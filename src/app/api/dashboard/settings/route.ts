import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { apiMsg } from "@/lib/i18n";
import { sanitizeLogoUrl, sanitizeSvgMarkup } from "@/lib/brand-logo";

/**
 * GET /api/dashboard/settings — همه تنظیمات key-value
 * PUT /api/dashboard/settings — به‌روزرسانی چند کلید با هم
 *   body: { settings: [{ key, value, label? }] }
 */

export async function GET() {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  const settings = await db.setting.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json({ settings });
}

type UpdateItem = { key: string; value: string; label?: string; type?: string };

export async function PUT(req: NextRequest) {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as { settings: UpdateItem[] };
    if (!Array.isArray(body.settings)) {
      return NextResponse.json({ error: await apiMsg("فرمت نامعتبر", "Invalid format") }, { status: 400 });
    }

    // upsert همه کلیدها
    for (const s of body.settings) {
      if (!s.key) continue;
      let val = String(s.value ?? "");
      if (s.key === "brand.logoSvg") {
        val = val.trim() ? sanitizeSvgMarkup(val) : "";
      } else if (s.key === "brand.logoUrl") {
        val = sanitizeLogoUrl(val);
      }
      await db.setting.upsert({
        where: { key: s.key },
        update: {
          value: val,
          ...(s.label !== undefined ? { label: s.label } : {}),
          ...(s.type !== undefined ? { type: s.type } : {}),
        },
        create: {
          key: s.key,
          value: val,
          label: s.label ?? null,
          type: s.type ?? "text",
        },
      });
    }

    revalidateTag("site-settings", { expire: 0 });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("settings update error", e);
    return NextResponse.json({ error: await apiMsg("خطا در به‌روزرسانی", "Update failed") }, { status: 500 });
  }
}
