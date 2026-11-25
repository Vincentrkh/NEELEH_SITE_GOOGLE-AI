import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { toFaDigits, regLabel, paymentLabel } from "@/lib/format";
import { getServerLang, apiMsg } from "@/lib/i18n";
import { escapeCsvCell } from "@/lib/security";

/** خروجی اکسل (CSV سازگار با Excel فارسی) از لیست ثبت‌نام‌کنندگان */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });
  const lang = await getServerLang();
  const fa = lang === "fa";

  const rows = await db.registration.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { name: true, phone: true, field: true, education: true } },
      course: { select: { title: true, price: true } },
    },
  });

  const header = fa
    ? [
        "ردیف",
        "نام و نام خانوادگی",
        "شماره موبایل",
        "دوره",
        "رشته تحصیلی",
        "سوابق تحصیلی",
        "وضعیت ثبت‌نام",
        "وضعیت پرداخت",
        "شهریه (تومان)",
        "تاریخ ثبت",
        "یادداشت",
      ]
    : [
        "No.",
        "Full name",
        "Mobile number",
        "Course",
        "Field of study",
        "Education",
        "Registration status",
        "Payment status",
        "Tuition (Toman)",
        "Registered at",
        "Note",
      ];

  const faDate = (d: Date) =>
    new Intl.DateTimeFormat(fa ? "fa-IR" : "en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

  const lines = rows.map((r, i) =>
    [
      fa ? toFaDigits(i + 1) : String(i + 1),
      r.student.name,
      r.student.phone,
      r.course.title,
      r.student.field ?? "",
      r.student.education ?? "",
      regLabel(lang, r.status),
      paymentLabel(lang, r.paymentStatus),
      fa ? toFaDigits(r.course.price.toLocaleString("en-US")) : r.course.price.toLocaleString("en-US"),
      faDate(r.createdAt),
      (r.note ?? "").replace(/[\r\n]/g, " "),
    ]
      .map((cell) => escapeCsvCell(cell))
      .join(",")
  );

  // BOM برای نمایش درست فارسی در Excel
  const csv = "\uFEFF" + [header.map((h) => escapeCsvCell(h)).join(","), ...lines].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="neeleh-registrations-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
