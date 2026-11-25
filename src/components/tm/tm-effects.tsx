"use client";

import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
  animate,
  type MotionValue,
} from "framer-motion";
import Lenis from "lenis";

/* ═══════════════════════════════════════════════════════════════════════════
   TM Effects — Lenis, Red Follow Cursor, Scroll-Fill Typography, Mask, Magnet
   ═══════════════════════════════════════════════════════════════════════════ */

declare global {
  interface Window {
    __tmLenis?: Lenis;
  }
}

export function TmSmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.09,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    window.__tmLenis = lenis;

    let raf = 0;
    const loop = (t: number) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.__tmLenis = undefined;
    };
  }, []);
  return null;
}

export function tmScrollTo(target: HTMLElement | number, offset = 0) {
  const lenis = typeof window !== "undefined" ? window.__tmLenis : undefined;
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.4 });
  } else if (typeof target === "number") {
    window.scrollTo({ top: target + offset, behavior: "smooth" });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + offset, behavior: "smooth" });
  }
}

/* ── Signature Red Cursor (`6px` dot + `[View]` pill on data-cursor-view) ─ */

export function TmCursor() {
  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);
  const scale = useSpring(1, { stiffness: 320, damping: 26, mass: 0.4 });
  const [label, setLabel] = React.useState<string | null>(null);
  const [on, setOn] = React.useState(false);

  React.useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setOn(true);
    document.body.classList.add("tm-cursor-on");

    const EXPO_OUT: [number, number, number, number] = [0.19, 1, 0.22, 1];
    const move = (e: MouseEvent) => {
      animate(dotX, e.clientX, { duration: 1, ease: EXPO_OUT });
      animate(dotY, e.clientY, { duration: 1, ease: EXPO_OUT });
    };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const view = t.closest<HTMLElement>("[data-cursor-view]");
      const interactive = t.closest(
        "a, button, [role='button'], input, textarea, select, label",
      );
      if (view) {
        setLabel(view.dataset.cursorView || "View");
        scale.set(0);
      } else if (interactive) {
        setLabel(null);
        scale.set(1.85);
      } else {
        setLabel(null);
        scale.set(1);
      }
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    return () => {
      document.body.classList.remove("tm-cursor-on");
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
    };
  }, [dotX, dotY, scale]);

  if (!on) return null;

  return (
    <div className="tm-cursor" aria-hidden="true">
      <motion.div
        className="tm-cursor__dot"
        style={{ x: dotX, y: dotY, scale }}
      />
      {label && (
        <motion.div
          className="tm-cursor__disc"
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.2, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{ x: dotX, y: dotY }}
        >
          <span>{label}</span>
        </motion.div>
      )}
    </div>
  );
}

/* ── Scroll-Linked Fill Typography (matches .title.--fill on Tres Mares) ── */

function FillToken({
  progress,
  range,
  children,
  accent,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
  accent?: boolean;
}) {
  const from = accent ? "rgba(228, 22, 19, 0.14)" : "rgba(43, 43, 43, 0.12)";
  const to = accent ? "#e41613" : "#2b2b2b";
  const color = useTransform(progress, range, [from, to]);
  return (
    <motion.span className="tm-wordfill" style={{ color, display: "inline-block" }}>
      {children}
    </motion.span>
  );
}

/**
 * TmWordFill — mirrors Tres Mares' large centered `--fill` text blocks:
 *   - Latin text fills character-by-character smoothly on scroll (04-y2550 & 12-y9750)
 *   - Persian/Arabic script fills word-by-word to preserve connected ligatures!
 *   - Optional `highlight` phrase renders in crisp Brand Red (#E41613).
 */
export function TmWordFill({
  text,
  highlight,
  className,
}: {
  text: string;
  highlight?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.92", "end 0.56"],
  });

  const isRtlScript = /[\u0600-\u06FF]/.test(text);

  // Build flat token array while remembering which tokens belong to highlighted substring
  const tokens = React.useMemo(() => {
    const out: { val: string; isSpace: boolean; accent: boolean }[] = [];
    const hiIdx = highlight ? text.indexOf(highlight) : -1;
    const hiEnd = hiIdx >= 0 && highlight ? hiIdx + highlight.length : -1;

    if (isRtlScript) {
      let pos = 0;
      const parts = text.split(/(\s+)/);
      for (const p of parts) {
        const start = pos;
        pos += p.length;
        out.push({
          val: p,
          isSpace: /^\s+$/.test(p),
          accent: hiIdx >= 0 && start >= hiIdx && pos <= hiEnd,
        });
      }
      return out;
    }

    // Latin: per-word grouping with character tokens inside each word
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      out.push({
        val: ch,
        isSpace: ch === " ",
        accent: hiIdx >= 0 && i >= hiIdx && i < hiEnd,
      });
    }
    return out;
  }, [text, highlight, isRtlScript]);

  const activeCount = React.useMemo(
    () => tokens.filter((t) => !t.isSpace).length || 1,
    [tokens],
  );

  // For Latin character mode, group non-space chars by words so lines never break mid-word
  if (!isRtlScript) {
    let charIndex = 0;
    const words = text.split(/(\s+)/);
    let cursor = 0;
    const hiIdx = highlight ? text.indexOf(highlight) : -1;
    const hiEnd = hiIdx >= 0 && highlight ? hiIdx + highlight.length : -1;

    return (
      <p ref={ref} className={className} aria-label={text}>
        {words.map((segment, wi) => {
          const segStart = cursor;
          cursor += segment.length;
          if (/^\s+$/.test(segment)) {
            return <React.Fragment key={`sp-${wi}`}> </React.Fragment>;
          }
          const chars = Array.from(segment);
          const isAccentWord = hiIdx >= 0 && segStart >= hiIdx && segStart < hiEnd;
          return (
            <span
              key={`w-${wi}`}
              className={`inline-block whitespace-nowrap ${isAccentWord ? "font-semibold" : ""}`}
            >
              {chars.map((ch, ci) => {
                const idx = charIndex++;
                const start = idx / activeCount;
                const end = Math.min(1, (idx + 1.4) / activeCount);
                return (
                  <FillToken
                    key={ci}
                    progress={scrollYProgress}
                    range={[start, end]}
                    accent={isAccentWord}
                  >
                    {ch}
                  </FillToken>
                );
              })}
            </span>
          );
        })}
      </p>
    );
  }

  let visibleWordIndex = 0;
  return (
    <p ref={ref} className={className} aria-label={text}>
      {tokens.map((tok, i) => {
        if (tok.isSpace) return <React.Fragment key={`sp-${i}`}> </React.Fragment>;
        const idx = visibleWordIndex++;
        const start = idx / activeCount;
        const end = Math.min(1, (idx + 1.2) / activeCount);
        return (
          <FillToken
            key={`t-${i}`}
            progress={scrollYProgress}
            range={[start, end]}
            accent={tok.accent}
          >
            {tok.val}
          </FillToken>
        );
      })}
    </p>
  );
}

/* ── ScrambleText — Decode reveal ───────────────────────────────────────── */

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function randChar() {
  return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
}

export function TmScrambleText({
  text,
  className,
  duration = 1.4,
  delay = 0,
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  duration?: number;
  delay?: number;
  as?: "p" | "span" | "div" | "h2" | "h3";
}) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const [display, setDisplay] = React.useState(text);

  const isFa = /[\u0600-\u06FF]/.test(text);
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  React.useEffect(() => {
    if (!inView) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(text);
      return;
    }

    let raf = 0;
    const start = performance.now() + delay * 1000;
    const total = duration * 1000;

    const tick = (now: number) => {
      if (now < start) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - start) / total);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

      if (isFa) {
        const revealedCount = Math.floor(eased * words.length);
        const out: string[] = [];
        for (let i = 0; i < words.length; i++) {
          if (i < revealedCount) {
            out.push(words[i]);
          } else if (i === revealedCount) {
            const w = words[i];
            const cutoff = Math.floor((eased * words.length - i) * w.length);
            out.push(
              w
                .split("")
                .map((c, j) => (j < cutoff ? c : randChar()))
                .join(""),
            );
          } else {
            out.push(
              words[i]
                .split("")
                .map(() => randChar())
                .join(""),
            );
          }
        }
        setDisplay(out.join(" "));
      } else {
        const totalChars = text.length;
        const revealedCount = Math.floor(eased * totalChars);
        let out = "";
        for (let i = 0; i < totalChars; i++) {
          const c = text[i];
          if (c === " " || c === "\n") out += c;
          else if (i < revealedCount) out += c;
          else out += randChar();
        }
        setDisplay(out);
      }

      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, text, duration, delay, isFa, words]);

  return (
    <Tag ref={ref as React.Ref<HTMLParagraphElement>} className={className}>
      {display}
    </Tag>
  );
}

/* ── MaskReveal — Rising word clip-mask ─────────────────────────────────── */

export function TmMaskText({
  text,
  className,
  delay = 0,
  stagger = 0.02,
  as: Tag = "p",
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: "p" | "span" | "div";
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const words = React.useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLParagraphElement>}
      className={`${className ?? ""} ${inView ? "tm-mask--in" : ""}`}
    >
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span
            className="tm-mask__word"
            style={inView ? { transitionDelay: `${delay + i * stagger}s` } : undefined}
          >
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </React.Fragment>
      ))}
    </Tag>
  );
}

/* ── Magnet — Horizontal ripple card entrance ───────────────────────────── */

export function TmMagnet({
  children,
  className,
  delay = 0,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
} & React.ComponentProps<typeof motion.div>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const [xDelay, setXDelay] = React.useState(0);

  React.useEffect(() => {
    if (inView && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setXDelay(rect.left * 0.00025);
    }
  }, [inView]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ y: 50, scale: 0.96, opacity: 0.0001 }}
      animate={
        inView
          ? { y: 0, scale: 1, opacity: 1 }
          : { y: 50, scale: 0.96, opacity: 0.0001 }
      }
      transition={{
        duration: 1.5,
        ease: [0.16, 1, 0.3, 1],
        delay: delay + xDelay,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ── Counter ────────────────────────────────────────────────────────────── */

export function TmCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1.1,
  format,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  format?: (n: number) => string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
      onComplete: () => setDisplay(value),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  const text = format
    ? format(display)
    : `${prefix}${display.toLocaleString("en-US")}${suffix}`;

  return (
    <span ref={ref} className="tabular-nums">
      {text}
    </span>
  );
}
