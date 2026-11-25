import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/** حذف منبع/فایل دوره (ادمین) */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await ctx.params;
  await db.courseResource.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
