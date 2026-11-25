import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { localeNumber, localeDate, postStatusLabel } from "@/lib/format";
import { localizedPost } from "@/lib/content";
import { dict, getServerLang } from "@/lib/i18n";
import { Plus, ExternalLink, Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-zinc-200 text-zinc-600",
};

export default async function DashboardPostsPage() {
  const user = await getCurrentUser();
  const lang = await getServerLang();
  const isAdmin = !!user?.roles.includes("ADMIN");
  if (!isAdmin && !user?.permissions.includes("post.view")) {
    return <div className="p-8 text-center text-muted-foreground">{lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}</div>;
  }
  const canCreate = isAdmin || user?.permissions.includes("post.create");
  const t = dict[lang].dashboard;

  const [posts, publishedCount, draftCount] = await Promise.all([
    db.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, nameEn: true } },
        _count: { select: { comments: true } },
      },
    }),
    db.post.count({ where: { status: "PUBLISHED" } }),
    db.post.count({ where: { status: "DRAFT" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {t.postsEyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
            {t.postsTitle}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.postsSummary
              .replace("{count}", localeNumber(lang, posts.length))
              .replace("{published}", localeNumber(lang, publishedCount))}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/posts/new"
            className="flex min-h-[44px] items-center gap-2 bg-foreground text-background rounded-md px-5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            {t.postsNew}
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Newspaper className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {t.postsEmpty}
          </p>
          {canCreate && (
            <Link
              href="/dashboard/posts/new"
              className="inline-flex min-h-[44px] items-center gap-2 bg-foreground text-background rounded-md px-5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" />
              {t.postsCreateFirst}
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="hidden md:grid grid-cols-12 gap-3 border-b border-border bg-secondary/40 px-4 py-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <div className="col-span-5">{t.postsColTitle}</div>
            <div className="col-span-2">{lang === "fa" ? "نویسنده" : "Author"}</div>
            <div className="col-span-2">{t.postsColDate}</div>
            <div className="col-span-1 text-center">{lang === "fa" ? "نظرات" : "Comments"}</div>
            <div className="col-span-2 text-center">{t.postsColStatus}</div>
          </div>
          <ul className="divide-y divide-border">
            {posts.map((p) => {
              const lp = localizedPost(lang, p);
              return (
              <li
                key={p.id}
                className="grid grid-cols-12 gap-3 items-center px-4 py-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="col-span-12 md:col-span-5 min-w-0">
                  <Link
                    href={`/dashboard/posts/${p.id}`}
                    className="flex min-h-[44px] items-center"
                  >
                    <span className="font-medium truncate hover:text-foreground transition-colors">
                      <bdi>{lp.title}</bdi>
                    </span>
                  </Link>
                  {p.featured && (
                    <span className="text-[10px] text-amber-700 ms-2">{lang === "fa" ? "★ برجسته" : "★ Featured"}</span>
                  )}
                </div>
                <div className="hidden md:block md:col-span-2 text-sm text-muted-foreground truncate">
                  <bdi>{lang === "en" ? (p.author?.nameEn || p.author?.name) : p.author?.name ?? "—"}</bdi>
                </div>
                <div className="hidden md:block md:col-span-2 text-xs text-muted-foreground">
                  {localeDate(lang, p.publishedAt ?? p.createdAt)}
                </div>
                <div className="hidden md:block md:col-span-1 text-center text-sm tabular-nums">
                  {localeNumber(lang, p._count.comments)}
                </div>
                <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${STATUS_BADGE[p.status]}`}>
                    {postStatusLabel(lang, p.status)}
                  </span>
                  {p.status === "PUBLISHED" && (
                    <a
                      href={`/blog/${p.slug}`}
                      target="_blank"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={t.postsActionView}
                    >
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
