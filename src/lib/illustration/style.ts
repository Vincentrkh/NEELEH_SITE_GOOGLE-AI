import { db } from "@/lib/db";

/**
 * سیستم استایل تصویر آکادمی نیله.
 *
 * همه‌ی تصاویر برداری سایت از این استایل استفاده می‌کنند:
 *   - رنگ پس‌زمینه، خطوط، تأکید، آب، گیاهان
 *   - ضخامت خطوط (مویری، اصلی، لبه)
 *   - میزان fade حاشیه‌ها
 *   - سرعت و فعال/غیرفعال بودن انیمیشن‌ها
 *
 * استایل پیش‌فرض بر اساس تحلیل تصویر مرجع معماری خطی:
 *   bg: #F2F0EB, lines: #B8B5AE, accent: #8E3B3B
 *   Quiet. Refined. Nostalgic.
 */

export type IllustrationStyle = {
  bgColor: string;
  lineColor: string;
  accentColor: string;
  waterColor: string;
  vegetationColor: string;
  fillColor: string;
  thinLineWidth: number;
  thickLineWidth: number;
  outlineWidth: number;
  edgeFadeOpacity: number;
  centerOpacity: number;
  fadeRadius: number;
  animationSpeed: number;
  enableWave: boolean;
  enableSway: boolean;
  enableDraw: boolean;
  enablePulse: boolean;
};

const DEFAULT_STYLE: IllustrationStyle = {
  bgColor: "#F2F0EB",
  lineColor: "#B8B5AE",
  accentColor: "#8E3B3B",
  waterColor: "#DCE4E4",
  vegetationColor: "#E4E6E0",
  fillColor: "#D8D5CE",
  thinLineWidth: 0.5,
  thickLineWidth: 1.5,
  outlineWidth: 2.0,
  edgeFadeOpacity: 0.2,
  centerOpacity: 0.9,
  fadeRadius: 0.6,
  animationSpeed: 1.0,
  enableWave: true,
  enableSway: true,
  enableDraw: true,
  enablePulse: true,
};

/** استایل فعال را از دیتابیس می‌خواند — با fallback به پیش‌فرض */
export async function getIllustrationStyle(): Promise<IllustrationStyle> {
  try {
    const row = await db.illustrationStyle.findFirst({
      where: { isActive: true },
    });
    if (!row) return DEFAULT_STYLE;
    return {
      bgColor: row.bgColor,
      lineColor: row.lineColor,
      accentColor: row.accentColor,
      waterColor: row.waterColor,
      vegetationColor: row.vegetationColor,
      fillColor: row.fillColor,
      thinLineWidth: row.thinLineWidth,
      thickLineWidth: row.thickLineWidth,
      outlineWidth: row.outlineWidth,
      edgeFadeOpacity: row.edgeFadeOpacity,
      centerOpacity: row.centerOpacity,
      fadeRadius: row.fadeRadius,
      animationSpeed: row.animationSpeed,
      enableWave: row.enableWave,
      enableSway: row.enableSway,
      enableDraw: row.enableDraw,
      enablePulse: row.enablePulse,
    };
  } catch {
    return DEFAULT_STYLE;
  }
}

/** استایل را به‌صورت CSS variables برای استفاده در client components تبدیل می‌کند */
export function styleToCSSVars(style: IllustrationStyle): Record<string, string> {
  return {
    "--illus-bg": style.bgColor,
    "--illus-line": style.lineColor,
    "--illus-accent": style.accentColor,
    "--illus-water": style.waterColor,
    "--illus-vegetation": style.vegetationColor,
    "--illus-fill": style.fillColor,
    "--illus-thin-w": `${style.thinLineWidth}px`,
    "--illus-thick-w": `${style.thickLineWidth}px`,
    "--illus-outline-w": `${style.outlineWidth}px`,
    "--illus-fade-opacity": `${style.edgeFadeOpacity}`,
    "--illus-center-opacity": `${style.centerOpacity}`,
    "--illus-anim-speed": `${style.animationSpeed}`,
  };
}

/** استایل پیش‌فرض را برمی‌گرداند (برای use در client بدون await) */
export function getDefaultStyle(): IllustrationStyle {
  return { ...DEFAULT_STYLE };
}
