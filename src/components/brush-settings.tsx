"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { DEFAULT_BRUSH_RADIUS } from "@/components/fluid-reveal";
import { useLang } from "@/components/language-provider";
import { toFaDigits } from "@/lib/i18n";

/**
 * BrushSettings — floating control panel for the fluid-reveal canvas layer.
 *
 * Row 1 — TRAIL: slider + − / + buttons + live % readout (100% = reference
 *   site value) for the cursor-trail diameter. Shortcuts: [ smaller, ] wider.
 * Row 2 — BG: background (solid color / image / gradient) applied to the
 *   `.fluid-reveal-content` layer — the layer the mouse trail reveals.
 *   Presets + custom pickers, persisted to localStorage.
 *
 * - Collapses to a small dot-preview button to keep the canvas clean.
 * - Fully responsive: on ≤991px the trail controls wrap onto a second line,
 *   the panel spans the available width, and every control gets an expanded
 *   touch target (.touch-hit) so it stays usable on phones.
 */

// ===== trail brush =====
const STORAGE_KEY = "fluid-brush-radius";
const MIN_RADIUS = 0.0005;
const MAX_RADIUS = 0.0125;
const STEP = 0.0005;

/** Clamp to [min,max] and snap to the STEP grid (avoids float drift). */
function snap(r: number) {
  const steps = Math.round(r / STEP);
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, steps * STEP));
}

/** Relative trail diameter vs. the reference value (gaussian → sqrt scale). */
function toPercent(r: number) {
  return Math.round(Math.sqrt(r / DEFAULT_BRUSH_RADIUS) * 100);
}

/** Preview dot diameter in px (purely a relative indicator). */
function dotPx(r: number) {
  return 3 + 9 * Math.sqrt(r / DEFAULT_BRUSH_RADIUS);
}

// ===== reveal background (.fluid-reveal-content) =====
export type RevealBgMode = "none" | "color" | "image" | "gradient";
export type RevealBg = { mode: RevealBgMode; value: string };
export const DEFAULT_REVEAL_BG: RevealBg = { mode: "none", value: "" };

const BG_STORAGE_KEY = "fluid-reveal-bg";

const COLOR_PRESETS = ["#ffffff", "#f0f0f0", "#d8d9da", "#000000"];

const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #111111 0%, #4a4a4a 100%)",
];

// Local architectural covers — no fragile external CDNs.
const IMAGE_PRESETS = [
  "/images/hero.png",
  "/images/tier-beginner.svg",
  "/images/tier-intermediate.svg",
  "/images/tier-pro.svg",
];

function imageUrlToBg(url: string) {
  return `url("${url}") center / cover no-repeat`;
}

function isValidImageUrl(url: string) {
  return /^(https?:\/\/|data:image\/)/i.test(url.trim());
}

const ringActive = "ring-2 ring-black ring-offset-1 ring-offset-white";

type BrushSettingsProps = {
  /** Current splat radius (owned by the page, passed to <FluidReveal>). */
  value: number;
  onChange: (r: number) => void;
  /** Current reveal-layer background (owned by the page). */
  bg: RevealBg;
  onBgChange: (bg: RevealBg) => void;
};

export function BrushSettings({
  value,
  onChange,
  bg,
  onBgChange,
}: BrushSettingsProps) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // BG UI state
  const [bgTab, setBgTab] = useState<"color" | "image" | "gradient">("color");
  const [customColor, setCustomColor] = useState("#ff0000");
  const [gradA, setGradA] = useState("#667eea");
  const [gradB, setGradB] = useState("#764ba2");
  const [imgUrl, setImgUrl] = useState("");

  // Keep a live ref for the keyboard shortcut handler.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [value, onChange]);

  // Restore persisted values once on mount.
  useEffect(() => {
    // Deliberate: `mounted` gates the persist-effects below so they never
    // overwrite stored values before the restore has read them.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const n = parseFloat(raw);
        if (Number.isFinite(n) && n >= MIN_RADIUS && n <= MAX_RADIUS) {
          onChange(n);
        }
      }
    } catch {
      /* private mode etc. — ignore */
    }
    try {
      const rawBg = localStorage.getItem(BG_STORAGE_KEY);
      if (rawBg) {
        const parsed = JSON.parse(rawBg) as {
          m?: RevealBgMode;
          v?: string;
        };
        const modes: RevealBgMode[] = [
          "none",
          "color",
          "image",
          "gradient",
        ];
        if (
          parsed &&
          parsed.m &&
          modes.includes(parsed.m) &&
          typeof parsed.v === "string" &&
          parsed.v.length <= 2000
        ) {
          onBgChange({ mode: parsed.m, value: parsed.v });
          // Open the UI tab matching the persisted mode.
          if (parsed.m !== "none") setBgTab(parsed.m);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      /* ignore */
    }
  }, [value, mounted]);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(
        BG_STORAGE_KEY,
        JSON.stringify({ m: bg.mode, v: bg.value })
      );
    } catch {
      /* ignore */
    }
  }, [bg, mounted]);

  // Keyboard shortcuts: [ = thinner, ] = wider.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Match by e.key, falling back to e.code (some environments / layouts
      // report an empty e.key for bracket keys).
      const isSmaller = e.key === "[" || (!e.key && e.code === "BracketLeft");
      const isBigger = e.key === "]" || (!e.key && e.code === "BracketRight");
      if (!isSmaller && !isBigger) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      const dir = isBigger ? 1 : -1;
      onChangeRef.current(snap(valueRef.current + dir * STEP));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pct = toPercent(value);

  const pickBg = (mode: RevealBgMode, bgValue: string) =>
    onBgChange({ mode, value: bgValue });

  const applyImgUrl = () => {
    if (!isValidImageUrl(imgUrl)) return;
    pickBg("image", imageUrlToBg(imgUrl.trim()));
  };

  const tabBtn = (tab: typeof bgTab, label: string) => (
    <button
      key={tab}
      type="button"
      onClick={() => setBgTab(tab)}
      className={`touch-hit relative rounded-full px-2 py-1 text-[9px] font-medium uppercase tracking-wider transition-colors max-[991px]:px-2.5 max-[991px]:py-1.5 ${
        bgTab === tab
          ? "bg-black text-white"
          : "text-black/50 hover:bg-black/5 hover:text-black"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      role="group"
      aria-label="Canvas settings"
      className="brush-panel fixed bottom-4 right-4 z-[80]"
    >
      {open ? (
        <div className="w-[302px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-black/10 bg-white/85 p-3 shadow-[0_2px_20px_rgba(0,0,0,0.08)] backdrop-blur-md">
          {/* ── Row 1: trail brush ─────────────────────────────────── */}
          <div className="flex flex-nowrap items-center gap-2 max-[991px]:flex-wrap">
            {/* Relative size preview dot */}
            <span
              className="relative block h-5 w-5 shrink-0"
              aria-hidden="true"
            >
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black transition-[width,height] duration-200"
                style={{ width: dotPx(value), height: dotPx(value) }}
              />
            </span>

            <span className="select-none text-[10px] font-medium uppercase tracking-[0.18em] text-black/50">
              {t.settings.trail}
            </span>

            <button
              type="button"
              aria-label="Smaller trail"
              onClick={() => onChange(snap(value - STEP))}
              className="touch-hit relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/15 text-black/70 transition-colors hover:bg-black hover:text-white max-[991px]:h-8 max-[991px]:w-8"
            >
              <Minus size={11} strokeWidth={2} />
            </button>

            <input
              type="range"
              className="fluid-brush-slider min-w-0 flex-1 max-[991px]:order-last max-[991px]:basis-full max-[991px]:h-6"
              min={MIN_RADIUS}
              max={MAX_RADIUS}
              step={STEP}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              aria-label="Trail brush size"
            />

            <button
              type="button"
              aria-label="Bigger trail"
              onClick={() => onChange(snap(value + STEP))}
              className="touch-hit relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-black/15 text-black/70 transition-colors hover:bg-black hover:text-white max-[991px]:h-8 max-[991px]:w-8"
            >
              <Plus size={11} strokeWidth={2} />
            </button>

            <span className="w-9 shrink-0 select-none text-end text-[10px] font-medium tabular-nums text-black/80">
              {lang === "fa" ? `${toFaDigits(pct)}٪` : `${pct}%`}
            </span>

            <button
              type="button"
              aria-label="Hide panel"
              title="Hide ( [ / ] adjusts size )"
              onClick={() => setOpen(false)}
              className="touch-hit relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black max-[991px]:h-8 max-[991px]:w-8"
            >
              <X size={12} strokeWidth={2} />
            </button>
          </div>

          {/* divider */}
          <div className="my-2.5 h-px bg-black/10" />

          {/* ── Row 2: reveal background ───────────────────────────── */}
          <div className="mb-2 mt-2.5 flex flex-wrap items-center gap-1 max-[991px]:mt-2">
            <span className="me-1 select-none text-[10px] font-medium uppercase tracking-[0.18em] text-black/50">
              {t.settings.bg}
            </span>
            {tabBtn("color", t.settings.solid)}
            {tabBtn("image", t.settings.image)}
            {tabBtn("gradient", t.settings.grad)}

            <span className="flex-1" />

            <button
              type="button"
              aria-label="Reset reveal background"
              title="Reset (transparent)"
              onClick={() => onBgChange(DEFAULT_REVEAL_BG)}
              className="touch-hit relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/5 hover:text-black max-[991px]:h-8 max-[991px]:w-8"
            >
              <RotateCcw size={11} strokeWidth={2} />
            </button>
          </div>

          {/* color mode */}
          {bgTab === "color" && (
            <div className="flex items-center gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={`BG color ${c}`}
                  onClick={() => pickBg("color", c)}
                  style={{ background: c }}
                  className={`touch-hit relative h-5 w-5 rounded-full border border-black/15 transition-shadow max-[991px]:h-7 max-[991px]:w-7 ${
                    bg.mode === "color" && bg.value === c ? ringActive : ""
                  }`}
                />
              ))}
              <label
                title="Custom color"
                aria-label="Custom BG color"
                className="touch-hit relative h-5 w-5 cursor-pointer overflow-hidden rounded-full border border-black/15 max-[991px]:h-7 max-[991px]:w-7"
                style={{
                  background:
                    "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
                }}
              >
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    setCustomColor(e.target.value);
                    pickBg("color", e.target.value);
                  }}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              {bg.mode === "color" && (
                <span className="ms-1 select-none text-[9px] tabular-nums text-black/50">
                  {bg.value}
                </span>
              )}
            </div>
          )}

          {/* image mode */}
          {bgTab === "image" && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                {IMAGE_PRESETS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    aria-label="BG image preset"
                    onClick={() => pickBg("image", imageUrlToBg(u))}
                    style={{ backgroundImage: `url(${u})` }}
                    className={`touch-hit relative h-7 w-9 rounded-md border border-black/15 bg-cover bg-center transition-shadow max-[991px]:h-9 max-[991px]:w-12 ${
                      bg.mode === "image" && bg.value.includes(u)
                        ? ringActive
                        : ""
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={imgUrl}
                  onChange={(e) => setImgUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyImgUrl();
                  }}
                  placeholder="https://image-url…"
                  spellCheck={false}
                  className="h-6 min-w-0 flex-1 rounded-md border border-black/15 bg-white/60 px-2 text-[10px] text-black/80 outline-none placeholder:text-black/30 focus:border-black/40"
                />
                <button
                  type="button"
                  aria-label="Apply image URL"
                  onClick={applyImgUrl}
                  className="touch-hit relative rounded-md bg-black px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-white transition-opacity hover:opacity-80 max-[991px]:px-3 max-[991px]:py-2"
                >
                  Set
                </button>
              </div>
            </div>
          )}

          {/* gradient mode */}
          {bgTab === "gradient" && (
            <div className="flex items-center gap-1.5">
              {GRADIENT_PRESETS.map((g) => (
                <button
                  key={g}
                  type="button"
                  title={g}
                  aria-label="BG gradient preset"
                  onClick={() => pickBg("gradient", g)}
                  style={{ background: g }}
                  className={`touch-hit relative h-5 w-8 rounded-full border border-black/15 transition-shadow max-[991px]:h-7 max-[991px]:w-10 ${
                    bg.mode === "gradient" && bg.value === g ? ringActive : ""
                  }`}
                />
              ))}
              <span className="flex-1" />
              <input
                type="color"
                aria-label="Gradient start color"
                value={gradA}
                onChange={(e) => {
                  setGradA(e.target.value);
                  pickBg(
                    "gradient",
                    `linear-gradient(135deg, ${e.target.value}, ${gradB})`
                  );
                }}
                className="h-5 w-5 cursor-pointer rounded-full border border-black/15 bg-transparent p-0 max-[991px]:h-7 max-[991px]:w-7"
              />
              <span className="select-none text-[9px] text-black/40">→</span>
              <input
                type="color"
                aria-label="Gradient end color"
                value={gradB}
                onChange={(e) => {
                  setGradB(e.target.value);
                  pickBg(
                    "gradient",
                    `linear-gradient(135deg, ${gradA}, ${e.target.value})`
                  );
                }}
                className="h-5 w-5 cursor-pointer rounded-full border border-black/15 bg-transparent p-0 max-[991px]:h-7 max-[991px]:w-7"
              />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          aria-label="Open canvas settings"
          title="Canvas settings"
          onClick={() => setOpen(true)}
          className="touch-hit relative flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white/90 shadow-[0_2px_20px_rgba(0,0,0,0.08)] backdrop-blur-md transition-transform hover:scale-110 max-[991px]:h-11 max-[991px]:w-11"
        >
          <span
            className="rounded-full bg-black"
            style={{ width: dotPx(value), height: dotPx(value) }}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
