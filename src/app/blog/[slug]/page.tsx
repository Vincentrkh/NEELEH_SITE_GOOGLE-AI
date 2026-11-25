import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { localeNumber, localeDate } from "@/lib/format";
import { getServerLang } from "@/lib/i18n";
import { localizedPost, pickName } from "@/lib/content";
import { Clock, ArrowUpRight, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await db.post.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, nameEn: true, bio: true, bioEn: true } },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!post || post.status !== "PUBLISHED") notFound();

  const lang = await getServerLang();
  const lp = localizedPost(lang, post);

  const categories = post.categories.map((pc) => pc.category);
  const tags = post.tags.map((pt) => pt.tag);

  return (
    <main className="min-h-[100svh]">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur z-30">
        <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 py-4 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2.5 min-h-[44px]">
            <span className="grid size-7 place-items-center rounded-md bg-foreground text-background font-bold text-sm">
              {lang === "fa" ? "ن" : "N"}
            </span>
            <span className="text-sm font-medium">{lang === "fa" ? "بلاگ نیله" : "Neeleh Blog"}</span>
          </Link>
          <Link
            href="/blog"
            className="flex min-h-[44px] items-center gap-1 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
          >
            {lang === "fa" ? "همه مقالات" : "All posts"}
            <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
          </Link>
        </div>
      </header>

      <article>
        {/* Cover */}
        {post.coverUrl && (
          <div className="h-[40vh] sm:h-[50vh] overflow-hidden bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverUrl}
              alt={lp.title}
              className="size-full object-cover"
            />
          </div>
        )}

        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-12 sm:py-16">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/blog?category=${c.slug}`}
                  className="text-[10px] uppercase tracking-[0.14em] border border-border px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {pickName(lang, c.name, c.nameEn)}
                </Link>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-tight mb-6">
            <bdi>{lp.title}</bdi>
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
            <span>
              {lang === "fa"
                ? <>نوشته: <bdi>{post.author?.name ?? ""}</bdi></>
                : <>By <bdi>{post.author?.nameEn || post.author?.name || ""}</bdi></>}
            </span>
            {post.publishedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {localeDate(lang, post.publishedAt)}
              </span>
            )}
            {post.readingMins > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {localeNumber(lang, post.readingMins)} {lang === "fa" ? "دقیقه مطالعه" : "min read"}
              </span>
            )}
          </div>

          {/* Excerpt */}
          {lp.excerpt && (
            <p className="text-lg sm:text-xl leading-relaxed text-muted-foreground mb-8 font-medium">
              {lp.excerpt}
            </p>
          )}

          {/* Content — simple Markdown-like rendering (paragraphs) */}
          <div className="prose prose-sm sm:prose-base max-w-none">
            {lp.content.split("\n\n").map((paragraph, i) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;

              // heading
              if (trimmed.startsWith("### ")) {
                return <h3 key={i} className="text-xl font-medium mt-8 mb-3">{trimmed.slice(4)}</h3>;
              }
              if (trimmed.startsWith("## ")) {
                return <h2 key={i} className="text-2xl font-medium mt-10 mb-4">{trimmed.slice(3)}</h2>;
              }
              if (trimmed.startsWith("# ")) {
                return <h2 key={i} className="text-3xl font-medium mt-10 mb-4">{trimmed.slice(2)}</h2>;
              }

              // list
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const items = trimmed.split("\n").filter((l) => l.startsWith("- ") || l.startsWith("* "));
                return (
                  <ul key={i} className="my-4 space-y-2 ps-5 list-disc">
                    {items.map((it, j) => (
                      <li key={j} className="text-base leading-9">{it.slice(2)}</li>
                    ))}
                  </ul>
                );
              }

              // quote
              if (trimmed.startsWith("> ")) {
                return (
                  <blockquote key={i} className="my-6 border-e-4 border-foreground/30 ps-4 py-2 italic text-muted-foreground">
                    {trimmed.slice(2)}
                  </blockquote>
                );
              }

              return <p key={i} className="text-base leading-9 mb-4">{trimmed}</p>;
            })}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-10 pt-8 border-t border-border flex flex-wrap gap-2">
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground me-2">
                {lang === "fa" ? "برچسب‌ها:" : "Tags:"}
              </span>
              {tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/blog?tag=${t.slug}`}
                  className="text-xs border border-border px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  #{pickName(lang, t.name, t.nameEn)}
                </Link>
              ))}
            </div>
          )}

          {/* Author bio */}
          {post.author?.bio && (
            <div className="mt-10 p-5 rounded-lg border border-border bg-secondary/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="grid size-10 place-items-center rounded-full bg-foreground text-background font-bold uppercase">
                  {(lang === "en" ? (post.author.nameEn || post.author.name) : post.author.name).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium"><bdi>{lang === "en" ? (post.author.nameEn || post.author.name) : post.author.name}</bdi></h3>
                  <div className="text-xs text-muted-foreground">{lang === "fa" ? "نویسنده" : "Author"}</div>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {lang === "en" ? (post.author.bioEn || post.author.bio) : post.author.bio}
              </p>
            </div>
          )}
        </div>
      </article>
    </main>
  );
}
