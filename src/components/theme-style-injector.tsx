import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import {
  buildLiveOverridesCss,
  LIVE_OVERRIDES_SETTING_KEY,
  parseLiveOverrides,
} from "@/lib/live-overrides";
import { sanitizeThemeCustomCss } from "@/lib/security";

const SAFE_RADIUS_RE = /^(?:0|\d+(?:\.\d+)?(?:px|rem|em|%))$/;
const SAFE_COLOR_RE = /^(?:#[0-9a-fA-F]{3,8}|(?:oklch|rgb|hsl)a?\([0-9a-zA-Z\s.,%/-]+\))$/;

export const getCachedThemePayload = unstable_cache(
  async () => {
    try {
      const [activeTheme, liveRow] = await Promise.all([
        db.themeSetting.findFirst({ where: { isActive: true } }),
        db.setting.findUnique({ where: { key: LIVE_OVERRIDES_SETTING_KEY } }),
      ]);
      const liveRules = liveRow?.value ? parseLiveOverrides(liveRow.value) : [];
      return {
        theme: activeTheme,
        liveRules,
        liveOverridesCss: liveRules.length > 0 ? buildLiveOverridesCss(liveRules) : "",
      };
    } catch {
      return { theme: null, liveRules: [], liveOverridesCss: "" };
    }
  },
  ["theme-style-injector"],
  { revalidate: 300, tags: ["site-theme", "live-overrides"] },
);

/**
 * ThemeStyleInjector — متغیرهای CSS تم و قوانین ویرایش زنده را از دیتابیس می‌خواند
 * و بدون مسدود کردن حالت تاریک (.dark)، در <head> تزریق می‌کند.
 */
export async function ThemeStyleInjector() {
  const { theme, liveOverridesCss } = await getCachedThemePayload();

  const lightVars: string[] = [];
  const rootVars: string[] = [];

  if (theme?.backgroundColor && SAFE_COLOR_RE.test(theme.backgroundColor)) {
    lightVars.push(`--background: ${hexToOklch(theme.backgroundColor)}`);
  }
  if (theme?.foregroundColor && SAFE_COLOR_RE.test(theme.foregroundColor)) {
    lightVars.push(`--foreground: ${hexToOklch(theme.foregroundColor)}`);
  }
  if (theme?.primaryColor && SAFE_COLOR_RE.test(theme.primaryColor)) {
    lightVars.push(`--primary: ${hexToOklch(theme.primaryColor)}`);
  }
  if (theme?.mutedColor && SAFE_COLOR_RE.test(theme.mutedColor)) {
    lightVars.push(`--muted-foreground: ${hexToOklch(theme.mutedColor)}`);
  }
  if (theme?.accentColor && SAFE_COLOR_RE.test(theme.accentColor)) {
    rootVars.push(`--clay: ${hexToOklch(theme.accentColor)}`);
  }
  if (theme?.radius && SAFE_RADIUS_RE.test(theme.radius.trim())) {
    rootVars.push(`--radius: ${theme.radius.trim()}`);
  }

  let css = "";
  if (rootVars.length > 0) {
    css += `:root {\n  ${rootVars.join(";\n  ")};\n}\n`;
  }
  if (lightVars.length > 0) {
    css += `:root:not(.dark) {\n  ${lightVars.join(";\n  ")};\n}\n`;
  }

  if (theme?.customCss?.trim()) {
    css += `\n/* CSS سفارشی ادمین */\n${sanitizeThemeCustomCss(theme.customCss)}\n`;
  }

  const dbMode = theme?.mode === "DARK" || theme?.mode === "AUTO" ? theme.mode : "LIGHT";
  const themeBootstrapJs = `(function(){try{var s=localStorage.getItem('theme');var d=s==='dark'||(!s&&(${JSON.stringify(dbMode)}==='DARK'||(${JSON.stringify(dbMode)}==='AUTO'&&window.matchMedia('(prefers-color-scheme: dark)').matches)));var r=document.documentElement;if(d){r.classList.add('dark');r.classList.remove('light');r.style.colorScheme='dark';}else{r.classList.remove('dark');r.classList.add('light');r.style.colorScheme='light';}}catch(e){}})();`;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeBootstrapJs }} />
      {css ? <style id="theme-vars" dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {liveOverridesCss ? (
        <style id="neeleh-live-overrides-css" dangerouslySetInnerHTML={{ __html: liveOverridesCss }} />
      ) : null}
    </>
  );
}

/** تبدیل hex به oklch ساده — اگر hex معتبر نبود، همان hex برمی‌گردد */
function hexToOklch(hex: string): string {
  if (hex.startsWith("oklch") || hex.startsWith("rgb") || hex.startsWith("hsl")) {
    return hex;
  }
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const [l, c, h] = rgbToOklch(r, g, b);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lr = lin(r), lg = lin(g), lb = lin(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l), m_ = Math.cbrt(m), s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bLab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  const C = Math.sqrt(a * a + bLab * bLab);
  let H = Math.atan2(bLab, a) * (180 / Math.PI);
  if (H < 0) H += 360;

  return [L, C, H];
}
