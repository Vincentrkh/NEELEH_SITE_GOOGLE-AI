import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg, getServerLang } from "@/lib/i18n";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";

/**
 * GET /api/dashboard/registrations — لیست همه ثبت‌نام‌ها (با فیلتر query)
 * فیلترها: ?status=PENDING|CONFIRMED|CANCELLED  &paymentStatus=PAID|UNPAID  &courseId=...  &q=جستجو در نام/موبایل
 */

export async function GET(req: Request) {
  const user = await requirePermission("registration.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const lang = await getServerLang();
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const paymentStatus = url.searchParams.get("paymentStatus");
  const courseId = url.searchParams.get("courseId");
  const q = url.searchParams.get("q");

  const where: { [k: string]: unknown } = {};
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (courseId) where.courseId = courseId;
  if (q) {
    where.OR = [
      { student: { name: { contains: q } } },
      { student: { phone: { contains: q } } },
    ];
  }

  const registrations = await db.registration.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  const enriched = await Promise.all(
    registrations.map(async (r) => {
      const gantt = await syncAndGetRegistrationGantt(r.id, lang);
      return {
        ...r,
        ganttStats: gantt?.stats ?? null,
      };
    }),
  );

  return NextResponse.json({ registrations: enriched });
}
