"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Inbox,
  FileText,
  Users,
  Palette,
  Settings,
  Newspaper,
  MessageSquare,
  FileEdit,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ListOrdered,
  Crosshair,
  Languages,
  Award,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { useLang } from "@/components/language-provider";
import { BrandLogoGraphic } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  group: "main" | "content" | "system";
};

const NAV: NavItem[] = [
  // ─── اصلی ───
  {
    href: "/dashboard",
    label: "داشبورد",
    labelEn: "Dashboard",
    icon: LayoutDashboard,
    group: "main",
  },
  {
    href: "/dashboard/registrations",
    label: "ثبت‌نام‌ها",
    labelEn: "Registrations",
    icon: ClipboardList,
    roles: ["ADMIN", "EDITOR"],
    group: "main",
  },
  {
    href: "/dashboard/leads",
    label: "لیدها",
    labelEn: "Leads",
    icon: Inbox,
    roles: ["ADMIN", "EDITOR"],
    group: "main",
  },
  // ─── محتوا ───
  {
    href: "/dashboard/courses",
    label: "دوره‌ها",
    labelEn: "Courses",
    icon: BookOpen,
    group: "content",
  },
  {
    href: "/dashboard/exams",
    label: "آزمون و گواهینامه",
    labelEn: "Exams & Certificates",
    icon: Award,
    roles: ["ADMIN", "EDITOR"],
    group: "content",
  },
  {
    href: "/dashboard/posts",
    label: "مقالات",
    labelEn: "Posts",
    icon: Newspaper,
    roles: ["ADMIN", "EDITOR"],
    group: "content",
  },
  {
    href: "/dashboard/comments",
    label: "نظرات",
    labelEn: "Comments",
    icon: MessageSquare,
    roles: ["ADMIN", "EDITOR"],
    group: "content",
  },
  {
    href: "/dashboard/pages",
    label: "صفحات ساکن",
    labelEn: "Pages",
    icon: FileEdit,
    roles: ["ADMIN", "EDITOR"],
    group: "content",
  },
  {
    href: "/dashboard/files",
    label: "فایل‌ها",
    labelEn: "Files",
    icon: FileText,
    group: "content",
  },
  // ─── سیستم ───
  {
    href: "/dashboard/users",
    label: "کاربران",
    labelEn: "Users",
    icon: Users,
    roles: ["ADMIN"],
    group: "system",
  },
  {
    href: "/dashboard/menus",
    label: "منوها",
    labelEn: "Menus",
    icon: ListOrdered,
    roles: ["ADMIN"],
    group: "system",
  },
  {
    href: "/dashboard/theme",
    label: "تم و ظاهر",
    labelEn: "Theme & Appearance",
    icon: Palette,
    roles: ["ADMIN"],
    group: "system",
  },
  {
    href: "/dashboard/ai-connections",
    label: "اتصال هوش مصنوعی",
    labelEn: "AI Connections",
    icon: Cpu,
    roles: ["ADMIN"],
    group: "system",
  },
  {
    href: "/dashboard/updates",
    label: "بکاپ و بروزرسانی",
    labelEn: "Backups & Updates",
    icon: RefreshCw,
    roles: ["ADMIN"],
    group: "system",
  },
  {
    href: "/dashboard/settings",
    label: "تنظیمات",
    labelEn: "Settings",
    icon: Settings,
    roles: ["ADMIN"],
    group: "system",
  },
];

const GROUP_LABEL: Record<"main" | "content" | "system", { fa: string; en: string }> = {
  main: { fa: "اصلی", en: "Main" },
  content: { fa: "محتوا", en: "Content" },
  system: { fa: "سیستم", en: "System" },
};

export type DashboardUser = {
  id: string;
  name: string;
  nameEn?: string | null;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  roles: string[];
  permissions: string[];
};

export function DashboardSidebar({ user }: { user: DashboardUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, isRTL } = useLang();
  const fa = lang === "fa";
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = user.roles.includes("ADMIN")
    ? NAV
    : NAV.filter((n) => !n.roles || n.roles.some((r) => user.roles.includes(r)));

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout/", { method: "POST" });
    window.dispatchEvent(new Event("neeleh-auth-changed"));
    router.push("/login/");
    router.refresh();
  }

  const groups: Array<"main" | "content" | "system"> = ["main", "content", "system"];

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-5 sm:px-8 py-4 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex items-center gap-2">
          <BrandLogoGraphic
            maxHeight={28}
            fallback={
              <span className="grid size-7 place-items-center rounded-md bg-foreground text-background text-sm font-bold">
                {fa ? "ن" : "N"}
              </span>
            }
          />
          <span className="text-sm font-medium">{fa ? "پنل نیله" : "Neeleh Admin"}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle variant="academy" className="min-h-[44px] min-w-[44px]" />
          <button
            type="button"
            onClick={() => setLang(fa ? "en" : "fa")}
            aria-label={fa ? "Switch language to English" : "تغییر زبان به فارسی"}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {fa ? "EN" : "FA"}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={fa ? "باز کردن منو" : "Open menu"}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 z-50 lg:z-auto
          ${isRTL ? "right-0 border-l" : "left-0 border-r"}
          h-screen lg:h-[100svh]
          w-[280px] lg:w-[260px] xl:w-[280px]
          bg-background border-border
          flex flex-col
          transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : isRTL ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5 min-h-[44px]">
            <BrandLogoGraphic
              maxHeight={32}
              fallback={
                <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-bold">
                  {fa ? "ن" : "N"}
                </span>
              }
            />
            <div>
              <div className="text-sm font-medium leading-tight">
                {fa ? "نیله" : "Neeleh"}
              </div>
              <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {fa ? "مدیریت یکپارچه آکادمی و دفتر" : "Unified Academy & Office"}
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label={fa ? "بستن منو" : "Close menu"}
            className="lg:hidden flex min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* User card */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-secondary text-sm font-bold uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {fa ? user.name : user.nameEn || user.name}
              </div>
              <div dir="ltr" className="text-xs text-muted-foreground truncate text-start">
                {user.phone}
              </div>
            </div>
          </div>
          {user.roles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {user.roles.map((r) => (
                <span
                  key={r}
                  className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {groups.map((g) => {
            const items = visibleNav.filter((n) => n.group === g);
            if (items.length === 0) return null;
            return (
              <div key={g} className="mb-4">
                <div className="px-5 mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {GROUP_LABEL[g][lang]}
                </div>
                <ul>
                  {items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex min-h-[44px] items-center gap-3 px-5 py-2 text-sm transition-colors ${
                            active
                              ? "bg-secondary text-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="flex-1">{fa ? item.label : item.labelEn}</span>
                          {active && (
                            <span
                              className={`size-1 rounded-full bg-foreground ${
                                isRTL ? "ms-0 me-auto" : ""
                              }`}
                              aria-hidden
                            />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-border space-y-1">
          <Link
            href="/?inspector=1"
            className="flex min-h-[44px] items-center gap-3 px-2 py-2 text-sm font-medium text-foreground hover:bg-secondary/60 transition-colors"
          >
            <Crosshair className="size-4 text-[#d92b2b]" aria-hidden />
            <span className="flex-1">{fa ? "بازرس صحنه (زنده)" : "Live Scene Inspector"}</span>
          </Link>
          <Link
            href="/"
            className="flex min-h-[44px] items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-4" aria-hidden />
            <span className="flex-1">{fa ? "مشاهده سایت" : "View site"}</span>
          </Link>
          <ThemeToggle variant="sidebar" className="w-full" />
          <button
            type="button"
            onClick={() => setLang(fa ? "en" : "fa")}
            className="w-full flex min-h-[44px] items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Languages className="size-4" aria-hidden />
            <span className="flex-1 text-start">
              {fa ? "تغییر زبان (English)" : "Switch language (فارسی)"}
            </span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full flex min-h-[44px] items-center gap-3 px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="flex-1 text-start">{fa ? "خروج" : "Sign out"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
