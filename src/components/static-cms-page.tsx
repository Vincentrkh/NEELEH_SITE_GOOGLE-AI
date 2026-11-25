import { db } from "@/lib/db";
import { getServerLang } from "@/lib/i18n";
import { localizedStaticPage } from "@/lib/content";
import { PublicShell } from "@/components/public-shell";

export async function StaticCmsPage({
  slug,
  fallbackTitleFa,
  fallbackTitleEn,
  fallbackBodyFa,
  fallbackBodyEn,
  extra,
}: {
  slug: string;
  fallbackTitleFa: string;
  fallbackTitleEn: string;
  fallbackBodyFa: string[];
  fallbackBodyEn: string[];
  extra?: React.ReactNode;
}) {
  const lang = await getServerLang();
  const fa = lang === "fa";

  const page = await db.staticPage.findUnique({ where: { slug } }).catch(() => null);
  const lp = page && page.status === "PUBLISHED" ? localizedStaticPage(lang, page) : null;

  const title = lp ? lp.title : fa ? fallbackTitleFa : fallbackTitleEn;
  const paragraphs = lp
    ? lp.content
        .split("\n\n")
        .map((p) => p.trim())
        .filter(Boolean)
    : fa
      ? fallbackBodyFa
      : fallbackBodyEn;

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-tight mb-4">
          <bdi>{title}</bdi>
        </h1>
        {lp?.excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">{lp.excerpt}</p>
        )}
        <div className="space-y-4">
          {paragraphs.map((t, i) => {
            if (t.startsWith("## ")) {
              return (
                <h2 key={i} className="text-xl font-medium mt-8 mb-3">
                  {t.slice(3)}
                </h2>
              );
            }
            if (t.startsWith("# ")) {
              return (
                <h2 key={i} className="text-2xl font-medium mt-8 mb-4">
                  {t.slice(2)}
                </h2>
              );
            }
            if (t.startsWith("- ") || t.startsWith("* ")) {
              const items = t.split("\n").filter((l) => l.startsWith("- ") || l.startsWith("* "));
              return (
                <ul key={i} className="list-disc ps-5 my-4 space-y-1.5">
                  {items.map((it, j) => (
                    <li key={j} className="text-base leading-relaxed">
                      {it.slice(2)}
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={i} className="text-base leading-8 text-foreground/90">
                {t}
              </p>
            );
          })}
        </div>
        {extra && <div className="mt-10 pt-10 border-t border-border">{extra}</div>}
      </div>
    </PublicShell>
  );
}
