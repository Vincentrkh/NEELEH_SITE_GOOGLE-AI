"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/components/language-provider";
import { SETTINGS_GROUPS } from "@/lib/settings";
import {
  BRAND_LOGO_UPDATED_EVENT,
  BrandLogoGraphic,
  extractBrandLogoConfig,
  hasCustomBrandLogo,
} from "@/components/brand-logo";
import { sanitizeSvgMarkup } from "@/lib/brand-logo";
import {
  Archive,
  Code2,
  Download,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";

type Setting = { key: string; value: string; label: string | null; type: string | null };

export type LogoAssetItem = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
};

const BUILTIN_LOGO_PRESETS = [
  { url: "/logo.svg", labelFa: "لوگوی استاندارد", labelEn: "Geometric Mark" },
  { url: "/logo-fill.svg", labelFa: "لوگوی متحرک SVG", labelEn: "Animated SVG" },
];

export function SettingsEditor({
  initialSettings,
  initialLogoAssets = [],
  isAdmin = false,
}: {
  initialSettings: Setting[];
  initialLogoAssets?: LogoAssetItem[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { lang } = useLang();
  const fa = lang === "fa";

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [logoAssets, setLogoAssets] = useState<LogoAssetItem[]>(initialLogoAssets);
  const [logoMode, setLogoMode] = useState<"file" | "svg">("file");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const s of initialSettings) {
      map[s.key] = s.value;
    }
    setSettings(map);
    if ((map["brand.logoSvg"] ?? "").trim() && !(map["brand.logoUrl"] ?? "").trim()) {
      setLogoMode("svg");
    }
  }, [initialSettings]);

  function update(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  const liveLogoConfig = extractBrandLogoConfig(settings);
  const logoHeightVal = liveLogoConfig.logoHeight;
  const showTextVal = settings["brand.logoShowText"] !== "false";

  async function uploadLogoFile(file: File) {
    const isSvg =
      file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    const isImage = file.type.startsWith("image/") || isSvg;
    if (!isImage) {
      toast({
        title: fa ? "فرمت نامعتبر" : "Unsupported file",
        description: fa
          ? "فقط فایل‌های SVG، PNG، WebP، JPG یا GIF مجاز است."
          : "Only SVG, PNG, WebP, JPG, or GIF images are allowed.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/dashboard/files", { method: "POST", body: fd });
      const data = (await res.json()) as {
        error?: string;
        file?: { id: string; filename: string; url: string; mimeType: string };
      };
      if (!res.ok || !data.file) {
        toast({
          title: fa ? "خطا در آپلود لوگو" : "Upload failed",
          description: data.error || (fa ? "فایل ذخیره نشد" : "Could not upload file"),
          variant: "destructive",
        });
        return;
      }

      const uploaded = data.file;
      setLogoAssets((prev) => [uploaded, ...prev.filter((a) => a.url !== uploaded.url)]);
      setSettings((s) => ({
        ...s,
        "brand.logoUrl": uploaded.url,
        "brand.logoSvg": "",
      }));
      setLogoMode("file");
      toast({
        title: fa ? "لوگو بارگذاری شد" : "Logo uploaded",
        description: fa
          ? "پیش‌نمایش به‌روز شد — برای ثبت دائمی دکمه «ذخیره» را بزنید."
          : "Preview updated — click Save to persist changes.",
      });
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa ? "ارتباط برقرار نشد" : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  }

  async function importSvgAsCode(file: File) {
    try {
      const text = await file.text();
      const cleaned = sanitizeSvgMarkup(text);
      if (!cleaned) {
        toast({
          title: fa ? "فایل SVG نامعتبر" : "Invalid SVG",
          description: fa
            ? "تگ <svg> معتبری داخل فایل پیدا نشد."
            : "No valid <svg> markup found in this file.",
          variant: "destructive",
        });
        return;
      }
      setSettings((s) => ({
        ...s,
        "brand.logoSvg": cleaned,
        "brand.logoUrl": "",
      }));
      setLogoMode("svg");
      toast({
        title: fa ? "کد SVG بارگذاری شد" : "SVG imported",
        description: file.name,
      });
    } catch {
      toast({
        title: fa ? "خطا در خواندن فایل" : "Failed to read file",
        variant: "destructive",
      });
    }
  }

  async function saveAllSettings() {
    setBusy(true);
    try {
      const items = SETTINGS_GROUPS.flatMap((g) => g.items).map((item) => ({
        key: item.key,
        value: settings[item.key] ?? "",
        label: item.label,
        type: item.type ?? "text",
      }));
      const res = await fetch("/api/dashboard/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: items }),
      });
      if (!res.ok) {
        toast({
          title: fa ? "خطا" : "Error",
          description: fa ? "تنظیمات ذخیره نشد" : "Could not save settings",
          variant: "destructive",
        });
        return;
      }

      window.dispatchEvent(
        new CustomEvent(BRAND_LOGO_UPDATED_EVENT, {
          detail: extractBrandLogoConfig(settings),
        }),
      );
      toast({
        title: fa ? "تنظیمات ذخیره شد" : "Settings saved",
        description: fa ? "لوگو و تنظیمات در کل سایت اعمال شد." : "Logo & site settings updated.",
      });
      router.refresh();
    } catch {
      toast({
        title: fa ? "خطا" : "Error",
        description: fa ? "ارتباط برقرار نشد" : "Connection failed",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveAllSettings();
  }

  const otherGroups = SETTINGS_GROUPS.filter((g) => g.key !== "logo");

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* ─── بخش تعیین لوگو و بارگذاری SVG ─── */}
      <fieldset className="space-y-6 rounded-lg border border-border bg-card p-5 sm:p-6">
        <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          <span>{fa ? "تعیین لوگو و نشان برند (Logo & SVG)" : "Brand Logo & SVG Settings"}</span>
        </legend>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {fa
              ? "لوگوی اختصاصی سایت را با فرمت SVG یا تصویر (PNG / WebP / JPG) بارگذاری کنید تا در هدر، فوتر، صفحه ورود و پنل مدیریت نمایش داده شود."
              : "Upload a custom SVG or raster logo (PNG, WebP, JPG) to display across headers, footer, login, and admin sidebar."}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {hasCustomBrandLogo(liveLogoConfig) && (
              <button
                type="button"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    "brand.logoUrl": "",
                    "brand.logoSvg": "",
                  }))
                }
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
              >
                <RotateCcw className="size-3.5" />
                <span>{fa ? "بازنشانی به لوگوی پیش‌فرض" : "Reset to default"}</span>
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveAllSettings()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-foreground text-background px-4 text-xs font-medium hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>{fa ? "ذخیره لوگو" : "Save Logo"}</span>
            </button>
          </div>
        </div>

        {/* Live Light & Dark Previews */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-white text-neutral-900 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">
              {fa ? "پیش‌نمایش روی پس‌زمینه روشن (هدر)" : "Light Header Preview"}
            </div>
            <div className="min-h-[64px] flex items-center gap-2.5 border border-dashed border-neutral-200 px-4 py-2 rounded">
              <BrandLogoGraphic
                config={liveLogoConfig}
                fallback={
                  <span className="grid size-8 place-items-center rounded-md bg-neutral-900 text-white font-bold text-sm">
                    {fa ? "ن" : "N"}
                  </span>
                }
              />
              {(!hasCustomBrandLogo(liveLogoConfig) || showTextVal) && (
                <span className="font-semibold text-sm tracking-tight">
                  {fa ? "آکادمی نیله" : "Neeleh Academy"}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-md border border-neutral-800 bg-neutral-950 text-white p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">
              {fa ? "پیش‌نمایش روی پس‌زمینه تیره" : "Dark Surface Preview"}
            </div>
            <div className="min-h-[64px] flex items-center gap-2.5 border border-dashed border-neutral-800 px-4 py-2 rounded">
              <BrandLogoGraphic
                config={liveLogoConfig}
                fallback={
                  <span className="grid size-8 place-items-center rounded-md bg-white text-neutral-900 font-bold text-sm">
                    {fa ? "ن" : "N"}
                  </span>
                }
              />
              {(!hasCustomBrandLogo(liveLogoConfig) || showTextVal) && (
                <span className="font-semibold text-sm tracking-tight">
                  {fa ? "آکادمی نیله" : "Neeleh Academy"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Source Mode Switch */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setLogoMode("file")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium border transition-colors ${
              logoMode === "file"
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <Upload className="size-3.5" />
            <span>{fa ? "بارگذاری فایل (SVG / تصویر)" : "Upload File (SVG / Image)"}</span>
          </button>
          <button
            type="button"
            onClick={() => setLogoMode("svg")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium border transition-colors ${
              logoMode === "svg"
                ? "bg-foreground text-background border-foreground"
                : "bg-transparent text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <Code2 className="size-3.5" />
            <span>{fa ? "کد مستقیم SVG" : "Inline SVG Code"}</span>
          </button>
        </div>

        {logoMode === "file" ? (
          <div className="space-y-5">
            {/* Drag & Drop Upload Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void uploadLogoFile(f);
              }}
              className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                dragOver ? "border-foreground bg-secondary/60" : "border-border bg-secondary/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml,image/png,image/webp,image/jpeg,image/gif"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogoFile(f);
                  e.target.value = "";
                }}
                className="sr-only"
              />
              <div className="flex flex-col items-center gap-2.5">
                {uploadingLogo ? (
                  <Loader2 className="size-7 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="size-7 text-muted-foreground" />
                )}
                <div className="text-sm font-medium">
                  {uploadingLogo
                    ? fa
                      ? "در حال آپلود و بهینه‌سازی SVG..."
                      : "Uploading & sanitizing SVG..."
                    : fa
                      ? "فایل لوگو (SVG، PNG، WebP) را اینجا بکشید یا انتخاب کنید"
                      : "Drag & drop your logo file (SVG, PNG, WebP) or click to browse"}
                </div>
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-md border border-border bg-background px-4 text-xs font-medium hover:bg-secondary transition-colors"
                >
                  <ImageIcon className="size-3.5" />
                  <span>{fa ? "انتخاب فایل SVG / تصویر" : "Choose SVG / Image File"}</span>
                </button>
              </div>
            </div>

            {/* Direct URL Input + Clear */}
            <div>
              <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {fa ? "آدرس فایل لوگو (URL)" : "Logo File URL"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={settings["brand.logoUrl"] ?? ""}
                  placeholder="/uploads/my-logo.svg"
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      "brand.logoUrl": e.target.value,
                      ...(e.target.value.trim() ? { "brand.logoSvg": "" } : {}),
                    }))
                  }
                  className="min-w-0 flex-1 bg-transparent border border-border rounded-md px-3 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                />
                {(settings["brand.logoUrl"] ?? "").trim() && (
                  <button
                    type="button"
                    onClick={() => update("brand.logoUrl", "")}
                    aria-label={fa ? "حذف آدرس لوگو" : "Clear logo URL"}
                    className="inline-flex min-h-[42px] items-center justify-center rounded-md border border-border px-3 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Presets & Uploaded Media Picker */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {fa ? "انتخاب سریع از لوگوی آماده و فایل‌های آپلودشده:" : "Quick pick from presets & uploaded files:"}
              </div>
              <div className="flex flex-wrap gap-2">
                {BUILTIN_LOGO_PRESETS.map((p) => {
                  const active = (settings["brand.logoUrl"] ?? "") === p.url && !(settings["brand.logoSvg"] ?? "").trim();
                  return (
                    <button
                      key={p.url}
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          "brand.logoUrl": p.url,
                          "brand.logoSvg": "",
                        }))
                      }
                      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                        active
                          ? "border-foreground bg-secondary font-medium"
                          : "border-border hover:bg-secondary/50"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="h-5 w-5 object-contain" />
                      <span>{fa ? p.labelFa : p.labelEn}</span>
                    </button>
                  );
                })}
                {logoAssets.map((asset) => {
                  const active =
                    (settings["brand.logoUrl"] ?? "") === asset.url &&
                    !(settings["brand.logoSvg"] ?? "").trim();
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          "brand.logoUrl": asset.url,
                          "brand.logoSvg": "",
                        }))
                      }
                      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors max-w-[200px] ${
                        active
                          ? "border-foreground bg-secondary font-medium"
                          : "border-border hover:bg-secondary/50"
                      }`}
                      title={asset.filename}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt="" className="h-5 w-5 object-contain shrink-0" />
                      <span className="truncate">{asset.filename}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {fa ? "کد برداری SVG (<svg>...</svg>)" : "Inline SVG Markup (<svg>...</svg>)"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={svgCodeInputRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importSvgAsCode(f);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => svgCodeInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary transition-colors"
                >
                  <Upload className="size-3.5" />
                  <span>{fa ? "بارگذاری فایل .svg به کد" : "Import .svg file"}</span>
                </button>
                {(settings["brand.logoSvg"] ?? "").trim() && (
                  <button
                    type="button"
                    onClick={() => update("brand.logoSvg", "")}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    <span>{fa ? "پاک کردن کد" : "Clear"}</span>
                  </button>
                )}
              </div>
            </div>
            <textarea
              dir="ltr"
              rows={6}
              value={settings["brand.logoSvg"] ?? ""}
              placeholder='<svg viewBox="0 0 120 32" xmlns="http://www.w3.org/2000/svg">...</svg>'
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  "brand.logoSvg": e.target.value,
                  ...(e.target.value.trim() ? { "brand.logoUrl": "" } : {}),
                }))
              }
              className="w-full rounded-md border border-border bg-transparent p-3 font-mono text-xs leading-5 outline-none focus:border-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              {fa
                ? "کدهای SVG به‌صورت خودکار در سرور پاک‌سازی و ایمن‌سازی می‌شوند."
                : "Uploaded and inline SVG markup is automatically sanitized server-side."}
            </p>
          </div>
        )}

        {/* Display Options: Height, Show Wordmark, Alt */}
        <div className="grid gap-5 sm:grid-cols-3 border-t border-border pt-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{fa ? "ارتفاع نمایش لوگو" : "Display Height"}</span>
              <span className="font-mono tabular-nums text-foreground font-medium">
                {logoHeightVal}px
              </span>
            </div>
            <input
              type="range"
              min={18}
              max={64}
              step={1}
              value={logoHeightVal}
              onChange={(e) => update("brand.logoHeight", e.target.value)}
              className="w-full accent-foreground"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-xs text-muted-foreground">
              {fa ? "نمایش عنوان کنار لوگو" : "Show Brand Name Next to Logo"}
            </span>
            <button
              type="button"
              onClick={() => update("brand.logoShowText", showTextVal ? "false" : "true")}
              className={`w-full min-h-[40px] rounded-md border px-3 text-xs font-medium transition-colors text-start flex items-center justify-between ${
                showTextVal
                  ? "border-foreground bg-secondary/50 text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <span>
                {showTextVal
                  ? fa
                    ? "بله — لوگو + عنوان"
                    : "Yes — Logo + Title"
                  : fa
                    ? "خیر — فقط تصویر لوگو"
                    : "No — Logo Only"}
              </span>
              <span className="text-[10px] font-mono uppercase opacity-70">
                {showTextVal ? "ON" : "OFF"}
              </span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground">
              {fa ? "متن جایگزین (Alt Text)" : "Logo Alt Text"}
            </label>
            <input
              type="text"
              value={settings["brand.logoAlt"] ?? ""}
              placeholder={fa ? "آکادمی نیله" : "Neeleh Academy"}
              onChange={(e) => update("brand.logoAlt", e.target.value)}
              className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-foreground transition-colors min-h-[40px]"
            />
          </div>
        </div>
      </fieldset>

      {/* ─── سایر بخش‌های تنظیمات ─── */}
      {otherGroups.map((group) => (
        <fieldset
          key={group.key}
          className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6"
        >
          <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {fa ? group.label : group.labelEn}
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            {group.items.map((item) => (
              <div key={item.key} className={item.type === "textarea" ? "sm:col-span-2" : ""}>
                <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  {fa ? item.label : item.labelEn || item.label}
                </label>
                {item.type === "textarea" ? (
                  <textarea
                    value={settings[item.key] ?? ""}
                    onChange={(e) => update(item.key, e.target.value)}
                    rows={3}
                    className="w-full bg-transparent border border-border rounded-md p-3 text-sm outline-none focus:border-foreground transition-colors resize-y min-h-[44px]"
                  />
                ) : (
                  <input
                    type="text"
                    value={settings[item.key] ?? ""}
                    onChange={(e) => update(item.key, e.target.value)}
                    dir={item.key.startsWith("social.") || item.key.includes("email") ? "ltr" : undefined}
                    className="w-full bg-transparent border-b border-border py-3 text-sm outline-none focus:border-foreground transition-colors min-h-[44px] text-start"
                  />
                )}
                <code className="text-[10px] text-muted-foreground/60 mt-1 block" dir="ltr">
                  {item.key}
                </code>
              </div>
            ))}
          </div>
        </fieldset>
      ))}

      {/* ─── بکاپ کامل پروژه (فقط مدیر کل) ─── */}
      {isAdmin && (
        <fieldset className="space-y-4 rounded-lg border border-border bg-card p-5 sm:p-6">
          <legend className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {fa ? "بکاپ کامل پروژه (ZIP)" : "Full Project Backup (ZIP)"}
          </legend>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Archive className="size-4 text-muted-foreground" aria-hidden />
                <span>
                  {fa
                    ? "دریافت نسخه پشتیبان کامل کدها، دیتابیس و فایل‌ها"
                    : "Download portable source, database & media archive"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {fa
                  ? "شامل تمام کدهای سورس (src)، اسکیمای Prisma، دیتابیس SQLite، اسکریپت‌ها، فایل‌های عمومی و راهنمای بازیابی (بدون node_modules و فایل‌های حساس محیطی)."
                  : "Includes src, Prisma schema, SQLite database, scripts, public media, and RESTORE_INSTRUCTIONS.txt (excludes node_modules, .next, and .env secrets)."}
              </p>
            </div>
            <a
              href="/api/dashboard/backup/"
              download
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-background px-5 text-sm font-medium hover:bg-secondary transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="size-4" aria-hidden />
              <span>{fa ? "دانلود بکاپ ZIP" : "Download ZIP Backup"}</span>
            </a>
          </div>
        </fieldset>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 sticky bottom-4 z-10">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-[48px] items-center gap-2 bg-foreground text-background rounded-md px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {fa ? "ذخیره تنظیمات" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
