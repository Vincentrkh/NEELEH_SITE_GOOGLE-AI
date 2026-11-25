import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/**
 * PATCH /api/dashboard/leads/[id] — تغییر وضعیت/یادداشت
 * DELETE /api/dashboard/leads/[id] — حذف
 */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("lead.update");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const body = (await req.json()) as { status?: string; note?: string };
  if (
    body.status &&
    !["NEW", "CONTACTED", "CONVERTED"].includes(body.status)
  ) {
    return NextResponse.json({ error: await apiMsg("وضعیت نامعتبر است", "Invalid status") }, { status: 400 });
  }

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });

  const data: { [k: string]: unknown } = {};
  if (body.status !== undefined) data.status = body.status;
  if (body.note !== undefined) data.note = body.note.slice(0, 2000);

  const updated = await db.lead.update({ where: { id }, data });
  return NextResponse.json({ lead: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("lead.delete");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    await db.lead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });
  }
}
