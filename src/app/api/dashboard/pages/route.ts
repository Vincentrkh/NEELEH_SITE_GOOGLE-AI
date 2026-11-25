import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { apiMsg } from "@/lib/i18n";

/** GET /api/dashboard/pages — لیست صفحات ساکن */
export async function GET() {
  const user = await requirePermission("page.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const pages = await db.staticPage.findMany({
    orderBy: [{ showInMenu: "desc" }, { sortOrder: "asc" }],
    include: {
      _count: { select: { children: true } },
    },
  });

  return NextResponse.json({
    pages: pages.map((p) => ({
      ...p,
      childrenCount: p._count.children,
      _count: undefined,
    })),
  });
}

type CreateBody = {
  title: string;
  titleEn?: string;
  slug?: string;
  content?: string;
  contentEn?: string;
  excerpt?: string;
  status?: "DRAFT" | "PUBLISHED";
  showInMenu?: boolean;
  sortOrder?: number;
  parentId?: string;
};

export async function POST(req: NextRequest) {
  const user = await requirePermission("page.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as CreateBody;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: await apiMsg("عنوان الزامی است", "Title is required") }, { status: 400 });
    }

    let slug = body.slug?.trim() ? slugify(body.slug) : slugify(body.title);
    if (!slug) slug = `page-${Date.now()}`;
    const existing = await db.staticPage.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const page = await db.staticPage.create({
      data: {
        slug,
        title: body.title.trim(),
        titleEn: body.titleEn?.trim() || null,
        content: body.content || "",
        contentEn: body.contentEn || "",
        excerpt: body.excerpt?.trim() || null,
        status: body.status || "DRAFT",
        showInMenu: Boolean(body.showInMenu),
        sortOrder: Number(body.sortOrder) || 0,
        parentId: body.parentId || null,
      },
    });

    return NextResponse.json({ page });
  } catch (e) {
    console.error("page create error", e);
    return NextResponse.json({ error: await apiMsg("خطا در ساخت صفحه", "Page creation failed") }, { status: 500 });
  }
}
