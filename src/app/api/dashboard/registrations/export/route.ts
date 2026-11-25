import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { toFaDigits } from "@/lib/format";
import { getServerLang, apiMsg } from "@/lib/i18n";
import { escapeCsvCell } from "@/lib/security";
import { listPresentSocials, SOCIAL_PLATFORM_META } from "@/lib/socials";
import { syncAndGetRegistrationGantt } from "@/lib/attendance-sync";

/**
 * GET /api/dashboard/registrations/export — خروجی CSV همه ثبت‌نام‌ها
 * قابل باز کردن در Excel (با BOM UTF-8).
 */

export async function GET() {
  const user = await requirePermission("registration.export");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });
  const lang = await getServerLang();
  const fa = lang === "fa";

  const registrations = await db.registration.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: {
          name: true,
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
      course: { select: { title: true, price: true } },
    },
  });

  const headers = fa
    ? [
        "ردیف",
        "کد رهگیری",
        "نام و نام خانوادگی",
        "شماره موبایل",
        "ایمیل",
        "شبکه‌های اجتماعی",
        "رشته تحصیلی",
        "سوابق تحصیلی",
        "دوره",
        "وضعیت ثبت‌نام",
        "وضعیت پرداخت",
        "پیشرفت دوره",
        "شهریه (تومان)",
        "تاریخ ثبت",
        "یادداشت",
      ]
    : [
        "No.",
        "Tracking code",
        "Full name",
        "Mobile number",
        "Email",
        "Social handles",
        "Field of study",
        "Education",
        "Course",
        "Registration status",
        "Payment status",
        "Course progress",
        "Tuition (Toman)",
        "Registered at",
        "Note",
      ];

  const statusLabels: Record<string, string> = fa
    ? { PENDING: "در انتظار تایید", CONFIRMED: "تایید شده", CANCELLED: "لغو شده" }
    : { PENDING: "Pending", CONFIRMED: "Confirmed", CANCELLED: "Cancelled" };
  const paymentLabels: Record<string, string> = fa
    ? { UNPAID: "پرداخت نشده", PAID: "پرداخت شده" }
    : { UNPAID: "Unpaid", PAID: "Paid" };

  const faDateShort = (d: Date) => {
    return new Intl.DateTimeFormat(fa ? "fa-IR-u-ca-persian" : "en-GB", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(d);
  };

  const rows = await Promise.all(
    registrations.map(async (r, i) => {
      const socialsText = listPresentSocials(r.student)
        .map((s) => `${fa ? SOCIAL_PLATFORM_META[s.platform].labelFa : SOCIAL_PLATFORM_META[s.platform].labelEn}: ${s.value}`)
        .join(" | ");
      const gantt = await syncAndGetRegistrationGantt(r.id, lang);
      const progressText = gantt
        ? `${fa ? toFaDigits(gantt.stats.progressPercent) : gantt.stats.progressPercent}% (${gantt.stats.completedSessions}/${gantt.stats.totalSessions})`
        : "—";

      return [
        escapeCsvCell(fa ? toFaDigits(String(i + 1)) : String(i + 1)),
        escapeCsvCell(r.trackingCode ?? ""),
        escapeCsvCell(r.student.name),
        escapeCsvCell(r.student.phone),
        escapeCsvCell(r.student.email ?? ""),
        escapeCsvCell(socialsText),
        escapeCsvCell(r.student.field ?? ""),
        escapeCsvCell(r.student.education ?? ""),
        escapeCsvCell(r.course.title),
        escapeCsvCell(statusLabels[r.status] ?? r.status),
        escapeCsvCell(paymentLabels[r.paymentStatus] ?? r.paymentStatus),
        escapeCsvCell(progressText),
        escapeCsvCell(fa ? toFaDigits(r.course.price.toLocaleString("en-US")) : r.course.price.toLocaleString("en-US")),
        escapeCsvCell(faDateShort(r.createdAt)),
        escapeCsvCell(r.note ?? ""),
      ];
    }),
  );

  const csv = [headers.map((h) => escapeCsvCell(h)).join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const bom = "\uFEFF";
  const csvBytes = Buffer.from(bom + csv, "utf-8");

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csvBytes, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="neeleh-registrations-${date}.csv"`,
    },
  });
}
