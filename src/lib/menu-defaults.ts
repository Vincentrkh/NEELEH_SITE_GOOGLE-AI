/**
 * منوهای پیش‌فرض دو بخش مجزای سایت (با یک هسته مشترک):
 *   - آکادمی نیله (Neeleh Academy): "header" و "footer"
 *   - دفتر نیله (Neeleh Office):   "office_header" و "office_footer"
 *
 * این ماژول عمداً هیچ وابستگی به دیتابیس ندارد تا هم در lib/menu.ts
 * (fallback سرور) و هم در scripts/seed.ts و تست‌های واحد استفاده شود.
 */

export const MENU_LOCATIONS = [
  "header",
  "footer",
  "office_header",
  "office_footer",
] as const;

export type MenuLocation = (typeof MENU_LOCATIONS)[number];
export type MenuDivision = "academy" | "office";

export type PublicMenuItem = {
  id: string;
  location: MenuLocation;
  labelFa: string;
  labelEn: string;
  href: string;
  bgColor: string;
  kind: string; // header / office_header: block | archive
  fillIndicator: boolean;
  order: number;
  isActive: boolean;
};

export function isValidMenuLocation(value: string): value is MenuLocation {
  return (MENU_LOCATIONS as readonly string[]).includes(value);
}

export function getMenuDivision(location: MenuLocation): MenuDivision {
  return location === "office_header" || location === "office_footer"
    ? "office"
    : "academy";
}

export function isHeaderMenuLocation(location: MenuLocation): boolean {
  return location === "header" || location === "office_header";
}

export function getLocationsForDivision(
  division: MenuDivision | "all",
): MenuLocation[] {
  if (division === "academy") return ["header", "footer"];
  if (division === "office") return ["office_header", "office_footer"];
  return [...MENU_LOCATIONS];
}

export const PRESET_MENU: Omit<PublicMenuItem, "id">[] = [
  // ── 1) آکادمی نیله — header (بلوک‌های پلکانی + منوی اصلی) ──
  {
    location: "header",
    labelFa: "خانه",
    labelEn: "Home",
    href: "#top",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: true,
    order: 0,
    isActive: true,
  },
  {
    location: "header",
    labelFa: "دوره‌ها",
    labelEn: "Work",
    href: "#work",
    bgColor: "#d8d9da",
    kind: "block",
    fillIndicator: false,
    order: 1,
    isActive: true,
  },
  {
    location: "header",
    labelFa: "تماس",
    labelEn: "Contact",
    href: "#contact",
    bgColor: "#e6e6e6",
    kind: "block",
    fillIndicator: false,
    order: 2,
    isActive: true,
  },
  {
    location: "header",
    labelFa: "آزمایشگاه AI",
    labelEn: "AI Lab",
    href: "/ai-lab",
    bgColor: "#d8d9da",
    kind: "archive",
    fillIndicator: false,
    order: 3,
    isActive: true,
  },

  // ── 2) آکادمی نیله — footer (ستون دسترسی سریع) ──
  {
    location: "footer",
    labelFa: "همه دوره‌ها",
    labelEn: "All courses",
    href: "/courses",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 0,
    isActive: true,
  },
  {
    location: "footer",
    labelFa: "دوره‌های مبتدی",
    labelEn: "Beginner courses",
    href: "/courses?tier=BEGINNER",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 1,
    isActive: true,
  },
  {
    location: "footer",
    labelFa: "دوره‌های حرفه‌ای",
    labelEn: "Pro courses",
    href: "/courses?tier=PRO",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 2,
    isActive: true,
  },
  {
    location: "footer",
    labelFa: "بلاگ",
    labelEn: "Blog",
    href: "/blog",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 3,
    isActive: true,
  },
  {
    location: "footer",
    labelFa: "ورود هنرجویان",
    labelEn: "Student login",
    href: "/login",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 4,
    isActive: true,
  },

  // ── 3) دفتر نیله (Neeleh Office) — office_header ──
  {
    location: "office_header",
    labelFa: "درباره دفتر",
    labelEn: "Practice",
    href: "/why-neeleh",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: true,
    order: 0,
    isActive: true,
  },
  {
    location: "office_header",
    labelFa: "تخصص‌ها و BIM",
    labelEn: "Capabilities",
    href: "/courses",
    bgColor: "#d8d9da",
    kind: "block",
    fillIndicator: false,
    order: 1,
    isActive: true,
  },
  {
    location: "office_header",
    labelFa: "مسیرهای استودیو",
    labelEn: "Workflows",
    href: "/paths",
    bgColor: "#e6e6e6",
    kind: "block",
    fillIndicator: false,
    order: 2,
    isActive: true,
  },
  {
    location: "office_header",
    labelFa: "تیم معماری",
    labelEn: "Architects",
    href: "/instructors",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 3,
    isActive: true,
  },
  {
    location: "office_header",
    labelFa: "یادداشت‌ها",
    labelEn: "Journal",
    href: "/blog",
    bgColor: "#d8d9da",
    kind: "block",
    fillIndicator: false,
    order: 4,
    isActive: true,
  },
  {
    location: "office_header",
    labelFa: "همکاری و تماس",
    labelEn: "Contact",
    href: "/contact",
    bgColor: "#e6e6e6",
    kind: "block",
    fillIndicator: false,
    order: 5,
    isActive: true,
  },

  // ── 4) دفتر نیله (Neeleh Office) — office_footer ──
  {
    location: "office_footer",
    labelFa: "پروژه‌ها و تخصص‌ها",
    labelEn: "Capabilities",
    href: "/courses",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 0,
    isActive: true,
  },
  {
    location: "office_footer",
    labelFa: "مسیرهای BIM",
    labelEn: "Workflows",
    href: "/paths",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 1,
    isActive: true,
  },
  {
    location: "office_footer",
    labelFa: "درباره دفتر",
    labelEn: "Practice",
    href: "/why-neeleh",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 2,
    isActive: true,
  },
  {
    location: "office_footer",
    labelFa: "تیم دفتر",
    labelEn: "Team",
    href: "/instructors",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 3,
    isActive: true,
  },
  {
    location: "office_footer",
    labelFa: "منابع",
    labelEn: "Resources",
    href: "/resources",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 4,
    isActive: true,
  },
  {
    location: "office_footer",
    labelFa: "حریم خصوصی",
    labelEn: "Privacy",
    href: "/privacy",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 5,
    isActive: true,
  },
  {
    location: "office_footer",
    labelFa: "قوانین",
    labelEn: "Terms",
    href: "/terms",
    bgColor: "#cbcccd",
    kind: "block",
    fillIndicator: false,
    order: 6,
    isActive: true,
  },
];
