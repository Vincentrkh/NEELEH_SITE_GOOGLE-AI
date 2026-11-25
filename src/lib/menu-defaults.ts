/**
 * منوی پیش‌فرض آکادمی نیله — عین وضعیت اولیه سایت.
 *
 * این ماژول عمداً هیچ وابستگی به دیتابیس ندارد تا هم در lib/menu.ts
 * (fallback سرور) و هم در scripts/seed.ts (نصب جدید) استفاده شود.
 */

export type MenuLocation = "header" | "footer";

export type PublicMenuItem = {
  id: string;
  location: MenuLocation;
  labelFa: string;
  labelEn: string;
  href: string;
  bgColor: string;
  kind: string; // header: block | archive
  fillIndicator: boolean;
  order: number;
  isActive: boolean;
};

export const PRESET_MENU: Omit<PublicMenuItem, "id">[] = [
  // header — بلوک‌های پلکانی منوی همبرگری
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
  // footer — ستون دسترسی سریع
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
];
