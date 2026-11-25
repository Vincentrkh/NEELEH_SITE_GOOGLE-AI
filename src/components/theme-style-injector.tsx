import { db } from "@/lib/db";
import {
  buildLiveOverridesCss,
  LIVE_OVERRIDES_SETTING_KEY,
  parseLiveOverrides,
} from "@/lib/live-overrides";
import { sanitizeThemeCustomCss } from "@/lib/security";

const SAFE_RADIUS_RE = /^(?:0|\d+(?:\.\d+)?(?:px|rem|em|%))$/;
const SAFE_COLOR_RE = /^(?:#[0-9a-fA-F]{3,8}|(?:oklch|rgb|hsl)a?\([0-9a-zA-Z\s.,%/-]+\))$/;

/**
 * ThemeStyleInjector — متغیرهای CSS تم و قوانین ویرایش زنده را از دیتابیس می‌خواند و در <head> تزریق می‌کند.
 *
 * این یک Server Component است که در layout ریشه فراخوانی می‌شود. اگر تمی
 * در دیتابیس نباشد (مثلاً در محیط توسعه قبل از seed)، هیچ چیزی تزریق نمی‌کند
 * و globals.css پیش‌فرض فعال می‌ماند.
 */
export async function ThemeStyleInjector() {
  let theme;
  let liveOverridesCss = "";
  try {
    const [activeTheme, liveRow] = await Promise.all([
      db.themeSetting.findFirst({ where: { isActive: true } }),
      db.setting.findUnique({ where: { key: LIVE_OVERRIDES_SETTING_KEY } }),
    ]);
    theme = activeTheme;
    if (liveRow?.value) {
      liveOverridesCss = buildLiveOverridesCss(parseLiveOverrides(liveRow.value));
    }
  } catch {
    // اگر دیتابیس هنوز آماده نیست یا خطایی رخ داد، هیچ چیزی تزریق نکن
    return null;
  }

  const vars: string[] = [];
  if (theme?.backgroundColor && SAFE_COLOR_RE.test(theme.backgroundColor)) vars.push(`--background: ${hexToOklch(theme.backgroundColor)}`);
  if (theme?.foregroundColor && SAFE_COLOR_RE.test(theme.foregroundColor)) vars.push(`--foreground: ${hexToOklch(theme.foregroundColor)}`);
  if (theme?.primaryColor && SAFE_COLOR_RE.test(theme.primaryColor)) vars.push(`--primary: ${hexToOklch(theme.primaryColor)}`);
  if (theme?.accentColor && SAFE_COLOR_RE.test(theme.accentColor)) vars.push(`--clay: ${hexToOklch(theme.accentColor)}`);
  if (theme?.mutedColor && SAFE_COLOR_RE.test(theme.mutedColor)) vars.push(`--muted-foreground: ${hexToOklch(theme.mutedColor)}`);
  if (theme?.radius && SAFE_RADIUS_RE.test(theme.radius.trim())) vars.push(`--radius: ${theme.radius.trim()}`);

  let css = "";
  if (vars.length > 0) {
    css += `:root {\n  ${vars.join(";\n  ")};\n}\n`;
  }

  if (theme?.mode === "DARK" && SAFE_COLOR_RE.test(theme.foregroundColor) && SAFE_COLOR_RE.test(theme.backgroundColor)) {
    css += `html { color-scheme: dark; }\n`;
    css += `:root {\n  --background: ${hexToOklch(theme.foregroundColor)};\n  --foreground: ${hexToOklch(theme.backgroundColor)};\n  --card: ${hexToOklch(theme.foregroundColor)};\n  --card-foreground: ${hexToOklch(theme.backgroundColor)};\n}\n`;
  }

  if (theme?.customCss?.trim()) {
    css += `\n/* CSS سفارشی ادمین */\n${sanitizeThemeCustomCss(theme.customCss)}\n`;
  }

  if (!css && !liveOverridesCss) return null;

  return (
    <>
      {css ? <style id="theme-vars" dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {liveOverridesCss ? (
        <style id="neeleh-live-overrides-css" dangerouslySetInnerHTML={{ __html: liveOverridesCss }} />
      ) : null}
      {theme?.mode === "DARK" && (
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('dark');`,
          }}
        />
      )}
      {theme?.mode === "AUTO" && (
        <script
          dangerouslySetInnerHTML={{
            __html: `if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');`,
          }}
        />
      )}
    </>
  );
}

/** تبدیل hex به oklch ساده — اگر hex معتبر نبود، همان hex برمی‌گردد */
function hexToOklch(hex: string): string {
  // اگر از قبل oklch یا rgb بود، دست نزن
  if (hex.startsWith("oklch") || hex.startsWith("rgb") || hex.startsWith("hsl")) {
    return hex;
  }
  // تبدیل hex به rgb
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  // تبدیل rgb → oklch (تقریبی)
  const [l, c, h] = rgbToOklch(r, g, b);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

// تبدیل sRGB linear → OKLab → OKLch
function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  // sRGB → linear
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lr = lin(r), lg = lin(g), lb = lin(b);

  // linear → lms
  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  // non-linear
  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);

  // OKLab
  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // OKLab → OKLch
  const C = Math.sqrt(a * a + bLab * bLab);
  let H = Math.atan2(bLab, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return [L, C, H];
}
