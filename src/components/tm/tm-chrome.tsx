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
import { BlockReveal } from "@/components/block-reveal";
import { BrandLogoGraphic, hasCustomBrandLogo, useBrandLogo } from "@/components/brand-logo";
import {
  TmArchitecturalPlate,
  TmSubmenuSvg,
  type TmPlateVariant,
  type TmSubmenuKind,
} from "@/components/tm/tm-svg-art";

/* ═══════════════════════════════════════════════════════════════════════════
   TM Chrome — 1:1 Tres Mares Header & Light #F2F2F2 Editorial Footer
   ═══════════════════════════════════════════════════════════════════════════ */

const LINKS = [
  { href: "/why-neeleh", en: "About", fa: "درباره ما" },
  { href: "/courses", en: "Courses", fa: "دوره‌ها", submenu: true },
  { href: "/paths", en: "Paths", fa: "مسیرها" },
  { href: "/instructors", en: "Instructors", fa: "مدرسین" },
  { href: "/blog", en: "Journal", fa: "مجله" },
  { href: "/contact", en: "Contact", fa: "تماس" },
] as const;

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

/** Three-peak architectural mark */
export function TmMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 34 20" className={className} aria-hidden="true">
      <polygon points="1,19 9,4 14,12 10,19" />
      <polygon points="10,19 17,1 24,19" />
      <polygon points="20,19 25,12 30,19 24,19" />
    </svg>
  );
}

export function TmLogo({ sub = true }: { sub?: boolean }) {
  const { lang } = useLang();
  const brandLogo = useBrandLogo();
  const hasCustom = hasCustomBrandLogo(brandLogo);

  return (
    <Link href="/" className="tm-logo" aria-label="Neeleh Academy — Home">
      <BrandLogoGraphic
        config={brandLogo}
        maxHeight={40}
        fallback={<TmMark className="tm-logo__mark" />}
      />
      {(!hasCustom || brandLogo.showText) && (
        <span>
          <span className="tm-logo__text">NEELEH</span>
          {sub && (
            <span className="tm-logo__sub">
              {lang === "fa" ? "آکادمی معماری" : "ARCHITECTURE ACADEMY"}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export function TmHeader() {
  const { lang, setLang } = useLang();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [megaOpen, setMegaOpen] = React.useState(false);
  const [portalRole, setPortalRole] = React.useState<"anon" | "student" | "staff">("anon");
  const megaRef = React.useRef<HTMLDivElement>(null);
  const hoverTimer = React.useRef<number | null>(null);

  const fa = lang === "fa";

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
    syncAuth();
    window.addEventListener("neeleh-auth-changed", syncAuth);
    return () => {
      dead = true;
      window.removeEventListener("neeleh-auth-changed", syncAuth);
    };
  }, [pathname]);

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

  return (
    <>
      <header className="tm-header" data-scrolled={scrolled}>
        <div className="tm-header__inner">
          <TmLogo sub={false} />

          <nav className="tm-nav" aria-label={fa ? "منوی اصلی" : "Main"}>
            {LINKS.map((l) =>
              "submenu" in l && l.submenu ? (
                <div
                  key={l.href}
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
                    aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                    onClick={() => setMegaOpen((v) => !v)}
                    onFocus={openMega}
                  >
                    {fa ? l.fa : l.en}
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
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                >
                  {fa ? l.fa : l.en}
                </Link>
              ),
            )}
          </nav>

          <div
            className="tm-page-mask"
            data-open={megaOpen}
            onClick={() => setMegaOpen(false)}
            aria-hidden="true"
          />

          <div className="tm-header__right">
            <SmartSearchTrigger variant="tm" />
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
                  ? "پنل هنرجو"
                  : "Student Portal"}
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
          aria-label={fa ? "منو" : "Menu"}
        >
          <button
            type="button"
            className="tm-offcanvas__close"
            onClick={() => setOpen(false)}
            aria-label={fa ? "بستن" : "Close"}
          >
            <X className="size-6" strokeWidth={1.25} />
          </button>

          <nav className="tm-offcanvas__links" aria-label={fa ? "منوی کامل" : "Full menu"}>
            {LINKS.map((l, i) => (
              <Link key={l.href} href={l.href}>
                <span>0{i + 1}</span>
                <span>{fa ? l.fa : l.en}</span>
              </Link>
            ))}
            <Link href="/calendar">
              <span>07</span>
              <span>{fa ? "تقویم دوره‌ها" : "Calendar"}</span>
            </Link>
            <Link href="/ai-lab">
              <span>08</span>
              <span>{fa ? "آزمایشگاه هوش مصنوعی" : "AI Lab"}</span>
            </Link>
            <Link href="/resources">
              <span>09</span>
              <span>{fa ? "منابع آموزشی" : "Resources"}</span>
            </Link>
          </nav>

          <div className="tm-offcanvas__meta" dir={fa ? "rtl" : "ltr"}>
            <p>hello@neeleh.academy</p>
            <p>{fa ? "محل برگزاری حضوری: دامغان · آنلاین سراسری" : "Venue: Damghan · Online Nationwide"}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {portalRole === "staff" ? (
                <a href="/dashboard/" className="tm-btn-dark">
                  {fa ? "پنل مدیریت" : "Admin Panel"}
                </a>
              ) : (
                <Link href={portalRole === "student" ? "/panel/" : "/login/"} prefetch={false} className="tm-btn-dark">
                  {fa ? "پنل هنرجو" : "Student Portal"}
                </Link>
              )}
              <Link href="/search/" className="tm-btn-dark">
                {fa ? "جستجو" : "Search"}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ── Light #F2F2F2 Tres Mares Footer with CTA + Horizontal SVG Strip ───── */

export function TmFooter() {
  const { lang, setLang } = useLang();
  const fa = lang === "fa";
  const stripRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stripRef,
    offset: ["start end", "end start"],
  });
  const driftX = useTransform(scrollYProgress, [0, 1], [-24, 24]);

  return (
    <footer className="tm-footer" dir={fa ? "rtl" : "ltr"}>
      {/* Top CTA block matching Tres Mares 12-y9750.png */}
      <BlockReveal className="tm-footer__cta">
        <TmWordFill
          className="tm-footer__headline"
          text={
            fa
              ? "فرصت طراحی دقیق، ساخت و نگاه به آینده"
              : "The opportunity to design, build, and look ahead"
          }
        />
        <div className="tm-footer__cta-link">
          <Link href="/contact" className="tm-link">
            {fa ? "تماس با ما" : "Contact us"}
          </Link>
        </div>
      </BlockReveal>

      {/* Horizontal Square Monochrome Architectural Strip matching 13-y10650.png */}
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

      {/* Unified Bottom Legal & Navigation Strip on #F2F2F2 */}
      <div className="tm-footer__bottom">
        <nav className="tm-footer__legal" aria-label={fa ? "لینک‌های پایین صفحه" : "Footer links"}>
          <Link href="/courses">{fa ? "دوره‌ها" : "Courses"}</Link>
          <Link href="/paths">{fa ? "مسیرها" : "Paths"}</Link>
          <Link href="/why-neeleh">{fa ? "درباره ما" : "About"}</Link>
          <Link href="/instructors">{fa ? "مدرسین" : "Instructors"}</Link>
          <Link href="/resources">{fa ? "منابع" : "Resources"}</Link>
          <Link href="/privacy">{fa ? "حریم خصوصی" : "Privacy"}</Link>
          <Link href="/terms">{fa ? "قوانین" : "Terms"}</Link>
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
          © {localeCurrentYear(lang)} {fa ? "آکادمی معماری نیله" : "Neeleh Architecture Academy"}
        </p>
      </div>
    </footer>
  );
}
