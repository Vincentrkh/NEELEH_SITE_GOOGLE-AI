"use client";

import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
  useInView,
  type MotionValue,
} from "framer-motion";
import { TMX_REVEAL, TMX_TIMELINE, TMX_WHEEL } from "@/config/tm-theme";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";
import { localeYearFromShamsi } from "@/lib/format";
import { BlockReveal } from "@/components/block-reveal";
import {
  TmMilestoneSvg,
  TmCityPlateSvg,
  TmHalftoneMapSvg,
  type TmMapHubCard,
} from "@/components/tm/tm-svg-art";
import { TmWordFill } from "@/components/tm/tm-effects";

/* ═══════════════════════════════════════════════════════════════════════════
   TmLetterReveal — Character-by-character scroll reveal
   ═══════════════════════════════════════════════════════════════════════════ */

export function TmLetterReveal({
  text,
  className,
  as: Tag = "h2",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  stagger?: number;
}) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "start 0.6"],
  });
  const isFa = /[\u0600-\u06FF]/.test(text);
  const units = React.useMemo(
    () => (isFa ? text.split(/\s+/).filter(Boolean) : Array.from(text)),
    [text, isFa],
  );

  return (
    <Tag ref={ref as React.Ref<HTMLHeadingElement>} className={className}>
      {units.map((u, i) => (
        <React.Fragment key={i}>
          <LetterUnit
            progress={scrollYProgress}
            range={[i / units.length, (i + 1) / units.length]}
          >
            {u}
          </LetterUnit>
          {isFa && i < units.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}

function LetterUnit({
  progress,
  range,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
}) {
  const opacity = useTransform(progress, range, [TMX_REVEAL.headingOpacityFrom, 1]);
  if (children === " ") return <span>{" "}</span>;
  return (
    <motion.span style={{ opacity, display: "inline-block" }}>
      {children}
    </motion.span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TmOdometer & TmHistoryTimeline (matches 01:12..01:22 full-bleed Red Years)
   ═══════════════════════════════════════════════════════════════════════════ */

export function TmOdometer({ value, className }: { value: number; className?: string }) {
  const digits = React.useMemo(() => {
    const s = String(value);
    return s.split("").map((c) => (/\d/.test(c) ? parseInt(c, 10) : -1));
  }, [value]);

  return (
    <span className={`tm-odo ${className ?? ""}`} dir="ltr" aria-label={String(value)}>
      {digits.map((d, i) => (
        <OdoDigit key={i} digit={d} delay={i * TMX_TIMELINE.rollStagger} index={i} />
      ))}
    </span>
  );
}

function OdoDigit({ digit, delay, index }: { digit: number; delay: number; index: number }) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const glyphs = fa
    ? ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]
    : ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const d = digit >= 0 ? digit : 0;
  return (
    <span className="tm-odo__digit" aria-hidden="true" data-index={index}>
      <span
        className="tm-odo__strip"
        style={{
          transform: `translateY(${-d}em)`,
          transition: `transform ${TMX_TIMELINE.rollSeconds}s var(--tm-ease-expo) ${delay}s`,
        }}
      >
        {glyphs.map((g, j) => (
          <span key={j} className="tm-odo__cell">
            {g}
          </span>
        ))}
      </span>
    </span>
  );
}

export function TmHistoryTimeline({
  milestones,
}: {
  milestones: readonly { year: number; fa: string; en: string; faSub?: string; enSub?: string }[];
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const [idx, setIdx] = React.useState(0);
  const [frameIn, setFrameIn] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  React.useEffect(() => {
    if (inView) {
      const t = setTimeout(() => setFrameIn(true), 120);
      return () => clearTimeout(t);
    }
  }, [inView]);

  const m = milestones[idx];
  const activeDisplayYear = localeYearFromShamsi(lang, m.year);

  return (
    <section className="tm-history" ref={ref as React.Ref<HTMLDivElement>} id="history">
      {/* Stage: Gigantic Crimson Odometer spanning background behind central framed SVG (01:12-01:22) */}
      <div className="tm-history__stage">
        <div className="tm-history__giant-year" aria-hidden="true">
          <TmOdometer value={activeDisplayYear} />
        </div>

        <div className="tm-history__frame">
          <div
            className="tm-history__media"
            style={{
              clipPath: frameIn ? TMX_TIMELINE.frameOpenTo : TMX_TIMELINE.frameOpenFrom,
              transition: `clip-path ${TMX_TIMELINE.frameOpenSeconds}s var(--tm-ease-expo)`,
            }}
          >
            <TmMilestoneSvg year={m.year} />
          </div>
        </div>
      </div>

      {/* Crisp Milestone Notes below central plate matching 01:13..01:22 */}
      <BlockReveal className="tm-history__bullets" aria-live="polite">
        <div dir={fa ? "rtl" : "ltr"} className="contents">
          <div className="tm-history__bullet">
            <span className="tm-map__pin" aria-hidden="true" />
            <p>{fa ? m.fa : m.en}</p>
          </div>
          <div className="tm-history__bullet">
            <span className="tm-map__pin" aria-hidden="true" />
            <p>
              {fa
                ? m.faSub ?? `سرفصل توسعه‌ی علمی و اجرایی آکادمی در سال ${toFaDigits(String(activeDisplayYear))}`
                : m.enSub ?? `Architectural curriculum milestone established in ${activeDisplayYear}.`}
            </p>
          </div>
        </div>
      </BlockReveal>

      {/* Horizontal clickable year selector bar */}
      <div className="tm-history__years" role="tablist" aria-label={fa ? "سال‌ها" : "Years"}>
        {milestones.map((mm, i) => (
          <button
            key={mm.year}
            role="tab"
            aria-selected={i === idx}
            className="tm-history__year"
            data-active={i === idx}
            onClick={() => setIdx(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setIdx((v) => Math.min(milestones.length - 1, v + 1));
              if (e.key === "ArrowLeft") setIdx((v) => Math.max(0, v - 1));
            }}
          >
            <TmOdometer value={localeYearFromShamsi(lang, mm.year)} />
          </button>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TmCityWheel — Band 6 (`component--map` from 00:35..00:42)
   ───────────────────────────────────────────────────────────────────────────
   Exact composition:
     1. Topographic wave backdrop
     2. Centered label + scroll-fill headline with Red Highlight phrase
     3. Wide upward convex ARC of tilted square city architectural cards
     4. Centered concise studio narrative
     5. Interactive Halftone Map (region crimson dots + floating white card!)
        + 3 synchronized Hub columns below
   ═══════════════════════════════════════════════════════════════════════════ */

export function TmCityWheel({
  cities,
  address,
  phone,
  email,
  hours,
}: {
  cities: readonly { caption: string; captionFa: string; note: string }[];
  address?: string;
  phone?: string;
  email?: string;
  hours?: string;
}) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const ref = React.useRef<HTMLDivElement>(null);
  const [activeHub, setActiveHub] = React.useState<number | null>(null);
  const [hoveredHub, setHoveredHub] = React.useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scrollDeg = useTransform(
    scrollYProgress,
    [0.12, 0.75],
    [-TMX_WHEEL.rotationRangeDeg * 0.35, TMX_WHEEL.rotationRangeDeg * 0.35],
  );
  const smoothDeg = useSpring(scrollDeg, { stiffness: 55, damping: 22 });
  const [offsetDeg, setOffsetDeg] = React.useState(0);
  useMotionValueEvent(smoothDeg, "change", (v) => setOffsetDeg(v));

  const n = cities.length;
  const spreadDeg = 16;
  const centerIdx = Math.floor(n / 2);

  const rawPhone = phone ?? "023-35230050 · 09120738211";
  const normPhone = fa
    ? toFaDigits(rawPhone)
    : rawPhone.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  const hubs: TmMapHubCard[] = [
    {
      title: fa ? "محل برگزاری حضوری — دامغان" : "In-Person Venue — Damghan",
      line: address ?? (fa ? "دامغان — محل برگزاری کلاس‌های حضوری آکادمی نیله" : "Damghan — Neeleh Academy In-Person Class Venue"),
      sub: normPhone,
    },
    {
      title: fa ? "پردیس زنده آنلاین" : "Online Live Campus",
      line: fa
        ? "کلاس‌های تعاملی زنده برای معماران در سراسر ایران و دنیا بدون محدودیت مکان."
        : "Interactive live studios for architects anywhere — location independent.",
      sub: hours ?? (fa ? "شنبه تا چهارشنبه، ۹ تا ۱۸" : "Sat–Wed, 9:00–18:00"),
    },
    {
      title: fa ? "شبکه استودیو و پشتیبانی" : "Practice & Advisory",
      line: fa
        ? "همراهی فنی روی پروژه‌های فاز دوم، مدل‌سازی BIM و اتوماسیون AI."
        : "Direct project review across drafting, BIM delivery and AI tools.",
      sub: email ?? "hello@neeleh.academy",
    },
  ];

  const focusIdx = hoveredHub ?? activeHub;

  return (
    <section className="tm-map" ref={ref as React.Ref<HTMLDivElement>} id="expansion">
      <svg className="tm-map__waves" viewBox="0 0 2400 220" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <path
            key={i}
            className={i % 2 === 0 ? "tm-svg-dash-slow" : undefined}
            d={`M -120 ${28 + i * 11} C 460 ${95 + i * 9}, 920 ${18 + i * 8}, 1480 ${75 + i * 10} S 2140 ${12 + i * 12}, 2520 ${68 + i * 9}`}
            fill="none"
            stroke="#f0f0f0"
            strokeWidth="1"
          />
        ))}
      </svg>

      <div className="tm-map__head">
        <p className="tm-textblock__label">{fa ? "گستره حضور" : "Our expansion"}</p>
        <TmWordFill
          className="tm-map__title"
          text={
            fa
              ? "آموزش عملی از دامغان تا تمام استودیوهای معماری"
              : "Connecting Damghan cohorts with studios everywhere"
          }
          highlight={fa ? "دامغان تا تمام استودیوها" : "Damghan cohorts"}
        />
      </div>

      {/* Semi-Circular Convex Arc Wheel (matches 00:36) */}
      <div className="tm-arc" dir="ltr" aria-label={fa ? "شهرهای حضور نیله" : "Studio network cities"}>
        <div className="tm-arc__stage">
          {cities.map((c, i) => {
            const baseAngle = (i - centerIdx) * spreadDeg + offsetDeg;
            const rad = (baseAngle * Math.PI) / 180;
            const radius = 640;
            const x = Math.sin(rad) * radius;
            const y = radius - Math.cos(rad) * radius;
            const absAng = Math.abs(baseAngle);
            const opacity = Math.max(0, Math.min(1, 1 - Math.max(0, absAng - 24) / 34));
            const labelOpacity = Math.max(0, 1 - absAng / 18);

            return (
              <div
                key={c.caption}
                className="tm-arc__card"
                style={{
                  transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${baseAngle.toFixed(2)}deg)`,
                  opacity: Number(opacity.toFixed(3)),
                  zIndex: Math.round(50 - absAng),
                }}
              >
                <div className="tm-arc__plate">
                  <TmCityPlateSvg city={c.caption} />
                </div>
                <span className="tm-arc__label" style={{ opacity: Number(labelOpacity.toFixed(2)) }}>
                  {fa ? c.captionFa : c.caption}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <BlockReveal>
        <p className="tm-map__intro" dir={fa ? "rtl" : "ltr"}>
          {fa
            ? "نیله وابسته به جغرافیای خاصی نیست؛ تجربه‌های گردآمده از سال ۱۳۷۹ زیر این نام، در کلاس‌های حضوری دامغان و بستر آموزش زنده آنلاین در سراسر کشور به استاندارد واحدی از اجرا تبدیل می‌شود."
            : "Neeleh is not tied to a single city — grounded in architectural experiences brought together since 2000, our Damghan cohorts and live online studios unite practitioners nationwide."}
        </p>

        {/* Interactive Halftone Map + Regional Highlight Dots + Floating Card */}
        <div className="tm-map__canvas">
          <TmHalftoneMapSvg
            activeHub={activeHub}
            hoveredHub={hoveredHub}
            onHoverHub={setHoveredHub}
            onSelectHub={(idx) => setActiveHub((prev) => (prev === idx ? null : idx))}
            hubData={hubs}
            dir={fa ? "rtl" : "ltr"}
          />
        </div>

        <div className="tm-map__hubs" dir={fa ? "rtl" : "ltr"}>
          {hubs.map((h, idx) => (
            <button
              type="button"
              key={h.title}
              className="tm-map__hub"
              data-active={focusIdx === idx}
              onMouseEnter={() => setHoveredHub(idx)}
              onMouseLeave={() => setHoveredHub(null)}
              onFocus={() => setHoveredHub(idx)}
              onBlur={() => setHoveredHub(null)}
              onClick={() => setActiveHub((prev) => (prev === idx ? null : idx))}
            >
              <h3>
                <span className="tm-map__pin" aria-hidden="true" />
                {h.title}
              </h3>
              <p>
                {h.line}
                <br />
                <span dir="ltr" className="tm-map__hub-sub">
                  {h.sub}
                </span>
              </p>
            </button>
          ))}
        </div>
      </BlockReveal>
    </section>
  );
}
