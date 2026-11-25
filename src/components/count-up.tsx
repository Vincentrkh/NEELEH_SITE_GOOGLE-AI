"use client";

import { useEffect, useState } from "react";
import { toFaDigits, type Lang } from "@/lib/i18n";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function parseLocaleInt(raw: string): { num: number | null; formatted: string } {
  const latin = raw.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d))).replace(/[,٬\s]/g, "");
  const n = Number(latin);
  if (!Number.isFinite(n)) return { num: null, formatted: raw };
  return { num: n, formatted: raw };
}

export function CountUp({ value, lang }: { value: string; lang: Lang }) {
  const { num } = parseLocaleInt(value);
  const [display, setDisplay] = useState<string>(value);

  useEffect(() => {
    if (num === null || num <= 0) {
      setDisplay(value);
      return;
    }

    const duration = 550;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(num * eased);
      const str = current.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
      setDisplay(lang === "fa" ? toFaDigits(str) : str);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [num, value, lang]);

  return <span>{display}</span>;
}
