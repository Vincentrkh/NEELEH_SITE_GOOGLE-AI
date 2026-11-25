import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/posts — لیست مقالات منتشر شده
 * فیلتر: ?category=&tag=&featured=
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const tag = url.searchParams.get("tag");
  const featured = url.searchParams.get("featured");

  const where: { [k: string]: unknown } = { status: "PUBLISHED" };
  if (featured === "true") where.featured = true;
  if (category) {
    where.categories = { some: { category: { slug: category } } };
  }
  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }

  const posts = await db.post.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverUrl: true,
      featured: true,
      readingMins: true,
      publishedAt: true,
      author: { select: { name: true } },
      categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
      _count: { select: { comments: { where: { status: "APPROVED" } } } },
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
