import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { seedDefaultMenus } from "@/lib/menu";
import type { MenuDivision } from "@/lib/menu-defaults";
import { apiMsg } from "@/lib/i18n";

/**
 * POST /api/dashboard/menus/reset
 * بازنشانی منوی بخش انتخابی ("academy" | "office" | "all") به پیش‌فرض
 */
export async function POST(req: NextRequest) {
  const user = await requirePermission("setting.manage");
  if (!user) return NextResponse.json({ error: await apiMsg("دسترسی مجاز نیست", "Not authorized") }, { status: 403 });

  let division: MenuDivision | "all" = "all";
  try {
    const body = (await req.json().catch(() => ({}))) as { division?: string };
    if (body.division === "academy" || body.division === "office") {
      division = body.division;
    }
  } catch {
    division = "all";
  }

  try {
    await seedDefaultMenus(true, division);
    revalidateTag("site-menus", { expire: 0 });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, division });
  } catch (e) {
    console.error("[menus RESET]", e);
    return NextResponse.json({ error: await apiMsg("خطا در بازنشانی منو", "Menu reset failed") }, { status: 500 });
  }
}
