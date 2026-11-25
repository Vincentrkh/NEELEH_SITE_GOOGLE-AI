import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg, getServerLang } from "@/lib/i18n";
import { generateCourseScheduleDays, isValidDateKey } from "@/lib/attendance-gantt";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";

/**
 * GET /api/dashboard/registrations/[id]/gantt
 *   Syncs AUTO_PRESENT for past confirmed sessions and returns the GitHub-style Gantt.
 *
 * PATCH /api/dashboard/registrations/[id]/gantt
 *   Admin-only actions:
 *   - { action: "MARK_PRESENT" | "MARK_ABSENT" | "CANCEL_LEAVE" | "RESET_SCHEDULED", dateKey, adminNote? }
 *   - { action: "UPDATE_SETTINGS", scheduleStartDate?, sessionsPerWeek?, sessionHours?, autoAttendance? }
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requirePermission("registration.view");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  const lang = await getServerLang();
  const gantt = await syncAndGetRegistrationGantt(id, lang);
  if (!gantt) {
    return NextResponse.json(
      { error: await apiMsg("ثبت‌نام یافت نشد", "Registration not found") },
      { status: 404 },
    );
  }

  return NextResponse.json({ gantt });
}

type AdminActionBody = {
  action?: "MARK_PRESENT" | "MARK_ABSENT" | "CANCEL_LEAVE" | "RESET_SCHEDULED" | "UPDATE_SETTINGS";
  dateKey?: string;
  adminNote?: string;
  scheduleStartDate?: string | null;
  sessionsPerWeek?: number;
  sessionHours?: number;
  autoAttendance?: boolean;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await requirePermission("registration.update");
  if (!user) {
    return NextResponse.json(
      { error: await apiMsg("دسترسی مجاز نیست", "Not authorized") },
      { status: 403 },
    );
  }

  let body: AdminActionBody;
  try {
    body = (await req.json()) as AdminActionBody;
  } catch {
    return NextResponse.json(
      { error: await apiMsg("درخواست نامعتبر است", "Invalid request body") },
      { status: 400 },
    );
  }

  const reg = await db.registration.findUnique({
    where: { id },
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

  if (!reg) {
    return NextResponse.json(
      { error: await apiMsg("ثبت‌نام یافت نشد", "Registration not found") },
      { status: 404 },
    );
  }

  const lang = await getServerLang();

  if (body.action === "UPDATE_SETTINGS") {
    const updateData: { [k: string]: unknown } = {};
    if (body.scheduleStartDate !== undefined) {
      if (!body.scheduleStartDate) {
        updateData.scheduleStartDate = null;
      } else {
        const dt = new Date(body.scheduleStartDate);
        if (Number.isNaN(dt.getTime())) {
          return NextResponse.json(
            { error: await apiMsg("تاریخ شروع نامعتبر است", "Invalid start date") },
            { status: 400 },
          );
        }
        updateData.scheduleStartDate = dt;
      }
    }
    if (body.sessionsPerWeek !== undefined) {
      updateData.sessionsPerWeek = Math.max(1, Math.min(6, Math.round(Number(body.sessionsPerWeek))));
    }
    if (body.sessionHours !== undefined) {
      updateData.sessionHours = Math.max(1, Math.min(12, Number(body.sessionHours)));
    }
    if (body.autoAttendance !== undefined) {
      updateData.autoAttendance = Boolean(body.autoAttendance);
    }

    await db.registration.update({ where: { id }, data: updateData });
    const gantt = await syncAndGetRegistrationGantt(id, lang);
    return NextResponse.json({ gantt });
  }

  const dateKey = String(body.dateKey ?? "").trim();
  if (!isValidDateKey(dateKey)) {
    return NextResponse.json(
      { error: await apiMsg("تاریخ نامعتبر است", "Invalid dateKey") },
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

  const matchedSlot = schedule.find((s) => s.dateKey === dateKey);
  if (!matchedSlot) {
    return NextResponse.json(
      { error: await apiMsg("این تاریخ در برنامه جلسات دوره نیست", "Date is outside the course schedule") },
      { status: 400 },
    );
  }

  const adminNote = body.adminNote !== undefined ? body.adminNote.trim().slice(0, 500) : undefined;

  if (body.action === "RESET_SCHEDULED") {
    await db.studentAttendanceDay.deleteMany({
      where: { registrationId: id, dateKey },
    });
  } else if (
    body.action === "MARK_PRESENT" ||
    body.action === "MARK_ABSENT" ||
    body.action === "CANCEL_LEAVE"
  ) {
    const nextStatus =
      body.action === "MARK_PRESENT"
        ? "PRESENT"
        : body.action === "MARK_ABSENT"
          ? "ABSENT"
          : "CANCELLED_LEAVE";

    await db.studentAttendanceDay.upsert({
      where: { registrationId_dateKey: { registrationId: id, dateKey } },
      update: {
        status: nextStatus,
        ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
        reviewedById: user.id,
        reviewedAt: new Date(),
        lockedForStudent: true,
      },
      create: {
        registrationId: id,
        dateKey,
        sessionIndex: matchedSlot.sessionIndex,
        status: nextStatus,
        adminNote: adminNote || null,
        reviewedById: user.id,
        reviewedAt: new Date(),
        lockedForStudent: true,
      },
    });
  } else {
    return NextResponse.json(
      { error: await apiMsg("عملیات نامعتبر است", "Invalid action") },
      { status: 400 },
    );
  }

  const gantt = await syncAndGetRegistrationGantt(id, lang);
  return NextResponse.json({ gantt });
}
