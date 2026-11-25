"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";
import { localePrice } from "@/lib/format";
import { CourseSoftwareArtwork } from "@/components/course-software-svg";
import { TmHeader, TmFooter } from "@/components/tm/tm-chrome";
import { TmCursor } from "@/components/tm/tm-effects";
import { TmScrollProgress } from "@/components/tm/tm-sections";

/* ═══════════════════════════════════════════════════════════════════════════
   TmPortfolio — 1:1 Match of https://www.tresmarescapital.com/en/portfolio/
   (Rec_0004_9ffd2644.mp4 01:39..01:57):
     • Huge Title on right / concise intro on left
     • Frameless inline borderless dropdown filters
     • 4-column edge-to-edge 1:1 square hairline cells with animated hover reveal
   ═══════════════════════════════════════════════════════════════════════════ */

export type TmCourseItem = {
  id: string;
  slug: string;
  title: string;
  tier: string;
  category: string | null;
  description: string | null;
  durationHrs: number | null;
  price: number;
};

const TIERS = [
  { value: "", en: "Level", fa: "همه سطوح" },
  { value: "BEGINNER", en: "Beginner", fa: "مبتدی" },
  { value: "INTERMEDIATE", en: "Intermediate", fa: "متوسط" },
  { value: "PRO", en: "Advanced & AI", fa: "پیشرفته و AI" },
] as const;

export function TmPortfolio({
  courses,
  initialTier,
}: {
  courses: TmCourseItem[];
  initialTier?: string;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [tier, setTier] = React.useState(initialTier ?? "");
  const [category, setCategory] = React.useState("");

  const categories = React.useMemo(
    () => Array.from(new Set(courses.map((c) => c.category).filter(Boolean))) as string[],
    [courses],
  );

  const filtered = React.useMemo(
    () =>
      courses.filter(
        (c) => (!tier || c.tier === tier) && (!category || c.category === category),
      ),
    [courses, tier, category],
  );

  const clear = () => {
    setTier("");
    setCategory("");
    window.history.replaceState(null, "", "/courses");
  };

  const onTier = (v: string) => {
    setTier(v);
    window.history.replaceState(null, "", v ? `/courses?tier=${v}` : "/courses");
  };

  return (
    <div className="tm-root" style={{ background: "#fff", color: "#2b2b2b" }}>
      <TmCursor />
      <TmScrollProgress />
      <TmHeader />
      <main>
        {/* Asymmetric Top Editorial Intro matching 01:39..01:40 */}
        <section className="tm-archive-hero" dir={fa ? "rtl" : "ltr"}>
          <div className="tm-archive-hero__intro">
            <p>
              {fa
                ? "از ترسیم فاز دوم تا طراحی پارامتریک و هوش مصنوعی — هر دوره برای استاندارد دفاتر معاصر طراحی شده است."
                : "We design specialized studio courses engineered to meet evolving architectural practice demands."}
            </p>
          </div>
          <h1 className="tm-archive-hero__title">
            {fa ? (
              <>
                دوره‌های
                <br />
                آکادمی نیله
              </>
            ) : (
              <>
                Neeleh
                <br />
                Portfolio
              </>
            )}
          </h1>
        </section>

        <section className="tm-archive tm-archive--edge" dir={fa ? "rtl" : "ltr"}>
          {/* Frameless Typographic Filter Bar matching 01:40 */}
          <div className="tm-archive__filters tm-archive__filters--inline">
            <span className="tm-archive__filter-kicker">{fa ? "فیلتر:" : "Filter by"}</span>

            <label className="tm-inline-select">
              <select value={tier} onChange={(e) => onTier(e.target.value)} aria-label={fa ? "سطح" : "Level"}>
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {fa ? t.fa : t.en}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-3.5" strokeWidth={1.6} aria-hidden="true" />
            </label>

            <label className="tm-inline-select">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label={fa ? "دسته‌بندی" : "Category"}
              >
                <option value="">{fa ? "دسته‌بندی" : "Discipline"}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="size-3.5" strokeWidth={1.6} aria-hidden="true" />
            </label>

            {(tier || category) && (
              <button type="button" className="tm-link" onClick={clear}>
                {fa ? "حذف فیلتر" : "Reset"}
              </button>
            )}

            <span className="tm-archive__count" aria-live="polite">
              {fa
                ? `${toFaDigits(String(filtered.length))} دوره`
                : `${filtered.length} courses`}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="tm-archive__empty">
              <p>{fa ? "دوره‌ای با این فیلترها پیدا نشد." : "No courses match these filters."}</p>
              <button type="button" className="tm-link" onClick={clear}>
                {fa ? "پاک کردن فیلترها" : "Clear filters"}
              </button>
            </div>
          ) : (
            /* 4-Column Square Hairline Cell Matrix matching 01:41..01:56 */
            <div className="tm-port-matrix">
              {filtered.map((c, i) => (
                <Link
                  href={`/courses/${c.slug}`}
                  key={c.id}
                  className="tm-port-cell"
                  data-cursor-view={fa ? "مشاهده" : "View"}
                >
                  <div className="tm-port-cell__artwork">
                    <CourseSoftwareArtwork slugOrKey={c.slug} compact className="w-full h-full" />
                  </div>
                  <div className="tm-port-cell__scrim" aria-hidden="true" />
                  <div className="tm-port-cell__center">
                    <h3 className="tm-port-cell__title">{c.title}</h3>
                    <span className="tm-port-cell__sub">
                      {fa
                        ? `${toFaDigits(String(i + 1).padStart(2, "0"))} · ${c.durationHrs ? `${toFaDigits(String(c.durationHrs))} ساعت` : ""} ${c.price ? `· ${localePrice(lang, c.price)}` : ""}`
                        : `${String(i + 1).padStart(2, "0")} · ${c.durationHrs ? `${c.durationHrs}h` : ""} ${c.price ? `· ${localePrice(lang, c.price)}` : ""}`}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <TmFooter />
    </div>
  );
}
