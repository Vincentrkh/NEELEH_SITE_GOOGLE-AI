import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/** تغییر وضعیت لید (ادمین) */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json()) as { status?: "NEW" | "CONTACTED" };

  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: await apiMsg("لید یافت نشد", "Lead not found") }, { status: 404 });

  await db.lead.update({
    where: { id },
    data: body.status ? { status: body.status } : {},
  });

  return NextResponse.json({ ok: true });
}
