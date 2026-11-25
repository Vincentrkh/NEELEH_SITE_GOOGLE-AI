import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("page.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const page = await db.staticPage.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });
  return NextResponse.json({ page });
}

type UpdateBody = {
  title?: string;
  titleEn?: string;
  slug?: string;
  content?: string;
  contentEn?: string;
  excerpt?: string;
  status?: "DRAFT" | "PUBLISHED";
  showInMenu?: boolean;
  sortOrder?: number;
  parentId?: string | null;
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("page.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const body = (await req.json()) as UpdateBody;
  const existing = await db.staticPage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });

  let slug = existing.slug;
  if (body.slug !== undefined) {
    const newSlug = slugify(body.slug);
    if (newSlug) {
      const conflict = await db.staticPage.findFirst({ where: { slug: newSlug, NOT: { id } } });
      slug = conflict ? `${newSlug}-${Date.now().toString(36)}` : newSlug;
    }
  }

  const page = await db.staticPage.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.titleEn !== undefined ? { titleEn: body.titleEn.trim() || null } : {}),
      ...(slug !== existing.slug ? { slug } : {}),
      ...(body.content !== undefined ? { content: body.content } : {}),
      ...(body.contentEn !== undefined ? { contentEn: body.contentEn } : {}),
      ...(body.excerpt !== undefined ? { excerpt: body.excerpt || null } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.showInMenu !== undefined ? { showInMenu: Boolean(body.showInMenu) } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.parentId !== undefined ? { parentId: body.parentId || null } : {}),
    },
  });

  return NextResponse.json({ page });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requirePermission("page.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    await db.staticPage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: await apiMsg("یافت نشد", "Not found") }, { status: 404 });
  }
}
