import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * GET /api/panel/courses — دوره‌های ثبت‌نام‌شده کاربر فعلی + وضعیت + فایل‌ها
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: await apiMsg("لاگین نیستید", "You are not signed in") }, { status: 401 });

  const registrations = await db.registration.findMany({
    where: { studentId: user.id, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    include: {
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          tier: true,
          category: true,
          durationHrs: true,
          bannerUrl: true,
          sections: { select: { id: true, title: true, items: true, order: true }, orderBy: { order: "asc" } },
          resources: {
            select: {
              id: true,
              title: true,
              kind: true,
              url: true,
              fileId: true,
              file: { select: { url: true, filename: true, mimeType: true, size: true } },
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          sessions: {
            select: {
              id: true,
              title: true,
              date: true,
              order: true,
            },
            orderBy: { order: "asc" },
          },
        },
      },
      attendance: {
        select: {
          sessionId: true,
          present: true,
        },
      },
    },
  });

  // تبدیل attendance به map برای دسترسی سریع
  const result = registrations.map((r) => ({
    id: r.id,
    status: r.status,
    paymentStatus: r.paymentStatus,
    note: r.note,
    createdAt: r.createdAt,
    course: r.course,
    // فایل‌ها فقط برای ثبت‌نام تاییدشده قابل دسترس هستند
    resources:
      r.status === "CONFIRMED"
        ? r.course.resources.map((res) => ({
            id: res.id,
            title: res.title,
            kind: res.kind,
            url: res.file?.url ?? res.url,
            filename: res.file?.filename,
            size: res.file?.size,
            createdAt: res.createdAt,
          }))
        : [],
    attendance: r.attendance,
    // attendanceRate: درصد حضور (تعداد present / تعداد کل sessions)
    attendanceRate:
      r.course.sessions.length > 0
        ? Math.round(
            (r.attendance.filter((a) => a.present).length /
              r.course.sessions.length) *
              100
          )
        : null,
  }));

  return NextResponse.json({ registrations: result });
}
