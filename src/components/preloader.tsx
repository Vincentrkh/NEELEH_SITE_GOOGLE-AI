"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";

/**
 * Preloader — counts 0 → 100 with gooey morph on the digits,
 * then slides the panel up to reveal the page.
 *
 * Implementation note: state updates happen inside rAF callbacks
 * (external tick), not synchronously in the effect body, so they
 * don't trigger the React "set-state-in-effect" lint rule.
 */
export function Preloader() {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const { lang, t } = useLang();

  useEffect(() => {
    let raf = 0;
    let finishTimer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      // Skip animation entirely
      finishTimer = setTimeout(() => {
        if (!cancelled) {
          setCount(100);
          setDone(true);
        }
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(finishTimer);
      };
    }

    const start = performance.now();
    const duration = 1700;

    const tick = (now: number) => {
      if (cancelled) return;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setCount(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        finishTimer = setTimeout(() => {
          if (!cancelled) setDone(true);
        }, 350);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(finishTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="preloader"
          initial={{ y: "0%" }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          className="fixed inset-0 z-[9999] bg-background flex items-end justify-end pointer-events-none"
        >
          <div className="px-5 sm:px-8 lg:px-12 pb-8 sm:pb-12">
            <div className="flex items-baseline gap-1 font-medium tabular-nums tracking-[-0.04em] text-[clamp(3rem,12vw,12rem)] leading-[0.9]">
              <span className="goo-text">
                {lang === "fa" ? toFaDigits(count) : count}
              </span>
              <span className="text-[0.5em] text-muted-foreground">
                {t.preloader.percent}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
