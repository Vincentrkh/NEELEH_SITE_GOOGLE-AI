"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll, useTransform, useSpring } from "framer-motion";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";
import { TMX_STATS_FALLBACK } from "@/config/tm-theme";
import { TmWordFill, TmMaskText, TmCounter } from "@/components/tm/tm-effects";
import { TmHeroScene } from "@/components/tm/tm-hero-scene";
import type { ParticleSphereHandle } from "@/components/tm/particle-sphere-canvas";
import { TmInstructorPortraitSvg } from "@/components/tm/tm-svg-art";
import { BlockReveal, HeroBlockEntrance } from "@/components/block-reveal";

/* ═══════════════════════════════════════════════════════════════════════════
   TM Sections — Exact Band 1, Band 2/4, Band 3 (6 KPI Grid), Band 7 (Team)
   Matching https://www.tresmarescapital.com/en/
   ═══════════════════════════════════════════════════════════════════════════ */

export type TmData = {
  stats: { years: string; courses: string; graduates: string };
  address: string;
  phone: string;
  email: string;
  hours: string;
  instructors: { id: string; name: string; field: string | null; avatarUrl: string | null }[];
};

/* ── Band 1: Hero (Sticky Scroll-Driven Sphere Scenes + Zoom-In/Out Fade) ── */

export function TmHero() {
  const { lang } = useLang();
  const fa = lang === "fa";

  const heroRef = React.useRef<HTMLElement>(null);
  const stickyRef = React.useRef<HTMLDivElement>(null);
  const sphereRef = React.useRef<ParticleSphereHandle>(null);
  const activeSceneRef = React.useRef(0);

  const [sceneCount, setSceneCount] = React.useState(4);
  const [activeScene, setActiveScene] = React.useState(0);

  React.useEffect(() => {
    const applyScrollProgress = () => {
      const heroEl = heroRef.current;
      const stickyEl = stickyRef.current;
      if (!heroEl || !stickyEl) return;

      const rect = heroEl.getBoundingClientRect();
      const travel = Math.max(1, heroEl.offsetHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / travel));

      const count = Math.max(1, sceneCount);
      const activePhase = Math.min(0.9999, Math.max(0, p / 0.76));
      const idx = Math.min(count - 1, Math.floor(activePhase * count));
      if (idx !== activeSceneRef.current) {
        activeSceneRef.current = idx;
        setActiveScene(idx);
        sphereRef.current?.goScene(idx);
      }

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        stickyEl.style.setProperty("--tm-sphere-scale", "1");
        stickyEl.style.setProperty("--tm-sphere-opacity", "1");
        stickyEl.style.setProperty("--tm-backdrop-opacity", "1");
        stickyEl.style.setProperty("--tm-copy-opacity", "1");
        stickyEl.style.setProperty("--tm-copy-y", "0px");
        return;
      }

      // Exit Zoom-Out + Fade-Out smoothly after last scene (p in [0.74, 0.94])
      const exitRaw = Math.min(1, Math.max(0, (p - 0.74) / 0.2));
      const exitEase = 1 - Math.pow(1 - exitRaw, 2.2);
      const copyRaw = Math.min(1, Math.max(0, (p - 0.7) / 0.2));
      const copyEase = 1 - Math.pow(1 - copyRaw, 2);

      const sphereScale = 1 - exitEase * 0.48; // 1 -> 0.52
      const sphereOpacity = 1 - exitEase; // 1 -> 0
      const backdropOpacity = 1 - exitEase; // 1 -> 0 into #fff Band 2
      const copyOpacity = 1 - copyEase; // 1 -> 0
      const copyY = -copyEase * 52; // 0 -> -52px

      stickyEl.style.setProperty("--tm-sphere-scale", sphereScale.toFixed(4));
      stickyEl.style.setProperty("--tm-sphere-opacity", sphereOpacity.toFixed(4));
      stickyEl.style.setProperty("--tm-backdrop-opacity", backdropOpacity.toFixed(4));
      stickyEl.style.setProperty("--tm-copy-opacity", copyOpacity.toFixed(4));
      stickyEl.style.setProperty("--tm-copy-y", `${copyY.toFixed(1)}px`);
    };

    applyScrollProgress();
    window.addEventListener("scroll", applyScrollProgress, { passive: true });
    window.addEventListener("resize", applyScrollProgress, { passive: true });
    return () => {
      window.removeEventListener("scroll", applyScrollProgress);
      window.removeEventListener("resize", applyScrollProgress);
    };
  }, [sceneCount]);

  const handleScenesCountChange = React.useCallback((count: number) => {
    setSceneCount(Math.max(1, count));
  }, []);

  const handleActiveSceneChange = React.useCallback((index: number) => {
    activeSceneRef.current = index;
    setActiveScene(index);
  }, []);

  const lines = fa ? ["طراحی", "فراتر از", "ابزار."] : ["Design", "beyond", "tools."];
  const stepCur = String(Math.min(sceneCount, activeScene + 1)).padStart(2, "0");
  const stepMax = String(sceneCount).padStart(2, "0");
  const runwayHeights = Math.max(280, sceneCount * 85 + 100);

  return (
    <section
      ref={heroRef}
      className="tm-hero"
      id="top"
      style={{ height: `${runwayHeights}svh` }}
    >
      <div ref={stickyRef} className="tm-hero__sticky">
        <TmHeroScene
          sphereRef={sphereRef}
          onScenesCountChange={handleScenesCountChange}
          onActiveSceneChange={handleActiveSceneChange}
        />

        <div className="tm-hero__frame">
          <h1
            className="tm-hero__title tm-hero__copy"
            dir={fa ? "rtl" : "ltr"}
          >
            <HeroBlockEntrance delay={0.05}>
              {lines.map((l, i) => (
                <span key={i} className="tm-hero__line">
                  {l}
                </span>
              ))}
            </HeroBlockEntrance>
          </h1>

          <HeroBlockEntrance delay={0.14} className="tm-hero__aside tm-hero__copy">
            <TmMaskText
              as="p"
              className="tm-hero__sub"
              delay={0.12}
              text={
                fa
                  ? "آموزش هدفمند برای معماران و متخصصان BIM — از ترسیم فاز دوم تا طراحی پارامتریک و هوش مصنوعی."
                  : "Tailored education for ambitious architects and BIM leaders — from execution drafting to AI workflows."
              }
            />
            <Link href="/paths" className="tm-link tm-hero__cta">
              {fa ? "مسیرهای آموزشی" : "Learning paths"}
            </Link>
          </HeroBlockEntrance>

          <span className="tm-hero__scroll tm-hero__copy">
            {fa
              ? `${toFaDigits(stepCur)} / ${toFaDigits(stepMax)} · اسکرول`
              : `${stepCur} / ${stepMax} · Scroll`}
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── Band 2 & Band 4: Centered Editorial Text Blocks (Scroll-Fill, No CTA) ─ */

export function TmTextBlock({
  id,
  eyebrow,
  text,
  highlight,
}: {
  id?: string;
  eyebrow?: { fa: string; en: string };
  text?: { fa: string; en: string };
  highlight?: { fa?: string; en?: string };
}) {
  const { lang } = useLang();
  const fa = lang === "fa";

  const label = eyebrow
    ? fa
      ? eyebrow.fa
      : eyebrow.en
    : fa
      ? "درباره آکادمی نیله"
      : "About Neeleh";

  const copy = text
    ? fa
      ? text.fa
      : text.en
    : fa
      ? "آکادمی تخصصی سیستم‌های هوشمند معماری — از ترسیم فاز دوم تا BIM، دیزاین محاسباتی و معماری افزوده با هوش مصنوعی."
      : "An academy for smart architectural systems — from execution drafting to BIM, computational design and AI-augmented studios.";

  const hi = highlight ? (fa ? highlight.fa : highlight.en) : undefined;

  return (
    <section
      className={`tm-textblock ${id === "about-intro" ? "tm-textblock--after-hero" : ""}`}
      id={id}
    >
      <p className="tm-textblock__label">{label}</p>
      <TmWordFill className="tm-textblock__text" text={copy} highlight={hi} />
    </section>
  );
}

/* ── Band 3: Sticky Left Intro + 6 Staggered Tall White KPI Cards ────────── */

function extractDigits(s: string): number {
  const norm = s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const m = norm.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

type KpiCellDef = {
  id: string;
  raw: string;
  mode: "year" | "plusPrefix" | "range" | "plain";
  label: string;
};

function KpiCard({ cell, fa, delay = 0 }: { cell: KpiCellDef; fa: boolean; delay?: number }) {
  const num = extractDigits(cell.raw);

  return (
    <BlockReveal delay={delay} distance={20}>
      <article className="tm-numcell">
        <div className="tm-numcell__value" dir="ltr">
          {cell.mode === "range" ? (
            <span>{fa ? toFaDigits(cell.raw) : cell.raw}</span>
          ) : (
            <TmCounter
              value={num}
              format={(n) => {
                const str = fa ? toFaDigits(String(n)) : String(n);
                return cell.mode === "plusPrefix" ? `+${str}` : str;
              }}
            />
          )}
        </div>
        <p className="tm-numcell__label">{cell.label}</p>
      </article>
    </BlockReveal>
  );
}

export function TmGridNumbers({ stats }: { stats: TmData["stats"] }) {
  const { lang } = useLang();
  const fa = lang === "fa";

  const leftCol: KpiCellDef[] = [
    {
      id: "founded",
      raw: fa ? TMX_STATS_FALLBACK.foundedShamsi : TMX_STATS_FALLBACK.founded,
      mode: "year",
      label: fa ? "آغاز شکل‌گیری تجربه‌ها زیر نام نیله (۱۳۷۹ شمسی)" : "Experience unified under Neeleh (since 2000)",
    },
    {
      id: "graduates",
      raw: stats.graduates || TMX_STATS_FALLBACK.graduates,
      mode: "plusPrefix",
      label: fa ? "فارغ‌التحصیل فعال در دفاتر معماری" : "Practicing alumni across architecture firms",
    },
    {
      id: "courses",
      raw: stats.courses || TMX_STATS_FALLBACK.courses,
      mode: "plain",
      label: fa ? "دوره تخصصی از فاز دوم تا AI" : "Specialized workshops from CAD to AI",
    },
  ];

  const rightCol: KpiCellDef[] = [
    {
      id: "years",
      raw: stats.years || TMX_STATS_FALLBACK.years,
      mode: "plusPrefix",
      label: fa ? "سال تجربه حرفه‌ای گردآمده در طراحی و اجرا" : "Years of execution & design practice",
    },
    {
      id: "hours",
      raw: TMX_STATS_FALLBACK.hours,
      mode: "range",
      label: fa ? "ساعت آموزش فشرده و پروژه‌محور هر دوره" : "Hours of studio-grade intensive curriculum",
    },
    {
      id: "paths",
      raw: TMX_STATS_FALLBACK.paths,
      mode: "plain",
      label: fa ? "مسیر جامع شغلی در معماری معاصر" : "Structured architectural career pathways",
    },
  ];

  return (
    <section className="tm-numbers" id="numbers">
      <div className="tm-numbers__grid">
        <div className="tm-numbers__intro" dir={fa ? "rtl" : "ltr"}>
          <TmMaskText
            as="p"
            text={
              fa
                ? "از سال ۱۳۷۹ شمسی تا امروز — تجربه‌های گوناگون طراحی و اجرا در نام نیله گرد هم آمده و به آموزش تخصصی منتقل می‌شود."
                : "Since 2000 — diverse design and construction experiences unified under Neeleh and brought into education."
            }
          />
          <Link href="/why-neeleh" className="tm-link tm-numbers__intro-cta">
            {fa ? "آشنایی با تاریخچه ما" : "Discover our history"}
          </Link>
        </div>

        <div className="tm-numbers__cards" dir={fa ? "rtl" : "ltr"}>
          <div className="tm-numbers__col tm-numbers__col--a">
            {leftCol.map((c, i) => (
              <KpiCard key={c.id} cell={c} fa={fa} delay={i * 0.06} />
            ))}
          </div>
          <div className="tm-numbers__col tm-numbers__col--b">
            {rightCol.map((c, i) => (
              <KpiCard key={c.id} cell={c} fa={fa} delay={0.08 + i * 0.06} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Band 7: Team — Edge-to-Edge Portrait Strip on #F7F7F7 ───────────────── */

const FALLBACK_FACULTY = [
  {
    id: "f1",
    name: "Hamed Faraji",
    nameFa: "حامد فرجی",
    field: "Principal Architect · Phase-2 Lead",
    fieldFa: "معمار ارشد · فاز دوم",
    avatarUrl: null,
  },
  {
    id: "f2",
    name: "Sara Kiani",
    nameFa: "سارا کیانی",
    field: "BIM Director & Revit Systems",
    fieldFa: "مدیر سیستم‌های BIM و Revit",
    avatarUrl: null,
  },
  {
    id: "f3",
    name: "Aria Nabavi",
    nameFa: "آریا نبوی",
    field: "Computational Design & Rhino",
    fieldFa: "طراحی محاسباتی و راینو",
    avatarUrl: null,
  },
  {
    id: "f4",
    name: "Nima Bahrami",
    nameFa: "نیما بهرامی",
    field: "AI Architecture & Automation",
    fieldFa: "هوش مصنوعی در معماری",
    avatarUrl: null,
  },
  {
    id: "f5",
    name: "Mina Rahimi",
    nameFa: "مینا رحیمی",
    field: "Detailing & Studio Fabrication",
    fieldFa: "جزئیات اجرایی و ساخت",
    avatarUrl: null,
  },
];

function formatInstructorField(raw: string | null, fa: boolean): string {
  if (!raw) return fa ? "مدرس معماری" : "Studio Instructor";
  if (fa) return raw;
  const map: Record<string, string> = {
    "طراحی پارامتریک و هوش مصنوعی": "Parametric Design & AI",
    "مدیریت طراحی و سیستم‌های هوشمند معماری": "Principal · Architectural Systems",
    "نقشه‌کشی اجرایی و سیستم‌های BIM": "Execution Drafting & BIM",
    "مدلسازی سه‌بعدی و رندرینگ": "3D Modeling & Visualization",
  };
  if (map[raw]) return map[raw];
  if (/[\u0600-\u06FF]/.test(raw)) return "Senior Studio Instructor";
  return raw;
}

export function TmTeam({ instructors }: { instructors: TmData["instructors"] }) {
  const { lang } = useLang();
  const fa = lang === "fa";

  const items = React.useMemo(() => {
    const cleanDb = instructors.filter((u) => !/Admin/i.test(u.name));
    const list: { id: string; name: string; field: string | null; avatarUrl: string | null }[] = [
      ...cleanDb,
    ];
    for (const f of FALLBACK_FACULTY) {
      if (list.length >= 5) break;
      if (!list.some((x) => x.name === f.name)) {
        list.push({
          id: f.id,
          name: fa ? f.nameFa : f.name,
          field: fa ? f.fieldFa : f.field,
          avatarUrl: null,
        });
      }
    }
    return list;
  }, [instructors, fa]);

  return (
    <section className="tm-team" id="team">
      <div className="tm-team__head" dir={fa ? "rtl" : "ltr"}>
        <TmWordFill
          className="tm-team__title"
          text={
            fa
              ? "تیم مدرسان ما از معماران طراح و متخصصان BIM تشکیل شده است که آینده دفاتر معماری را می‌سازند."
              : "We are a team of practicing architects and BIM leaders who shape the future of studios."
          }
        />
      </div>

      <BlockReveal className="tm-team__carousel">
        <div className="tm-team__track" dir="ltr">
          {items.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              href="/instructors"
              className="tm-teamcard"
              data-cursor-view={fa ? "مشاهده" : "View"}
            >
              <div className="tm-teamcard__photo">
                <TmInstructorPortraitSvg name={p.name} index={i} />
              </div>
              <div className="tm-teamcard__meta" dir={fa ? "rtl" : "ltr"}>
                <div className="tm-teamcard__role">
                  {formatInstructorField(p.field, fa)}
                </div>
                <h3 className="tm-teamcard__name">{p.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </BlockReveal>
    </section>
  );
}

/* ── Top Crimson Hairline Scroll Progress ────────────────────────────────── */

export function TmScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });
  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 2,
        background: "#e41613",
        transformOrigin: "0 50%",
        scaleX,
        zIndex: 3100,
      }}
    />
  );
}
