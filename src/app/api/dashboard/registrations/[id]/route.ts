import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg, getServerLang } from "@/lib/i18n";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";

/**
 * PATCH /api/dashboard/registrations/[id] — تغییر وضعیت ثبت‌نام و تنظیمات برنامه دوره
 * DELETE /api/dashboard/registrations/[id] — حذف ثبت‌نام
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("registration.update");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  let body: {
    status?: string;
    paymentStatus?: string;
    note?: string;
    scheduleStartDate?: string | null;
    sessionsPerWeek?: number | null;
    sessionHours?: number | null;
    autoAttendance?: boolean;
    examUnlocked?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: await apiMsg("درخواست نامعتبر است", "Invalid request body") }, { status: 400 });
  }

  if (
    body.status &&
    !["PENDING", "CONFIRMED", "CANCELLED"].includes(body.status)
  ) {
    return NextResponse.json({ error: await apiMsg("وضعیت نامعتبر است", "Invalid status") }, { status: 400 });
  }
  if (
    body.paymentStatus &&
    !["PAID", "UNPAID"].includes(body.paymentStatus)
  ) {
    return NextResponse.json({ error: await apiMsg("وضعیت پرداخت نامعتبر است", "Invalid payment status") }, { status: 400 });
  }

  const existing = await db.registration.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: await apiMsg("ثبت‌نام یافت نشد", "Registration not found") }, { status: 404 });
  }

  const data: { [k: string]: unknown } = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "CONFIRMED") {
      if (!existing.confirmedAt) data.confirmedAt = new Date();
      if (!existing.scheduleStartDate && body.scheduleStartDate === undefined) {
        data.scheduleStartDate = new Date();
      }
    }
  }
  if (body.paymentStatus !== undefined) data.paymentStatus = body.paymentStatus;
  if (body.note !== undefined) data.note = body.note.slice(0, 1000);
  if (body.scheduleStartDate !== undefined) {
    if (body.scheduleStartDate === null || body.scheduleStartDate === "") {
      data.scheduleStartDate = null;
    } else {
      const parsed = new Date(body.scheduleStartDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: await apiMsg("تاریخ شروع نامعتبر است", "Invalid start date") }, { status: 400 });
      }
      data.scheduleStartDate = parsed;
    }
  }
  if (body.sessionsPerWeek !== undefined) {
    data.sessionsPerWeek =
      body.sessionsPerWeek === null
        ? null
        : Math.max(1, Math.min(6, Math.round(Number(body.sessionsPerWeek))));
  }
  if (body.sessionHours !== undefined) {
    data.sessionHours =
      body.sessionHours === null
        ? null
        : Math.max(1, Math.min(12, Number(body.sessionHours)));
  }
  if (body.autoAttendance !== undefined) {
    data.autoAttendance = Boolean(body.autoAttendance);
  }
  if (body.examUnlocked !== undefined) {
    data.examUnlocked = Boolean(body.examUnlocked);
  }

  const updated = await db.registration.update({
    where: { id },
    data,
    include: {
      student: {
        select: {
          id: true,
          name: true,
          nameEn: true,
          phone: true,
          email: true,
          field: true,
          education: true,
          telegram: true,
          whatsapp: true,
          eitaa: true,
          bale: true,
          instagram: true,
          linkedin: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
          titleEn: true,
          slug: true,
          price: true,
          tier: true,
          durationHrs: true,
          sessionDurationHrs: true,
          sessionsPerWeek: true,
        },
      },
    },
  });

  const lang = await getServerLang();
  const gantt = await syncAndGetRegistrationGantt(updated.id, lang);

  return NextResponse.json({
    registration: {
      ...updated,
      ganttStats: gantt?.stats ?? null,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("registration.delete");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    await db.registration.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: await apiMsg("ثبت‌نام یافت نشد", "Registration not found") }, { status: 404 });
  }
}
