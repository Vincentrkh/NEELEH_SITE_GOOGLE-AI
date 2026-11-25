import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { seedDefaultMenus } from "@/lib/menu";
import { MenuEditor, type MenuItemRow } from "@/components/menu-editor";
import { dict, getServerLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/**
 * مدیریت منوها — مثل منوهای وردپرس.
 * دو جایگاه: منوی همبرگری اصلی (header) و دسترسی سریع فوتر (footer).
 */
export default async function DashboardMenusPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  if (!user?.permissions.includes("setting.manage")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }
  const t = dict[lang].dashboard;

  // اولین بار: منوی پیش‌فرض (عین وضعیت فعلی سایت) را بنشین
  try {
    await seedDefaultMenus(false);
  } catch {
    // جدول آماده نیست — بی‌خیال، ادیتور خالی رندر می‌شود
  }

  const items = await db.menuItem.findMany({
    orderBy: [{ location: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t.menusEyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {t.menusTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.menusSubtitle}
        </p>
      </div>

      <MenuEditor initialItems={items as MenuItemRow[]} />
    </div>
  );
}
