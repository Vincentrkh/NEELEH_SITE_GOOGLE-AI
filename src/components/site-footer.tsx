import Link from "next/link";
import { getSiteSettings, localizedSetting } from "@/lib/settings";
import { extractBrandLogoConfig, hasCustomBrandLogo } from "@/lib/brand-logo";
import { BrandLogoGraphic } from "@/components/brand-logo";
import { getServerLang } from "@/lib/i18n";
import { localeCurrentYear, localeNumber } from "@/lib/format";
import { getMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

export async function SiteFooter() {
  const [lang, s, footerMenu] = await Promise.all([
    getServerLang(),
    getSiteSettings(),
    getMenu("footer"),
  ]);
  const fa = lang === "fa";
  const brandLogo = extractBrandLogoConfig(s);
  const hasCustomLogo = hasCustomBrandLogo(brandLogo);
  const tagline = localizedSetting(lang, s, "hero.tagline");
  const hours = localizedSetting(lang, s, "contact.hours");
  const address = localizedSetting(lang, s, "contact.address");
  const years = localeNumber(lang, s["stats.years"]);
  const phone = localeNumber(lang, s["contact.phone"]);

  return (
    <footer className="mt-auto border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[1800px] px-5 sm:px-8 lg:px-12 py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5"
              aria-label={fa ? "آکادمی نیله" : "Neeleh Academy"}
            >
              <BrandLogoGraphic
                config={brandLogo}
                maxHeight={40}
                fallback={
                  <span className="grid size-8 place-items-center rounded-md bg-foreground text-background font-bold text-base">
                    {fa ? "ن" : "N"}
                  </span>
                }
              />
              {(!hasCustomLogo || brandLogo.showText) && (
                <span className="font-semibold text-base">
                  {fa ? "آکادمی نیله" : "Neeleh Academy"}
                </span>
              )}
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              {fa
                ? `${tagline} — ${years} سال تجربه حرفه‌ای از نقشه‌کشی اجرایی تا معماری محاسباتی و هوش مصنوعی.`
                : `${tagline} — ${years} years of architectural practice, from Phase-2 drafting to computational systems and AI.`}
            </p>
          </div>

          {/* Academy — Admin-configurable footer menu */}
          <nav aria-label={fa ? "آکادمی و دسترسی سریع" : "Academy & Quick Links"}>
            <h3 className="text-xs font-semibold text-foreground mb-3">
              {fa ? "آکادمی و دسترسی سریع" : "Academy & Quick Links"}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerMenu.map((item, idx) => (
                <li key={`${item.href}-${idx}`}>
                  <Link href={item.href} className="hover:text-foreground transition-colors">
                    {fa ? item.labelFa : item.labelEn}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company & Portals */}
          <nav aria-label={fa ? "پورتال و اطلاعات" : "Portals & Info"}>
            <h3 className="text-xs font-semibold text-foreground mb-3">
              {fa ? "پورتال و راهنما" : "Portals & Policies"}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/search" className="hover:text-foreground transition-colors">
                  {fa ? "جستجو در آکادمی" : "Search academy"}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  {fa ? "درباره آکادمی نیله" : "About Neeleh"}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground transition-colors">
                  {fa ? "سوالات متداول" : "FAQ"}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground transition-colors">
                  {fa ? "تماس و مشاوره" : "Contact & Advising"}
                </Link>
              </li>
              <li>
                <Link href="/login/" prefetch={false} className="hover:text-foreground transition-colors">
                  {fa ? "ورود / پورتال" : "Student & Staff Portal"}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold text-foreground mb-3">
              {fa ? "محل برگزاری حضوری — دامغان" : "In-Person Venue — Damghan"}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{address}</li>
              <li dir="ltr" className="text-start font-mono tabular-nums">
                {phone}
              </li>
              <li dir="ltr" className="text-start font-mono">
                {s["contact.email"]}
              </li>
              <li>{hours}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>
            © {localeCurrentYear(lang)}{" "}
            {fa
              ? "آکادمی معماری نیله — تمامی حقوق محفوظ است."
              : "Neeleh Architecture Academy — All rights reserved."}
          </span>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              {fa ? "حریم خصوصی" : "Privacy"}
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              {fa ? "قوانین و انصراف" : "Terms & Refund"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
