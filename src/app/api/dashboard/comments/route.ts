import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/** GET /api/dashboard/comments — لیست نظرات با فیلتر ?status= */
export async function GET(req: NextRequest) {
  const user = await requirePermission("comment.moderate");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const where: { [k: string]: unknown } = {};
  if (status) where.status = status;

  const comments = await db.comment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      post: { select: { id: true, title: true, slug: true } },
    },
  });

  return NextResponse.json({ comments });
}
