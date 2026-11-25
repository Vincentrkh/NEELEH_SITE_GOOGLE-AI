/**
 * Shared application security utilities:
 * - In-memory sliding-window rate limiter (IP / key scoped)
 * - Open-redirect & safe URL / href validation
 * - CSV formula injection neutralization
 * - JSON-LD script-breakout escaping
 * - CSS injection sanitization
 */

type RateEntry = {
  timestamps: number[];
};

const globalRateStore = globalThis as unknown as {
  __neelehRateBuckets?: Map<string, RateEntry>;
};

function getRateStore(): Map<string, RateEntry> {
  if (!globalRateStore.__neelehRateBuckets) {
    globalRateStore.__neelehRateBuckets = new Map<string, RateEntry>();
  }
  return globalRateStore.__neelehRateBuckets;
}

export function extractClientIp(headersLike: Headers): string {
  const xff = headersLike.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = headersLike.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

export function checkSlidingRateLimit(
  bucket: string,
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const store = getRateStore();
  const now = Date.now();
  const fullKey = `${bucket}:${key}`;

  // Periodic bounded cleanup so memory cannot grow unbounded under floods
  if (store.size > 4000) {
    for (const [k, entry] of store.entries()) {
      const fresh = entry.timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) store.delete(k);
      else entry.timestamps = fresh;
    }
  }

  const entry = store.get(fullKey) ?? { timestamps: [] };
  const recent = entry.timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= maxRequests) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    entry.timestamps = recent;
    store.set(fullKey, entry);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  entry.timestamps = recent;
  store.set(fullKey, entry);
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Ensures post-login or middleware redirects stay strictly on an internal single-slash path.
 * Blocks protocol-relative ("//evil.com"), absolute ("https://..."), backslashes, and control chars.
 */
export function sanitizeSafeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard/",
): string {
  const candidate = String(raw ?? "").trim();
  if (!candidate) return fallback;
  if (candidate.includes("\\") || /[\u0000-\u001f\u007f]/.test(candidate)) {
    return fallback;
  }
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }
  // Prevent scheme smuggling via encoded characters
  try {
    const parsed = new URL(candidate, "https://neeleh.local");
    if (parsed.origin !== "https://neeleh.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Sanitizes anchor/navigation hrefs (menus, external resource links).
 * Allows internal single-slash paths, in-page anchors, http(s):, mailto:, tel:.
 * Blocks javascript:, vbscript:, data:, and protocol-relative // URLs.
 */
export function sanitizeSafeHref(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || /[\u0000-\u001f\u007f]/.test(s)) return "";
  if (s.startsWith("#")) return s.slice(0, 500);
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 1000);
  if (/^(?:https?:\/\/|mailto:|tel:)/i.test(s)) {
    return s.slice(0, 1000);
  }
  return "";
}

/**
 * Sanitizes media URLs (covers, banners, avatars) — allows internal /... (not //) or http(s)://.
 */
export function sanitizeSafeMediaUrl(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || /[\u0000-\u001f\u007f]/.test(s)) return "";
  if (s.startsWith("/") && !s.startsWith("//")) return s.slice(0, 1000);
  if (/^https?:\/\//i.test(s)) return s.slice(0, 1000);
  return "";
}

/**
 * Prevents CSV / Excel Formula / DDE injection by prefixing dangerous leading triggers with `'`.
 */
export function escapeCsvCell(value: unknown): string {
  let str = String(value ?? "");
  if (/^[\s\uFEFF]*[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Escapes `<`, `>`, `&` inside JSON-LD serialized payloads to block `</script>` breakout.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Neutralizes HTML breakout and dangerous legacy CSS constructs in admin customCss.
 */
export function sanitizeThemeCustomCss(raw: string): string {
  return String(raw ?? "")
    .replace(/[<>]/g, "")
    .replace(/@import\b/gi, "/* blocked-import */")
    .replace(/expression\s*\(/gi, "/* blocked */(")
    .replace(/behavior\s*:/gi, "/* blocked */:")
    .replace(/-moz-binding\s*:/gi, "/* blocked */:")
    .replace(/javascript\s*:/gi, "/* blocked */:")
    .replace(/vbscript\s*:/gi, "/* blocked */:")
    .slice(0, 32_000);
}
