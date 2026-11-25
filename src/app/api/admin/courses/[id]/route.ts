import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSafeMediaUrl } from "@/lib/security";

type SectionInput = { title: string; items: string[] };
type Body = {
  title?: string;
  tier?: "BEGINNER" | "INTERMEDIATE" | "PRO";
  category?: string;
  tags?: string;
  about?: string;
  outputs?: string;
  prereqs?: string;
  durationHrs?: number;
  price?: number;
  capacity?: number;
  regStatus?: "OPEN" | "FULL" | "CLOSED";
  featured?: boolean;
  bannerUrl?: string | null;
  sections?: SectionInput[];
};

const VALID_TIERS = new Set(["BEGINNER", "INTERMEDIATE", "PRO"]);
const VALID_REG_STATUSES = new Set(["OPEN", "FULL", "CLOSED"]);

/** ویرایش دوره (ادمین) — شامل بازنویسی سرفصل‌ها */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await ctx.params;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: await apiMsg("درخواست نامعتبر است", "Invalid request body") }, { status: 400 });
  }

  const course = await db.course.findUnique({ where: { id } });
  if (!course) return NextResponse.json({ error: await apiMsg("دوره یافت نشد", "Course not found") }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const t = body.title.trim().slice(0, 200);
    if (t) data.title = t;
  }
  if (body.tier !== undefined) {
    if (!VALID_TIERS.has(body.tier)) {
      return NextResponse.json({ error: await apiMsg("سطح دوره نامعتبر است", "Invalid course tier") }, { status: 400 });
    }
    data.tier = body.tier;
  }
  if (typeof body.category === "string") data.category = body.category.trim().slice(0, 120);
  if (typeof body.tags === "string") data.tags = body.tags.trim().slice(0, 500);
  if (typeof body.about === "string") data.about = body.about.slice(0, 10000);
  if (typeof body.outputs === "string") data.outputs = body.outputs.slice(0, 10000);
  if (typeof body.prereqs === "string") data.prereqs = body.prereqs.slice(0, 5000);
  if (typeof body.durationHrs === "number" && Number.isFinite(body.durationHrs)) {
    data.durationHrs = Math.max(0, Math.min(2000, Math.round(body.durationHrs)));
  }
  if (typeof body.price === "number" && Number.isFinite(body.price)) {
    data.price = Math.max(0, Math.round(body.price));
  }
  if (typeof body.capacity === "number" && Number.isFinite(body.capacity)) {
    data.capacity = Math.max(1, Math.min(5000, Math.round(body.capacity)));
  }
  if (body.regStatus !== undefined) {
    if (!VALID_REG_STATUSES.has(body.regStatus)) {
      return NextResponse.json({ error: await apiMsg("وضعیت ثبت‌نام نامعتبر است", "Invalid regStatus") }, { status: 400 });
    }
    data.regStatus = body.regStatus;
  }
  if (typeof body.featured === "boolean") data.featured = body.featured;
  if (body.bannerUrl !== undefined) {
    data.bannerUrl = body.bannerUrl ? sanitizeSafeMediaUrl(body.bannerUrl) || null : null;
  }

  await db.course.update({ where: { id }, data });

  if (Array.isArray(body.sections)) {
    const cleanSections = body.sections
      .filter((s) => s && typeof s.title === "string")
      .slice(0, 100);
    await db.courseSection.deleteMany({ where: { courseId: id } });
    if (cleanSections.length > 0) {
      await db.courseSection.createMany({
        data: cleanSections.map((s, i) => ({
          courseId: id,
          title: s.title.trim().slice(0, 200),
          items: Array.isArray(s.items)
            ? s.items.filter((x): x is string => typeof x === "string").join("\n").slice(0, 5000)
            : "",
          order: i,
        })),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
