"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { dict } from "@/lib/i18n";
import { getDefaultStyle, type IllustrationStyle } from "@/lib/illustration/style";
import { Loader2, RotateCcw, Save } from "lucide-react";

export function IllustrationStyleEditor() {
  const { toast } = useToast();
  const { lang } = useLang();
  const t = dict[lang].dashboard;
  const [style, setStyle] = useState<IllustrationStyle>(getDefaultStyle);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/illustration-style")
      .then((r) => r.json())
      .then((d: { style?: IllustrationStyle }) => {
        if (d.style) setStyle(d.style);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof IllustrationStyle>(key: K, value: IllustrationStyle[K]) {
    setStyle((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/illustration-style", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(style),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: lang === "fa" ? "خطا" : "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: t.illToastSaved });
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setStyle(getDefaultStyle());
    toast({ title: t.illToastReset, description: t.illToastResetDesc });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const colorFields: Array<{ key: keyof IllustrationStyle; label: string; hint: string }> = [
    { key: "bgColor", label: t.illBg, hint: t.illBgHint },
    { key: "lineColor", label: t.illLines, hint: t.illLinesHint },
    { key: "accentColor", label: t.illAccent, hint: t.illAccentHint },
    { key: "waterColor", label: t.illWater, hint: t.illWaterHint },
    { key: "vegetationColor", label: t.illVegetation, hint: t.illVegetationHint },
    { key: "fillColor", label: t.illFill, hint: t.illFillHint },
  ];

  const numFields: Array<{ key: keyof IllustrationStyle; label: string; hint: string; min: number; max: number; step: number }> = [
    { key: "thinLineWidth", label: t.illThin, hint: t.illThinHint, min: 0.1, max: 4, step: 0.1 },
    { key: "thickLineWidth", label: t.illThick, hint: t.illThickHint, min: 0.5, max: 6, step: 0.1 },
    { key: "outlineWidth", label: t.illOutline, hint: t.illOutlineHint, min: 0.5, max: 8, step: 0.1 },
    { key: "edgeFadeOpacity", label: t.illEdgeOpacity, hint: t.illEdgeOpacityHint, min: 0, max: 1, step: 0.05 },
    { key: "centerOpacity", label: t.illCenterOpacity, hint: t.illCenterOpacityHint, min: 0, max: 1, step: 0.05 },
    { key: "fadeRadius", label: t.illFadeRadius, hint: t.illFadeRadiusHint, min: 0, max: 1, step: 0.05 },
    { key: "animationSpeed", label: t.illAnimSpeed, hint: t.illAnimSpeedHint, min: 0.2, max: 3, step: 0.1 },
  ];

  const boolFields: Array<{ key: keyof IllustrationStyle; label: string }> = [
    { key: "enableWave", label: t.illWave },
    { key: "enableSway", label: t.illSway },
    { key: "enableDraw", label: t.illDraw },
    { key: "enablePulse", label: t.illPulse },
  ];

  return (
    <form onSubmit={onSave} className="space-y-6">
      <fieldset className="rounded-lg border border-border bg-card p-5 space-y-4">
        <legend className="px-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {t.illColorsSection}
        </legend>
        <p className="text-xs text-muted-foreground">{t.illColorsSub}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {colorFields.map((f) => (
            <label key={f.key} className="flex items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-medium">{f.label}</div>
                <div className="text-xs text-muted-foreground">{f.hint}</div>
              </div>
              <input
                type="color"
                value={String(style[f.key])}
                onChange={(e) => update(f.key, e.target.value as never)}
                className="h-9 w-12 rounded border border-border bg-background p-0.5 cursor-pointer"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-border bg-card p-5 space-y-4">
        <legend className="px-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {t.illWidthSection} & {t.illFadeSection}
        </legend>
        <div className="grid sm:grid-cols-2 gap-4">
          {numFields.map((f) => (
            <label key={f.key} className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">{f.label}</span>
                <span className="text-xs font-mono text-muted-foreground">{String(style[f.key])}</span>
              </div>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={Number(style[f.key])}
                onChange={(e) => update(f.key, Number(e.target.value) as never)}
                className="w-full"
              />
              <div className="text-[11px] text-muted-foreground">{f.hint}</div>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-border bg-card p-5 space-y-3">
        <legend className="px-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {t.illAnimSection}
        </legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {boolFields.map((f) => (
            <label key={f.key} className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(style[f.key])}
                onChange={(e) => update(f.key, e.target.checked as never)}
                className="size-4 rounded border-border"
              />
              <span>{f.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border px-4 text-sm text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-4" />
          {t.illReset}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-foreground text-background px-5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {t.illSave}
        </button>
      </div>
    </form>
  );
}
