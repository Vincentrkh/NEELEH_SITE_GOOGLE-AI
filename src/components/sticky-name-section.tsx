"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useLang } from "./language-provider";
import { useSafeReducedMotion } from "@/hooks/use-safe-reduced-motion";

/**
 * StickyNameSection — restrained editorial pause band separating
 * the curriculum catalog from studio philosophy.
 * Scales smoothly using compositor `transform: scale` with proper gap
 * between brand halves in both EN and FA without horizontal overflow.
 */
export function StickyNameSection() {
  const { t, isRTL } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useSafeReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [0.76, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.35, 1, 1, 0.7]);

  return (
    <section
      ref={ref}
      className="relative h-[135vh] border-t border-border"
      aria-label={t.a11y.stickyName}
    >
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden px-4">
        <motion.div
          style={reduced ? undefined : { scale, opacity }}
          className="flex flex-wrap items-baseline justify-center gap-x-4 sm:gap-x-8 gap-y-2 text-center text-foreground max-w-full"
        >
          <span
            className={`font-medium leading-[0.95] text-[clamp(2.75rem,11vw,11rem)] whitespace-nowrap ${
              isRTL ? "" : "tracking-[-0.04em]"
            }`}
          >
            {t.brand.stickyA}
          </span>
          <span
            className={`font-normal leading-[0.95] text-[clamp(2.75rem,11vw,11rem)] whitespace-nowrap text-muted-foreground ${
              isRTL ? "fa-serif" : "font-serif-display italic tracking-[-0.03em]"
            }`}
          >
            {t.brand.stickyB}
          </span>
        </motion.div>

        {/* Bottom quiet meta row */}
        <div className="absolute bottom-6 sm:bottom-8 left-0 right-0">
          <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-12">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t.sticky.copyright}</span>
              <span className="hidden sm:inline font-mono tabular-nums">{t.sticky.version}</span>
              <span>
                {t.sticky.madeWith}{" "}
                <span
                  className={`text-foreground ${
                    isRTL ? "fa-serif" : "font-serif-display italic"
                  }`}
                >
                  {t.sticky.madeWithAccent}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
