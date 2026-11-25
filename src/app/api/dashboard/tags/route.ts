import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";

/**
 * /api/dashboard/tags
 *
 * GET   فهرست برچسب‌ها (با تعداد نوشته‌ها) — مجوز: post.view
 * POST  ساخت برچسب جدید — مجوز: post.create
 */

export async function GET() {
  const user = await requirePermission("post.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const tags = await db.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { posts: true } } },
  });

  return NextResponse.json({
    tags: tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, postCount: t._count.posts })),
  });
}

type CreateBody = { name?: string; slug?: string };

export async function POST(req: NextRequest) {
  const user = await requirePermission("post.create");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as CreateBody;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: await apiMsg("نام برچسب الزامی است", "Tag name is required") }, { status: 400 });
    }

    let slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.name.trim());
    if (!slug) slug = `tag-${Date.now().toString(36)}`;
    const existing = await db.tag.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: await apiMsg(`برچسبی با شناسه «${slug}» از قبل وجود دارد`, `A tag with the slug "${slug}" already exists`) }, { status: 409 });
    }

    const created = await db.tag.create({ data: { name: body.name.trim(), slug } });
    return NextResponse.json({ tag: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: await apiMsg("درخواست نامعتبر است", "Invalid request") }, { status: 400 });
  }
}
