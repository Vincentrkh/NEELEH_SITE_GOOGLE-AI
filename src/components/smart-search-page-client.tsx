"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Compass, FileText, Loader2, Newspaper, Search, Sparkles } from "lucide-react";
import { useLang } from "@/components/language-provider";
import type { SmartSearchItem } from "@/app/api/search/route";

const QUICK_TOPICS = {
  fa: [
    { label: "BIM و Revit", q: "revit" },
    { label: "فاز ۲ اتوکد", q: "autocad" },
    { label: "هوش مصنوعی در معماری", q: "هوش مصنوعی" },
    { label: "گرس‌هاپر و راینو", q: "grasshopper" },
    { label: "رندرینگ", q: "render" },
    { label: "اکسل و متره", q: "excel" },
  ],
  en: [
    { label: "BIM & Revit", q: "revit" },
    { label: "Phase-2 CAD", q: "autocad" },
    { label: "AI Workflows", q: "ai" },
    { label: "Grasshopper & Rhino", q: "grasshopper" },
    { label: "Rendering", q: "render" },
    { label: "Excel Takeoff", q: "excel" },
  ],
};

export function SmartSearchPageClient({
  initialQuery,
  initialItems,
}: {
  initialQuery: string;
  initialItems: SmartSearchItem[];
}) {
  const { lang } = useLang();
  const fa = lang === "fa";

  const [query, setQuery] = React.useState(initialQuery);
  const [items, setItems] = React.useState<SmartSearchItem[]>(initialItems);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === initialQuery.trim()) return;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/?q=${encodeURIComponent(trimmed)}&lang=${lang}`,
          { signal: ac.signal },
        );
        if (res.ok) {
          const data = (await res.json()) as { items?: SmartSearchItem[] };
          setItems(data.items ?? []);
        }
      } catch {
        /* aborted */
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, 160);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [query, lang, initialQuery]);

  const courses = items.filter((i) => i.kind === "course");
  const posts = items.filter((i) => i.kind === "post");
  const resources = items.filter((i) => i.kind === "resource" || i.kind === "page");

  return (
    <div className="mx-auto max-w-[1100px] px-5 sm:px-8 py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-[#e41613]" aria-hidden />
          <span>{fa ? "جستجوی هوشمند" : "Smart Search"}</span>
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em] mb-5">
          {fa ? "جستجو در آکادمی نیله" : "Search Neeleh Academy"}
        </h1>

        <form action="/search" method="GET" className="flex gap-2">
          <div className="relative flex-1">
            {loading ? (
              <Loader2
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 size-4 animate-spin text-[#e41613]"
                aria-hidden
              />
            ) : (
              <Search
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 size-4 text-muted-foreground"
                aria-hidden
              />
            )}
            <input
              type="search"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                fa
                  ? "جستجوی دوره، ابزار (Revit, Rhino, AI)، یا مقاله…"
                  : "Search courses, tools (Revit, Rhino, AI), or journal…"
              }
              aria-label={fa ? "عبارت جستجو" : "Search query"}
              className="w-full min-h-[48px] rounded-md border border-border bg-card ps-10 pe-4 text-sm outline-none focus:border-foreground transition-colors"
            />
          </div>
          <button
            type="submit"
            className="min-h-[48px] rounded-md bg-foreground px-5 text-xs font-medium text-background hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {fa ? "جستجو" : "Search"}
          </button>
        </form>

        {/* Smart Topic Quick Picks */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          {QUICK_TOPICS[lang].map((topic) => {
            const active = query.trim().toLowerCase() === topic.q.toLowerCase();
            return (
              <button
                key={topic.label}
                type="button"
                onClick={() => setQuery(active ? "" : topic.q)}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {topic.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-10">
        <ResultGroup
          title={fa ? `دوره‌ها (${courses.length})` : `Courses (${courses.length})`}
          emptyLabel={fa ? "دوره‌ای یافت نشد." : "No matching courses."}
          items={courses}
          actionLabel={fa ? "مشاهده" : "Open"}
          Icon={BookOpen}
        />

        <ResultGroup
          title={fa ? `مقالات (${posts.length})` : `Journal Articles (${posts.length})`}
          emptyLabel={fa ? "مقاله‌ای یافت نشد." : "No matching articles."}
          items={posts}
          actionLabel={fa ? "مطالعه" : "Read"}
          Icon={Newspaper}
        />

        {resources.length > 0 && (
          <ResultGroup
            title={fa ? `منابع و صفحات (${resources.length})` : `Resources & Guides (${resources.length})`}
            emptyLabel=""
            items={resources}
            actionLabel={fa ? "باز کردن" : "Open"}
            Icon={resources[0]?.kind === "resource" ? FileText : Compass}
          />
        )}
      </div>
    </div>
  );
}

function ResultGroup({
  title,
  emptyLabel,
  items,
  actionLabel,
  Icon,
}: {
  title: string;
  emptyLabel: string;
  items: SmartSearchItem[];
  actionLabel: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground mb-3 pb-2 border-b border-border">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <Icon className="size-4 shrink-0 mt-1 text-muted-foreground" aria-hidden />
                <div className="min-w-0">
                  <Link
                    href={item.href}
                    className="text-base font-medium hover:underline underline-offset-4 block"
                  >
                    <bdi>{item.title}</bdi>
                  </Link>
                  {item.subtitle && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={item.href}
                className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                <span>{actionLabel}</span>
                <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
