"use client";

import * as React from "react";
import { motion, useInView, type Variants } from "framer-motion";
import { hasRtlScript } from "@/lib/i18n";

/**
 * SplitText — splits a string into per-character or per-word spans,
 * each wrapped so a parent staggered animation can reveal them
 * with the "mask wipe" effect (translateY 100% → 0%).
 *
 * The wrap pattern matches bleibtgleich.dev's split structure:
 *   <span class="split-line"><span class="split-word"><span class="split-char">…</span></span></span>
 */

type SplitMode = "chars" | "words";

type Props = {
  text: string;
  mode?: SplitMode;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  charClassName?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  trigger?: "mount" | "inView";
  once?: boolean;
};

export function SplitText({
  text,
  mode = "chars",
  as: Tag = "span",
  className,
  charClassName,
  delay = 0,
  stagger = 0.025,
  duration = 0.7,
  trigger = "inView",
  once = true,
}: Props) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, amount: "some" });
  const animate = trigger === "mount" ? true : inView;

  const words = text.split(/(\s+)/); // keep whitespace tokens
  // RTL scripts (Persian/Arabic) are cursive — per-character splitting breaks
  // the joined letterforms, so those runs always animate per WORD instead.
  const rtlText = hasRtlScript(text);
  const effectiveMode: SplitMode = rtlText ? "words" : mode;
  // In an RTL document the bidi algorithm lays out sibling spans right-to-left,
  // visually reversing per-character splits of Latin text ("Aria" → "airA",
  // "UX/UI" → "IU/XU"). Pin non-RTL strings to LTR so their char order stays.
  const dir: "ltr" | undefined = rtlText ? undefined : "ltr";

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };

  const child: Variants = {
    hidden: { y: "110%" },
    show: {
      y: "0%",
      transition: { duration, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  return (
    <Tag
      // @ts-expect-error – ref typing across polymorphic Tag
      ref={ref}
      className={className}
      dir={dir}
      aria-label={text}
    >
      <motion.span
        style={{ display: "block" }}
        variants={container}
        initial="hidden"
        animate={animate ? "show" : "hidden"}
        aria-hidden
      >
        {words.map((word, wi) => {
          if (/^\s+$/.test(word)) {
            return (
              <span
                key={`s-${wi}`}
                // whiteSpace:pre keeps the space's width — an inline-block
                // span with a bare space would collapse to zero width.
                style={{ display: "inline-block", whiteSpace: "pre" }}
              >
                {word}
              </span>
            );
          }
          const chars = word.split("");
          return (
            <span
              key={`w-${wi}`}
              // width:max-content keeps every word on a single line — without
              // it, a word wider than its grid column wraps MID-WORD
              // ("Products" → "Produc / ts" on tablets). The surplus simply
              // bleeds into the column gap (≤ ~1 glyph, measured ≤ 26px vs a
              // 32px gap), matching the reference site's giant-word look.
              // Vertical mask-reveal clipping (overflow) is unaffected.
              style={{
                display: "inline-block",
                overflow: "clip",
                width: "max-content",
              }}
            >
              {effectiveMode === "words" ? (
                <motion.span
                  variants={child}
                  style={{ display: "inline-block" }}
                  className={charClassName}
                >
                  {word}
                </motion.span>
              ) : (
                <span style={{ display: "inline-block" }}>
                  {chars.map((c, ci) => (
                    <motion.span
                      key={`c-${ci}`}
                      variants={child}
                      style={{ display: "inline-block" }}
                      className={charClassName}
                    >
                      {c}
                    </motion.span>
                  ))}
                </span>
              )}
            </span>
          );
        })}
      </motion.span>
    </Tag>
  );
}
