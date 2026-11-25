"use client";

import Link from "next/link";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { useLang } from "@/components/language-provider";
import { SmartSearchTrigger } from "@/components/smart-search";
import { BrandLogoGraphic, hasCustomBrandLogo, useBrandLogo } from "@/components/brand-logo";
import { hasRtlScript, toFaDigits } from "@/lib/i18n";
import type { PublicMenuItem } from "@/lib/menu-defaults";

type MenuItem = {
  num?: string;
  labelKey?: "home" | "work" | "contact" | "experiments";
  labelFa?: string;
  labelEn?: string;
  href: string;
  bgColor: string;
  indicatorFill: boolean;
  isArchive?: boolean;
};

const ITEMS: MenuItem[] = [
  { num: "1", labelKey: "home", href: "#top", bgColor: "#cbcccd", indicatorFill: true },
  { num: "2", labelKey: "work", href: "#work", bgColor: "#d8d9da", indicatorFill: false },
  { num: "3", labelKey: "contact", href: "#contact", bgColor: "#e6e6e6", indicatorFill: false },
  { num: undefined, labelKey: "experiments", href: "/ai-lab", bgColor: "#d8d9da", indicatorFill: false, isArchive: true },
];

const HEIGHT_VARS = ["var(--menu-h-1)", "var(--menu-h-2)", "var(--menu-h-3)"];
const OPEN_BASE_DELAY = 0.0;
const OPEN_STAGGER = 0.09;
const OPEN_DURATION = 0.78;
const CLOSE_BASE_DELAY = 0.0;
const CLOSE_STAGGER = 0.1;
const CLOSE_DURATION = 0.32;
const EASE = [0.76, 0, 0.24, 1] as const;

export function SiteHeader({ menu }: { menu?: PublicMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [portalRole, setPortalRole] = useState<"anon" | "student" | "staff">("anon");
  const { lang, t } = useLang();
  const brandLogo = useBrandLogo();
  const hasCustomLogo = hasCustomBrandLogo(brandLogo);
  const fa = lang === "fa";

  useEffect(() => {
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
  }, []);

  const resolvedItems: MenuItem[] =
    menu && menu.length > 0
      ? (() => {
          let blockNum = 0;
          return menu.map((m) => {
            const isArchive = m.kind === "archive";
            if (!isArchive) blockNum += 1;
            const safeHref = m.href === "#experiments" ? "/ai-lab" : m.href;
            return {
              num: isArchive ? undefined : String(blockNum),
              labelFa: m.labelFa,
              labelEn: m.labelEn,
              href: safeHref,
              bgColor: m.bgColor || "#cbcccd",
              indicatorFill: m.fillIndicator,
              isArchive,
            };
          });
        })()
      : ITEMS;

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      document.body.dataset.menuOpen = "true";
    } else {
      delete document.body.dataset.menuOpen;
    }
    return () => {
      document.body.style.overflow = "";
      delete document.body.dataset.menuOpen;
    };
  }, [open]);

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left rtl:origin-right bg-foreground"
        style={{ scaleX: progress }}
      />

      <header className="fixed top-0 left-0 right-0 z-[90] border-b border-border/50 bg-background/85 backdrop-blur-md">
        <div className="mx-auto max-w-[1800px] px-4 sm:px-8 lg:px-12 h-14 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Brand wordmark & optional uploaded logo */}
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-sm sm:text-base font-medium tracking-tight text-foreground whitespace-nowrap shrink-0"
            aria-label={fa ? "آکادمی نیله" : "Neeleh Academy"}
          >
            <BrandLogoGraphic config={brandLogo} maxHeight={36} />
            {(!hasCustomLogo || brandLogo.showText) && (
              <span>{fa ? "آکادمی نیله" : "Neeleh Academy"}</span>
            )}
          </Link>

          {/* Zone 2: Clean single-line text nav links */}
          <nav
            aria-label={fa ? "ناوبری اصلی" : "Primary navigation"}
            className="hidden lg:flex items-center gap-6 text-xs font-medium text-muted-foreground"
          >
            <Link
              href="/courses"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0 link-underline py-1"
            >
              {fa ? "دوره‌ها" : "Courses"}
            </Link>
            <Link
              href="/calendar"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0 link-underline py-1"
            >
              {fa ? "تقویم ترم‌ها" : "Calendar"}
            </Link>
            <Link
              href="/ai-lab"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0 link-underline py-1"
            >
              {fa ? "آزمایشگاه AI" : "AI Lab"}
            </Link>
            <Link
              href="/resources"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0 link-underline py-1"
            >
              {fa ? "منابع" : "Resources"}
            </Link>
            <Link
              href="/blog"
              className="hover:text-foreground transition-colors whitespace-nowrap shrink-0 link-underline py-1"
            >
              {fa ? "بلاگ" : "Journal"}
            </Link>
          </nav>

          {/* Zone 3: Account / Lang / Search / Menu controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <SmartSearchTrigger variant="icon" />
            <Link
              href={portalRole === "staff" ? "/dashboard/" : portalRole === "student" ? "/panel/" : "/login/"}
              prefetch={false}
              className="hidden sm:flex min-h-[40px] items-center px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
            >
              {portalRole === "staff"
                ? fa
                  ? "پنل مدیریت"
                  : "Admin"
                : portalRole === "student"
                  ? fa
                    ? "پنل هنرجو"
                    : "Student Portal"
                  : fa
                    ? "ورود / پورتال"
                    : "Portal"}
            </Link>
            <LangToggle />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? t.a11y.closeMenu : t.a11y.openMenu}
              className="flex min-h-[40px] items-center gap-1.5 px-2.5 text-xs font-medium text-foreground border border-border rounded-md hover:bg-secondary/60 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{open ? t.menu.close : t.menu.button}</span>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && <MenuOverlay items={resolvedItems} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function LangToggle() {
  const { lang, t, setLang } = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "fa" : "en")}
      aria-label={t.langSwitch.aria}
      className="flex min-h-[40px] min-w-[40px] items-center justify-center px-2 text-xs font-medium text-foreground hover:opacity-70 transition-opacity whitespace-nowrap shrink-0"
    >
      {t.langSwitch.to}
    </button>
  );
}

function MenuOverlay({
  items,
  onClose,
}: {
  items: MenuItem[];
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[85]"
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <button
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/15"
        tabIndex={-1}
      />

      <div className="menu-blocks absolute top-0 end-0 h-full w-full lg:w-1/2">
        {items.map((item, i) => (
          <MenuBlock
            key={`${item.href}-${i}`}
            item={item}
            index={i}
            total={items.length}
            onClose={onClose}
          />
        ))}
      </div>
    </motion.div>
  );
}

function MenuBlock({
  item,
  index,
  total,
  onClose,
}: {
  item: MenuItem;
  index: number;
  total: number;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { lang, t } = useLang();

  const openOrder = total - 1 - index;
  const openDelay = OPEN_BASE_DELAY + openOrder * OPEN_STAGGER;
  const closeDelay = CLOSE_BASE_DELAY + index * CLOSE_STAGGER;

  return (
    <motion.a
      href={item.href}
      onClick={onClose}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        position: item.isArchive ? "fixed" : "absolute",
        top: item.isArchive ? "auto" : "var(--menu-top)",
        insetInlineStart: item.isArchive
          ? "var(--menu-archive-x)"
          : `calc(${index} * var(--menu-w))`,
        bottom: item.isArchive ? 0 : "auto",
        width: "var(--menu-w)",
        height: item.isArchive ? "var(--menu-h-arch)" : HEIGHT_VARS[index],
        backgroundColor: item.bgColor,
      }}
      className="group block overflow-hidden text-black"
      variants={{
        hidden: { clipPath: "inset(0% 0% 100%)" },
        show: {
          clipPath: "inset(0% 0% 0%)",
          transition: { duration: OPEN_DURATION, delay: openDelay, ease: EASE },
        },
        exit: {
          clipPath: "inset(0% 0% 100%)",
          transition: { duration: CLOSE_DURATION, delay: closeDelay, ease: EASE },
        },
      }}
    >
      {item.num && (
        <div
          className="absolute z-10 flex items-center justify-center text-[14px] font-medium tabular-nums"
          style={{
            top: 16,
            insetInlineStart: 16,
            width: 23,
            height: 23,
            backgroundColor: item.indicatorFill ? "#000000" : "transparent",
            color: item.indicatorFill ? "#ffffff" : "#000000",
          }}
        >
          {lang === "fa" ? toFaDigits(item.num!) : item.num}
        </div>
      )}

      <div
        className="absolute"
        style={{
          insetInlineStart: 16,
          bottom: item.isArchive ? 8 : 24,
          insetInlineEnd: 16,
        }}
      >
        <MenuLabel
          text={
            item.labelKey
              ? t.menu[item.labelKey]
              : lang === "fa"
                ? item.labelFa || item.labelEn || ""
                : item.labelEn || item.labelFa || ""
          }
          hovered={hovered}
        />
      </div>
    </motion.a>
  );
}

function MenuLabel({ text, hovered }: { text: string; hovered: boolean }) {
  const isRTL = hasRtlScript(text);
  const units = isRTL ? [text] : text.split("");
  return (
    <div className="menu-label relative font-medium leading-[1]">
      <div className="flex">
        {units.map((c, i) => (
          <span
            key={`v-${i}`}
            className="inline-block overflow-hidden"
            style={{ width: c === " " ? "0.3em" : "auto" }}
          >
            <span
              className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]"
              style={{
                transform: hovered ? "translateY(-110%)" : "translateY(0%)",
                transitionDelay: `${i * (isRTL ? 0 : 0.02)}s`,
              }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          </span>
        ))}
      </div>
      <div className="absolute inset-0 flex">
        {units.map((c, i) => (
          <span
            key={`s-${i}`}
            className="inline-block overflow-hidden"
            style={{ width: c === " " ? "0.3em" : "auto" }}
          >
            <span
              className="inline-block transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]"
              style={{
                transform: hovered ? "translateY(0%)" : "translateY(110%)",
                transitionDelay: `${i * (isRTL ? 0 : 0.02)}s`,
              }}
            >
              {c === " " ? "\u00A0" : c}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
