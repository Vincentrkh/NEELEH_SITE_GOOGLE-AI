import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiMsg, getServerLang } from "@/lib/i18n";
import {
  generateCourseScheduleDays,
  getTehranTodayKey,
  isValidDateKey,
} from "@/lib/attendance-gantt";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";

/**
 * GET /api/panel/gantt
 *   Returns synced GitHub-style Gantts for the signed-in student's active registrations.
 *
 * POST /api/panel/gantt
 *   Student declares an upcoming planned absence (`DECLARED_ABSENCE`) on a scheduled session day.
 *   Anti-cheat server-side rules:
 *   1. Registration must belong to authenticated student and be CONFIRMED.
 *   2. dateKey must belong to the computed schedule of that course.
 *   3. dateKey MUST be >= server-canonical Asia/Tehran today (cannot declare retroactively).
 *   4. Cannot overwrite an existing attendance decision or re-edit/cancel once declared.
 *
 * DELETE / PATCH:
 *   Strictly forbidden (403) — only an admin can cancel a declared absence.
 */

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("لاگین نیستید", "You are not signed in") },
      { status: 401 },
    );
  }

  const lang = await getServerLang();
  const regs = await db.registration.findMany({
    where: { studentId: user.id, status: { not: "CANCELLED" } },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  const gantts = (
    await Promise.all(regs.map((r) => syncAndGetRegistrationGantt(r.id, lang)))
  ).filter(Boolean);

  return NextResponse.json({ gantts });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("لاگین نیستید", "You are not signed in") },
      { status: 401 },
    );
  }

  let body: { registrationId?: string; dateKey?: string; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: await apiMsg("درخواست نامعتبر است", "Invalid request body") },
      { status: 400 },
    );
  }

  const registrationId = String(body.registrationId ?? "").trim();
  const dateKey = String(body.dateKey ?? "").trim();
  const note = String(body.note ?? "").trim().slice(0, 300);

  if (!registrationId || !isValidDateKey(dateKey)) {
    return NextResponse.json(
      { error: await apiMsg("شناسه دوره یا تاریخ نامعتبر است", "Invalid registration or date") },
      { status: 400 },
    );
  }

  const reg = await db.registration.findUnique({
    where: { id: registrationId },
    include: {
      course: {
        select: {
          durationHrs: true,
          sessionDurationHrs: true,
          sessionsPerWeek: true,
          sessions: {
            select: { title: true, date: true, startAt: true, order: true },
            orderBy: [{ startAt: "asc" }, { order: "asc" }],
          },
        },
      },
      session: { select: { startAt: true, date: true } },
    },
  });

  if (!reg || reg.studentId !== user.id) {
    return NextResponse.json(
      { error: await apiMsg("ثبت‌نام یافت نشد", "Registration not found") },
      { status: 404 },
    );
  }

  if (reg.status !== "CONFIRMED") {
    return NextResponse.json(
      {
        error: await apiMsg(
          "ثبت‌نام شما هنوز تایید نهایی نشده است.",
          "Only confirmed enrollments can declare attendance notices.",
        ),
      },
      { status: 403 },
    );
  }

  // Server canonical Asia/Tehran date check — prevents client clock spoofing
  const tehranTodayKey = getTehranTodayKey();
  if (dateKey < tehranTodayKey) {
    return NextResponse.json(
      {
        error: await apiMsg(
          "امکان اعلام غیبت برای روزهای گذشته وجود ندارد.",
          "You cannot declare an absence for past dates.",
        ),
      },
      { status: 400 },
    );
  }

  const effectiveStartDate =
    reg.scheduleStartDate ??
    reg.session?.startAt ??
    reg.session?.date ??
    reg.confirmedAt ??
    reg.createdAt;
  const schedule = generateCourseScheduleDays({
    durationHrs: reg.course.durationHrs || 24,
    sessionHours: reg.sessionHours ?? reg.course.sessionDurationHrs ?? 2,
    sessionsPerWeek: reg.sessionsPerWeek ?? reg.course.sessionsPerWeek ?? 2,
    startDate: effectiveStartDate,
    explicitSessions: reg.course.sessions,
  });

  const slot = schedule.find((s) => s.dateKey === dateKey);
  if (!slot) {
    return NextResponse.json(
      {
        error: await apiMsg(
          "این تاریخ جزو روزهای برنامه‌ریزی‌شده دوره نیست.",
          "Selected date is not a scheduled class day for this course.",
        ),
      },
      { status: 400 },
    );
  }

  const existingDay = await db.studentAttendanceDay.findUnique({
    where: { registrationId_dateKey: { registrationId: reg.id, dateKey } },
  });

  if (existingDay) {
    return NextResponse.json(
      {
        error: await apiMsg(
          "این روز قبلاً ثبت یا قفل شده است. لغو یا تغییر آن فقط توسط مدیر امکان‌پذیر است.",
          "This session day is already locked or recorded. Only an admin can cancel or change it.",
        ),
      },
      { status: 403 },
    );
  }

  await db.studentAttendanceDay.create({
    data: {
      registrationId: reg.id,
      dateKey,
      sessionIndex: slot.sessionIndex,
      status: "DECLARED_ABSENCE",
      studentNote: note || null,
      declaredAt: new Date(),
      lockedForStudent: true,
    },
  });

  const lang = await getServerLang();
  const gantt = await syncAndGetRegistrationGantt(reg.id, lang);

  return NextResponse.json({ ok: true, gantt });
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: await apiMsg(
        "لغو یا ویرایش غیبت اعلام‌شده فقط توسط مدیر امکان‌پذیر است.",
        "Only an administrator can cancel or edit a declared absence.",
      ),
    },
    { status: 403 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: await apiMsg(
        "لغو غیبت اعلام‌شده فقط توسط مدیر امکان‌پذیر است.",
        "Only an administrator can cancel a declared absence.",
      ),
    },
    { status: 403 },
  );
}
