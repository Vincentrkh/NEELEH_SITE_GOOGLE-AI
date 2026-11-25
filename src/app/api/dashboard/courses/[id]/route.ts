import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSafeMediaUrl } from "@/lib/security";

/**
 * GET /api/dashboard/courses/[id] — جزئیات یک دوره
 * PUT /api/dashboard/courses/[id] — ویرایش کامل دوره (با بازنویسی sections)
 * DELETE /api/dashboard/courses/[id] — حذف دوره
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePermission("course.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { order: "asc" } },
      resources: { orderBy: { createdAt: "desc" } },
      sessions: { orderBy: { order: "asc" } },
      _count: {
        select: {
          registrations: { where: { status: { not: "CANCELLED" } } },
        },
      },
    },
  });
  if (!course) return NextResponse.json({ error: await apiMsg("دوره یافت نشد", "Course not found") }, { status: 404 });

  return NextResponse.json({
    course: {
      ...course,
      tagsArray: course.tags ? course.tags.split(",").filter(Boolean) : [],
      outputsArray: course.outputs ? course.outputs.split("\n").filter(Boolean) : [],
      sections: course.sections.map((s) => ({
        ...s,
        itemsArray: s.items ? s.items.split("\n").filter(Boolean) : [],
      })),
      registrationCount: course._count.registrations,
      _count: undefined,
    },
  });
}

type UpdateBody = {
  title?: string;
  titleEn?: string;
  tier?: "BEGINNER" | "INTERMEDIATE" | "PRO";
  category?: string;
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
  sections?: { id?: string; title: string; items: string[] }[];
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePermission("course.update");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await params;
  try {
    const body = (await req.json()) as UpdateBody;

    const existing = await db.course.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: await apiMsg("دوره یافت نشد", "Course not found") }, { status: 404 });

    // اگر عنوان تغییر کرد و slug تکراری شد، slug جدید بساز
    let slug = existing.slug;
    if (body.title && body.title.trim() !== existing.title) {
      const newSlug = slugify(body.title);
      if (newSlug) {
        const conflict = await db.course.findFirst({
          where: { slug: newSlug, NOT: { id } },
        });
        slug = conflict ? `${newSlug}-${Date.now().toString(36)}` : newSlug;
      }
    }

    // اگر sections داده شد، بازنویسی کامل (idempotent)
    if (body.sections !== undefined) {
      await db.courseSection.deleteMany({ where: { courseId: id } });
      if (body.sections.length > 0) {
        await db.courseSection.createMany({
          data: body.sections.map((s, i) => ({
            courseId: id,
            title: s.title,
            items: (s.items || []).join("\n"),
            order: i,
          })),
        });
      }
    }

    const course = await db.course.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.titleEn !== undefined ? { titleEn: body.titleEn.trim() || null } : {}),
        ...(slug !== existing.slug ? { slug } : {}),
        ...(body.tier ? { tier: body.tier } : {}),
        ...(body.category !== undefined ? { category: body.category.trim() } : {}),
        ...(body.categoryEn !== undefined ? { categoryEn: body.categoryEn.trim() || null } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.descriptionEn !== undefined ? { descriptionEn: body.descriptionEn } : {}),
        ...(body.about !== undefined ? { about: body.about } : {}),
        ...(body.aboutEn !== undefined ? { aboutEn: body.aboutEn } : {}),
        ...(body.tags !== undefined ? { tags: body.tags.join(",") } : {}),
        ...(body.tagsEn !== undefined ? { tagsEn: body.tagsEn.join(",") } : {}),
        ...(body.outputs !== undefined ? { outputs: body.outputs.join("\n") } : {}),
        ...(body.outputsEn !== undefined ? { outputsEn: body.outputsEn.join("\n") } : {}),
        ...(body.prereqs !== undefined ? { prereqs: body.prereqs } : {}),
        ...(body.prereqsEn !== undefined ? { prereqsEn: body.prereqsEn } : {}),
        ...(body.durationHrs !== undefined ? { durationHrs: Number(body.durationHrs) } : {}),
        ...(body.price !== undefined ? { price: Number(body.price) } : {}),
        ...(body.capacity !== undefined ? { capacity: Number(body.capacity) } : {}),
        ...(body.regStatus ? { regStatus: body.regStatus } : {}),
        ...(body.featured !== undefined ? { featured: Boolean(body.featured) } : {}),
        ...(body.published !== undefined ? { published: Boolean(body.published) } : {}),
        ...(body.bannerUrl !== undefined ? { bannerUrl: body.bannerUrl ? sanitizeSafeMediaUrl(body.bannerUrl) || null : null } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      },
      include: { sections: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({
      course: {
        ...course,
        tagsArray: course.tags ? course.tags.split(",").filter(Boolean) : [],
        outputsArray: course.outputs ? course.outputs.split("\n").filter(Boolean) : [],
        sections: course.sections.map((s) => ({
          ...s,
          itemsArray: s.items ? s.items.split("\n").filter(Boolean) : [],
        })),
      },
    });
  } catch (e) {
    console.error("course update error", e);
    return NextResponse.json({ error: await apiMsg("خطا در ویرایش دوره", "Course update failed") }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePermission("course.delete");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await params;
  try {
    await db.course.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: await apiMsg("دوره یافت نشد", "Course not found") }, { status: 404 });
  }
}
