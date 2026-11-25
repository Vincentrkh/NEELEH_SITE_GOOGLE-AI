import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSafeMediaUrl } from "@/lib/security";

/**
 * GET /api/dashboard/courses — لیست همه دوره‌ها (با sections و آمار ثبت‌نام)
 * POST /api/dashboard/courses — ساخت دوره جدید
 */

export async function GET() {
  const user = await requirePermission("course.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const courses = await db.course.findMany({
    orderBy: [{ tier: "asc" }, { sortOrder: "asc" }],
    include: {
      sections: { orderBy: { order: "asc" } },
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
        },
      },
    },
  });

  return NextResponse.json({
    courses: courses.map((c) => ({
      ...c,
      tagsArray: c.tags ? c.tags.split(",").filter(Boolean) : [],
      outputsArray: c.outputs ? c.outputs.split("\n").filter(Boolean) : [],
      registrationCount: c._count.registrations,
      _count: undefined,
    })),
  });
}

type CreateBody = {
  title: string;
  titleEn?: string;
  tier: "BEGINNER" | "INTERMEDIATE" | "PRO";
  category: string;
  categoryEn?: string;
  description?: string;
  descriptionEn?: string;
  about?: string;
  aboutEn?: string;
  tags?: string[];
  tagsEn?: string[];
  outputs?: string[];
  outputsEn?: string[];
  prereqs?: string;
  prereqsEn?: string;
  durationHrs?: number;
  price?: number;
  capacity?: number;
  regStatus?: "OPEN" | "FULL" | "CLOSED";
  featured?: boolean;
  published?: boolean;
  bannerUrl?: string;
  sortOrder?: number;
  sections?: { title: string; items: string[] }[];
};

export async function POST(req: NextRequest) {
  const user = await requirePermission("course.create");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as CreateBody;

    if (!body.title?.trim()) {
      return NextResponse.json({ error: await apiMsg("عنوان دوره الزامی است", "Course title is required") }, { status: 400 });
    }
    if (!["BEGINNER", "INTERMEDIATE", "PRO"].includes(body.tier)) {
      return NextResponse.json({ error: await apiMsg("سطح دوره نامعتبر است", "Invalid course tier") }, { status: 400 });
    }

    // ساخت slug یکتا
    let slug = slugify(body.title);
    if (!slug) slug = `course-${Date.now()}`;
    const existing = await db.course.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const course = await db.course.create({
      data: {
        slug,
        title: body.title.trim(),
        titleEn: body.titleEn?.trim() || null,
        tier: body.tier,
        category: body.category?.trim() || await apiMsg("عمومی", "General"),
        categoryEn: body.categoryEn?.trim() || null,
        description: body.description?.trim() || "",
        descriptionEn: body.descriptionEn?.trim() || "",
        about: body.about?.trim() || "",
        aboutEn: body.aboutEn?.trim() || "",
        tags: (body.tags || []).join(","),
        tagsEn: (body.tagsEn || []).join(","),
        outputs: (body.outputs || []).join("\n"),
        outputsEn: (body.outputsEn || []).join("\n"),
        prereqs: body.prereqs?.trim() || "",
        prereqsEn: body.prereqsEn?.trim() || "",
        durationHrs: Number(body.durationHrs) || 0,
        price: Number(body.price) || 0,
        capacity: Number(body.capacity) || 12,
        regStatus: body.regStatus || "OPEN",
        featured: Boolean(body.featured),
        published: body.published !== false, // پیش‌فرض: منتشر شده
        bannerUrl: body.bannerUrl ? sanitizeSafeMediaUrl(body.bannerUrl) || null : null,
        sortOrder: Number(body.sortOrder) || 0,
        sections: body.sections?.length
          ? {
              create: body.sections.map((s, i) => ({
                title: s.title,
                items: (s.items || []).join("\n"),
                order: i,
              })),
            }
          : undefined,
      },
      include: { sections: true },
    });

    return NextResponse.json({ course });
  } catch (e) {
    console.error("course create error", e);
    return NextResponse.json({ error: await apiMsg("خطا در ساخت دوره", "Course creation failed") }, { status: 500 });
  }
}
