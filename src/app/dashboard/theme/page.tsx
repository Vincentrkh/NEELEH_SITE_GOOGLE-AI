"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { dict } from "@/lib/i18n";
import { Loader2, Save, RotateCcw, Palette } from "lucide-react";

type ThemeData = {
  id: string;
  backgroundColor: string;
  foregroundColor: string;
  primaryColor: string;
  accentColor: string;
  mutedColor: string;
  fontHeading: string;
  fontBody: string;
  radius: string;
  mode: "LIGHT" | "DARK" | "AUTO";
  customCss: string;
};

const DEFAULTS: Omit<ThemeData, "id"> = {
  backgroundColor: "#fafaf7",
  foregroundColor: "#1a1a18",
  primaryColor: "#1f1f1c",
  accentColor: "#a8632c",
  mutedColor: "#8a8a85",
  fontHeading: "Estedad Var",
  fontBody: "Vazirmatn Var",
  radius: "0.75rem",
  mode: "LIGHT",
  customCss: "",
};

const FONT_OPTIONS: { value: string; labelFa: string; labelEn: string }[] = [
  { value: "Estedad Var", labelFa: "Estedad (فارسی/لاتین)", labelEn: "Estedad (Persian/Latin)" },
  { value: "Vazirmatn Var", labelFa: "Vazirmatn (فارسی/لاتین)", labelEn: "Vazirmatn (Persian/Latin)" },
  { value: "Sultan K Medium", labelFa: "Sultan K (فارسی)", labelEn: "Sultan K (Persian)" },
  { value: "var(--font-geist-sans)", labelFa: "Geist Sans (لاتین)", labelEn: "Geist Sans (Latin)" },
  { value: "var(--font-geist-mono)", labelFa: "Geist Mono (لاتین)", labelEn: "Geist Mono (Latin)" },
  { value: "var(--font-serif-display)", labelFa: "Instrument Serif (لاتین)", labelEn: "Instrument Serif (Latin)" },
];

export default function ThemePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { lang } = useLang();
  const t = dict[lang].dashboard;
  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/theme")
      .then(async (r) => {
        if (r.status === 403) {
          setDenied(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.theme) setTheme(data.theme);
        else setTheme({ id: "new", ...DEFAULTS });
      })
      .catch(() => setTheme({ id: "new", ...DEFAULTS }));
  }, []);

  function update<K extends keyof ThemeData>(key: K, value: ThemeData[K]) {
    setTheme((t) => (t ? { ...t, [key]: value } : t));
  }

  const toastErrorTitle = lang === "fa" ? "خطا" : "Error";
  const toastSavedTitle = lang === "fa" ? "تم به‌روزرسانی شد" : "Theme updated";
  const toastSavedDesc =
    lang === "fa"
      ? "تغییرات در کل سایت اعمال شد"
      : "Changes applied across the site";
  const toastNetworkDesc =
    lang === "fa" ? "ارتباط برقرار نشد" : "Connection failed";
  const confirmResetMessage =
    lang === "fa"
      ? "بازگردانی به تم پیش‌فرض؟ همه تغییرات از بین می‌رود."
      : "Reset to default theme? All changes will be lost.";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!theme) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: toastErrorTitle, description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: toastSavedTitle, description: toastSavedDesc });
      router.refresh();
    } catch {
      toast({ title: toastErrorTitle, description: toastNetworkDesc, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    if (!confirm(confirmResetMessage)) return;
    setTheme((t) => (t ? { ...t, ...DEFAULTS } : t));
  }

  if (denied) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {lang === "fa" ? "دسترسی مجاز نیست" : "Access denied"}
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const modeLabels: Record<"LIGHT" | "DARK" | "AUTO", string> = {
    LIGHT: t.themeModeLight,
    DARK: t.themeModeDark,
    AUTO: t.themeModeAuto,
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
            {t.themeEyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-[-0.03em]">
            {t.themeTitle}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.themeSubtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex min-h-[44px] items-center gap-2 border border-border rounded-md px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <RotateCcw className="size-3.5" />
          {t.themeReset}
        </button>
      </div>

      {/* Mode selector */}
      <fieldset className="space-y-3 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t.themeDisplayMode}
        </legend>
        <div className="grid sm:grid-cols-3 gap-3">
          {(["LIGHT", "DARK", "AUTO"] as const).map((m) => {
            const active = theme.mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => update("mode", m)}
                className={`flex min-h-[64px] items-center gap-3 p-4 rounded-md border transition-colors ${
                  active
                    ? "border-foreground bg-secondary"
                    : "border-border hover:bg-secondary/40"
                }`}
              >
                <Palette className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{modeLabels[m]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Color palette */}
      <fieldset className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t.themePalette}
        </legend>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ColorField
            label={t.themeBackgroundColor}
            value={theme.backgroundColor}
            onChange={(v) => update("backgroundColor", v)}
          />
          <ColorField
            label={t.themeForegroundColor}
            value={theme.foregroundColor}
            onChange={(v) => update("foregroundColor", v)}
          />
          <ColorField
            label={t.themePrimaryColor}
            value={theme.primaryColor}
            onChange={(v) => update("primaryColor", v)}
          />
          <ColorField
            label={t.themeAccentColor}
            value={theme.accentColor}
            onChange={(v) => update("accentColor", v)}
          />
          <ColorField
            label={t.themeMutedColor}
            value={theme.mutedColor}
            onChange={(v) => update("mutedColor", v)}
          />
          <Field label={t.themeRadius}>
            <input
              type="text"
              value={theme.radius}
              onChange={(e) => update("radius", e.target.value)}
              dir="ltr"
              placeholder="0.75rem"
              className="w-full bg-transparent border-b border-border py-2 text-sm tabular-nums outline-none focus:border-foreground transition-colors"
            />
          </Field>
        </div>
      </fieldset>

      {/* Live preview */}
      <fieldset className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t.themePreview}
        </legend>
        <div
          className="rounded-md p-8 my-2"
          style={{
            backgroundColor: theme.backgroundColor,
            color: theme.foregroundColor,
            borderRadius: theme.radius,
            fontFamily: theme.fontBody,
          }}
        >
          <h3
            className="text-2xl font-medium mb-3"
            style={{ fontFamily: theme.fontHeading }}
          >
            {lang === "fa" ? "آکادمی نیله" : "Neeleh Academy"}
          </h3>
          <p className="text-sm leading-relaxed opacity-80 mb-4">
            {lang === "fa"
              ? "این یک پیش‌نمایش از تنظیمات فعلی تم است. با تغییر رنگ‌ها و فونت‌ها، این بخش به‌صورت زنده به‌روزرسانی می‌شود."
              : "This is a live preview of the current theme. Changing colors and fonts updates this section in real time."}
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{
              backgroundColor: theme.primaryColor,
              color: theme.backgroundColor,
              borderRadius: theme.radius,
            }}
          >
            {t.themePreviewButton}
          </button>
          <span
            className="ms-3 text-sm"
            style={{ color: theme.accentColor }}
          >
            {t.themePreviewLink}
          </span>
          <span
            className="ms-3 text-sm"
            style={{ color: theme.mutedColor }}
          >
            {t.themePreviewMuted}
          </span>
        </div>
      </fieldset>

      {/* Fonts */}
      <fieldset className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t.themeFonts}
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.themeFontHeading}>
            <select
              value={theme.fontHeading}
              onChange={(e) => update("fontHeading", e.target.value)}
              className="w-full bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors"
            >
              {FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {lang === "fa" ? o.labelFa : o.labelEn}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.themeFontBody}>
            <select
              value={theme.fontBody}
              onChange={(e) => update("fontBody", e.target.value)}
              className="w-full bg-transparent border-b border-border py-2 text-sm outline-none focus:border-foreground transition-colors"
            >
              {FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {lang === "fa" ? o.labelFa : o.labelEn}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      {/* Custom CSS */}
      <fieldset className="space-y-3 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <bdi>{t.themeCustomCss}</bdi>
        </legend>
        <p className="text-xs text-muted-foreground leading-relaxed">
          <bdi>{t.themeCustomCssHint}</bdi>
        </p>
        <textarea
          value={theme.customCss}
          onChange={(e) => update("customCss", e.target.value)}
          rows={8}
          dir="ltr"
          placeholder={
            lang === "fa"
              ? "/* مثال */\n:root {\n  --clay: #b07030;\n}\n.hero-title { letter-spacing: -0.04em; }"
              : "/* Example */\n:root {\n  --clay: #b07030;\n}\n.hero-title { letter-spacing: -0.04em; }"
          }
          className="w-full bg-background border border-border rounded-md p-3 text-sm font-mono outline-none focus:border-foreground transition-colors resize-y"
        />
      </fieldset>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4 z-10">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-[48px] items-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {t.themeSave}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
        <bdi>{label}</bdi>
      </label>
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3 border-b border-border py-2 min-h-[52px]">
        <label className="size-11 rounded cursor-pointer bg-transparent border border-border shrink-0 relative overflow-hidden" aria-label={label}>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full opacity-0 cursor-pointer"
          />
          <span className="absolute inset-0 pointer-events-none" style={{ backgroundColor: value }} />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          className="flex-1 bg-transparent text-sm tabular-nums outline-none min-h-[44px]"
        />
      </div>
    </Field>
  );
}
