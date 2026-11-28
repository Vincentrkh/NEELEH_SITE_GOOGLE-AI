"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { dict } from "@/lib/i18n";
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import type { ParticleSphereHandle } from "@/components/tm/particle-sphere-canvas";

const ParticleSphereCanvas = dynamic(
  () => import("@/components/tm/particle-sphere-canvas").then((m) => m.ParticleSphereCanvas),
  { ssr: false },
);

/* ═══════════════════════════════════════════════════════════════════════════
   /dashboard/globe — تنظیمات «Particle Sphere 5» بخش Hero
   ───────────────────────────────────────────────────────────────────────────
   • متن‌ها و آپلود مدل سه‌بعدی GLB / GLTF
   • کره شیشه‌ای: شعاع (sz) و موقعیت مکانی (spx, spy, spz)
   • متریال شیشه و رفلکس استودیویی HDRI (بدون نمایش HDRI در پس‌زمینه)
   • ظاهر ذرات (نقطه تخت / هشت‌وجهی / بیست‌وجهی)، فیزیک، VFX و پس‌زمینه تعاملی
   ═══════════════════════════════════════════════════════════════════════════ */

type FieldOption = { value: number; label: string; labelEn: string };

type Field =
  | { key: string; label: string; labelEn: string; type: "range"; min: number; max: number; step: number; int?: boolean }
  | { key: string; label: string; labelEn: string; type: "color" }
  | { key: string; label: string; labelEn: string; type: "select"; options: FieldOption[] }
  | { key: string; label: string; labelEn: string; type: "bool" }
  | { key: string; label: string; labelEn: string; type: "textarea" };

type Settings = Record<string, string | number | boolean>;

const GLASS_PRESETS: Record<
  number,
  {
    label: string;
    labelEn: string;
    swatch: string;
    values: Record<string, string | number | boolean>;
  }
> = {
  0: {
    label: "پیش‌فرض (خاکستری استودیو)",
    labelEn: "Studio Clear (Default)",
    swatch: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(217,221,227,0.45))",
    values: { gcm: false, gc1: "#d9dde3", gc2: "#ffffff", ga: 1, gp: 2.2, gk: 0.6, gsp: 1, gsh: 48, gin: 1, gfr: 0, ghd: 1.15 },
  },
  1: {
    label: "شیشه‌ی یخی",
    labelEn: "Frosted Ice",
    swatch: "linear-gradient(135deg, #ffffff, #dfe9f2)",
    values: { gcm: true, gc1: "#dfe9f2", gc2: "#ffffff", ga: 0.9, gp: 3, gk: 0.5, gsp: 1.4, gsh: 80, gin: 0.6, gfr: 0.25, ghd: 1.35 },
  },
  2: {
    label: "هلویی استودیویی",
    labelEn: "Studio Peach",
    swatch: "linear-gradient(135deg, #ffd6dc, #ff9d7d)",
    values: { gcm: true, gc1: "#ff9d7d", gc2: "#ffd6dc", ga: 0.92, gp: 2, gk: 0.8, gsp: 0.6, gsh: 40, gin: 1, gfr: 0.04, ghd: 1.05 },
  },
  3: {
    label: "شیشه‌ی تیره (ابسیدین)",
    labelEn: "Smoked Obsidian",
    swatch: "linear-gradient(135deg, #1b1d22, #8a93a6)",
    values: { gcm: true, gc1: "#1b1d22", gc2: "#8a93a6", ga: 0.85, gp: 2.6, gk: 0.7, gsp: 1.2, gsh: 90, gin: 0.5, gfr: 0.02, ghd: 1.4 },
  },
};

const SECTIONS: { id: string; title: string; titleEn: string; fields: Field[] }[] = [
  {
    id: "content",
    title: "متن‌ها و مدل سه‌بعدی",
    titleEn: "Texts & 3D Model",
    fields: [
      { key: "texts", label: "متن‌ها (هر خط = یک صفحه)", labelEn: "Texts (one scene per line)", type: "textarea" },
      { key: "showModel", label: "مدل در آخرین صفحه", labelEn: "Show 3D model on last scene", type: "bool" },
    ],
  },
  {
    id: "spherePos",
    title: "کره‌ی شیشه‌ای (موقعیت X, Y, Z و شعاع)",
    titleEn: "Glass Sphere Position (X, Y, Z) & Radius",
    fields: [
      { key: "sz", label: "شعاع کره", labelEn: "Sphere radius", type: "range", min: 1.5, max: 9, step: 0.05 },
      { key: "spx", label: "موقعیت کره X", labelEn: "Sphere X", type: "range", min: -9, max: 9, step: 0.05 },
      { key: "spy", label: "موقعیت کره Y", labelEn: "Sphere Y", type: "range", min: -6, max: 6, step: 0.05 },
      { key: "spz", label: "موقعیت کره Z", labelEn: "Sphere Z", type: "range", min: -6, max: 8, step: 0.05 },
    ],
  },
  {
    id: "glassMat",
    title: "متریال شیشه و رفلکس استودیویی HDRI",
    titleEn: "Glass Material & Studio HDRI Reflections",
    fields: [
      {
        key: "gpr",
        label: "پیش‌تنظیم متریال",
        labelEn: "Material preset",
        type: "select",
        options: Object.entries(GLASS_PRESETS).map(([k, v]) => ({
          value: Number(k),
          label: v.label,
          labelEn: v.labelEn,
        })),
      },
      { key: "gcm", label: "رنگ سفارشی شیشه", labelEn: "Custom glass colors", type: "bool" },
      { key: "gc1", label: "رنگ داخل شیشه", labelEn: "Inner glass color", type: "color" },
      { key: "gc2", label: "رنگ لبه‌ی شیشه", labelEn: "Edge rim color", type: "color" },
      { key: "ga", label: "شفافیت شیشه", labelEn: "Glass opacity", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "gp", label: "باریکی لبه (فرنل)", labelEn: "Edge narrowness (Fresnel)", type: "range", min: 0.8, max: 6, step: 0.05 },
      { key: "gk", label: "شدت لبه", labelEn: "Edge intensity", type: "range", min: 0, max: 1.5, step: 0.01 },
      { key: "gsp", label: "شدت براقی (هایلایت)", labelEn: "Specular intensity", type: "range", min: 0, max: 2.5, step: 0.05 },
      { key: "gsh", label: "تیزی هایلایت", labelEn: "Specular sharpness", type: "range", min: 8, max: 160, step: 1, int: true },
      { key: "gin", label: "سایه‌روشن داخل شیشه", labelEn: "Inner glass shading", type: "range", min: 0, max: 2, step: 0.05 },
      { key: "ghd", label: "شدت رفلکس HDRI روی شیشه", labelEn: "Studio HDRI reflection", type: "range", min: 0, max: 2, step: 0.02 },
      { key: "ghr", label: "زاویه‌ی چرخش HDRI", labelEn: "HDRI reflection rotation", type: "range", min: 0, max: 360, step: 1, int: true },
      { key: "gfr", label: "ماتی و شکست سطح شیشه", labelEn: "Surface frost", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "ml", label: "نور شیشه دنبال موس", labelEn: "Glass light follows pointer", type: "bool" },
    ],
  },
  {
    id: "particleLook",
    title: "ظاهر ذرات",
    titleEn: "Particle Appearance",
    fields: [
      {
        key: "pm",
        label: "شکل ذرات",
        labelEn: "Particle shape",
        type: "select",
        options: [
          { value: 0, label: "نقطه‌ی تخت (کم‌هزینه‌ترین)", labelEn: "Flat point (Lightweight)" },
          { value: 1, label: "گوی هشت‌وجهی (۸ وجه)", labelEn: "Octahedron sphere (8 faces)" },
          { value: 2, label: "گوی بیست‌وجهی (۲۰ وجه)", labelEn: "Icosahedron sphere (20 faces)" },
        ],
      },
      { key: "sat", label: "اشباع رنگ ذرات", labelEn: "Particle color saturation", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "ac", label: "رنگ تأکیدی", labelEn: "Accent color", type: "color" },
    ],
  },
  {
    id: "returnPath",
    title: "بازگشت ذرات بعد از Splash",
    titleEn: "Particle Return Physics",
    fields: [
      {
        key: "rm",
        label: "مسیر بازگشت",
        labelEn: "Return trajectory",
        type: "select",
        options: [
          { value: 0, label: "فنری (ساده)", labelEn: "Spring (Simple)" },
          { value: 1, label: "مارپیچ", labelEn: "Spiral" },
          { value: 2, label: "کهکشانی", labelEn: "Galactic" },
          { value: 3, label: "فیبوناچی (طلایی)", labelEn: "Fibonacci Sphere" },
        ],
      },
      { key: "sp", label: "قدرت مارپیچ", labelEn: "Swirl strength", type: "range", min: 0, max: 2, step: 0.05 },
      { key: "rk", label: "سرعت بازگشت", labelEn: "Return stiffness", type: "range", min: 2, max: 14, step: 0.5 },
    ],
  },
  {
    id: "splash",
    title: "Splash و حرکت",
    titleEn: "Splash & Motion",
    fields: [
      { key: "sr", label: "شعاع splash", labelEn: "Splash radius", type: "range", min: 0.3, max: 3, step: 0.05 },
      { key: "ss", label: "قدرت splash", labelEn: "Splash strength", type: "range", min: 0, max: 8, step: 0.1 },
      { key: "al", label: "جنب‌وجوش ذرات", labelEn: "Ambient liveliness", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "ps", label: "اندازه ذرات", labelEn: "Particle size", type: "range", min: 0.3, max: 3, step: 0.05 },
      { key: "dp", label: "عمق اکسترود", labelEn: "Extrusion depth", type: "range", min: 0.05, max: 1.5, step: 0.05 },
    ],
  },
  {
    id: "vfx",
    title: "افکت‌ها (VFX)",
    titleEn: "VFX & Post Effects",
    fields: [
      { key: "gl", label: "درخشش جرقه‌ها", labelEn: "Sparkle glow", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "fl", label: "فلر سرعت", labelEn: "Velocity flare", type: "range", min: 0, max: 2, step: 0.05 },
      { key: "df", label: "عمق میدان (DOF)", labelEn: "Depth of field (DOF)", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "gr", label: "دانه‌ی فیلم", labelEn: "Film grain", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "vg", label: "وینیت", labelEn: "Vignette", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "sk", label: "موج شوک با کلیک / لمس", labelEn: "Click/tap shockwave", type: "bool" },
    ],
  },
  {
    id: "transform",
    title: "اندازه و جای نوشته / مدل (نسبت به مرکز کره)",
    titleEn: "Text & Model Transform (Relative to Sphere)",
    fields: [
      { key: "fs", label: "اندازه فونت", labelEn: "Text scale", type: "range", min: 0.3, max: 2.5, step: 0.01 },
      { key: "ms", label: "اندازه مدل", labelEn: "Model scale", type: "range", min: 0.3, max: 2.5, step: 0.01 },
      { key: "tpx", label: "نوشته X", labelEn: "Text X", type: "range", min: -4, max: 4, step: 0.05 },
      { key: "tpy", label: "نوشته Y", labelEn: "Text Y", type: "range", min: -4, max: 4, step: 0.05 },
      { key: "tpz", label: "نوشته Z", labelEn: "Text Z", type: "range", min: -3, max: 3, step: 0.05 },
      { key: "mpx", label: "مدل X", labelEn: "Model X", type: "range", min: -4, max: 4, step: 0.05 },
      { key: "mpy", label: "مدل Y", labelEn: "Model Y", type: "range", min: -4, max: 4, step: 0.05 },
      { key: "mpz", label: "مدل Z", labelEn: "Model Z", type: "range", min: -3, max: 3, step: 0.05 },
    ],
  },
  {
    id: "background",
    title: "پس‌زمینه و محو پایین صفحه",
    titleEn: "Background & Bottom Fade",
    fields: [
      {
        key: "bm",
        label: "نوع پس‌زمینه",
        labelEn: "Background mode",
        type: "select",
        options: [
          { value: 0, label: "تم خاکستری استودیو", labelEn: "Studio Gray" },
          { value: 1, label: "رنگ ساده", labelEn: "Solid Color" },
          { value: 2, label: "گرادیان", labelEn: "Gradient" },
        ],
      },
      { key: "b1", label: "رنگ اول", labelEn: "Primary color", type: "color" },
      { key: "b2", label: "رنگ دوم (گرادیان)", labelEn: "Secondary color (gradient)", type: "color" },
      { key: "ba", label: "زاویه‌ی گرادیان", labelEn: "Gradient angle", type: "range", min: 0, max: 360, step: 1, int: true },
      { key: "fd", label: "شدت محو پایین صفحه", labelEn: "Bottom fade opacity", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "fh", label: "ارتفاع محو (٪)", labelEn: "Bottom fade height (%)", type: "range", min: 5, max: 100, step: 1, int: true },
      { key: "fm", label: "هم‌رنگ پس‌زمینه", labelEn: "Fade matches background", type: "bool" },
      { key: "fc", label: "رنگ محو (اگر هم‌رنگ نباشد)", labelEn: "Custom fade color", type: "color" },
    ],
  },
  {
    id: "interactiveOrbs",
    title: "پس‌زمینه‌ی تعاملی (نورهای دنبال‌کننده و پارالکس)",
    titleEn: "Interactive Background Orbs & Parallax",
    fields: [
      { key: "ob", label: "شدت نور دنبال‌کننده", labelEn: "Orb intensity", type: "range", min: 0, max: 1, step: 0.01 },
      { key: "os", label: "اندازه‌ی نور (٪)", labelEn: "Orb size (%)", type: "range", min: 8, max: 60, step: 1, int: true },
      { key: "olg", label: "سرعت دنبال کردن", labelEn: "Orb follow lag", type: "range", min: 0.3, max: 6, step: 0.1 },
      { key: "obl", label: "نرمی نور (Blur)", labelEn: "Orb blur (px)", type: "range", min: 0, max: 120, step: 1, int: true },
      { key: "oc1", label: "رنگ نور اول", labelEn: "Orb color 1", type: "color" },
      { key: "oc2", label: "رنگ نور دوم", labelEn: "Orb color 2", type: "color" },
      { key: "bp", label: "پارالکس پس‌زمینه", labelEn: "Background parallax", type: "range", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "playback",
    title: "نمایش",
    titleEn: "Playback",
    fields: [
      { key: "au", label: "تعویض خودکار صحنه‌ها (در حالت پیش‌نمایش)", labelEn: "Auto-switch scenes (preview)", type: "bool" },
      { key: "ai", label: "فاصله‌ی تعویض (ثانیه)", labelEn: "Switch interval (sec)", type: "range", min: 2, max: 15, step: 0.5 },
    ],
  },
];

export default function HeroSphereSettingsPage() {
  const { toast } = useToast();
  const { lang } = useLang();
  const t = dict[lang].dashboard;
  const sphereRef = useRef<ParticleSphereHandle>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tm/globe-config/", { cache: "no-store" });
      const data = await res.json();
      setSettings(data.settings ?? {});
    } catch {
      toast({
        title: lang === "fa" ? "خطا در خواندن تنظیمات" : "Failed to load settings",
        description: lang === "fa" ? "لطفاً دوباره تلاش کنید." : "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, lang]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: string, v: string | number | boolean) =>
    setSettings((s) => (s ? { ...s, [k]: v } : s));

  const applyGlassPreset = (gpr: number) => {
    const preset = GLASS_PRESETS[gpr] ?? GLASS_PRESETS[0];
    setSettings((s) => (s ? { ...s, gpr, ...preset.values } : s));
  };

  const save = async (makeDefault = false) => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tm/globe-config/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, makeDefault }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || (lang === "fa" ? "ذخیره ناموفق بود" : "Save failed"));
      }
      toast({
        title: makeDefault
          ? (lang === "fa" ? "ذخیره و پیش‌فرض شد ✓" : "Saved as default ✓")
          : (lang === "fa" ? "ذخیره شد ✓" : "Saved ✓"),
        description: makeDefault
          ? (lang === "fa"
              ? "این تنظیمات هم روی سایت اعمال شد و هم به‌عنوان پیش‌فرض سیستم ثبت گردید."
              : "Settings saved and promoted as the active fallback default.")
          : (lang === "fa"
              ? "هروی سایت در بارگذاری بعدی همین تنظیمات را نمایش می‌دهد."
              : "The hero will use these settings on the next load."),
      });
    } catch (e) {
      toast({
        title: lang === "fa" ? "خطا" : "Error",
        description: e instanceof Error ? e.message : (lang === "fa" ? "ذخیره ناموفق بود" : "Save failed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/tm/globe-config/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      if (!res.ok) throw new Error(lang === "fa" ? "بازنشانی ناموفق بود" : "Reset failed");
      await load();
      toast({ title: lang === "fa" ? "به پیش‌فرض کارخانه برگشت" : "Reset to factory defaults" });
    } catch (e) {
      toast({
        title: lang === "fa" ? "خطا" : "Error",
        description: e instanceof Error ? e.message : (lang === "fa" ? "بازنشانی ناموفق بود" : "Reset failed"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const stepScene = (dir: number) => {
    sphereRef.current?.stepScene(dir);
  };

  const onModelFile = (f?: File) => {
    if (!f) return;
    if (f.size > 1_400_000) {
      toast({
        title: lang === "fa" ? "فایل مدل بزرگ‌تر از ۱.۴ مگابایت است" : "Model file is larger than 1.4 MB",
        variant: "destructive",
      });
      return;
    }
    const r = new FileReader();
    r.onload = () => set("modelDataUri", String(r.result));
    r.readAsDataURL(f);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        {lang === "fa" ? "تنظیمات یافت نشد — صفحه را دوباره باز کنید." : "Settings not found — please reopen the page."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {t.globeEyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
            {t.globeTitle}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.globeSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={saving}
            className="flex min-h-[44px] items-center gap-2 border border-border rounded-md px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" />
            {t.globeReset}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="flex min-h-[44px] items-center gap-2 border border-border rounded-md px-4 text-sm text-foreground hover:bg-secondary/40 transition-colors disabled:opacity-50"
          >
            <Sparkles className="size-3.5" />
            {lang === "fa" ? "ثبت به‌عنوان پیش‌فرض" : "Set as default"}
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="flex min-h-[44px] items-center gap-2 rounded-md bg-foreground px-5 text-sm font-medium text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            {t.globeSave}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_440px] items-start">
        <div className="space-y-6">
          {SECTIONS.map((sec) => (
            <fieldset
              key={sec.id}
              className="space-y-4 rounded-lg border border-border bg-card p-5 sm:p-6"
            >
              <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {lang === "fa" ? sec.title : sec.titleEn}
              </legend>

              {sec.id === "glassMat" && (
                <div className="space-y-2 pb-2 border-b border-border/70">
                  <span className="block text-xs text-muted-foreground">
                    {lang === "fa" ? "انتخاب سریع متریال شیشه" : "Quick Glass Material Swatches"}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(GLASS_PRESETS).map(([keyStr, preset]) => {
                      const idx = Number(keyStr);
                      const active = Number(settings.gpr) === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyGlassPreset(idx)}
                          className={`flex items-center gap-2.5 rounded-md border px-3 py-2 text-start text-xs transition-colors ${
                            active
                              ? "border-foreground bg-secondary/60 text-foreground font-medium"
                              : "border-border bg-background/60 text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                          }`}
                        >
                          <span
                            className="size-5 shrink-0 rounded-full border border-border shadow-inner"
                            style={{ background: preset.swatch }}
                          />
                          <span className="truncate">
                            {lang === "fa" ? preset.label : preset.labelEn}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
                {sec.fields.map((f) => {
                  const v = settings[f.key];
                  if (f.type === "textarea") {
                    return (
                      <div key={f.key} className="sm:col-span-2 space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          <bdi>{lang === "fa" ? f.label : f.labelEn}</bdi>
                        </label>
                        <textarea
                          rows={4}
                          value={String(v ?? "")}
                          onChange={(e) => set(f.key, e.target.value)}
                          className="w-full rounded-md border border-border bg-background p-3 text-sm font-mono leading-relaxed"
                          dir="auto"
                        />
                      </div>
                    );
                  }
                  if (f.type === "range") {
                    const num = Number(v);
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <label className="text-xs text-muted-foreground">
                            <bdi>{lang === "fa" ? f.label : f.labelEn}</bdi>
                          </label>
                          <input
                            type="number"
                            value={Number.isFinite(num) ? num : ""}
                            step={f.step}
                            onChange={(e) => {
                              const n = parseFloat(e.target.value);
                              if (Number.isFinite(n)) set(f.key, f.int ? Math.round(n) : n);
                            }}
                            className="h-7 w-20 rounded border border-border bg-background px-2 text-xs tabular-nums"
                          />
                        </div>
                        <input
                          type="range"
                          min={f.min}
                          max={f.max}
                          step={f.step}
                          value={Number.isFinite(num) ? num : f.min}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value);
                            set(f.key, f.int ? Math.round(n) : n);
                          }}
                          className="w-full accent-foreground"
                        />
                      </div>
                    );
                  }
                  if (f.type === "color") {
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          <bdi>{lang === "fa" ? f.label : f.labelEn}</bdi>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={typeof v === "string" && v.startsWith("#") ? v : "#ffffff"}
                            onChange={(e) => set(f.key, e.target.value)}
                            className="h-8 w-12 cursor-pointer rounded border border-border p-0.5"
                          />
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {typeof v === "string" ? v : ""}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  if (f.type === "select") {
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          <bdi>{lang === "fa" ? f.label : f.labelEn}</bdi>
                        </label>
                        <select
                          value={String(Number(v ?? 0))}
                          onChange={(e) => {
                            const numVal = Number(e.target.value);
                            if (f.key === "gpr") applyGlassPreset(numVal);
                            else set(f.key, numVal);
                          }}
                          className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                        >
                          {f.options.map((o) => (
                            <option key={o.value} value={String(o.value)}>
                              {lang === "fa" ? o.label : o.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        <bdi>{lang === "fa" ? f.label : f.labelEn}</bdi>
                      </label>
                      <select
                        value={v ? "1" : "0"}
                        onChange={(e) => set(f.key, e.target.value === "1")}
                        className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                      >
                        <option value="1">{lang === "fa" ? "بله" : "Yes"}</option>
                        <option value="0">{lang === "fa" ? "خیر" : "No"}</option>
                      </select>
                    </div>
                  );
                })}
              </div>

              {sec.id === "content" && (
                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".glb,.gltf,model/gltf-binary"
                    className="hidden"
                    onChange={(e) => {
                      onModelFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex min-h-[38px] items-center gap-2 rounded-md border border-border px-3.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
                  >
                    <Upload className="size-3.5" />
                    {lang === "fa" ? "آپلود مدل سه‌بعدی (GLB / GLTF)" : "Upload 3D Model (GLB / GLTF)"}
                  </button>
                  {settings.modelDataUri ? (
                    <>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <Box className="size-3.5" />
                        {lang === "fa" ? "مدل سفارشی بارگذاری شده" : "Custom model loaded"}
                      </span>
                      <button
                        type="button"
                        onClick={() => set("modelDataUri", "")}
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
                      >
                        {lang === "fa" ? "بازگشت به مدل پیش‌فرض" : "Use default TorusKnot"}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {lang === "fa"
                        ? "در حالت پیش‌فرض از مدل هندسی TorusKnot استفاده می‌شود"
                        : "Using default TorusKnot geometry"}
                    </span>
                  )}
                </div>
              )}
            </fieldset>
          ))}
        </div>

        <div className="lg:sticky lg:top-8 space-y-3">
          <div className="overflow-hidden rounded-lg border border-border bg-[#c6c6c6]">
            <ParticleSphereCanvas
              ref={sphereRef}
              settings={settings}
              interactiveScrollScenes
              className="aspect-[16/10] w-full"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => stepScene(-1)}
              className="flex flex-1 min-h-[38px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              <ChevronRight className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
              {lang === "fa" ? "صحنه قبلی" : "Previous scene"}
            </button>
            <button
              type="button"
              onClick={() => stepScene(1)}
              className="flex flex-1 min-h-[38px] items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              <Sparkles className="size-3.5" />
              {lang === "fa" ? "صحنه بعدی" : "Next scene"}
              <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">
            {lang === "fa"
              ? "پیش‌نمایش زنده — تغییر موقعیت کره (X, Y, Z)، رفلکس HDRI، شکل ذرات (نقطه/هشت‌وجهی/بیست‌وجهی) و متریال شیشه بلافاصله دیده می‌شود. نوشته و مدل همیشه از موقعیت کره تبعیت می‌کنند و ذرات درون کره باقی می‌مانند."
              : "Live preview — sphere coordinates (X, Y, Z), studio HDRI reflections, 3D particle geometry, and glass presets update live. Texts and 3D model track the sphere position, with all particles confined inside."}
          </p>
        </div>
      </div>
    </div>
  );
}
