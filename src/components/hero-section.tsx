"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { SplitText } from "./split-text";
import { useLang } from "@/components/language-provider";
import { CourseGuideDrawer } from "@/components/course-guide-drawer";
import { toFaDigits } from "@/lib/i18n";
import { HeroBlockEntrance } from "@/components/block-reveal";

/**
 * HeroSection — Neeleh Architecture Academy focal opening.
 * Fixes bilingual Estedad / Plus Jakarta Sans vertical rhythm,
 * removes rotated vertical RTL distortion and giant colliding descriptor widths,
 * and presents a clear primary CTA + interactive Course Guide trigger.
 */
export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { lang, t, isRTL } = useLang();
  const fa = lang === "fa";

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.9], [1, 0]);

  return (
    <section
      id="top"
      ref={ref}
      className="relative min-h-[100svh] flex flex-col justify-between overflow-hidden pt-20 pb-10 border-b border-border/60"
    >
      <motion.div
        style={{ y, opacity }}
        className="flex-1 flex flex-col justify-between mx-auto w-full max-w-[1800px] px-5 sm:px-8 lg:px-12 py-8 sm:py-12"
      >
        {/* Top editorial row */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <MaskIcon />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <div className="font-medium text-foreground">{t.hero.roleA} {t.hero.roleB}</div>
              <div>{fa ? "دوره‌های تخصصی ۹‌گانه · ۳ سطح" : "9 Specialized Courses · 3 Tiers"}</div>
            </div>
          </div>

          <div className="text-end text-xs leading-relaxed">
            <div className="font-medium text-foreground">{t.hero.basedIn}</div>
            <div className="text-muted-foreground tabular-nums">{t.hero.workingWith}</div>
          </div>
        </div>

        {/* Center primary display focal statement */}
        <div className="my-10 sm:my-14 grid grid-cols-12 gap-6 lg:gap-10 items-end">
          <div className="col-span-12 lg:col-span-8 space-y-3">
            <div className="mask-reveal">
              <SplitText
                as="h1"
                text={`${t.brand.heroLine1} ${t.brand.heroLine2}`}
                mode="chars"
                trigger="mount"
                delay={0.2}
                stagger={0.03}
                duration={0.75}
                className={`font-medium text-foreground text-balance ${
                  fa
                    ? "text-[clamp(2.5rem,7vw,6.2rem)] leading-[1.15]"
                    : "text-[clamp(2.75rem,7.2vw,6.5rem)] tracking-[-0.04em] leading-[0.95]"
                }`}
              />
            </div>

            <p
              className={`max-w-2xl text-balance ${
                fa
                  ? "text-xl sm:text-3xl font-medium leading-[1.45] text-foreground/85"
                  : "font-serif-display text-2xl sm:text-4xl leading-[1.2] text-foreground/85"
              }`}
            >
              {t.hero.taglineAccent}
            </p>
          </div>

          {/* Right / End focal intro + action */}
          <HeroBlockEntrance delay={0.18} className="col-span-12 lg:col-span-4 space-y-5">
            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
              {t.hero.tagline}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/courses"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-md bg-foreground text-background px-5 py-2.5 text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
              >
                <span>{fa ? "مشاهده کاتالوگ دوره‌ها" : "Explore Courses"}</span>
                <ArrowUpRight className={`size-4 ${isRTL ? "-scale-x-100" : ""}`} aria-hidden />
              </Link>
              <CourseGuideDrawer
                triggerLabel={fa ? "راهنمای انتخاب مسیر" : "Course Path Guide"}
                triggerClassName="inline-flex min-h-[46px] items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:border-foreground transition-colors whitespace-nowrap shrink-0"
              />
            </div>
          </HeroBlockEntrance>
        </div>

        {/* Bottom discipline architecture strip — zero collisions, balanced alignment */}
        <HeroBlockEntrance delay={0.28} className="pt-6 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            {t.hero.descriptors.map((word, i) => (
              <span key={`${word}-${i}`} className="inline-flex items-center gap-4">
                <span className={i === 0 || i === t.hero.descriptors.length - 1 ? "text-foreground font-medium" : ""}>
                  {word}
                </span>
                {i < t.hero.descriptors.length - 1 && (
                  <span aria-hidden className="text-border">/</span>
                )}
              </span>
            ))}
          </div>

          <a
            href="#work"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
          >
            <span className="tabular-nums">
              {fa ? `${toFaDigits("09")} دوره تخصصی` : "09 courses"}
            </span>
            <ArrowDown className="size-3.5" aria-hidden />
          </a>
        </HeroBlockEntrance>
      </motion.div>
    </section>
  );
}

function MaskIcon() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0"
      aria-hidden
    >
      <svg viewBox="0 0 80 80" className="w-full h-full">
        <path
          d="M 22 18 C 12 22, 8 34, 12 46 C 16 58, 28 66, 42 64 C 56 62, 68 52, 68 38 C 68 24, 58 14, 44 14 C 36 14, 28 16, 22 18 Z"
          fill="currentColor"
          className="text-foreground"
        />
        <circle cx="30" cy="38" r="4" fill="var(--background)" />
        <circle cx="50" cy="38" r="4" fill="var(--background)" />
        <rect x="30" y="36.5" width="20" height="1.5" fill="var(--background)" />
      </svg>
    </motion.div>
  );
}
