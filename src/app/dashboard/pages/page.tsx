import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { localeNumber, localeDate, pageStatusLabel } from "@/lib/format";
import { dict, getServerLang } from "@/lib/i18n";
import { Plus, ExternalLink, FileEdit, Eye, EyeOff } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
};

export default async function DashboardPagesPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const isAdmin = !!user?.roles.includes("ADMIN");
  if (!isAdmin && !user?.permissions.includes("page.manage")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }
  const canCreate = isAdmin || user?.permissions.includes("page.manage");
  const t = dict[lang].dashboard;

  const pages = await db.staticPage.findMany({
    orderBy: [{ showInMenu: "desc" }, { sortOrder: "asc" }],
    include: { _count: { select: { children: true } } },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {t.pagesEyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
            {t.pagesTitle}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.pagesSummary.replace("{count}", localeNumber(lang, pages.length))}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/pages/new"
            className="flex min-h-[44px] items-center gap-2 bg-foreground text-background rounded-md px-5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            {t.pagesNew}
          </Link>
        )}
      </div>

      {pages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <FileEdit className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {t.pagesEmpty}
          </p>
          {canCreate && (
            <Link
              href="/dashboard/pages/new"
              className="inline-flex min-h-[44px] items-center gap-2 bg-foreground text-background rounded-md px-5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              {t.pagesCreateFirst}
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="hidden md:grid grid-cols-12 gap-3 border-b border-border bg-secondary/40 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <div className="col-span-5">{t.pagesColTitle}</div>
            <div className="col-span-2">{t.pagesColSlug}</div>
            <div className="col-span-2 text-center">{t.menusColVisible}</div>
            <div className="col-span-2">{t.pagesColDate}</div>
            <div className="col-span-1 text-center">{t.pagesColStatus}</div>
          </div>
          <ul className="divide-y divide-border">
            {pages.map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-12 gap-3 items-center px-4 py-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="col-span-12 md:col-span-5 min-w-0">
                  <Link
                    href={`/dashboard/pages/${p.id}`}
                    className="flex min-h-[44px] items-center"
                  >
                    <span className="font-medium truncate hover:text-foreground transition-colors">
                      <bdi>{lang === "en" ? p.titleEn || p.title : p.title}</bdi>
                    </span>
                  </Link>
                </div>
                <div className="hidden md:block md:col-span-2 text-xs text-muted-foreground truncate" dir="ltr">
                  <bdi>{p.slug}</bdi>
                </div>
                <div className="hidden md:flex md:col-span-2 justify-center">
                  {p.showInMenu ? (
                    <Eye className="size-4 text-emerald-600" />
                  ) : (
                    <EyeOff className="size-4 text-muted-foreground" />
                  )}
                </div>
                <div className="hidden md:block md:col-span-2 text-xs text-muted-foreground">
                  {localeDate(lang, p.updatedAt)}
                </div>
                <div className="col-span-12 md:col-span-1 flex items-center justify-center md:justify-end gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${STATUS_BADGE[p.status]}`}>
                    {pageStatusLabel(lang, p.status)}
                  </span>
                  {p.status === "PUBLISHED" && (
                    <a
                      href={`/page/${p.slug}`}
                      target="_blank"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={t.pagesActionView}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
