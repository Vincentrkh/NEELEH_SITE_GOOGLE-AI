import { db } from "@/lib/db";
import { PRESET_MENU, type MenuLocation, type PublicMenuItem } from "@/lib/menu-defaults";

/**
 * مدیریت منوها — مثل منوهای وردپرس.
 *
 * دو جایگاه (location):
 *   - "header": منوی همبرگری امضادار صفحه اصلی (بلوک‌های پلکانی)
 *   - "footer": ستون «دسترسی سریع» فوتر
 *
 * اگر دیتابیس خالی بود یا در دسترس نبود، PRESET_MENU (منوی پیش‌فرض برابر
 * وضعیت فعلی سایت) استفاده می‌شود — یعنی ظاهر سایت هرگز خراب نمی‌شود.
 */

export { PRESET_MENU };
export type { MenuLocation, PublicMenuItem };

/** آیتم‌های فعال یک جایگاه را به ترتیب برمی‌گرداند (با fallback پیش‌فرض). */
export async function getMenu(location: MenuLocation): Promise<PublicMenuItem[]> {
  const fallback = () =>
    PRESET_MENU.filter((m) => m.location === location).map((m, i) => ({
      ...m,
      id: `preset-${location}-${i}`,
    }));
  try {
    const rows = await db.menuItem.findMany({
      where: { location, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    if (rows.length === 0) return fallback();
    return rows as PublicMenuItem[];
  } catch {
    return fallback();
  }
}

/**
 * منوی پیش‌فرض را در دیتابیس می‌نویسد (فقط اگر جدول خالی باشد؛
 * یا با force=true همه را پاک و بازنویسی می‌کند — برای «بازنشانی»).
 */
export async function seedDefaultMenus(force = false): Promise<number> {
  const existing = await db.menuItem.count();
  if (existing > 0 && !force) return existing;

  if (force) await db.menuItem.deleteMany({});

  await db.menuItem.createMany({ data: PRESET_MENU });
  return PRESET_MENU.length;
}
