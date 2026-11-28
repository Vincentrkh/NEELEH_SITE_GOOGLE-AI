import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { seedDefaultMenus } from "@/lib/menu";
import {
  isHeaderMenuLocation,
  isValidMenuLocation,
} from "@/lib/menu-defaults";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSafeHref } from "@/lib/security";

/**
 * /api/dashboard/menus — مدیریت منوهای آکادمی نیله و دفتر نیله
 *
 * GET   لیست همه آیتم‌های هر چهار جایگاه (header, footer, office_header, office_footer)
 * POST  افزودن آیتم جدید
 * PUT   ذخیره ترتیب جدید — body: { ids: string[] }
 */

const KINDS = ["block", "archive"];
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

function invalidateMenuCaches() {
  revalidateTag("site-menus", { expire: 0 });
  revalidatePath("/", "layout");
}

export async function GET() {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    await seedDefaultMenus(false, "all");
  } catch {
    // جدول ممکن است هنوز موجود نباشد
  }

  const items = await db.menuItem.findMany({
    orderBy: [{ location: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ items });
}

type CreateBody = {
  location?: string;
  labelFa?: string;
  labelEn?: string;
  href?: string;
  bgColor?: string;
  kind?: string;
  fillIndicator?: boolean;
  isActive?: boolean;
};

export async function POST(req: NextRequest) {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as CreateBody;

    const location = isValidMenuLocation(body.location ?? "")
      ? body.location!
      : "header";
    const isHeaderLoc = isHeaderMenuLocation(location);
    const labelFa = (body.labelFa ?? "").trim();
    const labelEn = (body.labelEn ?? "").trim();
    const href = sanitizeSafeHref(body.href);

    if (!labelFa && !labelEn) {
      return NextResponse.json(
        { error: await apiMsg("حداقل یکی از برچسب‌های فارسی یا انگلیسی لازم است", "At least one of the Persian or English labels is required") },
        { status: 400 },
      );
    }
    if (!href) {
      return NextResponse.json({ error: await apiMsg("آدرس (لینک) معتبر نیست", "Valid address (link) is required") }, { status: 400 });
    }

    let kind = "block";
    if (isHeaderLoc && body.kind) {
      if (!KINDS.includes(body.kind)) {
        return NextResponse.json({ error: await apiMsg("نوع آیتم نامعتبر است", "Invalid item type") }, { status: 400 });
      }
      kind = body.kind;
    }

    let bgColor = "#cbcccd";
    if (isHeaderLoc && body.bgColor) {
      if (!COLOR_RE.test(body.bgColor)) {
        return NextResponse.json({ error: await apiMsg("رنگ نامعتبر است", "Invalid color") }, { status: 400 });
      }
      bgColor = body.bgColor;
    }

    const last = await db.menuItem.findFirst({
      where: { location },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const item = await db.menuItem.create({
      data: {
        location,
        labelFa: labelFa || labelEn,
        labelEn: labelEn || labelFa,
        href,
        bgColor,
        kind,
        fillIndicator: isHeaderLoc ? Boolean(body.fillIndicator) : false,
        isActive: body.isActive ?? true,
        order: (last?.order ?? -1) + 1,
      },
    });

    invalidateMenuCaches();
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    console.error("[menus POST]", e);
    return NextResponse.json({ error: await apiMsg("خطا در افزودن آیتم منو", "Failed to add the menu item") }, { status: 500 });
  }
}

type ReorderBody = { ids?: string[] };

export async function PUT(req: NextRequest) {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as ReorderBody;
    const ids = Array.isArray(body.ids) ? body.ids : null;
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: await apiMsg("لیست ترتیب ارسال نشده است", "Order list was not sent") }, { status: 400 });
    }

    const found = await db.menuItem.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      return NextResponse.json(
        { error: await apiMsg("بعضی از آیتم‌ها یافت نشدند", "Some items were not found") },
        { status: 400 },
      );
    }

    await db.$transaction(
      ids.map((id, i) =>
        db.menuItem.update({ where: { id }, data: { order: i } }),
      ),
    );

    invalidateMenuCaches();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[menus PUT]", e);
    return NextResponse.json({ error: await apiMsg("خطا در ذخیره ترتیب", "Failed to save the order") }, { status: 500 });
  }
}
