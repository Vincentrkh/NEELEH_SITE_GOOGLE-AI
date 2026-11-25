import { sanitizeSafeHref } from "./security";

export const SOCIAL_PLATFORMS = [
  "telegram",
  "whatsapp",
  "eitaa",
  "bale",
  "instagram",
  "linkedin",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type StudentSocials = {
  telegram?: string | null;
  whatsapp?: string | null;
  eitaa?: string | null;
  bale?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
};

export const SOCIAL_PLATFORM_META: Record<
  SocialPlatform,
  {
    key: SocialPlatform;
    labelFa: string;
    labelEn: string;
    shortFa: string;
    shortEn: string;
    placeholderFa: string;
    placeholderEn: string;
    supportsMessaging: boolean;
  }
> = {
  telegram: {
    key: "telegram",
    labelFa: "تلگرام",
    labelEn: "Telegram",
    shortFa: "تلگرام",
    shortEn: "TG",
    placeholderFa: "@username یا شماره",
    placeholderEn: "@username or phone",
    supportsMessaging: true,
  },
  whatsapp: {
    key: "whatsapp",
    labelFa: "واتساپ",
    labelEn: "WhatsApp",
    shortFa: "واتساپ",
    shortEn: "WA",
    placeholderFa: "09123456789",
    placeholderEn: "09123456789",
    supportsMessaging: true,
  },
  eitaa: {
    key: "eitaa",
    labelFa: "ایتا",
    labelEn: "Eitaa",
    shortFa: "ایتا",
    shortEn: "Eitaa",
    placeholderFa: "@id یا شماره موبایل",
    placeholderEn: "@handle or phone",
    supportsMessaging: true,
  },
  bale: {
    key: "bale",
    labelFa: "بله",
    labelEn: "Bale",
    shortFa: "بله",
    shortEn: "Bale",
    placeholderFa: "@id یا شماره موبایل",
    placeholderEn: "@handle or phone",
    supportsMessaging: true,
  },
  instagram: {
    key: "instagram",
    labelFa: "اینستاگرام",
    labelEn: "Instagram",
    shortFa: "اینستا",
    shortEn: "IG",
    placeholderFa: "@page_id",
    placeholderEn: "@handle",
    supportsMessaging: false,
  },
  linkedin: {
    key: "linkedin",
    labelFa: "لینکدین",
    labelEn: "LinkedIn",
    shortFa: "لینکدین",
    shortEn: "IN",
    placeholderFa: "username یا لینک پروفایل",
    placeholderEn: "username or profile URL",
    supportsMessaging: false,
  },
};

const FA_DIGITS_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function toAsciiDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (ch) => FA_DIGITS_MAP[ch] ?? ch);
}

/**
 * Normalizes a user-supplied social handle or URL into a clean, safe string.
 * Strips HTML tags, control chars, and protocol prefixes from known domains.
 */
export function normalizeSocialHandle(
  platform: SocialPlatform,
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  let val = toAsciiDigits(String(raw))
    .replace(/[\u0000-\u001f\u007f<>`"'\\]/g, "")
    .trim();
  if (!val) return null;

  // Reject explicit dangerous schemes
  if (/^(javascript|vbscript|data):/i.test(val)) return null;

  // Extract handle if a full known URL was pasted
  val = val
    .replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, "")
    .replace(/^https?:\/\/(www\.)?(wa\.me|api\.whatsapp\.com\/send\?phone=)/i, "")
    .replace(/^https?:\/\/(www\.)?eitaa\.com\//i, "")
    .replace(/^https?:\/\/(www\.)?ble\.ir\//i, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\//i, "");

  val = val.split("?")[0]?.replace(/\/+$/, "").trim() ?? "";
  if (!val) return null;

  if (platform === "whatsapp") {
    const digits = val.replace(/[^\d+]/g, "");
    if (!digits || digits.length < 7) return null;
    if (digits.startsWith("09") && digits.length === 11) {
      return `+98${digits.slice(1)}`.slice(0, 32);
    }
    if (digits.startsWith("989") && digits.length === 12) {
      return `+${digits}`.slice(0, 32);
    }
    return digits.slice(0, 32);
  }

  if (platform === "linkedin") {
    if (/^https?:\/\//i.test(val)) {
      return sanitizeSafeHref(val).slice(0, 120) || null;
    }
    return val.replace(/^@+/, "").slice(0, 100) || null;
  }

  // Handle @username or Iranian phone for telegram/eitaa/bale/instagram
  const cleaned = val.replace(/\s+/g, "");
  if (cleaned.length < 2) return null;
  if (/^\+?\d{7,15}$/.test(cleaned)) {
    return cleaned.slice(0, 32);
  }
  const handle = cleaned.replace(/^@+/, "");
  if (!/^[a-zA-Z0-9._-]{2,64}$/.test(handle)) {
    // Allow non-empty safe fallback up to 64 chars if user typed valid characters
    return handle.slice(0, 64) || null;
  }
  return `@${handle}`;
}

export function normalizeSocialsInput(input: StudentSocials): Required<{
  [K in SocialPlatform]: string | null;
}> {
  return {
    telegram: normalizeSocialHandle("telegram", input.telegram),
    whatsapp: normalizeSocialHandle("whatsapp", input.whatsapp),
    eitaa: normalizeSocialHandle("eitaa", input.eitaa),
    bale: normalizeSocialHandle("bale", input.bale),
    instagram: normalizeSocialHandle("instagram", input.instagram),
    linkedin: normalizeSocialHandle("linkedin", input.linkedin),
  };
}

export function hasAtLeastOneSocial(socials: StudentSocials): boolean {
  return SOCIAL_PLATFORMS.some((key) => {
    const val = socials[key];
    return typeof val === "string" && val.trim().length >= 2;
  });
}

export function listPresentSocials(
  socials: StudentSocials,
): Array<{ platform: SocialPlatform; value: string; href: string }> {
  const out: Array<{ platform: SocialPlatform; value: string; href: string }> = [];
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = socials[platform];
    if (typeof raw === "string" && raw.trim().length > 0) {
      const href = buildSocialDeepLink(platform, raw);
      out.push({ platform, value: raw.trim(), href });
    }
  }
  return out;
}

export function buildSocialDeepLink(
  platform: SocialPlatform,
  rawHandle: string | null | undefined,
  prefillText?: string,
): string {
  const raw = String(rawHandle ?? "").trim();
  if (!raw) return "";
  const encodedText = prefillText ? encodeURIComponent(prefillText) : "";

  if (platform === "telegram") {
    if (raw.startsWith("+") || /^\d+$/.test(raw)) {
      const phone = raw.startsWith("+") ? raw : raw.startsWith("09") ? `+98${raw.slice(1)}` : `+${raw}`;
      return sanitizeSafeHref(`https://t.me/${phone}${encodedText ? `?text=${encodedText}` : ""}`);
    }
    const u = raw.replace(/^@+/, "");
    return sanitizeSafeHref(`https://t.me/${encodeURIComponent(u)}${encodedText ? `?text=${encodedText}` : ""}`);
  }

  if (platform === "whatsapp") {
    let digits = toAsciiDigits(raw).replace(/[^\d]/g, "");
    if (digits.startsWith("09") && digits.length === 11) {
      digits = `98${digits.slice(1)}`;
    } else if (digits.startsWith("00")) {
      digits = digits.slice(2);
    }
    if (!digits) return "";
    return sanitizeSafeHref(`https://wa.me/${digits}${encodedText ? `?text=${encodedText}` : ""}`);
  }

  if (platform === "eitaa") {
    const u = raw.replace(/^@+/, "");
    if (/^\+?\d+$/.test(u)) {
      return sanitizeSafeHref(`https://eitaa.com/${u}`);
    }
    return sanitizeSafeHref(`https://eitaa.com/${encodeURIComponent(u)}`);
  }

  if (platform === "bale") {
    const u = raw.replace(/^@+/, "");
    return sanitizeSafeHref(`https://ble.ir/${encodeURIComponent(u)}`);
  }

  if (platform === "instagram") {
    const u = raw.replace(/^@+/, "");
    return sanitizeSafeHref(`https://instagram.com/${encodeURIComponent(u)}`);
  }

  if (platform === "linkedin") {
    if (/^https?:\/\//i.test(raw)) {
      return sanitizeSafeHref(raw);
    }
    const u = raw.replace(/^@+/, "");
    return sanitizeSafeHref(`https://www.linkedin.com/in/${encodeURIComponent(u)}`);
  }

  return "";
}
