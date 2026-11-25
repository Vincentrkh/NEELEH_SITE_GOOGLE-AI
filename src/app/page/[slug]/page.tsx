import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getServerLang } from "@/lib/i18n";
import { localizedStaticPage } from "@/lib/content";
import { ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaticPageView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await db.staticPage.findUnique({ where: { slug } });
  if (!page || page.status !== "PUBLISHED") notFound();

  const lang = await getServerLang();
  const lp = localizedStaticPage(lang, page);

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
          <Link
            href="/"
            className="flex min-h-[44px] items-center gap-1 text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground transition-colors"
          >
            {lang === "fa" ? "خانه" : "Home"}
            <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-tight mb-4">
          <bdi>{lp.title}</bdi>
        </h1>
        {lp.excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            {lp.excerpt}
          </p>
        )}
        <div className="prose prose-sm sm:prose-base max-w-none">
          {lp.content.split("\n\n").map((p, i) => {
            const t = p.trim();
            if (!t) return null;
            if (t.startsWith("## ")) return <h2 key={i} className="text-xl font-medium mt-8 mb-3">{t.slice(3)}</h2>;
            if (t.startsWith("# ")) return <h2 key={i} className="text-2xl font-medium mt-8 mb-4">{t.slice(2)}</h2>;
            if (t.startsWith("> ")) return <blockquote key={i} className="border-e-4 border-foreground/30 ps-4 italic text-muted-foreground my-4">{t.slice(2)}</blockquote>;
            if (t.startsWith("- ") || t.startsWith("* ")) {
              const items = t.split("\n").filter((l) => l.startsWith("- ") || l.startsWith("* "));
              return <ul key={i} className="list-disc ps-5 my-4 space-y-1">{items.map((it, j) => <li key={j} className="text-base leading-8">{it.slice(2)}</li>)}</ul>;
            }
            return <p key={i} className="text-base leading-9 mb-4">{t}</p>;
          })}
        </div>
      </article>
    </main>
  );
}
