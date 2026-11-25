import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSafeMediaUrl } from "@/lib/security";

/**
 * GET /api/dashboard/posts/[id]
 * PUT /api/dashboard/posts/[id] — ویرایش (با بازنویسی categories/tags)
 * DELETE /api/dashboard/posts/[id]
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requirePermission("post.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await params;
  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!post) return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });

  return NextResponse.json({
    post: {
      ...post,
      categoriesArray: post.categories.map((pc) => pc.category),
      tagsArray: post.tags.map((pt) => pt.tag),
      categories: undefined,
      tags: undefined,
    },
  });
}

type UpdateBody = {
  title?: string;
  titleEn?: string;
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

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("post.update");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as UpdateBody;
    const existing = await db.post.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });

    // slug در صورت تغییر عنوان
    let slug = existing.slug;
    if (body.title && body.title.trim() !== existing.title) {
      const newSlug = slugify(body.title);
      if (newSlug) {
        const conflict = await db.post.findFirst({ where: { slug: newSlug, NOT: { id } } });
        slug = conflict ? `${newSlug}-${Date.now().toString(36)}` : newSlug;
      }
    }

    // اگر از DRAFT به PUBLISHED تغییر کرد، publishedAt را ست کن
    const willPublish =
      body.status === "PUBLISHED" && existing.status !== "PUBLISHED" && !existing.publishedAt;

    // بازنویسی categories/tags
    if (body.categoryIds !== undefined) {
      await db.postCategory.deleteMany({ where: { postId: id } });
      if (body.categoryIds.length > 0) {
        await db.postCategory.createMany({
          data: body.categoryIds.map((cid) => ({ postId: id, categoryId: cid })),
        });
      }
    }
    if (body.tagIds !== undefined) {
      await db.postTag.deleteMany({ where: { postId: id } });
      if (body.tagIds.length > 0) {
        await db.postTag.createMany({
          data: body.tagIds.map((tid) => ({ postId: id, tagId: tid })),
        });
      }
    }

    const post = await db.post.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.titleEn !== undefined ? { titleEn: body.titleEn.trim() || null } : {}),
        ...(slug !== existing.slug ? { slug } : {}),
        ...(body.excerpt !== undefined ? { excerpt: body.excerpt } : {}),
        ...(body.excerptEn !== undefined ? { excerptEn: body.excerptEn } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.contentEn !== undefined ? { contentEn: body.contentEn } : {}),
        ...(body.coverUrl !== undefined ? { coverUrl: body.coverUrl ? sanitizeSafeMediaUrl(body.coverUrl) || null : null } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.featured !== undefined ? { featured: Boolean(body.featured) } : {}),
        ...(body.readingMins !== undefined ? { readingMins: Number(body.readingMins) } : {}),
        ...(willPublish ? { publishedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ post });
  } catch (e) {
    console.error("post update error", e);
    return NextResponse.json({ error: await apiMsg("خطا در ویرایش", "Update failed") }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("post.delete");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    await db.post.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });
  }
}
