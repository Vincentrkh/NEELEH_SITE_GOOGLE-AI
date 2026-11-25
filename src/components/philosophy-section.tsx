"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SplitText } from "./split-text";
import { useLang } from "./language-provider";
import { toFaDigits } from "@/lib/i18n";
import { useSafeReducedMotion } from "@/hooks/use-safe-reduced-motion";

export function PhilosophySection() {
  const { lang, t, isRTL } = useLang();
  const ref = useRef<HTMLElement>(null);
  const reduced = useSafeReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [32, -32]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.55, 1, 1, 0.55]);

  return (
    <section
      id="philosophy"
      ref={ref}
      className="relative py-24 sm:py-36 overflow-hidden border-t border-border"
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12 relative z-10">
        {/* Clean editorial section label */}
        <div className="mb-12 sm:mb-16 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{lang === "fa" ? "۰۳" : "03"}</span>
          <span aria-hidden>·</span>
          <span>{t.philosophy.label}</span>
        </div>

        {/* Architectural manifesto + live Tehran studio time */}
        <motion.div
          style={reduced ? undefined : { y, opacity }}
          className="max-w-4xl mx-auto text-center"
        >
          {t.philosophy.linesA.map((line, i) => (
            <QuoteLine key={`a-${i}`} text={line} />
          ))}

          {/* Parenthesized live studio clock flanking architectural compass motif */}
          <div className="my-6 sm:my-10 flex items-center justify-center gap-3 sm:gap-6">
            <ParenPart text="(" />
            <div className="flex items-center gap-3 sm:gap-5">
              <LiveHour fa={lang === "fa"} />
              <div className="text-3xl sm:text-5xl md:text-6xl font-medium text-muted-foreground">
                :
              </div>
              <div
                className="relative w-14 sm:w-20 h-20 sm:h-28 rounded border border-border bg-foreground text-background flex items-center justify-center overflow-hidden"
                aria-hidden
              >
                <svg viewBox="0 0 80 110" className="w-full h-full">
                  <g stroke="currentColor" strokeOpacity="0.22" strokeWidth="0.75">
                    <line x1="40" y1="8" x2="40" y2="102" />
                    <line x1="8" y1="55" x2="72" y2="55" />
                    <circle cx="40" cy="55" r="26" fill="none" />
                  </g>
                  <g stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round">
                    <path d="M40 20 L22 86" />
                    <path d="M40 20 L58 86" />
                    <circle cx="40" cy="20" r="3" fill="currentColor" />
                    <path d="M24 66 A 24 24 0 0 0 56 66" stroke="#D92B2B" strokeWidth="1.5" />
                  </g>
                </svg>
              </div>
              <div className="text-3xl sm:text-5xl md:text-6xl font-medium text-muted-foreground">
                :
              </div>
              <LiveMinute fa={lang === "fa"} />
            </div>
            <ParenPart text=")" />
          </div>

          {t.philosophy.linesB.map((line, i) => (
            <QuoteLine
              key={`b-${i}`}
              text={line}
              muted={i < t.philosophy.linesB.length - 1}
            />
          ))}

          <p className="mt-8 text-xs text-muted-foreground">
            {isRTL ? "ساعت ایران · طراحی محاسباتی و آموزش معماری" : "Iran Standard Time · Architectural Practice & Computation"}
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function QuoteLine({
  text,
  muted,
}: {
  text: string;
  muted?: boolean;
}) {
  const { isRTL } = useLang();

  return (
    <div className="mask-reveal py-1">
      <SplitText
        as="h2"
        text={text}
        mode="chars"
        stagger={0.03}
        duration={0.65}
        className={`${isRTL ? "fa-serif" : "font-serif-display"} text-3xl sm:text-5xl md:text-6xl leading-[1.12] tracking-tight text-balance ${
          muted ? `text-muted-foreground ${isRTL ? "" : "italic"}` : "text-foreground"
        }`}
      />
    </div>
  );
}

function ParenPart({ text }: { text: string }) {
  return (
    <div className="mask-reveal inline-block">
      <SplitText
        as="span"
        text={text}
        mode="chars"
        stagger={0.06}
        duration={0.65}
        className="text-3xl sm:text-5xl md:text-6xl font-medium text-muted-foreground"
      />
    </div>
  );
}

function LiveHour({ fa }: { fa?: boolean }) {
  const [h, setH] = useState("--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Tehran",
    });
    const tick = () => setH(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-3xl sm:text-5xl md:text-6xl font-medium tabular-nums">
      {fa ? toFaDigits(h) : h}
    </span>
  );
}

function LiveMinute({ fa }: { fa?: boolean }) {
  const [m, setM] = useState("--");
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Tehran",
    });
    const tick = () => setM(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-3xl sm:text-5xl md:text-6xl font-medium tabular-nums">
      {fa ? toFaDigits(m) : m}
    </span>
  );
}
