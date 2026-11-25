import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiMsg } from "@/lib/i18n";

/** GET /api/pages/[slug] — صفحه ساکن منتشر شده */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await db.staticPage.findUnique({ where: { slug } });
  if (!page || page.status !== "PUBLISHED") {
    return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });
  }
  return NextResponse.json({ page });
}
