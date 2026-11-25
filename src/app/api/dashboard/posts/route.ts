import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSafeMediaUrl } from "@/lib/security";

/**
 * GET /api/dashboard/posts — لیست همه مقالات (با status)
 * POST /api/dashboard/posts — ساخت مقاله جدید
 */

export async function GET() {
  const user = await requirePermission("post.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const posts = await db.post.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true } },
      categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({
    posts: posts.map((p) => ({
      ...p,
      categoriesArray: p.categories.map((pc) => pc.category),
      tagsArray: p.tags.map((pt) => pt.tag),
      commentCount: p._count.comments,
      _count: undefined,
      categories: undefined,
      tags: undefined,
    })),
  });
}

type CreateBody = {
  title: string;
  titleEn?: string;
  slug?: string;
  excerpt?: string;
  excerptEn?: string;
  content?: string;
  contentEn?: string;
  coverUrl?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured?: boolean;
  readingMins?: number;
  categoryIds?: string[];
  tagIds?: string[];
};

export async function POST(req: NextRequest) {
  const user = await requirePermission("post.create");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as CreateBody;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: await apiMsg("عنوان مقاله الزامی است", "Post title is required") }, { status: 400 });
    }

    let slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.title);
    if (!slug) slug = `post-${Date.now()}`;
    const existing = await db.post.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const publishedAt =
      body.status === "PUBLISHED" ? new Date() : null;

    const post = await db.post.create({
      data: {
        slug,
        title: body.title.trim(),
        titleEn: body.titleEn?.trim() || null,
        excerpt: body.excerpt?.trim() || "",
        excerptEn: body.excerptEn?.trim() || "",
        content: body.content || "",
        contentEn: body.contentEn || "",
        coverUrl: body.coverUrl ? sanitizeSafeMediaUrl(body.coverUrl) || null : null,
        status: body.status || "DRAFT",
        featured: Boolean(body.featured),
        readingMins: Number(body.readingMins) || 0,
        authorId: user.id,
        publishedAt,
        categories: body.categoryIds?.length
          ? { create: body.categoryIds.map((id) => ({ categoryId: id })) }
          : undefined,
        tags: body.tagIds?.length
          ? { create: body.tagIds.map((id) => ({ tagId: id })) }
          : undefined,
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ post });
  } catch (e) {
    console.error("post create error", e);
    return NextResponse.json({ error: await apiMsg("خطا در ساخت مقاله", "Post creation failed") }, { status: 500 });
  }
}
