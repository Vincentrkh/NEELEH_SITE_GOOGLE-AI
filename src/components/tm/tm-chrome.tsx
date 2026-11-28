"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Box,
  ChevronDown,
  Columns2,
  Compass,
  Layers,
  Mail,
  Network,
  Sparkles,
  X,
} from "lucide-react";
import { useLang } from "@/components/language-provider";
import { localeCurrentYear } from "@/lib/format";
import { TmWordFill } from "@/components/tm/tm-effects";
import { SmartSearchTrigger } from "@/components/smart-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { BlockReveal } from "@/components/block-reveal";
import { BrandLogoGraphic, hasCustomBrandLogo, useBrandLogo } from "@/components/brand-logo";
import type { PublicMenuItem } from "@/lib/menu-defaults";
import type { PortalRole } from "@/lib/auth";
import {
  TmArchitecturalPlate,
  TmSubmenuSvg,
  type TmPlateVariant,
  type TmSubmenuKind,
} from "@/components/tm/tm-svg-art";

/* ═══════════════════════════════════════════════════════════════════════════
   TM Chrome — Neeleh Office Header & Editorial Footer
   ═══════════════════════════════════════════════════════════════════════════ */

const OFFICE_HEADER_FALLBACK: PublicMenuItem[] = [
  { labelFa: "دفتر نیله", labelEn: "Studio", href: "/why-neeleh", kind: "block", bgColor: "#cbcccd", fillIndicator: true },
  { labelFa: "پروژه‌ها و دوره‌ها", labelEn: "Courses", href: "/courses", kind: "block", bgColor: "#d8d9da", fillIndicator: false },
  { labelFa: "مسیرهای BIM", labelEn: "BIM Paths", href: "/paths", kind: "block", bgColor: "#e2e2e2", fillIndicator: false },
  { labelFa: "تیم معماری", labelEn: "Architects", href: "/instructors", kind: "block", bgColor: "#ebebea", fillIndicator: false },
  { labelFa: "آزمایشگاه AI", labelEn: "AI Lab", href: "/ai-lab", kind: "archive", bgColor: "#d8d9da", fillIndicator: false },
  { labelFa: "تماس با دفتر", labelEn: "Contact", href: "/contact", kind: "block", bgColor: "#e6e6e6", fillIndicator: false },
];

const OFFICE_FOOTER_FALLBACK: PublicMenuItem[] = [
  { labelFa: "درباره دفتر", labelEn: "Studio", href: "/why-neeleh", kind: "block", bgColor: "#cbcccd", fillIndicator: false },
  { labelFa: "دوره‌ها و کارگاه‌ها", labelEn: "Courses", href: "/courses", kind: "block", bgColor: "#d8d9da", fillIndicator: false },
  { labelFa: "مسیرهای تخصصی", labelEn: "Paths", href: "/paths", kind: "block", bgColor: "#e2e2e2", fillIndicator: false },
  { labelFa: "تیم و مدرسان", labelEn: "Team", href: "/instructors", kind: "block", bgColor: "#ebebea", fillIndicator: false },
  { labelFa: "منابع", labelEn: "Resources", href: "/resources", kind: "block", bgColor: "#ededec", fillIndicator: false },
  { labelFa: "حریم خصوصی", labelEn: "Privacy", href: "/privacy", kind: "block", bgColor: "#f0f0ef", fillIndicator: false },
  { labelFa: "قوانین", labelEn: "Terms", href: "/terms", kind: "block", bgColor: "#f0f0ef", fillIndicator: false },
];

const COURSE_SUBMENU: readonly {
  href: string;
  en: string;
  fa: string;
  svgKind: TmSubmenuKind;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { href: "/courses?tier=BEGINNER", en: "Beginner", fa: "مبتدی", svgKind: "beginner", Icon: Layers },
  {
    href: "/courses?tier=INTERMEDIATE",
    en: "Intermediate",
    fa: "متوسط",
    svgKind: "intermediate",
    Icon: Box,
  },
  { href: "/courses?tier=PRO", en: "Advanced & AI", fa: "پیشرفته و AI", svgKind: "pro", Icon: Network },
  { href: "/courses/compare", en: "Compare", fa: "مقایسه", svgKind: "compare", Icon: Columns2 },
];

const FOOTER_PLATES: TmPlateVariant[] = ["atelier", "drafting", "bim", "parametric", "ai"];

/** Main Neeleh geometric logo mark (matches /logo.svg) */
export function TmMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={className} aria-hidden="true">
      <path
        className="tm-logo__frame"
        d="M24.51,28.51H5.49c-2.21,0-4-1.79-4-4V5.49c0-2.21,1.79-4,4-4h19.03c2.21,0,4,1.79,4,4v19.03C28.51,26.72,26.72,28.51,24.51,28.51z"
      />
      <g>
        <path
          className="tm-logo__glyph"
          d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z"
        />
        <polygon
          className="tm-logo__glyph"
          points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1"
        />
        <path
          className="tm-logo__glyph"
          d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z"
        />
      </g>
    </svg>
  );
}

export function TmLogo({ sub = true }: { sub?: boolean }) {
  const { lang } = useLang();
  const brandLogo = useBrandLogo();
  const hasCustom = hasCustomBrandLogo(brandLogo);

  return (
    <Link href="/" className="tm-logo" aria-label="Neeleh Office — Home">
      <BrandLogoGraphic
        config={brandLogo}
        maxHeight={40}
        fallback={<TmMark className="tm-logo__mark" />}
      />
      {(!hasCustom || brandLogo.showText) && (
        <span>
          <span className="tm-logo__text">{lang === "fa" ? "دفتر نیله" : "NEELEH OFFICE"}</span>
          {sub && (
            <span className="tm-logo__sub">
              {lang === "fa" ? "دفتر معماری و سیستم‌های BIM" : "ARCHITECTURE OFFICE"}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export function TmHeader({
  menu,
  initialPortalRole,
}: {
  menu?: PublicMenuItem[];
  initialPortalRole?: PortalRole;
}) {
  const { lang, setLang } = useLang();
  const pathname = usePathname() || "/";
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [megaOpen, setMegaOpen] = React.useState(false);
  const [portalRole, setPortalRole] = React.useState<PortalRole>(initialPortalRole ?? "anon");
  const megaRef = React.useRef<HTMLDivElement>(null);
  const hoverTimer = React.useRef<number | null>(null);

  const fa = lang === "fa";

  const navItems = React.useMemo(
    () => (menu && menu.length > 0 ? menu : OFFICE_HEADER_FALLBACK),
    [menu],
  );

  React.useEffect(() => {
    if (initialPortalRole !== undefined) {
      setPortalRole(initialPortalRole);
    }
  }, [initialPortalRole]);

  React.useEffect(() => {
    let dead = false;
    const syncAuth = () => {
      fetch("/api/auth/me/", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (dead) return;
          const roles = (d?.user?.roles as string[] | undefined) ?? [];
          if (roles.includes("ADMIN") || roles.includes("EDITOR")) setPortalRole("staff");
          else if (d?.user) setPortalRole("student");
          else setPortalRole("anon");
        })
        .catch(() => {});
    };
    if (initialPortalRole === undefined) {
      syncAuth();
    }
    window.addEventListener("neeleh-auth-changed", syncAuth);
    return () => {
      dead = true;
      window.removeEventListener("neeleh-auth-changed", syncAuth);
    };
  }, [initialPortalRole]);

  React.useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    if (!megaOpen) return;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [megaOpen]);

  React.useEffect(() => {
    setOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    document.body.dataset.menuOpen = open || megaOpen ? "true" : "false";
    return () => {
      document.body.dataset.menuOpen = "false";
    };
  }, [open, megaOpen]);

  const openMega = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setMegaOpen(true), 70);
  };
  const closeMegaSoon = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setMegaOpen(false), 140);
  };

  React.useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMegaOpen(false);
    const onDown = (e: MouseEvent) => {
      if (!megaRef.current?.contains(e.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [megaOpen]);

  const formatHref = (href: string) =>
    href.startsWith("#") && pathname !== "/" ? `/${href}` : href;

  return (
    <>
      <header className="tm-header" data-scrolled={scrolled}>
        <div className="tm-header__inner">
          <TmLogo sub={false} />

          <nav className="tm-nav" aria-label={fa ? "منوی دفتر نیله" : "Office navigation"}>
            {navItems.map((l, idx) => {
              const label = fa ? l.labelFa : l.labelEn;
              const href = formatHref(l.href);
              const hasSubmenu = l.href === "/courses" || l.href.startsWith("/courses?");

              if (hasSubmenu) {
                return (
                  <div
                    key={`${l.href}-${idx}`}
                    className="tm-nav__item"
                    ref={megaRef}
                    onMouseEnter={openMega}
                    onMouseLeave={closeMegaSoon}
                  >
                    <button
                      type="button"
                      className="tm-nav__trigger"
                      aria-expanded={megaOpen}
                      aria-controls="tm-mega-courses"
                      aria-current={pathname.startsWith("/courses") ? "page" : undefined}
                      onClick={() => setMegaOpen((v) => !v)}
                      onFocus={openMega}
                    >
                      {label}
                      <ChevronDown
                        className="tm-nav__caret"
                        data-open={megaOpen}
                        strokeWidth={1.6}
                        aria-hidden="true"
                      />
                    </button>
                    <div
                      id="tm-mega-courses"
                      className="tm-mega"
                      data-open={megaOpen}
                      onMouseEnter={openMega}
                      onMouseLeave={closeMegaSoon}
                    >
                      {COURSE_SUBMENU.map((c, i) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          className="tm-mega__item"
                          style={{ "--i": i } as React.CSSProperties}
                          tabIndex={megaOpen ? 0 : -1}
                          onClick={() => setMegaOpen(false)}
                        >
                          <span className="tm-mega__img" aria-hidden="true">
                            <TmSubmenuSvg kind={c.svgKind} />
                          </span>
                          <span className="tm-mega__flex">
                            <span className="tm-mega__icon">
                              <c.Icon className="h-full w-full" strokeWidth={1.35} />
                            </span>
                            <span className="tm-mega__title">{fa ? c.fa : c.en}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={`${l.href}-${idx}`}
                  href={href}
                  aria-current={pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href)) ? "page" : undefined}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div
            className="tm-page-mask"
            data-open={megaOpen}
            onClick={() => setMegaOpen(false)}
            aria-hidden="true"
          />

          <div className="tm-header__right">
            <SmartSearchTrigger variant="tm" />
            <ThemeToggle variant="tm" />
            <div className="tm-lang-inline" role="group" aria-label={fa ? "تغییر زبان" : "Language switcher"}>
              <button
                type="button"
                onClick={() => setLang("en")}
                className="tm-lang-opt"
                data-active={!fa}
                aria-pressed={!fa}
              >
                EN
              </button>
              <span className="tm-lang-sep" aria-hidden="true">
                |
              </span>
              <button
                type="button"
                onClick={() => setLang("fa")}
                className="tm-lang-opt"
                data-active={fa}
                aria-pressed={fa}
              >
                FA
              </button>
            </div>

            <Link
              href={portalRole === "staff" ? "/dashboard/" : portalRole === "student" ? "/panel/" : "/login/"}
              prefetch={false}
              className="tm-btn-dark tm-portal-edge hidden lg:inline-flex"
            >
              {portalRole === "staff"
                ? fa
                  ? "پنل مدیریت"
                  : "Admin Panel"
                : fa
                  ? "پنل کاربران"
                  : "Portal"}
            </Link>

            <button
              type="button"
              className="tm-burger"
              aria-expanded={open}
              aria-label={open ? (fa ? "بستن منو" : "Close menu") : fa ? "باز کردن منو" : "Open menu"}
              onClick={() => setOpen(true)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* Offcanvas Drawer */}
      <div className="tm-offcanvas" data-open={open} aria-hidden={!open}>
        <div
          className="tm-offcanvas__mask"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <aside
          className="tm-offcanvas__panel"
          role="dialog"
          aria-modal="true"
          aria-label={fa ? "منوی دفتر نیله" : "Office Menu"}
        >
          <button
            type="button"
            className="tm-offcanvas__close"
            onClick={() => setOpen(false)}
            aria-label={fa ? "بستن" : "Close"}
          >
            <X className="size-6" strokeWidth={1.25} />
          </button>

          <nav className="tm-offcanvas__links" aria-label={fa ? "منوی کامل دفتر" : "Full office menu"}>
            {navItems.map((l, i) => (
              <Link key={`${l.href}-${i}`} href={formatHref(l.href)} onClick={() => setOpen(false)}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <span>{fa ? l.labelFa : l.labelEn}</span>
              </Link>
            ))}
          </nav>

          <div className="tm-offcanvas__meta" dir={fa ? "rtl" : "ltr"}>
            <p>hello@neeleh.academy</p>
            <p>{fa ? "دفتر معماری نیله — دامغان · همکاری سراسری" : "Neeleh Office — Damghan · Nationwide Practice"}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {portalRole === "staff" ? (
                <a href="/dashboard/" className="tm-btn-dark">
                  {fa ? "پنل مدیریت" : "Admin Panel"}
                </a>
              ) : (
                <Link href={portalRole === "student" ? "/panel/" : "/login/"} prefetch={false} className="tm-btn-dark">
                  {fa ? "پنل کاربران" : "Portal"}
                </Link>
              )}
              <Link href="/search/" className="tm-btn-dark">
                {fa ? "جستجو" : "Search"}
              </Link>
              <ThemeToggle variant="tm" className="border border-[var(--tm-hairline)] min-w-[44px]" />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ── Editorial Neeleh Office Footer with CTA + Horizontal SVG Strip ───── */

export function TmFooter({ menu }: { menu?: PublicMenuItem[] }) {
  const { lang, setLang } = useLang();
  const fa = lang === "fa";
  const stripRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stripRef,
    offset: ["start end", "end start"],
  });
  const driftX = useTransform(scrollYProgress, [0, 1], [-24, 24]);

  const footerItems = menu && menu.length > 0 ? menu : OFFICE_FOOTER_FALLBACK;

  return (
    <footer className="tm-footer" dir={fa ? "rtl" : "ltr"}>
      {/* Top CTA block */}
      <BlockReveal className="tm-footer__cta">
        <TmWordFill
          className="tm-footer__headline"
          text={
            fa
              ? "طراحی دقیق، مهندسی BIM و نگاه به آینده معماری"
              : "Precision design, BIM engineering, and architecture ahead"
          }
        />
        <div className="tm-footer__cta-link">
          <Link href="/contact" className="tm-link">
            {fa ? "گفتگو با دفتر نیله" : "Contact Neeleh Office"}
          </Link>
        </div>
      </BlockReveal>

      {/* Horizontal Square Monochrome Architectural Strip */}
      <div ref={stripRef} className="tm-footer__vignettes-wrap" aria-hidden="true">
        <motion.div className="tm-footer__vignettes" style={{ x: driftX }} dir="ltr">
          {FOOTER_PLATES.map((variant, i) => (
            <div key={i} className="tm-footer__vignette">
              <TmArchitecturalPlate variant={variant} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Centered Compact Square Outline Action Buttons */}
      <div className="tm-footer__social" aria-label={fa ? "دسترسی سریع" : "Quick links"}>
        <Link href="/courses" className="tm-footer__social-btn" aria-label={fa ? "دوره‌ها" : "Courses"}>
          <Compass className="size-4" strokeWidth={1.6} />
        </Link>
        <Link href="/ai-lab" className="tm-footer__social-btn" aria-label={fa ? "آزمایشگاه AI" : "AI Lab"}>
          <Sparkles className="size-4" strokeWidth={1.6} />
        </Link>
        <Link href="/contact" className="tm-footer__social-btn" aria-label={fa ? "تماس" : "Contact"}>
          <Mail className="size-4" strokeWidth={1.6} />
        </Link>
      </div>

      <hr className="tm-footer__rule" />

      {/* Unified Bottom Legal & Navigation Strip */}
      <div className="tm-footer__bottom">
        <nav className="tm-footer__legal" aria-label={fa ? "منوی فوتر دفتر نیله" : "Office footer links"}>
          {footerItems.map((item, idx) => (
            <Link key={`${item.href}-${idx}`} href={item.href}>
              {fa ? item.labelFa : item.labelEn}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setLang(fa ? "en" : "fa")}
            className="tm-footer__lang-btn"
            aria-label={fa ? "تغییر زبان به English" : "Switch language to Persian"}
          >
            {fa ? "EN" : "FA"}
          </button>
        </nav>

        <p className="tm-footer__copy">
          © {localeCurrentYear(lang)} {fa ? "دفتر معماری نیله" : "Neeleh Architecture Office"}
        </p>
      </div>
    </footer>
  );
}
