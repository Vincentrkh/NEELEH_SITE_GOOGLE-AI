import Link from "next/link";
import { db } from "@/lib/db";
import { localeNumber, localeDate, POST_STATUS_LABEL } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { localizedPost, pickName } from "@/lib/content";
import { Clock, ArrowUpRight, Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string }>;
}) {
  const lang = await getServerLang();
  const sp = await searchParams;
  const activeCategory = sp.category?.trim() || "";
  const activeTag = sp.tag?.trim() || "";

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (activeCategory) {
    where.categories = { some: { category: { slug: activeCategory } } };
  }
  if (activeTag) {
    where.tags = { some: { tag: { slug: activeTag } } };
  }

  const [posts, categories] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      include: {
        author: { select: { name: true, nameEn: true } },
        categories: { include: { category: true } },
        _count: { select: { comments: { where: { status: "APPROVED" } } } },
      },
    }),
    db.category.findMany({
      include: { _count: { select: { posts: { where: { post: { status: "PUBLISHED" } } } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const isFiltered = Boolean(activeCategory || activeTag);
  const featuredPosts = isFiltered ? [] : posts.filter((p) => p.featured);
  const regularPosts = isFiltered ? posts : posts.filter((p) => !p.featured);

  return (
    <main className="min-h-[100svh]">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur z-30">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 min-h-[44px]">
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-background font-bold text-sm">
              {lang === "fa" ? "ن" : "N"}
            </span>
            <span className="text-sm font-medium">{lang === "fa" ? "آکادمی نیله" : "Neeleh Academy"}</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/courses"
              className="flex min-h-[44px] items-center px-3 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
            >
              {lang === "fa" ? "دوره‌ها" : "Courses"}
            </Link>
            <Link
              href="/blog"
              className="flex min-h-[44px] items-center px-3 text-xs uppercase tracking-[0.14em] text-foreground transition-colors"
            >
              {lang === "fa" ? "بلاگ" : "Blog"}
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
            [{lang === "fa" ? " بلاگ آکادمی نیله " : " Neeleh Academy blog "}]
          </p>
          <h1 className="text-4xl sm:text-6xl font-medium tracking-[-0.04em] leading-[0.95]">
            {lang === "fa" ? "مقالات و" : "Articles &"}
            <br />
            {lang === "fa" ? "یادداشت‌های معماری" : "architecture notes"}
          </h1>
          <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-xl">
            {lang === "fa"
              ? "تحلیل، آموزش و تجربه‌های واقعی از دنیای معماری محاسباتی، BIM و هوش مصنوعی در طراحی."
              : "Analysis, teaching and real-world experience from computational architecture, BIM and AI in design."}
          </p>
        </div>

        {/* Categories strip */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/blog"
              className={`flex min-h-[44px] items-center px-4 text-xs uppercase tracking-[0.12em] border rounded-md transition-colors ${
                !activeCategory && !activeTag
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {lang === "fa" ? "همه" : "All"}
            </Link>
            {categories.map((c) => {
              const active = activeCategory === c.slug;
              return (
                <Link
                  key={c.id}
                  href={active ? "/blog" : `/blog?category=${c.slug}`}
                  className={`flex min-h-[44px] items-center px-4 text-xs uppercase tracking-[0.12em] border rounded-md transition-colors ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  {pickName(lang, c.name, c.nameEn)}
                  <span className="ms-1.5 text-[10px] opacity-60">
                    {localeNumber(lang, c._count.posts)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Featured posts */}
        {featuredPosts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
              {lang === "fa" ? "برجسته" : "Featured"}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {featuredPosts.map((p) => {
                const lp = localizedPost(lang, p);
                return (
                  <Link
                    key={p.id}
                    href={`/blog/${p.slug}`}
                    className="group rounded-lg border border-border bg-card overflow-hidden hover:border-foreground/30 transition-colors"
                  >
                    {p.coverUrl && (
                      <div className="h-48 overflow-hidden bg-secondary/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.coverUrl}
                          alt={lp.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-lg font-medium leading-snug mb-2 group-hover:text-foreground transition-colors line-clamp-2">
                        <bdi>{lp.title}</bdi>
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                        {lp.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span><bdi>{lang === "en" ? (p.author?.nameEn || p.author?.name) : p.author?.name}</bdi></span>
                        <span>•</span>
                        <span>{localeDate(lang, p.publishedAt)}</span>
                        {p.readingMins > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {localeNumber(lang, p.readingMins)} {lang === "fa" ? "دقیقه" : "min"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* All posts */}
        <section>
          <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">
            {lang === "fa" ? "همه مقالات" : "All posts"}
          </h2>
          {regularPosts.length === 0 && posts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <Newspaper className="size-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {lang === "fa" ? "هنوز مقاله‌ای منتشر نشده است." : "No posts have been published yet."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(regularPosts.length > 0 ? regularPosts : posts).map((p) => {
                const lp = localizedPost(lang, p);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="group grid grid-cols-12 gap-4 items-center py-5 hover:bg-secondary/20 -mx-2 px-2 rounded-md transition-colors min-h-[88px]"
                    >
                      <div className="col-span-12 md:col-span-7 min-w-0">
                        <h3 className="text-lg font-medium leading-snug group-hover:text-foreground transition-colors line-clamp-2">
                          <bdi>{lp.title}</bdi>
                        </h3>
                        {lp.excerpt && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                            {lp.excerpt}
                          </p>
                        )}
                      </div>
                      <div className="col-span-6 md:col-span-3 text-xs text-muted-foreground">
                        <div><bdi>{lang === "en" ? (p.author?.nameEn || p.author?.name) : p.author?.name}</bdi></div>
                        <div>{localeDate(lang, p.publishedAt)}</div>
                      </div>
                      <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                        {p.readingMins > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {localeNumber(lang, p.readingMins)} {lang === "fa" ? "دقیقه" : "min"}
                          </span>
                        )}
                        <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
