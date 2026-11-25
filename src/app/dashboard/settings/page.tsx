import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dict, getServerLang } from "@/lib/i18n";
import { SettingsEditor } from "@/components/settings-editor";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  if (!user?.permissions.includes("setting.manage")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }

  const t = dict[lang].dashboard;

  const [settings, logoAssets] = await Promise.all([
    db.setting.findMany({ orderBy: { key: "asc" } }),
    db.fileAsset.findMany({
      where: { mimeType: { startsWith: "image/" } },
      orderBy: { createdAt: "desc" },
      take: 16,
      select: { id: true, filename: true, url: true, mimeType: true },
    }),
  ]);

  const isAdmin = user.roles.includes("ADMIN");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t.settingsEyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {t.settingsTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.settingsSubtitle}
        </p>
      </div>

      <SettingsEditor
        initialSettings={settings}
        initialLogoAssets={logoAssets}
        isAdmin={isAdmin}
      />
    </div>
  );
}
