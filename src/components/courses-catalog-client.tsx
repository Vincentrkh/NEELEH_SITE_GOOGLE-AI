"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Clock, Search, Users } from "lucide-react";
import { CourseSoftwareArtwork } from "@/components/course-software-svg";
import { CourseGuideDrawer } from "@/components/course-guide-drawer";
import { matchesNormalizedQuery } from "@/lib/domain/academy-rules";
import { localeNumber, localePrice, regStatusLabel, tierLabel } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

export type CatalogCourseItem = {
  id: string;
  slug: string;
  tier: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  tools: string | null;
  durationHrs: number;
  capacity: number;
  takenCount: number;
  price: number;
  regStatus: string;
  bannerUrl: string | null;
};

export function CoursesCatalogClient({
  courses,
  lang,
  initialTier,
}: {
  courses: CatalogCourseItem[];
  lang: Lang;
  initialTier?: string;
}) {
  const fa = lang === "fa";
  const [tier, setTier] = useState<string>(
    initialTier && ["BEGINNER", "INTERMEDIATE", "PRO"].includes(initialTier)
      ? initialTier
      : "ALL"
  );
  const [query, setQuery] = useState("");

  const tierTabs = [
    {
      key: "ALL",
      label: fa ? "همه دوره‌ها" : "All courses",
      count: courses.length,
    },
    {
      key: "BEGINNER",
      label: fa ? "لایه ۱ · پایه" : "Tier 1 · Foundation",
      count: courses.filter((c) => c.tier === "BEGINNER").length,
    },
    {
      key: "INTERMEDIATE",
      label: fa ? "لایه ۲ · متوسط" : "Tier 2 · Intermediate",
      count: courses.filter((c) => c.tier === "INTERMEDIATE").length,
    },
    {
      key: "PRO",
      label: fa ? "لایه ۳ · پیشرفته" : "Tier 3 · Advanced",
      count: courses.filter((c) => c.tier === "PRO").length,
    },
  ];

  const filtered = courses.filter((c) => {
    if (tier !== "ALL" && c.tier !== tier) return false;
    if (!query.trim()) return true;
    return matchesNormalizedQuery(
      query,
      c.title,
      c.description,
      c.category,
      c.tools,
      c.tags.join(" ")
    );
  });

  return (
    <div className="space-y-8">
      {/* Interactive filter toolbar + advisor drawer trigger */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border">
        <div
          role="tablist"
          aria-label={fa ? "فیلتر سطح دوره‌ها" : "Filter courses by tier"}
          className="flex flex-wrap items-center gap-1.5 rounded-lg bg-secondary/50 p-1 w-fit"
        >
          {tierTabs.map((tab) => {
            const active = tier === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTier(tab.key)}
                className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label} ({localeNumber(lang, tab.count)})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 size-4 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={fa ? "جستجو (Revit، رندر، نما…)" : "Search (Revit, Rhino, AI…)"}
              aria-label={fa ? "فیلتر نام دوره یا نرم‌افزار" : "Filter courses by title or software"}
              className="w-full min-h-[42px] rounded-md border border-border bg-background ps-9 pe-3 text-xs outline-none focus:border-foreground transition-colors"
            />
          </div>
          <CourseGuideDrawer />
        </div>
      </div>

      {/* Course cards grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            {fa
              ? "دوره‌ای مطابق با فیلتر یا عبارت جستجوی شما یافت نشد."
              : "No courses matched your active filter or search term."}
          </p>
          <button
            type="button"
            onClick={() => {
              setTier("ALL");
              setQuery("");
            }}
            className="inline-flex min-h-[40px] items-center rounded-md border border-border px-4 text-xs font-medium hover:bg-secondary transition-colors whitespace-nowrap"
          >
            {fa ? "پاک کردن فیلترها" : "Reset filters"}
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const remaining = Math.max(0, c.capacity - c.takenCount);
            const full = remaining === 0 || c.regStatus !== "OPEN";
            return (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="group flex flex-col rounded-lg border border-border bg-card overflow-hidden hover:border-foreground/35 transition-colors"
              >
                <div className="h-44 relative border-b border-border bg-secondary/25 overflow-hidden">
                  {c.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.bannerUrl}
                      alt={c.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 size-full object-cover opacity-15 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                  <div className="relative z-10 h-full w-full p-4">
                    <CourseSoftwareArtwork slugOrKey={c.slug} className="w-full h-full" />
                  </div>
                </div>

                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>{tierLabel(lang, c.tier)}</span>
                      <span aria-hidden>·</span>
                      <span>
                        <bdi>{c.category}</bdi>
                      </span>
                      <span aria-hidden>·</span>
                      <span className={full ? "text-amber-700" : "text-emerald-700"}>
                        {full ? regStatusLabel(lang, "FULL") : regStatusLabel(lang, "OPEN")}
                      </span>
                    </div>

                    <h2 className="text-lg font-medium leading-snug mb-2 group-hover:text-foreground transition-colors line-clamp-2">
                      <bdi>{c.title}</bdi>
                    </h2>

                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                      {c.description}
                    </p>

                    {c.tags.length > 0 && (
                      <div className="text-xs text-muted-foreground/85 mb-4 truncate">
                        {c.tags.slice(0, 3).map((t) => t.trim()).join(" · ")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground">
                    <div className="flex items-center gap-3 tabular-nums">
                      {c.durationHrs > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden />
                          {localeNumber(lang, c.durationHrs)} {fa ? "ساعت" : "hrs"}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" aria-hidden />
                        {localeNumber(lang, remaining)}/{localeNumber(lang, c.capacity)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground tabular-nums">
                      <span>
                        {c.price > 0 ? localePrice(lang, c.price) : fa ? "تماس" : "Contact"}
                      </span>
                      <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
