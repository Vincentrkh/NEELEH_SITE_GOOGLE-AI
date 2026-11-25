import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import type { IllustrationStyle } from "@/lib/illustration/style";
import { apiMsg } from "@/lib/i18n";

/**
 * GET /api/dashboard/illustration-style
 * استایل تصویر فعال را برمی‌گرداند. نیاز به مجوز setting.manage.
 */
export async function GET() {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  let style = await db.illustrationStyle.findFirst({ where: { isActive: true } });
  if (!style) {
    // ساخت استایل پیش‌فرض
    style = await db.illustrationStyle.create({ data: { isActive: true } });
  }
  return NextResponse.json({ style });
}

/**
 * PUT /api/dashboard/illustration-style
 * به‌روزرسانی استایل تصویر فعال.
 */
export async function PUT(req: NextRequest) {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    const body = (await req.json()) as Partial<IllustrationStyle>;
    const colorRe = /^#[0-9a-fA-F]{3,8}$/;

    // اعتبارسنجی رنگ‌ها
    const colorFields = ["bgColor", "lineColor", "accentColor", "waterColor", "vegetationColor", "fillColor"];
    for (const f of colorFields) {
      if (body[f as keyof IllustrationStyle] !== undefined) {
        if (!colorRe.test(body[f as keyof IllustrationStyle] as string)) {
          return NextResponse.json({ error: await apiMsg(`رنگ ${f} نامعتبر است`, `Invalid color: ${f}`) }, { status: 400 });
        }
      }
    }

    // اعتبارسنجی اعداد
    const numFields = ["thinLineWidth", "thickLineWidth", "outlineWidth", "edgeFadeOpacity", "centerOpacity", "fadeRadius", "animationSpeed"];
    for (const f of numFields) {
      if (body[f as keyof IllustrationStyle] !== undefined) {
        const val = Number(body[f as keyof IllustrationStyle]);
        if (isNaN(val) || val < 0) {
          return NextResponse.json({ error: await apiMsg(`${f} باید عدد مثبت باشد`, `${f} must be a positive number`) }, { status: 400 });
        }
      }
    }

    // پیدا کردن یا ساخت رکورد فعال
    let style = await db.illustrationStyle.findFirst({ where: { isActive: true } });
    if (!style) {
      style = await db.illustrationStyle.create({ data: { isActive: true } });
    }

    const data: Record<string, unknown> = {};
    for (const f of [...colorFields, ...numFields]) {
      if (body[f as keyof IllustrationStyle] !== undefined) {
        data[f] = body[f as keyof IllustrationStyle];
      }
    }
    // booleans
    for (const f of ["enableWave", "enableSway", "enableDraw", "enablePulse"]) {
      if (body[f as keyof IllustrationStyle] !== undefined) {
        data[f] = Boolean(body[f as keyof IllustrationStyle]);
      }
    }

    const updated = await db.illustrationStyle.update({ where: { id: style.id }, data });
    return NextResponse.json({ style: updated });
  } catch (e) {
    console.error("illustration style update error", e);
    return NextResponse.json({ error: await apiMsg("خطا در به‌روزرسانی", "Update failed") }, { status: 500 });
  }
}
