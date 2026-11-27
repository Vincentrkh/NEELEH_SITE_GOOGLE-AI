// قالب‌بندی اعداد و قیمت — فارسی

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/** Convert Persian digits in a string to ASCII digits (leaves other chars intact). */
export function toEnDigits(input: string | number): string {
  return String(input).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

export function faPrice(toman: number): string {
  if (!toman) return "تماس بگیرید";
  return `${toFaDigits(toman.toLocaleString("en-US"))} تومان`;
}

export function faNumber(n: number): string {
  return toFaDigits(n.toLocaleString("en-US"));
}

const CANONICAL_TZ = "Asia/Tehran";

export function faDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CANONICAL_TZ,
  }).format(date);
}

export function faDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CANONICAL_TZ,
  }).format(date);
}

/** English date formatters — used when site lang is "en". */
export function enDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CANONICAL_TZ,
  }).format(date);
}

export function enDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CANONICAL_TZ,
  }).format(date);
}

/** Convert Solar Hijri (Shamsi) year to Gregorian year (e.g. 1379 -> 2000, 1405 -> 2026). */
export function shamsiToGregorianYear(shamsi: number): number {
  return shamsi + 621;
}

/** Convert Gregorian year to Solar Hijri (Shamsi) year (e.g. 2000 -> 1379, 2026 -> 1405). */
export function gregorianToShamsiYear(gregYear: number): number {
  return gregYear - 621;
}

/** Format a canonical Shamsi year in the active locale calendar (Shamsi in fa, Gregorian in en). */
export function localeYearFromShamsi(lang: "en" | "fa", shamsi: number): number {
  return lang === "fa" ? shamsi : shamsiToGregorianYear(shamsi);
}

/** Return the current year formatted for the active calendar (Shamsi Persian digits in fa, Gregorian in en). */
export function localeCurrentYear(lang: "en" | "fa", now: Date = new Date()): string {
  if (lang === "fa") {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      timeZone: CANONICAL_TZ,
    }).format(now);
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: CANONICAL_TZ,
  }).format(now);
}

/** Locale-aware number/date formatters — pick the right one based on lang. */
export function localeNumber(lang: "en" | "fa", n: number | string): string {
  const num = typeof n === "string" ? n : n.toLocaleString("en-US");
  return lang === "fa" ? toFaDigits(num) : toEnDigits(num);
}
export function localeDate(lang: "en" | "fa", d: Date | string | null | undefined): string {
  return lang === "fa" ? faDate(d) : enDate(d);
}
export function localeDateTime(lang: "en" | "fa", d: Date | string | null | undefined): string {
  return lang === "fa" ? faDateTime(d) : enDateTime(d);
}

/** Localized price — جدا کردن عدد از واحد برای جلوگیری از line-break. */
export function localePrice(lang: "en" | "fa", toman: number): string {
  if (!toman) return lang === "fa" ? "تماس بگیرید" : "Contact us";
  const num = lang === "fa"
    ? toFaDigits(toman.toLocaleString("en-US"))
    : toman.toLocaleString("en-US");
  const unit = lang === "fa" ? "تومان" : "Toman";
  return `${num} ${unit}`;
}

export function localePriceParts(lang: "en" | "fa", toman: number): { num: string; unit: string } {
  if (!toman) {
    return { num: "", unit: lang === "fa" ? "تماس بگیرید" : "Contact us" };
  }
  return {
    num: lang === "fa"
      ? toFaDigits(toman.toLocaleString("en-US"))
      : toman.toLocaleString("en-US"),
    unit: lang === "fa" ? "تومان" : "Toman",
  };
}

/** Localized file size */
export function localeFileSize(lang: "en" | "fa", bytes: number): string {
  const size = formatFileSize(bytes);
  if (lang !== "fa") return size;
  // جایگزینی اعداد لاتین با فارسی
  return toFaDigits(size);
}

export const TIER_LABEL: Record<string, string> = {
  BEGINNER: "مبتدی",
  INTERMEDIATE: "متوسط",
  PRO: "حرفه‌ای",
};

export const TIER_LABEL_EN: Record<string, string> = {
  BEGINNER: "Foundation",
  INTERMEDIATE: "Intermediate",
  PRO: "Advanced",
};

export function tierLabel(lang: "en" | "fa", tier: string): string {
  return lang === "fa" ? (TIER_LABEL[tier] ?? tier) : (TIER_LABEL_EN[tier] ?? tier);
}

export const TIER_COLOR: Record<string, string> = {
  BEGINNER: "bg-emerald-100 text-emerald-900 border-emerald-200",
  INTERMEDIATE: "bg-amber-100 text-amber-900 border-amber-200",
  PRO: "bg-rose-100 text-rose-900 border-rose-200",
};

export const REG_STATUS_LABEL: Record<string, string> = {
  OPEN: "ثبت‌نام فعال",
  FULL: "تکمیل ظرفیت",
  CLOSED: "ثبت‌نام بسته",
};

export const REG_STATUS_LABEL_EN: Record<string, string> = {
  OPEN: "Open",
  FULL: "Full",
  CLOSED: "Closed",
};

export function regStatusLabel(lang: "en" | "fa", status: string): string {
  return lang === "fa" ? (REG_STATUS_LABEL[status] ?? status) : (REG_STATUS_LABEL_EN[status] ?? status);
}

export const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: "پرداخت نشده",
  PAID: "پرداخت شده",
};

export const PAYMENT_LABEL_EN: Record<string, string> = {
  UNPAID: "Unpaid",
  PAID: "Paid",
};

export function paymentLabel(lang: "en" | "fa", status: string): string {
  return lang === "fa" ? (PAYMENT_LABEL[status] ?? status) : (PAYMENT_LABEL_EN[status] ?? status);
}

export const REG_LABEL: Record<string, string> = {
  PENDING: "در انتظار تایید",
  CONFIRMED: "تایید شده",
  CANCELLED: "لغو شده",
};

export const REG_LABEL_EN: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export function regLabel(lang: "en" | "fa", status: string): string {
  return lang === "fa" ? (REG_LABEL[status] ?? status) : (REG_LABEL_EN[status] ?? status);
}

export const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: "جدید",
  CONTACTED: "تماس گرفته شد",
  CONVERTED: "تبدیل به هنرجو شد",
};

export const LEAD_STATUS_LABEL_EN: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CONVERTED: "Converted",
};

export function leadStatusLabel(lang: "en" | "fa", status: string): string {
  return lang === "fa" ? (LEAD_STATUS_LABEL[status] ?? status) : (LEAD_STATUS_LABEL_EN[status] ?? status);
}

export const POST_STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشر شده",
  ARCHIVED: "بایگانی",
};

export const POST_STATUS_LABEL_EN: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export function postStatusLabel(lang: "en" | "fa", status: string): string {
  return lang === "fa" ? (POST_STATUS_LABEL[status] ?? status) : (POST_STATUS_LABEL_EN[status] ?? status);
}

export const COMMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تایید شده",
  SPAM: "اسپم",
  REJECTED: "رد شده",
};

export const COMMENT_STATUS_LABEL_EN: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  SPAM: "Spam",
  REJECTED: "Rejected",
};

export function commentStatusLabel(lang: "en" | "fa", status: string): string {
  return lang === "fa" ? (COMMENT_STATUS_LABEL[status] ?? status) : (COMMENT_STATUS_LABEL_EN[status] ?? status);
}

export const RESOURCE_KIND_LABEL: Record<string, string> = {
  EXERCISE: "تمرین",
  PROJECT: "پروژه اولیه",
  HANDOUT: "جزوه",
};

export const RESOURCE_KIND_LABEL_EN: Record<string, string> = {
  EXERCISE: "Exercise",
  PROJECT: "Starter Project",
  HANDOUT: "Handout",
};

export function resourceKindLabel(lang: "en" | "fa", kind: string): string {
  return lang === "fa" ? (RESOURCE_KIND_LABEL[kind] ?? kind) : (RESOURCE_KIND_LABEL_EN[kind] ?? kind);
}

export const PAGE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PUBLISHED: "منتشر شده",
};

export const PAGE_STATUS_LABEL_EN: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
};

export function pageStatusLabel(lang: "en" | "fa", status: string): string {
  return lang === "fa" ? (PAGE_STATUS_LABEL[status] ?? status) : (PAGE_STATUS_LABEL_EN[status] ?? status);
}

export const THEME_MODE_LABEL: Record<string, string> = {
  LIGHT: "روشن",
  DARK: "تیره",
  AUTO: "خودکار (سیستم)",
};

export const THEME_MODE_LABEL_EN: Record<string, string> = {
  LIGHT: "Light",
  DARK: "Dark",
  AUTO: "Auto (System)",
};

export function themeModeLabel(lang: "en" | "fa", mode: string): string {
  return lang === "fa" ? (THEME_MODE_LABEL[mode] ?? mode) : (THEME_MODE_LABEL_EN[mode] ?? mode);
}

export function normalizePhone(raw: string): string {
  // تبدیل ارقام فارسی/عربی به لاتین + حذف کاراکترهای اضافه
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  let s = String(raw).trim();
  s = s.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
  s = s.replace(/[٠-٩]/g, (d) => String(ar.indexOf(d)));
  s = s.replace(/[^\d+]/g, "").replace(/^\+98/, "0");
  if (/^9\d{9}$/.test(s)) s = "0" + s;
  return s;
}

export function isValidPhone(p: string): boolean {
  return /^09\d{9}$/.test(p);
}

/** تبدیل حجم بایت به نمایش خوانا */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/** ساخت slug از یک متن فارسی/انگلیسی */
export function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** برچسب نمایشی نقش‌ها — دوزبانه (فیلد label دیتابیس فقط فارسی است) */
export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "ادمین کل",
  EDITOR: "ویراستار محتوا",
  STUDENT: "هنرجو",
};

export const ROLE_LABEL_EN: Record<string, string> = {
  ADMIN: "Super Admin",
  EDITOR: "Content Editor",
  STUDENT: "Student",
};

export function roleLabel(lang: "en" | "fa", name: string, dbLabel?: string | null): string {
  if (lang === "fa") return dbLabel ?? ROLE_LABEL[name] ?? name;
  return ROLE_LABEL_EN[name] ?? dbLabel ?? name;
}

const ROLE_DESC_EN: Record<string, string> = {
  ADMIN: "Full access to every part of the system. Cannot be deleted.",
  EDITOR: "Creates and edits blog posts, pages and site content.",
  STUDENT: "Access to the student panel, courses and own registrations.",
};

export function roleDesc(lang: "en" | "fa", name: string, dbDesc?: string | null): string {
  if (lang === "fa") return dbDesc ?? ROLE_LABEL[name] ?? name;
  return ROLE_DESC_EN[name] ?? dbDesc ?? name;
}
