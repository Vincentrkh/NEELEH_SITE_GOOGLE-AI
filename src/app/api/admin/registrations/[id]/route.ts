import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

type Body = {
  status?: "PENDING" | "CONFIRMED" | "CANCELLED";
  paymentStatus?: "UNPAID" | "PAID";
  attendance?: { sessionId: string; present: boolean }[];
};

/** ویرایش وضعیت ثبت‌نام / پرداخت / حضور و غیاب (ادمین) */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json()) as Body;

  const reg = await db.registration.findUnique({ where: { id } });
  if (!reg) return NextResponse.json({ error: await apiMsg("ثبت‌نام یافت نشد", "Registration not found") }, { status: 404 });

  const data: { status?: string; paymentStatus?: string } = {};
  if (body.status) data.status = body.status;
  if (body.paymentStatus) data.paymentStatus = body.paymentStatus;
  if (Object.keys(data).length > 0) {
    await db.registration.update({ where: { id }, data });
  }

  if (body.attendance?.length) {
    for (const a of body.attendance) {
      await db.attendance.upsert({
        where: {
          registrationId_sessionId: { registrationId: id, sessionId: a.sessionId },
        },
        update: { present: a.present },
        create: { registrationId: id, sessionId: a.sessionId, present: a.present },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
