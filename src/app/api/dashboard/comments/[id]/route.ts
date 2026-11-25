import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * PATCH /api/dashboard/comments/[id] — تغییر وضعیت نظر (APPROVED/SPAM/REJECTED)
 * DELETE /api/dashboard/comments/[id] — حذف نظر
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("comment.moderate");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const body = (await req.json()) as { status?: string };
  if (body.status && !["PENDING", "APPROVED", "SPAM", "REJECTED"].includes(body.status)) {
    return NextResponse.json({ error: await apiMsg("وضعیت نامعتبر", "Invalid status") }, { status: 400 });
  }

  const existing = await db.comment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });

  const updated = await db.comment.update({
    where: { id },
    data: body.status ? { status: body.status } : {},
  });
  return NextResponse.json({ comment: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("comment.moderate");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    await db.comment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });
  }
}
