import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";

/** GET /api/dashboard/leads — لیست لیدها با فیلتر ?status=&q= */
export async function GET(req: NextRequest) {
  const user = await requirePermission("lead.view");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");

  const where: { [k: string]: unknown } = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { message: { contains: q } },
    ];
  }

  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ leads });
}
