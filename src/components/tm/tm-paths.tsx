"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";
import { localePrice } from "@/lib/format";
import { TmHeader, TmFooter } from "@/components/tm/tm-chrome";
import { TmCursor, TmWordFill } from "@/components/tm/tm-effects";
import { TmScrollProgress } from "@/components/tm/tm-sections";
import { CourseSoftwareArtwork } from "@/components/course-software-svg";

/* ═══════════════════════════════════════════════════════════════════════════
   TmPaths — 1:1 Match of https://www.tresmarescapital.com/en/investors/
   (Rec_0004_9ffd2644.mp4 02:13..02:23):
     • Clean centered statement
     • 3x2 grid of crisp gray architectural pathway & cohort cards with [->]
     • Clicking any card slides open a 78vw right-side detail sheet over
       dimmed scrim with [X] close button!
   ═══════════════════════════════════════════════════════════════════════════ */

export type TmPathCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  durationHrs: number | null;
  price: number;
};

export type TmPathItem = {
  key: string;
  index: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  outcome: string;
  courses: TmPathCourse[];
};

export function TmPaths({ paths }: { paths: TmPathItem[] }) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [selected, setSelected] = React.useState<TmPathItem | null>(null);

  React.useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [selected]);

  return (
    <div className="tm-root" style={{ background: "#fff", color: "#2b2b2b" }}>
      <TmCursor />
      <TmScrollProgress />
      <TmHeader />
      <main>
        <section className="tm-paths-head" dir={fa ? "rtl" : "ltr"}>
          <p className="tm-textblock__label">{fa ? "مسیرهای یادگیری" : "Career Pathways"}</p>
          <TmWordFill
            className="tm-paths-head__title"
            text={
              fa
                ? "تمامی مسیرهای ساختاریافته برای معماران و رهبران BIM"
                : "All structured pathways for ambitious architects"
            }
          />
        </section>

        <section className="tm-paths-grid-wrap" dir={fa ? "rtl" : "ltr"}>
          <div className="tm-paths-grid">
            {paths.map((p, idx) => (
              <button
                type="button"
                key={p.key}
                className="tm-path-card"
                onClick={() => setSelected(p)}
                data-cursor-view={fa ? "باز کردن" : "Open"}
              >
                <div className="tm-path-card__top">
                  <span className="tm-path-card__idx">
                    {fa ? toFaDigits(String(idx + 1).padStart(2, "0")) : String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.subtitle}</p>
                </div>
                <div className="tm-path-card__foot">
                  <span className="tm-path-card__dur">{p.duration}</span>
                  <span className="tm-path-card__btn" aria-hidden="true">
                    <ArrowRight className="size-4" strokeWidth={1.6} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Slide-Over Detail Sheet matching Tres Mares Investors Drawer (02:17..02:23) */}
      <AnimatePresence>
        {selected && (
          <div className="tm-drawer-root" dir={fa ? "rtl" : "ltr"}>
            <motion.div
              className="tm-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.72 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              onClick={() => setSelected(null)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={selected.title}
              className="tm-drawer-panel"
              initial={{ x: fa ? "-100%" : "100%" }}
              animate={{ x: "0%" }}
              exit={{ x: fa ? "-100%" : "100%" }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="tm-drawer-top">
                <span className="tm-textblock__label" style={{ margin: 0 }}>
                  {selected.duration}
                </span>
                <button
                  type="button"
                  className="tm-drawer-close"
                  onClick={() => setSelected(null)}
                  aria-label={fa ? "بستن" : "Close"}
                >
                  <X className="size-5" strokeWidth={1.5} />
                </button>
              </div>

              <h2 className="tm-drawer-title">{selected.title}</h2>
              <p className="tm-drawer-desc">{selected.description}</p>

              <div className="tm-drawer-meta-row">
                <div>
                  <span className="tm-drawer-kicker">{fa ? "خروجی مسیر" : "OUTCOME"}</span>
                  <p>{selected.outcome}</p>
                </div>
                <div>
                  <span className="tm-drawer-kicker">{fa ? "تعداد دوره‌ها" : "COURSES"}</span>
                  <p>
                    {fa
                      ? `${toFaDigits(String(selected.courses.length))} کارگاه`
                      : `${selected.courses.length} Studios`}
                  </p>
                </div>
              </div>

              <div className="tm-drawer-courses">
                {selected.courses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/courses/${c.slug}`}
                    className="tm-drawer-course"
                  >
                    <div className="tm-drawer-course__art">
                      <CourseSoftwareArtwork slugOrKey={c.slug} compact className="w-full h-full" />
                    </div>
                    <div className="tm-drawer-course__info">
                      <h4>{c.title}</h4>
                      <p>{c.description}</p>
                    </div>
                    <div className="tm-drawer-course__right">
                      {c.durationHrs && (
                        <span>
                          {fa ? `${toFaDigits(String(c.durationHrs))} ساعت` : `${c.durationHrs}h`}
                        </span>
                      )}
                      {c.price > 0 && <strong>{localePrice(lang, c.price)}</strong>}
                    </div>
                  </Link>
                ))}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <TmFooter />
    </div>
  );
}
