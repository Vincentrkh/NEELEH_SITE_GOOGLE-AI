import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "./tresmares.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeStyleInjector } from "@/components/theme-style-injector";
import { PageTransition } from "@/components/page-transition";
import { SkinProvider } from "@/components/skin-provider";
import { SkinSwitcher } from "@/components/skin-switcher";
import { AdminLiveInspector } from "@/components/admin-live-inspector";
import { SmartSearchDialog } from "@/components/smart-search";
import { BrandLogoProvider } from "@/components/brand-logo";
import { BRAND_LOGO_KEYS, extractBrandLogoConfig } from "@/lib/brand-logo";
import { getSkin } from "@/lib/skin";
import { getServerLang } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LIVE_OVERRIDES_SETTING_KEY, parseLiveOverrides } from "@/lib/live-overrides";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-tech",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const frauncesSerif = Fraunces({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const tmSerifFont = Instrument_Serif({
  variable: "--font-tm-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const EN_META = {
  title: "Neeleh Academy | Smart Architectural Systems & AI-era Education",
  description:
    "Neeleh Academy — architecture education beyond tools: from Phase-2 drafting and BIM workflows to computational design with Grasshopper and AI-augmented architecture. Built on architectural experiences unified since 2000; in-person cohorts in Damghan & live online.",
};

const FA_META = {
  title: "آکادمی نیله | آموزش معماری در عصر هوش مصنوعی",
  description:
    "آکادمی نیله — آموزش معماری فراتر از ابزارها: از نقشه‌کشی فاز ۲ و گردش‌کار BIM تا طراحی محاسباتی با گرس‌هاپر و معماری مبتنی بر هوش مصنوعی. هم‌افزایی تجربه‌ها از سال ۱۳۷۹ تا امروز؛ برگزاری حضوری در دامغان و آنلاین.",
};

export async function generateMetadata(): Promise<Metadata> {
  const [lang, logoUrlRow] = await Promise.all([
    getServerLang(),
    db.setting.findUnique({ where: { key: "brand.logoUrl" } }).catch(() => null),
  ]);
  const m = lang === "fa" ? FA_META : EN_META;
  const customIcon = logoUrlRow?.value?.trim();
  return {
    title: m.title,
    description: m.description,
    keywords: [
      "آکادمی نیله",
      "Neeleh Academy",
      "architecture education",
      "AutoCAD Phase 2",
      "Revit BIM",
      "Grasshopper",
      "parametric design",
      "AI in architecture",
      "computational design",
      "Damghan architecture academy",
    ],
    authors: [{ name: "Neeleh Academy" }],
    ...(customIcon ? { icons: { icon: customIcon, shortcut: customIcon } } : {}),
    openGraph: {
      title: m.title,
      description: m.description,
      type: "website",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // پوسته فعال از کوکی — تا SSR از همان ابتدا با پوسته درست رندر شود
  const skin = await getSkin();
  // زبان از کوکی — برای dir درست در اولین رندر سرور (بدون فلش RTL/LTR)
  const lang = await getServerLang();
  const [currentUser, overrideRow, brandRows] = await Promise.all([
    getCurrentUser().catch(() => null),
    db.setting.findUnique({ where: { key: LIVE_OVERRIDES_SETTING_KEY } }).catch(() => null),
    db.setting.findMany({ where: { key: { in: [...BRAND_LOGO_KEYS] } } }).catch(() => []),
  ]);
  const initialIsAdmin = Boolean(
    currentUser &&
      (currentUser.roles.includes("ADMIN") ||
        currentUser.permissions.includes("theme.manage")),
  );
  const initialRules = parseLiveOverrides(overrideRow?.value);
  const brandMap: Record<string, string> = {};
  for (const r of brandRows) {
    brandMap[r.key] = r.value;
  }
  const initialBrandLogo = extractBrandLogoConfig(brandMap);

  return (
    <html lang={lang} dir={lang === "fa" ? "rtl" : "ltr"} suppressHydrationWarning data-skin={skin}>
      <head>
        <ThemeStyleInjector />
      </head>
      <body
        className={`${jakartaSans.variable} ${jetbrainsMono.variable} ${frauncesSerif.variable} ${tmSerifFont.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <SkinProvider skin={skin}>
            <LanguageProvider initialLang={lang}>
              <BrandLogoProvider initialLogo={initialBrandLogo}>
                <PageTransition>
                  {children}
                </PageTransition>
                <SmartSearchDialog />
                <SkinSwitcher />
                <AdminLiveInspector
                  initialIsAdmin={initialIsAdmin}
                  initialRules={initialRules}
                />
                <Toaster />
              </BrandLogoProvider>
            </LanguageProvider>
          </SkinProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
