import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiMsg } from "@/lib/i18n";

/** GET /api/posts/[slug] — جزئیات یک مقاله منتشر شده */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await db.post.findUnique({
    where: { slug },
    include: {
      author: { select: { id: true, name: true, bio: true } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      comments: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          content: true,
          createdAt: true,
          parentId: true,
        },
      },
    },
  });

  if (!post || post.status !== "PUBLISHED") {
    return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });
  }

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
