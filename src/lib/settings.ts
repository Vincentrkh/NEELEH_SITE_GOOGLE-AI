import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";

/**
 * تنظیمات سایت — key-value از دیتابیس با کش React + Next.js (site-settings).
 * در صورتی که دیتابیس در دسترس نباشد، fallback امن برمی‌گردد و تنظیمات موجود سایت اصلی حفظ می‌شوند.
 */

export type SiteSettings = Record<string, string>;

const FALLBACK_SETTINGS: SiteSettings = {
  "hero.title": "آکادمی نیله",
  "hero.subtitle": "سیستم‌های هوشمند معماری و آموزش عصر AI",
  "hero.tagline": "معماری را فراتر از ابزارها یاد بگیرید",
  "hero.intro":
    "استودیوی تخصصی نیله، با تکیه بر تجربه حرفه‌ای و تسلط بر ابزارهای نوین طراحی محاسباتی، مدلسازی اطلاعات ساختمان (BIM) و هوش مصنوعی، مسیر نوین یادگیری و ارتقای مهندسی معماری را ترسیم می‌کند.",
  "contact.phone": "۰۲۳-۳۵۲۳۰۰۵۰ · ۰۹۱۲۰۷۳۸۲۱۱",
  "contact.email": "hello@neeleh.academy",
  "contact.address": "دامغان — محل برگزاری کلاس‌های حضوری آکادمی نیله (همراه با دوره‌های آنلاین)",
  "contact.hours": "شنبه تا چهارشنبه، ۹ تا ۱۸",
  "stats.years": "۲۶+",
  "stats.courses": "۹",
  "stats.graduates": "۳۰۰+",
  "stats.instructors": "۱",
  "social.instagram": "https://instagram.com",
  "social.telegram": "https://telegram.org",
  "social.linkedin": "https://linkedin.com",
  "social.youtube": "https://youtube.com",
  "social.behance": "https://behance.net",
  "hero.titleEn": "Neeleh Academy",
  "hero.subtitleEn": "Smart architectural systems & AI-era education",
  "hero.taglineEn": "Learn architecture beyond the tools",
  "hero.introEn":
    "Neeleh is a specialized studio-led academy. Drawing on professional experience and mastery of modern computational design tools, Building Information Modeling (BIM) and artificial intelligence, it charts a new learning path for advancing the architectural engineering profession.",
  "contact.addressEn": "Damghan — in-person venue for Neeleh Academy classes (plus live online)",
  "contact.hoursEn": "Saturday to Wednesday, 9 to 18",
  "brand.logoUrl": "",
  "brand.logoSvg": "",
  "brand.logoHeight": "28",
  "brand.logoShowText": "true",
  "brand.logoAlt": "",
};

const fetchCachedSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    try {
      const rows = await db.setting.findMany();
      const map: SiteSettings = {};
      for (const r of rows) {
        map[r.key] = r.value;
      }
      return { ...FALLBACK_SETTINGS, ...map };
    } catch {
      return { ...FALLBACK_SETTINGS };
    }
  },
  ["site-settings-map"],
  { revalidate: 300, tags: ["site-settings"] },
);

/** همه تنظیمات را به‌صورت یک map کش‌شده برمی‌گرداند. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  return fetchCachedSettings();
});

/** یک تنظیم خاص را برمی‌گرداند. */
export async function getSetting(key: string): Promise<string> {
  const all = await getSiteSettings();
  return all[key] ?? "";
}

/**
 * لیست کلیدهای تنظیمات برای نمایش در پنل ادمین.
 */
export const SETTINGS_GROUPS: {
  label: string;
  labelEn: string;
  key: string;
  items: { key: string; label: string; labelEn?: string; enKey?: string; type?: "text" | "textarea" }[];
}[] = [
  {
    label: "لوگو و نشان برند (Logo)",
    labelEn: "Brand logo & SVG",
    key: "logo",
    items: [
      { key: "brand.logoUrl", label: "آدرس فایل لوگو (SVG / تصویر)", labelEn: "Logo file URL (SVG / Image)" },
      { key: "brand.logoSvg", label: "کد مستقیم SVG لوگو", labelEn: "Inline SVG code", type: "textarea" },
      { key: "brand.logoHeight", label: "ارتفاع لوگو (پیکسل)", labelEn: "Logo height (px)" },
      { key: "brand.logoShowText", label: "نمایش عنوان کنار لوگو", labelEn: "Show brand text next to logo" },
      { key: "brand.logoAlt", label: "متن جایگزین (Alt)", labelEn: "Alt text" },
    ],
  },
  {
    label: "بخش هیرو (صفحه اصلی)",
    labelEn: "Hero section (homepage)",
    key: "hero",
    items: [
      { key: "hero.title", label: "عنوان اصلی", labelEn: "Main title", enKey: "hero.titleEn" },
      { key: "hero.subtitle", label: "زیرعنوان", labelEn: "Subtitle", enKey: "hero.subtitleEn" },
      { key: "hero.tagline", label: "شعار (تأکیدی)", labelEn: "Tagline (accent)", enKey: "hero.taglineEn" },
      { key: "hero.intro", label: "معرفی کوتاه", labelEn: "Short intro", enKey: "hero.introEn", type: "textarea" },
    ],
  },
  {
    label: "اطلاعات تماس",
    labelEn: "Contact information",
    key: "contact",
    items: [
      { key: "contact.phone", label: "شماره تلفن", labelEn: "Phone number" },
      { key: "contact.email", label: "ایمیل", labelEn: "Email" },
      { key: "contact.address", label: "آدرس", labelEn: "Address", enKey: "contact.addressEn", type: "textarea" },
      { key: "contact.hours", label: "ساعات کاری", labelEn: "Working hours", enKey: "contact.hoursEn" },
    ],
  },
  {
    label: "آمار صفحه اصلی",
    labelEn: "Homepage stats",
    key: "stats",
    items: [
      { key: "stats.years", label: "سال تجربه", labelEn: "Years of experience" },
      { key: "stats.courses", label: "تعداد دوره", labelEn: "Course count" },
      { key: "stats.graduates", label: "فارغ‌التحصیلان", labelEn: "Graduates" },
      { key: "stats.instructors", label: "تعداد مدرس", labelEn: "Instructors" },
    ],
  },
  {
    label: "شبکه‌های اجتماعی",
    labelEn: "Social networks",
    key: "social",
    items: [
      { key: "social.instagram", label: "اینستاگرام (URL)", labelEn: "Instagram (URL)" },
      { key: "social.telegram", label: "تلگرام (URL)", labelEn: "Telegram (URL)" },
      { key: "social.linkedin", label: "لینکدین (URL)", labelEn: "LinkedIn (URL)" },
      { key: "social.youtube", label: "یوتیوب (URL)", labelEn: "YouTube (URL)" },
      { key: "social.behance", label: "بیهانس (URL)", labelEn: "Behance (URL)" },
    ],
  },
];

/** مقدار بومی‌شده یک تنظیم — در حالت انگلیسی کلید En را ترجیح می‌دهد */
export function localizedSetting(
  lang: "en" | "fa",
  settings: SiteSettings,
  key: string,
): string {
  const faVal = settings[key] ?? "";
  if (lang !== "en") return faVal;
  const enVal = settings[key + "En"];
  return enVal && enVal.trim() ? enVal : faVal;
}
