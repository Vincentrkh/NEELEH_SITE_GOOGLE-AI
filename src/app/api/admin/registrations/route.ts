import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/** لیست ثبت‌نام‌ها (ادمین) */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const registrations = await db.registration.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { id: true, name: true, phone: true, field: true, education: true } },
      course: { select: { id: true, title: true, slug: true, price: true } },
      attendance: true,
    },
  });

  return NextResponse.json({ registrations });
}
