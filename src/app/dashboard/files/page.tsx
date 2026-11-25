import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FilesManager } from "@/components/files-manager";
import { localeNumber, localeFileSize } from "@/lib/format";
import { dict, getServerLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardFilesPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const isAdmin = !!user?.roles.includes("ADMIN");
  if (!isAdmin && !user?.permissions.includes("file.upload")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }
  const canDelete = isAdmin || !!user?.permissions.includes("file.delete");
  const t = dict[lang].dashboard;

  const files = await db.fileAsset.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      uploader: { select: { name: true } },
      _count: { select: { resources: true } },
    },
  });

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {t.filesEyebrow}
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
          {t.filesTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.filesSummary
            .replace("{count}", localeNumber(lang, files.length))
            .replace("{size}", localeFileSize(lang, totalSize))}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-medium tabular-nums">{localeNumber(lang, files.length)}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{lang === "en" ? "Uploaded files" : "فایل آپلودشده"}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-medium tabular-nums">
            {localeNumber(lang, (totalSize / 1024 / 1024).toFixed(1))}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{lang === "en" ? "Total megabytes" : "مگابایت کل"}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-medium tabular-nums">
            {localeNumber(lang, files.filter((f) => f._count.resources > 0).length)}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{lang === "en" ? "Files in use" : "فایل در حال استفاده"}</div>
        </div>
      </div>

      <FilesManager
        initialFiles={files.map((f) => ({
          id: f.id,
          filename: f.filename,
          storedName: f.storedName,
          mimeType: f.mimeType,
          size: f.size,
          url: f.url,
          createdAt: f.createdAt.toISOString(),
          uploaderName: f.uploader?.name ?? null,
          usedCount: f._count.resources,
        }))}
        canDelete={canDelete}
      />
    </div>
  );
}
