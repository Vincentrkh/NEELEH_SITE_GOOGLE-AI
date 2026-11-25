export const LIVE_OVERRIDES_SETTING_KEY = "neeleh_live_overrides";

export type LiveOverrideRule = {
  id: string;
  /** Route pathname (normalized, e.g. "/" or "/why-neeleh") or "*" for site-wide */
  path: string;
  /** Unique CSS selector targeting the element */
  selector: string;
  /** Human-readable tag/descriptor shown in UI */
  label: string;
  /** Optional replaced plain text content */
  text?: string;
  /** Optional CSS declarations (kebab-case or camelCase) */
  styles?: Record<string, string>;
  /** Optional raw CSS declarations string for this selector */
  customCss?: string;
  /** Optional visibility override */
  hidden?: boolean;
  /** ISO timestamp */
  updatedAt: string;
};

/** Normalizes route pathnames consistently (strips trailing slash except "/") */
export function normalizeOverridePath(path: string): string {
  const clean = (path || "/").split("?")[0].split("#")[0].trim();
  if (!clean || clean === "/") return "/";
  if (clean === "*") return "*";
  return clean.endsWith("/") ? clean.slice(0, -1) : clean;
}

export function camelToKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function sanitizeCssProp(prop: string): string | null {
  const kebab = camelToKebab(prop.trim());
  if (!/^[a-z][a-z0-9-]{0,48}$/.test(kebab)) return null;
  return kebab;
}

export function sanitizeCssValue(val: string): string | null {
  const clean = String(val ?? "").replace(/[{}<>]/g, "").replace(/;\s*$/, "").trim();
  if (!clean || clean.length > 400) return null;
  if (
    /url\s*\(\s*["']?(?:javascript|vbscript|data:text\/html)/i.test(clean) ||
    /expression\s*\(/i.test(clean) ||
    /behavior\s*:/i.test(clean)
  ) {
    return null;
  }
  return clean;
}

export function sanitizeCustomDeclarations(raw: string): string {
  return String(raw ?? "")
    .replace(/[<>]/g, "")
    .replace(/[{}]/g, "")
    .replace(/@import\b/gi, "")
    .replace(/expression\s*\(/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/(?:javascript|vbscript)\s*:/gi, "")
    .slice(0, 1500)
    .trim();
}

export function parseLiveOverrides(raw: string | null | undefined): LiveOverrideRule[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { rules?: unknown }).rules)
        ? (parsed as { rules: unknown[] }).rules
        : [];
    const out: LiveOverrideRule[] = [];
    for (const item of list) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const selector = typeof r.selector === "string" ? r.selector.trim() : "";
      if (!selector || selector.length > 500 || /[{}<>]/.test(selector)) continue;
      const path = normalizeOverridePath(typeof r.path === "string" ? r.path : "/");
      const styles: Record<string, string> = {};
      if (r.styles && typeof r.styles === "object" && !Array.isArray(r.styles)) {
        for (const [k, v] of Object.entries(r.styles as Record<string, unknown>)) {
          const prop = sanitizeCssProp(k);
          const val = sanitizeCssValue(String(v ?? ""));
          if (prop && val) styles[prop] = val;
        }
      }
      out.push({
        id: typeof r.id === "string" && r.id.trim() ? r.id.trim() : `${path}::${selector}`,
        path,
        selector,
        label: typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 120) : selector.slice(0, 60),
        ...(typeof r.text === "string" ? { text: r.text } : {}),
        ...(Object.keys(styles).length > 0 ? { styles } : {}),
        ...(typeof r.customCss === "string" && r.customCss.trim()
          ? { customCss: sanitizeCustomDeclarations(r.customCss) }
          : {}),
        ...(r.hidden === true ? { hidden: true } : {}),
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function escapeSelectorAttr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Serializes saved rules into scoped CSS.
 * Route-specific rules are scoped via `html[data-live-path="/..."] <selector>`
 * so styles never leak onto unrelated routes while navigating client-side.
 */
export function buildLiveOverridesCss(rules: LiveOverrideRule[]): string {
  const blocks: string[] = [];
  for (const r of rules) {
    if (!r.selector || /[{}<>]/.test(r.selector)) continue;
    const decls: string[] = [];
    if (r.styles) {
      for (const [k, v] of Object.entries(r.styles)) {
        const prop = sanitizeCssProp(k);
        const val = sanitizeCssValue(v);
        if (prop && val) {
          decls.push(`${prop}: ${val} !important`);
        }
      }
    }
    if (r.hidden) {
      decls.push("display: none !important");
    }
    if (r.customCss) {
      const cleaned = sanitizeCustomDeclarations(r.customCss);
      if (cleaned) decls.push(cleaned);
    }
    if (decls.length === 0) continue;

    const norm = normalizeOverridePath(r.path);
    const scopedSelector =
      norm === "*"
        ? r.selector
        : `html[data-live-path="${escapeSelectorAttr(norm)}"] ${r.selector}`;
    blocks.push(`${scopedSelector} {\n  ${decls.join(";\n  ")};\n}`);
  }
  return blocks.join("\n");
}
