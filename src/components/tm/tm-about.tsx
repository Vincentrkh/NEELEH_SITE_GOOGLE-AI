"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from "framer-motion";
import { useLang } from "@/components/language-provider";
import {
  TmHistoryTimeline,
} from "@/components/tm/tm-motion";
import { TmMaskText, TmCursor, TmWordFill } from "@/components/tm/tm-effects";
import { TmHeader, TmFooter } from "@/components/tm/tm-chrome";
import { TmScrollProgress } from "@/components/tm/tm-sections";
import {
  TmArchitecturalPlate,
  TmValueSvg,
  type TmPlateVariant,
} from "@/components/tm/tm-svg-art";
import { TMX_MILESTONES } from "@/config/tm-theme";

/* ═══════════════════════════════════════════════════════════════════════════
   TmAbout — 1:1 Match of https://www.tresmarescapital.com/en/about/
   (Rec_0004_9ffd2644.mp4 01:06..01:35)
   ═══════════════════════════════════════════════════════════════════════════ */

const VALUES = [
  {
    key: "exactness",
    fa: "دقت",
    en: "Precision",
    faCaption: "«مقیاس و اندازه در نقشه‌کشی یعنی صفر ابهام در کارگاه.»",
    enCaption: "“Dimension and tolerances transform ink on paper into standing structures.”",
    faBody: "هر خط اجرایی دلیلی ساختاری دارد. ما دانشجویان را از ترسیم سطحی به درک دقیق کارگاهی می‌رسانیم.",
    enBody: "Every drawing line carries structural intent. We train architects to think from construction tolerance outward.",
  },
  {
    key: "method",
    fa: "روش",
    en: "Method",
    faCaption: "«ابزار تغییر می‌کند؛ روش تفکر معمار ماندگار است.»",
    enCaption: "“Software updates yearly; disciplined spatial methodology endures across decades.”",
    faBody: "از ابزار شروع می‌شود، اما در سیستم فکری و استاندارد دفتر تمام می‌شود.",
    enBody: "Learning begins with tools and matures into studio-grade standards and repeatable BIM workflows.",
  },
  {
    key: "craft",
    fa: "اجرا",
    en: "Practice",
    faCaption: "«تجربه‌های اجرایی گردآمده از ۱۳۷۹ تا امروز، مستقیم در کلاس.»",
    enCaption: "“Construction experience accumulated since 2000 poured straight into mentorship.”",
    faBody: "تجربه‌های واقعی طراحی و اجرا در پروژه‌های متنوع معماری، پایه‌ی هر تمرین و پروژه‌ی آموزشی نیله است.",
    enBody: "Each project in Neeleh draws directly from real execution challenges solved on site since 2000.",
  },
  {
    key: "future",
    fa: "آینده",
    en: "Future",
    faCaption: "«هوش مصنوعی دست معمار را بازتر می‌کند، نه حذفش.»",
    enCaption: "“Parametric algorithms and AI expand the architect’s creative reach, never replacing craft.”",
    faBody: "ترکیب گرس‌هاپر، اتوماسیون دفاتر و سیستم‌های AI برای خلق معماری کارآمدتر و خلاقانه‌تر.",
    enBody: "Integrating Grasshopper, office automation, and AI pipelines to accelerate design ideation and BIM accuracy.",
  },
  {
    key: "growth",
    fa: "رشد",
    en: "Growth",
    faCaption: "«هر هنرجو یک مسیر شخصی از کلاس تا رهبری تیم دارد.»",
    enCaption: "“Every student follows a bespoke trajectory from studio drafting to technical leadership.”",
    faBody: "همراهی مداوم از نخستین جلسه تا ورود به دفاتر معماری یا راه‌اندازی استودیوی مستقل.",
    enBody: "Long-term mentorship connecting alumni cohorts directly with leading studios and partner practices.",
  },
] as const;

const STRIP_VARIANTS: TmPlateVariant[] = ["atelier", "drafting", "bim", "parametric", "ai"];

export function TmAbout() {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [activeVal, setActiveVal] = React.useState(0);
  const valuesRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: valuesRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(VALUES.length - 1, Math.max(0, Math.floor(v * VALUES.length)));
    setActiveVal(idx);
  });

  const curVal = VALUES[activeVal];

  return (
    <div className="tm-root" style={{ background: "#fff", color: "#2b2b2b" }}>
      <TmCursor />
      <TmScrollProgress />
      <TmHeader />
      <main>
        <TmPageHero
          eyebrow={fa ? "درباره نیله" : "About Neeleh"}
          lines={fa ? ["مسیر ما", "تا امروز"] : ["Our journey", "so far"]}
          body={
            fa
              ? "آموزش معماری فراتر از ابزارها — هم‌افزایی تجربه‌های طراحی و اجرا از سال ۱۳۷۹ تا امروز از فاز دوم تا BIM و هوش مصنوعی."
              : "Architecture education beyond tools — uniting architectural and BIM experiences since 2000 through AI workflows."
          }
          ctaHref="/courses"
          ctaLabel={fa ? "دوره‌ها" : "Browse courses"}
        />

        <TmHistoryTimeline milestones={TMX_MILESTONES} />

        {/* Full-Bleed Sticky Interactive Values Stage (matches video 01:23..01:30) */}
        <section
          ref={valuesRef}
          className="tm-values-stage"
          id="values"
          style={{ height: "280vh" }}
        >
          <div className="tm-values-stage__sticky">
            <AnimatePresence mode="wait">
              <motion.div
                key={curVal.key}
                className="tm-values-stage__bg"
                initial={{ opacity: 0.2, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.2 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <TmValueSvg valueKey={curVal.key} dark />
              </motion.div>
            </AnimatePresence>

            <div className="tm-values-stage__scrim" aria-hidden="true" />

            <div className="tm-values-stage__inner" dir={fa ? "rtl" : "ltr"}>
              <div className="tm-values-stage__left">
                <p className="tm-values-stage__eyebrow">{fa ? "ارزش‌های ما" : "Our values"}</p>
                <ul className="tm-values-stage__list">
                  {VALUES.map((v, i) => (
                    <li key={v.key}>
                      <button
                        type="button"
                        data-active={i === activeVal}
                        onClick={() => setActiveVal(i)}
                      >
                        {fa ? v.fa : v.en}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="tm-values-stage__bottom">
                <p className="tm-values-stage__caption">
                  {fa ? curVal.faCaption : curVal.enCaption}
                </p>
                <p className="tm-values-stage__body">
                  {fa ? curVal.faBody : curVal.enBody}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing Editorial Asymmetric Split + Scroll-Fill Quote (01:31..01:34) */}
        <section className="tm-about-split" dir={fa ? "rtl" : "ltr"}>
          <div className="tm-about-split__text">
            <h2>{fa ? "بهترین همراه حرفه‌ای شما" : "Your best studio partner"}</h2>
            <p>
              {fa
                ? "آکادمی نیله معماران و دانشجویان مستعد را با آموزش‌های کارگاهی و سیستم‌های هوشمند دفتر به استانداردی ماندگار می‌رساند."
                : "Neeleh Academy prepares architects for high-impact roles by uniting construction precision with BIM systems and AI workflows."}
            </p>
          </div>
          <div className="tm-about-split__media">
            <TmArchitecturalPlate variant="bim" />
          </div>
        </section>

        <section className="tm-textblock">
          <TmWordFill
            className="tm-textblock__text"
            text={
              fa
                ? "ما با ذهنیت حرفه‌ای و تیمی متعهد به دقت، کیفیت و آینده‌نگری در کنار شما هستیم."
                : "We operate with a studio-driven mindset, supported by mentors guided by precision and engineering rigor."
            }
          />
        </section>
      </main>
      <TmFooter />
    </div>
  );
}

/* ── قالب هرو صفحات داخلی TM ───────────────────────────────────────────── */

export function TmPageHero({
  eyebrow,
  lines,
  body,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string;
  lines: string[];
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <section className="tm-hero tm-hero--page">
      <p className="tm-hero__eyebrow">{eyebrow}</p>
      <h1 className="tm-hero__title tm-hero__title--sub" dir="auto">
        {lines.map((l, i) => (
          <span key={i} className="tm-hero__line">
            {l}
          </span>
        ))}
      </h1>
      <div className="tm-hero__aside">
        <TmMaskText as="p" className="tm-hero__sub" text={body} />
        <Link href={ctaHref} className="tm-link" style={{ marginTop: 18 }}>
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}

export function TmEndCta({
  title,
  linkHref,
  linkLabel,
}: {
  title: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <section className="tm-cta">
      <div className="tm-cta__strip">
        {STRIP_VARIANTS.map((variant, i) => (
          <div key={i} className="tm-cta__plate">
            <TmArchitecturalPlate variant={variant} />
          </div>
        ))}
      </div>
      <div className="tm-cta__link">
        <Link href={linkHref} className="tm-link">
          {linkLabel}
        </Link>
      </div>
      <span className="sr-only">{title}</span>
    </section>
  );
}
