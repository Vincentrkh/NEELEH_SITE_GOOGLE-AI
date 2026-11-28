import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { isHeaderMenuLocation, isValidMenuLocation } from "@/lib/menu-defaults";
import { apiMsg } from "@/lib/i18n";
import { sanitizeSafeHref } from "@/lib/security";

/**
 * /api/dashboard/menus/[id]
 *
 * PATCH   ویرایش آیتم (برچسب‌ها، لینک، رنگ، نوع، فعال، شماره توپُر)
 * DELETE  حذف آیتم
 */

const KINDS = ["block", "archive"];
const COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

type PatchBody = {
  labelFa?: string;
  labelEn?: string;
  href?: string;
  bgColor?: string;
  kind?: string;
  fillIndicator?: boolean;
  isActive?: boolean;
};

function invalidateMenuCaches() {
  revalidateTag("site-menus", { expire: 0 });
  revalidatePath("/", "layout");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const { id } = await params;
    const existing = await db.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: await apiMsg("آیتم یافت نشد", "Item not found") }, { status: 404 });
    }

    const body = (await req.json()) as PatchBody;
    const data: Record<string, unknown> = {};

    if (body.labelFa !== undefined) {
      const v = body.labelFa.trim();
      if (!v && !((body.labelEn ?? existing.labelEn) || "").trim()) {
        return NextResponse.json(
          { error: await apiMsg("حداقل یکی از برچسب‌ها لازم است", "At least one label is required") },
          { status: 400 },
        );
      }
      data.labelFa = v || body.labelEn?.trim() || existing.labelEn;
    }
    if (body.labelEn !== undefined) {
      const v = body.labelEn.trim();
      data.labelEn = v || body.labelFa?.trim() || existing.labelFa;
    }
    if (body.href !== undefined) {
      const v = sanitizeSafeHref(body.href);
      if (!v) {
        return NextResponse.json({ error: await apiMsg("آدرس (لینک) معتبر نیست", "Valid address (link) is required") }, { status: 400 });
      }
      data.href = v;
    }

    const isHeaderLoc =
      isValidMenuLocation(existing.location) && isHeaderMenuLocation(existing.location);

    if (isHeaderLoc) {
      if (body.kind !== undefined) {
        if (!KINDS.includes(body.kind)) {
          return NextResponse.json({ error: await apiMsg("نوع آیتم نامعتبر است", "Invalid item type") }, { status: 400 });
        }
        data.kind = body.kind;
      }
      if (body.bgColor !== undefined) {
        if (!COLOR_RE.test(body.bgColor)) {
          return NextResponse.json({ error: await apiMsg("رنگ نامعتبر است", "Invalid color") }, { status: 400 });
        }
        data.bgColor = body.bgColor;
      }
      if (body.fillIndicator !== undefined) {
        data.fillIndicator = Boolean(body.fillIndicator);
      }
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    const item = await db.menuItem.update({ where: { id }, data });
    invalidateMenuCaches();
    return NextResponse.json({ item });
  } catch (e) {
    console.error("[menus PATCH]", e);
    return NextResponse.json({ error: await apiMsg("خطا در ویرایش آیتم", "Item update failed") }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const { id } = await params;
    const existing = await db.menuItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: await apiMsg("آیتم یافت نشد", "Item not found") }, { status: 404 });
    }
    await db.menuItem.delete({ where: { id } });
    invalidateMenuCaches();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[menus DELETE]", e);
    return NextResponse.json({ error: await apiMsg("خطا در حذف آیتم", "Failed to delete the item") }, { status: 500 });
  }
}
