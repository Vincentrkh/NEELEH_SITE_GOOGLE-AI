"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { useLang } from "@/components/language-provider";
import { TMX_STRATEGY as CFG } from "@/config/tm-theme";
import { TmStrategySculptureSvg } from "@/components/tm/tm-svg-art";

/* ═══════════════════════════════════════════════════════════════════════════
   TmMorphMark + TmStrategyStage
   ───────────────────────────────────────────────────────────────────────────
   Exact 1:1 reconstruction of `.component--contentscrollcenter` from
   tresmarescapital.com/en/ (Rec_0004_9ffd2644.mp4 00:28 -> 00:34):
     0: Two crisp staggered horizontal red blocks (00:29)
     1: Four separated red squares in a 2x2 grid (00:30 & 00:54)
     2: Single clean solid crimson circle (00:32)
     3: Wide flat-bottom pitched architectural crown/gable (00:33 & 00:53)
   Plus: continuous animated monochrome SVG sculptures moving vertically
   through the stage + circular crimson [VIEW] hover zone in center!
   ═══════════════════════════════════════════════════════════════════════════ */

const RED_MARK = "#e41613";

type BezPoint = { p: [number, number]; in: [number, number]; out: [number, number] };
type Shape = BezPoint[];

function shapeToPath(s: Shape): string {
  let d = `M ${s[0].p[0].toFixed(1)} ${s[0].p[1].toFixed(1)}`;
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const cur = s[i];
    const nxt = s[(i + 1) % n];
    d += ` C ${cur.out[0].toFixed(1)} ${cur.out[1].toFixed(1)}, ${nxt.in[0].toFixed(1)} ${nxt.in[1].toFixed(1)}, ${nxt.p[0].toFixed(1)} ${nxt.p[1].toFixed(1)}`;
  }
  return d + " Z";
}

function lerpShape(a: Shape, b: Shape, t: number): Shape {
  const L = (u: [number, number], v: [number, number]): [number, number] => [
    u[0] + (v[0] - u[0]) * t,
    u[1] + (v[1] - u[1]) * t,
  ];
  return a.map((pa, i) => ({
    p: L(pa.p, b[i].p),
    in: L(pa.in, b[i].in),
    out: L(pa.out, b[i].out),
  }));
}

function quad(pts: [number, number][]): Shape {
  const expanded: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    expanded.push(a);
    expanded.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return expanded.map((p) => ({ p, in: p, out: p }));
}

function circleArcPie(cx: number, cy: number, r: number, startDeg: number, endDeg: number): Shape {
  // Smooth 8-point pie quadrant touching cleanly at (cx, cy) with zero center gap
  const pts: [number, number][] = [[cx, cy]];
  const arcSteps = 6;
  for (let i = 0; i <= arcSteps; i++) {
    const ang = ((startDeg + ((endDeg - startDeg) * i) / arcSteps) * Math.PI) / 180;
    pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  return pts.slice(0, 8).map((p) => ({ p, in: p, out: p }));
}

/* Four symmetric sub-shapes on a 580x490 canvas matching video frames 00:29..00:33 */
const BLOCKS_PER_STATE: [Shape, Shape, Shape, Shape][] = [
  // State 0 (00:29) — Two staggered wide horizontal ribbons (top-right + bottom-left)
  [
    quad([[195, 58], [340, 58], [340, 178], [195, 178]]),
    quad([[340, 58], [485, 58], [485, 178], [340, 178]]),
    quad([[95, 290], [240, 290], [240, 410], [95, 410]]),
    quad([[240, 290], [385, 290], [385, 410], [240, 410]]),
  ],
  // State 1 (00:30 & 00:54) — Four separated crisp crimson squares in 2x2 grid
  [
    quad([[138, 92], [268, 92], [268, 222], [138, 222]]),
    quad([[312, 92], [442, 92], [442, 222], [312, 222]]),
    quad([[138, 268], [268, 268], [268, 398], [138, 398]]),
    quad([[312, 268], [442, 268], [442, 398], [312, 398]]),
  ],
  // State 2 (00:32) — Single seamless solid crimson circle (4 pie quadrants flush)
  [
    circleArcPie(290, 245, 148, 180, 270),
    circleArcPie(290, 245, 148, 270, 360),
    circleArcPie(290, 245, 148, 90, 180),
    circleArcPie(290, 245, 148, 0, 90),
  ],
  // State 3 (00:33 & 00:53) — Wide pitched architectural gable / crown monolith
  [
    quad([[118, 148], [290, 72], [290, 248], [118, 248]]),
    quad([[290, 72], [462, 148], [462, 248], [290, 248]]),
    quad([[118, 246], [290, 246], [290, 418], [118, 418]]),
    quad([[290, 246], [462, 246], [462, 418], [290, 418]]),
  ],
];

function morphPathsAt(progress: number): [string, string, string, string] {
  const n = BLOCKS_PER_STATE.length;
  const scaled = Math.min(n - 1.0001, Math.max(0, progress * (n - 1)));
  const i = Math.floor(scaled);
  const rawT = scaled - i;
  const t = rawT < 0.5 ? Math.pow(2, 14 * rawT - 7) / 2 : (2 - Math.pow(2, -14 * rawT + 7)) / 2;
  const cur = BLOCKS_PER_STATE[i];
  const nxt = BLOCKS_PER_STATE[Math.min(n - 1, i + 1)];
  return [
    shapeToPath(lerpShape(cur[0], nxt[0], t)),
    shapeToPath(lerpShape(cur[1], nxt[1], t)),
    shapeToPath(lerpShape(cur[2], nxt[2], t)),
    shapeToPath(lerpShape(cur[3], nxt[3], t)),
  ];
}

export function TmMorphMark({ progress }: { progress: MotionValue<number> }) {
  const rawReduced = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const reduced = mounted && Boolean(rawReduced);
  const r0 = React.useRef<SVGPathElement>(null);
  const r1 = React.useRef<SVGPathElement>(null);
  const r2 = React.useRef<SVGPathElement>(null);
  const r3 = React.useRef<SVGPathElement>(null);
  const smooth = useSpring(progress, { stiffness: 120, damping: 24, mass: 0.65 });
  const rotZ = useTransform(smooth, [0, 0.33, 0.66, 1], [0, -3.5, 0, 2.5]);

  useMotionValueEvent(smooth, "change", (v) => {
    const [d0, d1, d2, d3] = morphPathsAt(v);
    r0.current?.setAttribute("d", d0);
    r1.current?.setAttribute("d", d1);
    r2.current?.setAttribute("d", d2);
    r3.current?.setAttribute("d", d3);
  });

  const init = morphPathsAt(0);
  return (
    <motion.div
      className="tm-morph"
      style={reduced ? undefined : { rotate: rotZ }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 580 490" className="tm-morph__svg">
        <path ref={r0} d={init[0]} fill={RED_MARK} />
        <path ref={r1} d={init[1]} fill={RED_MARK} />
        <path ref={r2} d={init[2]} fill={RED_MARK} />
        <path ref={r3} d={init[3]} fill={RED_MARK} />
      </svg>
    </motion.div>
  );
}

/* ── Main Pinned Stage Component ────────────────────────────────────────── */

export type TmStrategy = {
  id: string;
  label: { fa: string; en: string };
  title: { fa: readonly [string, string]; en: readonly [string, string] };
  desc: { fa: string; en: string };
  kpi: readonly { key: { fa: string; en: string }; value: { fa: string; en: string } }[];
  art: "slab" | "cross" | "circle" | "gable";
  href: string;
};

export function TmStrategyStage({ strategies }: { strategies: readonly TmStrategy[] }) {
  const { lang } = useLang();
  const fa = lang === "fa";
  const ref = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  React.useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      const idx = Math.min(
        strategies.length - 1,
        Math.max(0, Math.floor(v * strategies.length)),
      );
      setActive(idx);
    });
    return () => unsub();
  }, [scrollYProgress, strategies.length]);

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const w = window as unknown as { __tmLenis?: { scrollTo: (t: number, o?: object) => void } };
    const span = el.offsetHeight - window.innerHeight;
    const frac =
      i === 0
        ? 0
        : i === strategies.length - 1
          ? 1
          : (i + 0.5) / strategies.length;
    const target = el.offsetTop + frac * span;
    if (w.__tmLenis) w.__tmLenis.scrollTo(target, { duration: 1.5 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <section
      className="tm-solutions"
      id="solutions"
      ref={ref}
      style={{ height: `${strategies.length * 900}px` }}
    >
      <div className="tm-solutions__sticky">
        {/* Continuous Morphing Red Core Centerpiece */}
        <div className="tm-solutions__mark">
          <TmMorphMark progress={scrollYProgress} />
        </div>

        {/* Individual Scroll-Curtained Slides (strictly non-overlapping windows) */}
        {strategies.map((s, i) => (
          <StrategyCurtain
            key={s.id}
            s={s}
            i={i}
            total={strategies.length}
            progress={scrollYProgress}
            fa={fa}
          />
        ))}

        {/* Persistent Top-Left Anchor List (matching 00:29..00:33) */}
        <ul className="tm-solutions__nav" aria-label={fa ? "مسیرها" : "Solutions"}>
          {strategies.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                data-active={i === active}
                aria-current={i === active ? "true" : undefined}
                onClick={() => goTo(i)}
              >
                {fa ? s.label.fa : s.label.en}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StrategyCurtain({
  s,
  i,
  total,
  progress,
  fa,
}: {
  s: TmStrategy;
  i: number;
  total: number;
  progress: MotionValue<number>;
  fa: boolean;
}) {
  const segStart = i / total;
  const segEnd = (i + 1) / total;
  const deadGap = 0.008;
  const fadeSpan = 0.048;

  // Strictly non-overlapping: outgoing hits 0 at (segEnd - deadGap),
  // incoming stays at 0 until (segStart + deadGap) so two slides never overlap.
  const clipProgress = useTransform(
    progress,
    i === 0
      ? [0, 0.001]
      : [Math.min(1, segStart + deadGap), Math.min(1, segStart + deadGap + fadeSpan)],
    i === 0 ? [1, 1] : [0, 1],
  );
  const clipOut = useTransform(
    progress,
    i === total - 1
      ? [0.999, 1]
      : [Math.max(0, segEnd - deadGap - fadeSpan), Math.max(0, segEnd - deadGap)],
    i === total - 1 ? [1, 1] : [1, 0],
  );

  const visibleFactor = useTransform([clipProgress, clipOut], ([inV, outV]: number[]) =>
    Math.min(inV, outV),
  );
  const clipPath = useTransform(clipProgress, (v) =>
    v >= 0.995 ? "inset(0% 0% 0% 0%)" : `inset(${((1 - v) * 100).toFixed(1)}% 0% 0% 0%)`,
  );
  const pointerEvents = useTransform(visibleFactor, (v) => (v > 0.2 ? "auto" : "none"));
  const visibility = useTransform(visibleFactor, (v) => (v > 0.01 ? "visible" : "hidden"));
  const infoY = useTransform(clipProgress, [0, 1], [CFG.textYPercent, 0]);
  // Continuous vertical motion of monochrome SVG through the slide window (matching 00:29..00:33)
  const artScrollY = useTransform(
    progress,
    [Math.max(0, segStart), Math.min(1, segEnd)],
    ["7%", "-9%"],
  );

  return (
    <motion.article
      className="tm-solutions__slide"
      style={{
        opacity: visibleFactor,
        clipPath,
        pointerEvents,
        visibility,
        zIndex: i + 2,
      }}
    >
      {/* Center Interactive Hotspot for signature Red Circular [VIEW] Badge */}
      <Link
        href={s.href}
        className="tm-solutions__hotspot"
        data-cursor-view={fa ? "مشاهده" : "View"}
        aria-label={fa ? `${s.title.fa.join(" ")}` : `${s.title.en.join(" ")}`}
      />

      {/* Monochrome Animated Architectural Sculpture Overlay */}
      <motion.div className="tm-solutions__sculpture" style={{ y: artScrollY }}>
        <TmStrategySculptureSvg
          variant={s.id as "drafting" | "bim" | "parametric" | "ai"}
        />
      </motion.div>

      {/* Gigantic Centerpiece 2-Line Display Title */}
      <div className="tm-solutions__title-wrap">
        <motion.h3 className="tm-solutions__title" style={{ y: infoY }} dir={fa ? "rtl" : "ltr"}>
          <span className="tm-solutions__title-l1">{fa ? s.title.fa[0] : s.title.en[0]}</span>
          <span className="tm-solutions__title-l2">{fa ? s.title.fa[1] : s.title.en[1]}</span>
        </motion.h3>
      </div>

      {/* Bottom-Left Narrative & Know More Link */}
      <motion.div className="tm-solutions__desc" style={{ y: infoY }} dir={fa ? "rtl" : "ltr"}>
        <p>{fa ? s.desc.fa : s.desc.en}</p>
        <Link href={s.href} className="tm-link tm-solutions__more">
          {fa ? "اطلاعات بیشتر" : "Know more"}
        </Link>
      </motion.div>

      {/* Bottom-Right Vertical KPI Column */}
      <motion.dl className="tm-solutions__data" style={{ y: infoY }}>
        {s.kpi.map((kv) => (
          <div key={kv.key.en}>
            <dt>{fa ? kv.key.fa : kv.key.en}</dt>
            <dd>{fa ? kv.value.fa : kv.value.en}</dd>
          </div>
        ))}
      </motion.dl>
    </motion.article>
  );
}
