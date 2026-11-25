import Link from "next/link";
import { db } from "@/lib/db";
import { localeDate, localeNumber } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { localizedPost } from "@/lib/content";
import { BlockReveal } from "@/components/block-reveal";
import { ArrowUpRight, Clock, Newspaper } from "lucide-react";

export const dynamic = "force-dynamic";

export async function LatestPostsSection() {
  const lang = await getServerLang();
  const fa = lang === "fa";

  let posts;
  try {
    posts = await db.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        titleEn: true,
        excerpt: true,
        excerptEn: true,
        content: true,
        contentEn: true,
        coverUrl: true,
        readingMins: true,
        publishedAt: true,
        author: { select: { name: true, nameEn: true } },
      },
    });
  } catch {
    return null;
  }

  if (posts.length === 0) return null;

  return (
    <section className="border-t border-border bg-secondary/15">
      <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        <BlockReveal className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="font-mono tabular-nums">{fa ? "۰۶" : "06"}</span>
              <span aria-hidden>·</span>
              <span>{fa ? "مجله و یادداشت‌ها" : "Architecture Journal"}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em]">
              {fa ? "یادداشت‌های معماری و ابزار" : "Notes on practice & computation"}
            </h2>
          </div>
          <Link
            href="/blog"
            className="group flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            <span>{fa ? "همه مقالات" : "All articles"}</span>
            <ArrowUpRight className="size-4 rtl:-scale-x-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
          </Link>
        </BlockReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((p, idx) => {
            const lp = localizedPost(lang, p);
            const authorName = fa ? (p.author?.name ?? "") : (p.author?.nameEn || p.author?.name || "");
            return (
              <BlockReveal key={p.id} delay={idx * 0.08}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group flex h-full flex-col rounded-lg border border-border bg-card overflow-hidden hover:border-foreground/35 transition-colors"
                >
                <div className="h-44 overflow-hidden bg-secondary/35 flex items-center justify-center relative border-b border-border">
                  {p.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.coverUrl}
                      alt={lp.title}
                      referrerPolicy="no-referrer"
                      className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <Newspaper className="size-8 text-muted-foreground/60" aria-hidden />
                  )}
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-medium leading-snug mb-2 group-hover:text-foreground transition-colors line-clamp-2">
                      <bdi>{lp.title}</bdi>
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                      {lp.excerpt}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-3 border-t border-border">
                    {authorName && (
                      <>
                        <span>
                          <bdi>{authorName}</bdi>
                        </span>
                        <span aria-hidden>·</span>
                      </>
                    )}
                    <span className="tabular-nums">{localeDate(lang, p.publishedAt)}</span>
                    {p.readingMins > 0 && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Clock className="size-3" aria-hidden />
                          {localeNumber(lang, p.readingMins)} {fa ? "دقیقه" : "min read"}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                </Link>
              </BlockReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
