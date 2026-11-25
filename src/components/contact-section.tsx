"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Copy, Delete, PhoneCall, RotateCcw } from "lucide-react";
import { useLang } from "./language-provider";
import { LeadForm } from "./lead-form";
import { ROTARY_DIGITS, dialDigitPhysics } from "@/lib/domain/academy-rules";
import { toFaDigits } from "@/lib/i18n";
import { BlockReveal } from "@/components/block-reveal";

const EMAIL = "hello@neeleh.academy";
const STUDIO_PHONE = "02335230050";
const STUDIO_MOBILE = "09120738211";
const STUDIO_PHONE_DISPLAY_FA = "۰۲۳-۳۵۲۳۰۰۵۰ · ۰۹۱۲۰۷۳۸۲۱۱";
const STUDIO_PHONE_DISPLAY_EN = "02335230050 · 09120738211";

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com", handle: "@neeleh.academy" },
  { label: "Telegram", href: "https://telegram.org", handle: "@neeleh" },
  { label: "LinkedIn", href: "https://linkedin.com", handle: "in/neeleh-academy" },
  { label: "YouTube", href: "https://youtube.com", handle: "@neeleh" },
  { label: "Behance", href: "https://behance.net", handle: "/neeleh" },
];

export function ContactSection() {
  const { t, lang, isRTL } = useLang();
  const fa = lang === "fa";

  const [dialed, setDialed] = useState("");
  const [dialAngle, setDialAngle] = useState(0);
  const [activeDigit, setActiveDigit] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<"phone" | "email" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function triggerDialDigit(digit: string) {
    const physics = dialDigitPhysics(digit);
    if (timerRef.current) clearTimeout(timerRef.current);

    setActiveDigit(physics.digit);
    setDialAngle(physics.pullAngleDeg);
    setDialed((prev) => (prev.length >= 13 ? prev.slice(1) + physics.digit : prev + physics.digit));

    timerRef.current = setTimeout(() => {
      setDialAngle(0);
      setActiveDigit(null);
    }, physics.returnDurationMs);
  }

  function handleQuickFillStudio() {
    setDialed(STUDIO_PHONE);
    setActiveDigit("0");
    setDialAngle(120);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDialAngle(0);
      setActiveDigit(null);
    }, 420);
  }

  async function copyValue(key: "phone" | "email", val: string) {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Clipboard blocked in sandboxed context; harmless no-op
    }
  }

  const formattedDialed = dialed
    ? fa
      ? toFaDigits(dialed)
      : dialed
    : fa
      ? "شماره را شماره‌گیری کنید"
      : "Dial digits 1–0…";

  return (
    <section
      id="contact"
      className="relative overflow-hidden bg-[#B91C1C] text-white border-t border-black/20"
    >
      <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        {/* Top intro & interactive rotary switchboard */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center pb-16 border-b border-white/20">
          {/* Left / End: Interactive Vintage Rotary Dial */}
          <BlockReveal className="lg:col-span-6 flex flex-col items-center">
            <VintageRotaryDial
              dialAngle={dialAngle}
              activeDigit={activeDigit}
              onDialDigit={triggerDialDigit}
              isRTL={isRTL}
            />

            {/* LED Phone Readout & Dial Controls */}
            <div className="mt-7 w-full max-w-md rounded-lg border border-white/20 bg-black/35 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs text-white/70">
                  {fa ? "شماره‌گیر خط مستقیم استودیو" : "Studio Rotary Line"}
                </span>
                <button
                  type="button"
                  onClick={handleQuickFillStudio}
                  className="text-xs underline underline-offset-4 text-amber-200 hover:text-white transition-colors whitespace-nowrap"
                >
                  {fa ? "پرکردن شماره آکادمی" : "Quick-fill studio line"}
                </button>
              </div>
              <div
                dir="ltr"
                data-testid="rotary-readout"
                className="min-h-[44px] flex items-center justify-between rounded bg-black/60 px-3.5 py-2 font-mono text-lg tracking-wider tabular-nums text-amber-100 border border-white/10"
              >
                <span className={dialed ? "text-amber-100" : "text-white/45 text-sm font-sans"}>
                  {formattedDialed}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDialed((prev) => prev.slice(0, -1))}
                    aria-label={fa ? "حذف آخرین رقم" : "Backspace digit"}
                    className="grid size-8 place-items-center rounded hover:bg-white/10 text-white/80 transition-colors"
                  >
                    <Delete className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialed("")}
                    aria-label={fa ? "پاک کردن شماره" : "Clear dialer"}
                    className="grid size-8 place-items-center rounded hover:bg-white/10 text-white/80 transition-colors"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${dialed || STUDIO_PHONE}`}
                  className="flex-1 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-xs font-medium text-black hover:bg-amber-100 transition-colors whitespace-nowrap"
                >
                  <PhoneCall className="size-3.5" aria-hidden />
                  <span>
                    {dialed
                      ? fa
                        ? "برقراری تماس با این شماره"
                        : "Call dialed number"
                      : fa
                        ? `تماس با آکادمی (${STUDIO_PHONE_DISPLAY_FA})`
                        : `Call Studio (${STUDIO_PHONE_DISPLAY_EN})`}
                  </span>
                </a>
                <Link
                  href="/contact"
                  className="inline-flex min-h-[42px] items-center justify-center rounded-md border border-white/30 px-4 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  {fa ? "صفحه کامل تماس" : "Contact page"}
                </Link>
              </div>
            </div>
          </BlockReveal>

          {/* Right / Start: Studio details + inline callback lead capture */}
          <BlockReveal delay={0.1} className="lg:col-span-6 space-y-6">
            <div>
              <p className="text-xs text-amber-200 mb-2">{t.contact.availability}</p>
              <h2
                className={`text-3xl sm:text-5xl text-white leading-[1.1] text-balance ${
                  isRTL ? "fa-serif" : "font-serif-display italic"
                }`}
              >
                {t.contact.cta}
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-white/85 max-w-xl">
                {t.contact.blurb}
              </p>
            </div>

            {/* Address, hours & copyable direct channels */}
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-white/20 bg-black/20 p-4 space-y-1.5">
                <div className="text-xs text-white/65">
                  {fa ? "تلفن استودیو و ساعات پاسخ‌گویی" : "Studio Phone & Hours"}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`tel:${STUDIO_PHONE}`}
                    dir="ltr"
                    className="font-mono font-medium text-white hover:text-amber-200 transition-colors tabular-nums"
                  >
                    {fa ? STUDIO_PHONE_DISPLAY_FA : STUDIO_PHONE_DISPLAY_EN}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyValue("phone", STUDIO_PHONE)}
                    aria-label={fa ? "کپی شماره تماس" : "Copy studio phone"}
                    className="grid size-8 place-items-center rounded border border-white/20 hover:bg-white/10 transition-colors"
                  >
                    {copiedKey === "phone" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
                  <a
                    href={`tel:${STUDIO_MOBILE}`}
                    dir="ltr"
                    className="block font-mono text-xs text-white/85 hover:text-amber-200 transition-colors tabular-nums"
                  >
                    {fa ? "۰۹۱۲۰۷۳۸۲۱۱" : STUDIO_MOBILE}
                  </a>
                <p className="text-xs text-white/75">
                  {fa ? "شنبه تا چهارشنبه، ۹ تا ۱۸ · محل برگزاری: دامغان" : "Sat–Wed, 09:00–18:00 · Venue: Damghan"}
                </p>
              </div>

              <div className="rounded-lg border border-white/20 bg-black/20 p-4 space-y-1.5">
                <div className="text-xs text-white/65">{t.contact.writeTo}</div>
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`mailto:${EMAIL}`}
                    dir="ltr"
                    className="font-mono text-sm font-medium text-white hover:text-amber-200 transition-colors truncate"
                  >
                    {EMAIL}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyValue("email", EMAIL)}
                    aria-label={fa ? "کپی ایمیل" : "Copy studio email"}
                    className="grid size-8 shrink-0 place-items-center rounded border border-white/20 hover:bg-white/10 transition-colors"
                  >
                    {copiedKey === "email" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
                <p className="text-xs text-white/75">
                  {fa ? "پاسخ‌گویی به سوالات سرفصل‌ها و مشاوره دفاتر" : "Syllabus & studio advisory inquiries"}
                </p>
              </div>
            </div>

            {/* Inline callback LeadForm */}
            <LeadForm compact tone="crimson" />
          </BlockReveal>
        </div>

        {/* Social links bar */}
        <BlockReveal delay={0.08} className="pt-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 rounded-lg border border-white/20 bg-black/20 p-4 hover:bg-white hover:text-black transition-colors"
              >
                <span className="text-xs opacity-70 group-hover:opacity-100">{s.label}</span>
                <span className="text-sm font-medium flex items-center justify-between gap-1">
                  <span dir="ltr">{s.handle}</span>
                  <ArrowUpRight className="size-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </span>
              </a>
            ))}
          </div>
        </BlockReveal>
      </div>
    </section>
  );
}

function VintageRotaryDial({
  dialAngle,
  activeDigit,
  onDialDigit,
  isRTL,
}: {
  dialAngle: number;
  activeDigit: string | null;
  onDialDigit: (digit: string) => void;
  isRTL: boolean;
}) {
  return (
    <div
      className="relative w-[min(82vw,23rem)] sm:w-[25rem] aspect-square select-none"
      role="group"
      aria-label={isRTL ? "شماره‌گیر تلفن کلاسیک" : "Vintage rotary telephone dial"}
    >
      {/* Outer crimson/obsidian bezel */}
      <div className="absolute inset-0 rounded-full border-4 border-black/80 bg-zinc-950 shadow-2xl" />
      <div className="absolute inset-3 rounded-full border border-white/15 bg-zinc-900" />

      {/* Rotating clear brass-trimmed finger wheel */}
      <div
        className="absolute inset-4 rounded-full transition-transform ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          transform: `rotate(${dialAngle}deg)`,
          transitionDuration: dialAngle === 0 ? "520ms" : "260ms",
        }}
      >
        {/* Outer dial ring markings */}
        <div className="absolute inset-1 rounded-full border border-amber-100/20" />

        {/* 10 finger holes (1..9, 0) arranged counter-clockwise */}
        {ROTARY_DIGITS.map((digit) => {
          const { holeAngleDeg } = dialDigitPhysics(digit);
          const rad = (holeAngleDeg * Math.PI) / 180;
          const rPct = 36.5;
          const x = 50 + Math.cos(rad) * rPct;
          const y = 50 + Math.sin(rad) * rPct;
          const isCurrent = activeDigit === digit;

          return (
            <button
              key={digit}
              type="button"
              onClick={() => onDialDigit(digit)}
              aria-label={isRTL ? `شماره‌گیری عدد ${digit}` : `Dial ${digit}`}
              style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) rotate(${-dialAngle}deg)` }}
              className={`absolute grid size-11 sm:size-12 place-items-center rounded-full border-2 font-mono text-sm sm:text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                isCurrent
                  ? "border-amber-200 bg-amber-100 text-black"
                  : "border-white/35 bg-[#F6F2EA] text-zinc-950 hover:bg-amber-100 hover:border-amber-200"
              }`}
            >
              <span className="tabular-nums">{isRTL ? toFaDigits(digit) : digit}</span>
            </button>
          );
        })}
      </div>

      {/* Stationary metal finger stop at ~42deg (bottom-right) */}
      <div
        aria-hidden
        style={{
          left: "79%",
          top: "74%",
          transform: "translate(-50%, -50%) rotate(-38deg)",
        }}
        className="pointer-events-none absolute h-3.5 w-10 rounded-full bg-gradient-to-r from-amber-200 via-amber-100 to-zinc-400 border border-black/40 shadow"
      />

      {/* Center studio label medallion */}
      <div className="pointer-events-none absolute inset-[29%] rounded-full border border-white/20 bg-zinc-950 flex flex-col items-center justify-center text-center px-3 shadow-inner">
        <span className="font-mono text-xs tracking-wider text-amber-200/90 tabular-nums">
          {isRTL ? "۰۲۳-۳۵۲۳۰۰۵۰" : "023 · NEELEH"}
        </span>
        <span className="mt-1 text-sm font-medium text-white">
          {isRTL ? "استودیوی نیله" : "Studio Dial"}
        </span>
        <span className="mt-0.5 text-[11px] text-white/60">
          {isRTL ? "کلیک کنید" : "Click to dial"}
        </span>
      </div>
    </div>
  );
}
