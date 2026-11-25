export const BRAND_LOGO_KEYS = [
  "brand.logoUrl",
  "brand.logoSvg",
  "brand.logoHeight",
  "brand.logoShowText",
  "brand.logoAlt",
] as const;

export type BrandLogoConfig = {
  logoUrl: string;
  logoSvg: string;
  logoHeight: number;
  showText: boolean;
  alt: string;
};

/**
 * Hardened SVG sanitizer: blocks <script>, <foreignObject>, <iframe>/<object>/<embed>/<handler>,
 * XML PI / ENTITY bombs, SMIL href/event animations, external <use>/<image> URLs,
 * slash-delimited or quoted/unquoted on* handlers, and javascript:/vbscript:/data: URLs.
 */
export function sanitizeSvgMarkup(raw: string): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";

  const cleanedHeader = input
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<!ENTITY[\s\S]*?>/gi, "")
    .replace(/<\?xml-stylesheet[\s\S]*?\?>/gi, "");

  const startIdx = cleanedHeader.search(/<svg[\s>/]/i);
  const endIdx = cleanedHeader.toLowerCase().lastIndexOf("</svg>");
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) return "";

  let svg = cleanedHeader.slice(startIdx, endIdx + 6);

  // Strip dangerous executable or embedded active elements
  const dangerousContainers = [
    "script",
    "foreignObject",
    "iframe",
    "object",
    "embed",
    "applet",
    "handler",
    "listener",
    "meta",
    "base",
    "link",
    "audio",
    "video",
  ];
  for (const tag of dangerousContainers) {
    svg = svg
      .replace(new RegExp(`<${tag}[\\s/>][\\s\\S]*?<\\/${tag}>`, "gi"), "")
      .replace(new RegExp(`<${tag}[^>]*\\/?>`, "gi"), "");
  }

  // Strip SMIL <set> or <animate...> elements that attempt to mutate href / xlink:href / on* attributes
  svg = svg
    .replace(
      /<(?:set|animate|animateTransform|animateMotion)[^>]*(?:attributeName\s*=\s*["']?\s*(?:xlink:)?href|on[a-z]+)[^>]*\/?>(?:[\s\S]*?<\/(?:set|animate|animateTransform|animateMotion)>)?/gi,
      "",
    );

  // Strip <use> or <image> referencing external URLs or data: URIs (only #fragment allowed on <use>)
  svg = svg
    .replace(
      /<use\b[^>]*(?:xlink:)?href\s*=\s*(?:"\s*(?!#)[^"]*"|'\s*(?!#)[^']*'|[^\s>#][^\s>]*)[^>]*\/?>/gi,
      "",
    )
    .replace(
      /<image\b[^>]*(?:xlink:)?href\s*=\s*(?:"\s*(?:javascript|vbscript|data:|https?:|\/\/)[^"]*"|'\s*(?:javascript|vbscript|data:|https?:|\/\/)[^']*'|(?:javascript|vbscript|data:|https?:|\/\/)[^\s>]*)[^>]*\/?>/gi,
      "",
    );

  // Strip inline event handlers even when slash-delimited (<svg/onload=...>) or unquoted
  svg = svg.replace(/(?:[\s/])+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, " ");

  // Strip javascript:/vbscript:/data:text|application links in href / xlink:href (quoted or unquoted)
  svg = svg.replace(
    /(?:[\s/])+(?:xlink:)?href\s*=\s*(?:"\s*(?:javascript|vbscript|data:(?:text|application))[^"]*"|'\s*(?:javascript|vbscript|data:(?:text|application))[^']*'|(?:javascript|vbscript|data:(?:text|application))[^\s>]*)/gi,
    " ",
  );

  // Guard CSS expression(), behavior:, @import, or javascript:/vbscript: inside inline <style> or style=""
  svg = svg
    .replace(/expression\s*\(/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/@import\b/gi, "")
    .replace(/(?:javascript|vbscript)\s*:/gi, "");

  return svg.slice(0, 120_000).trim();
}

export function sanitizeLogoUrl(raw: string | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || /[\u0000-\u001f\u007f]/.test(s)) return "";
  if (
    (s.startsWith("/") && !s.startsWith("//")) ||
    /^https?:\/\//i.test(s) ||
    /^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml);/i.test(s)
  ) {
    return s.slice(0, 1000);
  }
  return "";
}

export function extractBrandLogoConfig(
  settings: Record<string, string | undefined>,
): BrandLogoConfig {
  const rawHeight = Number(settings["brand.logoHeight"]);
  const logoHeight = Number.isFinite(rawHeight)
    ? Math.min(72, Math.max(18, Math.round(rawHeight)))
    : 28;

  return {
    logoUrl: sanitizeLogoUrl(settings["brand.logoUrl"]),
    logoSvg: sanitizeSvgMarkup(settings["brand.logoSvg"] ?? ""),
    logoHeight,
    showText: settings["brand.logoShowText"] !== "false",
    alt: (settings["brand.logoAlt"] ?? "").trim(),
  };
}

export function hasCustomBrandLogo(config: BrandLogoConfig): boolean {
  return Boolean(config.logoSvg || config.logoUrl);
}
