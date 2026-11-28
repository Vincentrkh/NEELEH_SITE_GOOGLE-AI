import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import {
  getLocationsForDivision,
  PRESET_MENU,
  type MenuDivision,
  type MenuLocation,
  type PublicMenuItem,
} from "@/lib/menu-defaults";

/**
 * مدیریت منوهای دو بخش مجزای سایت (آکادمی نیله و دفتر نیله):
 *
 *   - "header" / "footer"               -> Neeleh Academy (آکادمی نیله)
 *   - "office_header" / "office_footer" -> Neeleh Office  (دفتر نیله)
 *
 * کش سرور با React cache() + unstable_cache(tag: "site-menus") انجام می‌شود
 * تا سرعت بارگذاری روی اینترنت کند حداکثر باشد و در هر ویرایش در پنل مدیریت فوراً پاک شود.
 */

export { PRESET_MENU };
export type { MenuDivision, MenuLocation, PublicMenuItem };

function fallbackMenu(location: MenuLocation): PublicMenuItem[] {
  return PRESET_MENU.filter((m) => m.location === location).map((m, i) => ({
    ...m,
    id: `preset-${location}-${i}`,
  }));
}

const getCachedMenuFromDb = unstable_cache(
  async (location: MenuLocation): Promise<PublicMenuItem[]> => {
    try {
      const rows = await db.menuItem.findMany({
        where: { location, isActive: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      });
      if (rows.length === 0) return fallbackMenu(location);
      return rows as PublicMenuItem[];
    } catch {
      return fallbackMenu(location);
    }
  },
  ["site-menu-by-location"],
  { revalidate: 300, tags: ["site-menus"] },
);

/** آیتم‌های فعال یک جایگاه را به ترتیب برمی‌گرداند (با کش و fallback ایمن). */
export const getMenu = cache(async (location: MenuLocation): Promise<PublicMenuItem[]> => {
  return getCachedMenuFromDb(location);
});

/**
 * منوی پیش‌فرض را به‌صورت غیرمخرب و تفکیک‌شده در دیتابیس می‌نویسد:
 * - وقتی force=false است، هر بخش (academy یا office) فقط اگر خودش هیچ رکوردی نداشته باشد مقداردهی می‌شود؛
 *   بنابراین تنظیمات و منوهای موجود سایت اصلی (neeleh.com) هرگز تغییر نمی‌کنند.
 * - وقتی force=true است، فقط جایگاه‌های بخش انتخابی بازنشانی می‌شوند.
 */
export async function seedDefaultMenus(
  force = false,
  division: MenuDivision | "all" = "all",
): Promise<number> {
  const divisionsToCheck: MenuDivision[] =
    division === "all" ? ["academy", "office"] : [division];

  let inserted = 0;

  for (const div of divisionsToCheck) {
    const locs = getLocationsForDivision(div);
    if (force) {
      await db.menuItem.deleteMany({ where: { location: { in: locs } } });
    } else {
      const existing = await db.menuItem.count({
        where: { location: { in: locs } },
      });
      if (existing > 0) continue;
    }

    const presetRows = PRESET_MENU.filter((m) =>
      locs.includes(m.location),
    );
    if (presetRows.length > 0) {
      await db.menuItem.createMany({ data: presetRows });
      inserted += presetRows.length;
    }
  }

  return inserted;
}
