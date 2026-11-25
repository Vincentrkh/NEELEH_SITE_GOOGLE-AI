import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { seedDefaultMenus } from "@/lib/menu";
import { apiMsg } from "@/lib/i18n";

/**
 * POST /api/dashboard/menus/reset
 * بازنشانی منو به پیش‌فرض (عین منوی فعلی سایت) — همه تغییرات ادمین پاک می‌شود.
 */
export async function POST() {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  try {
    await seedDefaultMenus(true);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[menus RESET]", e);
    return NextResponse.json({ error: await apiMsg("خطا در بازنشانی منو", "Menu reset failed") }, { status: 500 });
  }
}
