"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Compass, FileText, Loader2, Newspaper, Search, Sparkles, X } from "lucide-react";
import { useLang } from "@/components/language-provider";
import type { SmartSearchItem } from "@/app/api/search/route";

const OPEN_SEARCH_EVENT = "neeleh-open-smart-search";

export function dispatchOpenSmartSearch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
  }
}

const SMART_TOPICS = {
  fa: ["BIM / رویت", "فاز ۲ اتوکد", "هوش مصنوعی", "گرس‌هاپر", "رندرینگ", "اکسل و متره"],
  en: ["BIM / Revit", "Phase-2 CAD", "AI Workflows", "Grasshopper", "Rendering", "Excel Takeoff"],
};

const TOPIC_QUERY_MAP: Record<string, string> = {
  "BIM / رویت": "revit",
  "فاز ۲ اتوکد": "autocad",
  "هوش مصنوعی": "هوش مصنوعی",
  "گرس‌هاپر": "grasshopper",
  "رندرینگ": "render",
  "اکسل و متره": "excel",
  "BIM / Revit": "revit",
  "Phase-2 CAD": "autocad",
  "AI Workflows": "ai",
  "Grasshopper": "grasshopper",
  "Rendering": "render",
  "Excel Takeoff": "excel",
};

/**
 * Search button:
 * - On desktop & tablet (>= 768px): opens the Smart Search popup modal directly.
 * - On mobile (< 768px): navigates cleanly to /search/ as a dedicated page.
 */
export function SmartSearchTrigger({
  variant = "icon",
  className = "",
}: {
  variant?: "icon" | "tm";
  className?: string;
}) {
  const router = useRouter();
  const { lang } = useLang();
  const fa = lang === "fa";

  function handleClick() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      dispatchOpenSmartSearch();
    } else {
      router.push("/search/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={fa ? "جستجوی هوشمند (Ctrl+K)" : "Smart Search (Ctrl+K)"}
      title={fa ? "جستجو (Ctrl+K)" : "Search (Ctrl+K)"}
      className={
        variant === "tm"
          ? `inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3 text-xs font-medium text-[#2b2b2b] hover:text-[#e41613] transition-colors shrink-0 ${className}`
          : `flex min-h-[40px] min-w-[40px] items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 ${className}`
      }
    >
      <Search className="size-4" aria-hidden />
      {variant === "tm" && (
        <span className="hidden xl:inline text-[11px] tracking-wide opacity-70">
          {fa ? "جستجو" : "Search"}
        </span>
      )}
    </button>
  );
}

/**
 * Global desktop/tablet Smart Search Popup Dialog (mounted once in RootLayout).
 * Supports Cmd/Ctrl+K shortcut, debounced live semantic/synonym lookup, keyboard navigation.
 */
export function SmartSearchDialog() {
  const router = useRouter();
  const { lang } = useLang();
  const fa = lang === "fa";

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<SmartSearchItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onOpen = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setOpen(true);
      } else {
        router.push("/search/");
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches) {
          setOpen((v) => !v);
        } else {
          router.push("/search/");
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/?q=${encodeURIComponent(query)}&lang=${lang}`,
          { signal: ac.signal },
        );
        if (res.ok) {
          const data = (await res.json()) as { items?: SmartSearchItem[] };
          setItems(data.items ?? []);
          setActiveIdx(0);
        }
      } catch {
        /* ignore aborted requests */
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 150 : 0);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [open, query, lang]);

  function navigateTo(href: string) {
    setOpen(false);
    router.push(href);
  }

  function handleKeyNav(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(Math.max(0, items.length - 1), i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      if (items[activeIdx]) {
        e.preventDefault();
        navigateTo(items[activeIdx].href);
      } else if (query.trim()) {
        e.preventDefault();
        navigateTo(`/search/?q=${encodeURIComponent(query.trim())}`);
      }
    }
  }

  function kindIcon(kind: SmartSearchItem["kind"]) {
    if (kind === "course") return BookOpen;
    if (kind === "post") return Newspaper;
    if (kind === "resource") return FileText;
    return Compass;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={fa ? "جستجوی هوشمند" : "Smart Search"}
          dir={fa ? "rtl" : "ltr"}
          className="fixed inset-0 z-[4500] flex items-start justify-center pt-[10vh] px-4 sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Centered Popup Panel */}
          <motion.div
            className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-black/15 bg-white text-[#18181a] shadow-2xl dark:border-white/15 dark:bg-zinc-950 dark:text-zinc-100"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Search input header */}
            <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-4 py-3.5">
              {loading ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-[#e41613]" aria-hidden />
              ) : (
                <Search className="size-4 shrink-0 opacity-60" aria-hidden />
              )}
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyNav}
                placeholder={
                  fa
                    ? "جستجوی هوشمند دوره، ابزار (Revit، Grasshopper، AI) یا مقاله…"
                    : "Smart search courses, tools (Revit, Grasshopper, AI), or articles…"
                }
                aria-label={fa ? "عبارت جستجو" : "Search query"}
                className="flex-1 bg-transparent text-sm sm:text-base outline-none placeholder:text-zinc-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label={fa ? "پاک کردن متن" : "Clear search"}
                  className="text-xs opacity-60 hover:opacity-100 px-2 py-1"
                >
                  {fa ? "پاک" : "Clear"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={fa ? "بستن جستجو" : "Close search"}
                className="flex size-8 items-center justify-center rounded border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Smart Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-black/10 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/60 px-4 py-2.5 text-xs">
              <span className="inline-flex items-center gap-1 text-zinc-500 me-1">
                <Sparkles className="size-3.5 text-[#e41613]" aria-hidden />
                {fa ? "پیشنهاد هوشمند:" : "Quick topics:"}
              </span>
              {SMART_TOPICS[lang].map((label) => {
                const targetQ = TOPIC_QUERY_MAP[label] ?? label;
                const active = query.trim().toLowerCase() === targetQ.toLowerCase();
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setQuery(active ? "" : targetQ)}
                    className={`px-2 py-1 rounded transition-colors ${
                      active
                        ? "bg-[#18181a] text-white dark:bg-white dark:text-black"
                        : "text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Live Results List */}
            <div className="max-h-[54vh] overflow-y-auto divide-y divide-black/8 dark:divide-white/10">
              {items.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-zinc-500">
                  {fa
                    ? "نتیجه‌ای یافت نشد — می‌توانید با نام نرم‌افزار (مثلاً Revit، اتوکد، گرس‌هاپر) جستجو کنید."
                    : "No matching items — try software keywords like Revit, Rhino, Grasshopper, or AI."}
                </div>
              ) : (
                items.map((item, i) => {
                  const Icon = kindIcon(item.kind);
                  const selected = i === activeIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => navigateTo(item.href)}
                      className={`w-full text-start px-4 py-3 flex items-start justify-between gap-3 transition-colors ${
                        selected
                          ? "bg-zinc-100 dark:bg-zinc-900"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <Icon className="size-4 shrink-0 mt-1 text-zinc-500" aria-hidden />
                        <div className="min-w-0">
                          <div className="text-sm font-medium leading-snug truncate">
                            <bdi>{item.title}</bdi>
                          </div>
                          {item.subtitle && (
                            <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[11px] text-zinc-500 mt-0.5">
                        <span className="hidden sm:inline">{item.meta}</span>
                        <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer bar */}
            <div className="flex items-center justify-between border-t border-black/10 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/60 px-4 py-2.5 text-[11px] text-zinc-500">
              <span>
                {fa
                  ? "↑↓ برای جابجایی · Enter برای باز کردن · Esc برای بستن"
                  : "↑↓ to navigate · Enter to open · Esc to close"}
              </span>
              <button
                type="button"
                onClick={() =>
                  navigateTo(
                    query.trim()
                      ? `/search/?q=${encodeURIComponent(query.trim())}`
                      : "/search/",
                  )
                }
                className="font-medium text-[#18181a] dark:text-zinc-100 hover:text-[#e41613] transition-colors"
              >
                {fa ? "مشاهده صفحه کامل نتایج" : "Full search page"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
