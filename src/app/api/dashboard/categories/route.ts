import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";

/**
 * /api/dashboard/categories
 *
 * GET   فهرست دسته‌ها (با تعداد نوشته‌ها) — مجوز: post.view
 * POST  ساخت دسته جدید — مجوز: post.create
 */

export async function GET() {
  const user = await requirePermission("post.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      postCount: c._count.posts,
    })),
  });
}

type CreateBody = { name?: string; slug?: string; description?: string };

export async function POST(req: NextRequest) {
  const user = await requirePermission("post.create");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as CreateBody;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: await apiMsg("نام دسته الزامی است", "Category name is required") }, { status: 400 });
    }

    let slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.name.trim());
    if (!slug) slug = `cat-${Date.now().toString(36)}`;
    const existing = await db.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: await apiMsg(`دسته‌ای با شناسه «${slug}» از قبل وجود دارد`, `A category with the slug "${slug}" already exists`) }, { status: 409 });
    }

    const created = await db.category.create({
      data: { name: body.name.trim(), slug, description: body.description?.trim() || null },
    });
    return NextResponse.json({ category: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: await apiMsg("درخواست نامعتبر است", "Invalid request") }, { status: 400 });
  }
}
