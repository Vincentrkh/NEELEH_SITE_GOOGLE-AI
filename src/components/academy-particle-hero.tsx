"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { SplitText } from "@/components/split-text";
import { useLang } from "@/components/language-provider";
import { CourseGuideDrawer } from "@/components/course-guide-drawer";
import { toFaDigits } from "@/lib/i18n";
import { HeroBlockEntrance } from "@/components/block-reveal";
import { TmHeroScene } from "@/components/tm/tm-hero-scene";
import type { ParticleSphereHandle } from "@/components/tm/particle-sphere-canvas";

/**
 * AcademyParticleHero — Neeleh Academy's 3D Particle Sphere Hero ("ذرات").
 * Preserves Academy bilingual Estedad / Plus Jakarta Sans typography,
 * course CTAs & CourseGuideDrawer while rendering the scroll-driven
 * interactive 3D Particle Sphere in Light & Dark modes.
 */
export function AcademyParticleHero() {
  const { lang, t, isRTL } = useLang();
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

      const exitRaw = Math.min(1, Math.max(0, (p - 0.74) / 0.2));
      const exitEase = 1 - Math.pow(1 - exitRaw, 2.2);
      const copyRaw = Math.min(1, Math.max(0, (p - 0.7) / 0.2));
      const copyEase = 1 - Math.pow(1 - copyRaw, 2);

      const sphereScale = 1 - exitEase * 0.48;
      const sphereOpacity = 1 - exitEase;
      const backdropOpacity = 1 - exitEase;
      const copyOpacity = 1 - copyEase;
      const copyY = -copyEase * 52;

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

  const stepCur = String(Math.min(sceneCount, activeScene + 1)).padStart(2, "0");
  const stepMax = String(sceneCount).padStart(2, "0");
  const runwayHeights = Math.max(260, sceneCount * 80 + 90);

  return (
    <section
      id="top"
      ref={heroRef}
      className="relative bg-background border-b border-border/60"
      style={{ height: `${runwayHeights}svh` }}
    >
      <div
        ref={stickyRef}
        className="tm-hero__sticky"
        style={{ background: "var(--background)" }}
      >
        <TmHeroScene
          sphereRef={sphereRef}
          onScenesCountChange={handleScenesCountChange}
          onActiveSceneChange={handleActiveSceneChange}
        />

        {/* Soft top & bottom gradient scrims so Academy text stays legible over 3D glass in Light & Dark modes */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-32"
          style={{
            background:
              "linear-gradient(to bottom, color-mix(in oklab, var(--background) 78%, transparent), transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-44"
          style={{
            background:
              "linear-gradient(to top, var(--background) 14%, color-mix(in oklab, var(--background) 70%, transparent) 55%, transparent)",
          }}
        />

        <div className="tm-hero__copy relative z-[2] flex h-full w-full flex-col justify-between mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-12 pt-20 sm:pt-24 pb-20 sm:pb-16 pointer-events-none">
          {/* Top editorial row */}
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3.5">
              <div className="text-xs leading-relaxed text-foreground/75">
                <div className="font-medium text-foreground">
                  {t.hero.roleA} {t.hero.roleB}
                </div>
                <div>
                  {fa ? "دوره‌های تخصصی ۹‌گانه · ۳ سطح" : "9 Specialized Courses · 3 Tiers"}
                </div>
              </div>
            </div>

            <div className="text-end text-xs leading-relaxed">
              <div className="font-medium text-foreground">{t.hero.basedIn}</div>
              <div className="text-foreground/75 tabular-nums">{t.hero.workingWith}</div>
            </div>
          </div>

          {/* Center primary display focal statement */}
          <div className="my-auto py-4 grid grid-cols-12 gap-6 lg:gap-10 items-end">
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
                  className={`font-medium text-foreground text-balance drop-shadow-[0_1px_12px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_2px_16px_rgba(0,0,0,0.55)] ${
                    fa
                      ? "text-[clamp(2.35rem,6.5vw,5.75rem)] leading-[1.15]"
                      : "text-[clamp(2.6rem,6.8vw,6.1rem)] tracking-[-0.04em] leading-[0.95]"
                  }`}
                />
              </div>

              <p
                className={`max-w-2xl text-balance ${
                  fa
                    ? "text-lg sm:text-2xl font-medium leading-[1.45] text-foreground/90"
                    : "font-serif-display text-2xl sm:text-4xl leading-[1.2] text-foreground/90"
                }`}
              >
                {t.hero.taglineAccent}
              </p>
            </div>

            {/* Right / End focal intro + action */}
            <HeroBlockEntrance
              delay={0.18}
              className="col-span-12 lg:col-span-4 space-y-4 pointer-events-auto"
            >
              <p className="text-sm sm:text-base leading-relaxed text-foreground/85 bg-background/55 dark:bg-background/45 backdrop-blur-sm rounded-lg border border-border/50 p-3.5 sm:p-4">
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
                  triggerClassName="inline-flex min-h-[46px] items-center gap-2 rounded-md border border-border bg-background/85 backdrop-blur-sm px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:border-foreground transition-colors whitespace-nowrap shrink-0"
                />
              </div>
            </HeroBlockEntrance>
          </div>

          {/* Bottom discipline strip + interactive particle scene selector */}
          <HeroBlockEntrance
            delay={0.28}
            className="pt-4 border-t border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-3 pointer-events-auto"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-foreground/75">
              {t.hero.descriptors.map((word, i) => (
                <span key={`${word}-${i}`} className="inline-flex items-center gap-4">
                  <span
                    className={
                      i === 0 || i === t.hero.descriptors.length - 1
                        ? "text-foreground font-medium"
                        : ""
                    }
                  >
                    {word}
                  </span>
                  {i < t.hero.descriptors.length - 1 && (
                    <span aria-hidden className="text-border">
                      /
                    </span>
                  )}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between md:justify-end gap-5">
              <div className="inline-flex items-center gap-2 text-xs text-foreground/75 tabular-nums">
                <span>
                  {fa
                    ? `${toFaDigits(stepCur)} / ${toFaDigits(stepMax)} · اسکرول`
                    : `${stepCur} / ${stepMax} · Scroll`}
                </span>
                <div className="inline-flex items-center gap-1" role="group" aria-label={fa ? "صحنه‌های گوی ذرات" : "Particle scenes"}>
                  {Array.from({ length: sceneCount }).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        activeSceneRef.current = idx;
                        setActiveScene(idx);
                        sphereRef.current?.goScene(idx);
                      }}
                      aria-label={fa ? `صحنه ${toFaDigits(idx + 1)}` : `Scene ${idx + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        activeScene === idx
                          ? "w-5 bg-foreground"
                          : "w-2 bg-foreground/30 hover:bg-foreground/60"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <a
                href="#work"
                className="inline-flex items-center gap-2 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors whitespace-nowrap shrink-0"
              >
                <span className="tabular-nums">
                  {fa ? `${toFaDigits("09")} دوره تخصصی` : "09 courses"}
                </span>
                <ArrowDown className="size-3.5" aria-hidden />
              </a>
            </div>
          </HeroBlockEntrance>
        </div>
      </div>
    </section>
  );
}
