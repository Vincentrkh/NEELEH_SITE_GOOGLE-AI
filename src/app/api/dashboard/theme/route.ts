import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import { sanitizeThemeCustomCss } from "@/lib/security";

/**
 * GET /api/dashboard/theme — تنظیمات تم فعلی
 * PUT /api/dashboard/theme — به‌روزرسانی تنظیمات تم
 */

const COLOR_FIELDS = [
  "backgroundColor",
  "foregroundColor",
  "primaryColor",
  "accentColor",
  "mutedColor",
] as const;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const RADIUS_RE = /^(?:0|\d+(?:\.\d+)?(?:px|rem|em|%))$/;
const ALLOWED_FONTS = new Set([
  "Estedad Var",
  "Vazirmatn Var",
  "Sultan K Medium",
  "var(--font-geist-sans)",
  "var(--font-geist-mono)",
  "var(--font-serif-display)",
]);

export async function GET() {
  const user = await requirePermission("theme.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const theme = await db.themeSetting.findFirst({
    where: { isActive: true },
  });
  if (!theme) {
    return NextResponse.json({ error: await apiMsg("تم فعال یافت نشد", "Active theme not found") }, { status: 404 });
  }
  return NextResponse.json({ theme });
}

type UpdateBody = {
  isActive?: boolean;
  backgroundColor?: string;
  foregroundColor?: string;
  primaryColor?: string;
  accentColor?: string;
  mutedColor?: string;
  fontHeading?: string;
  fontBody?: string;
  radius?: string;
  mode?: string;
  customCss?: string;
};

export async function PUT(req: NextRequest) {
  const user = await requirePermission("theme.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as UpdateBody;

    const theme = await db.themeSetting.findFirst({ where: { isActive: true } });
    if (!theme) return NextResponse.json({ error: await apiMsg("تم یافت نشد", "Theme not found") }, { status: 404 });

    const data: Record<string, unknown> = {};

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }

    for (const f of COLOR_FIELDS) {
      const val = body[f];
      if (val !== undefined) {
        const clean = String(val).trim();
        if (!HEX_COLOR_RE.test(clean)) {
          return NextResponse.json(
            { error: await apiMsg("کد رنگ نامعتبر است", "Invalid hex color") },
            { status: 400 }
          );
        }
        data[f] = clean;
      }
    }

    if (body.fontHeading !== undefined) {
      const f = String(body.fontHeading).trim();
      if (!ALLOWED_FONTS.has(f)) {
        return NextResponse.json({ error: await apiMsg("فونت عنوان نامعتبر است", "Invalid heading font") }, { status: 400 });
      }
      data.fontHeading = f;
    }

    if (body.fontBody !== undefined) {
      const f = String(body.fontBody).trim();
      if (!ALLOWED_FONTS.has(f)) {
        return NextResponse.json({ error: await apiMsg("فونت متن نامعتبر است", "Invalid body font") }, { status: 400 });
      }
      data.fontBody = f;
    }

    if (body.radius !== undefined) {
      const r = String(body.radius).trim();
      if (!RADIUS_RE.test(r)) {
        return NextResponse.json({ error: await apiMsg("شعاع گوشه نامعتبر است", "Invalid border radius") }, { status: 400 });
      }
      data.radius = r;
    }

    if (body.mode !== undefined) {
      const m = String(body.mode);
      if (!["LIGHT", "DARK", "AUTO"].includes(m)) {
        return NextResponse.json({ error: await apiMsg("حالت تم نامعتبر است", "Invalid theme mode") }, { status: 400 });
      }
      data.mode = m;
    }

    if (body.customCss !== undefined) {
      data.customCss = sanitizeThemeCustomCss(String(body.customCss));
    }

    const updated = await db.themeSetting.update({
      where: { id: theme.id },
      data,
    });

    revalidateTag("site-theme", { expire: 0 });
    revalidatePath("/", "layout");
    return NextResponse.json({ theme: updated });
  } catch (e) {
    console.error("theme update error", e);
    return NextResponse.json({ error: await apiMsg("خطا در به‌روزرسانی تم", "Theme update failed") }, { status: 500 });
  }
}
