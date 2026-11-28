import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Fraunces, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "./tresmares.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/components/language-provider";
import { ThemeStyleInjector, getCachedThemePayload } from "@/components/theme-style-injector";
import { PageTransition } from "@/components/page-transition";
import { SkinProvider } from "@/components/skin-provider";
import { SkinSwitcher } from "@/components/skin-switcher";
import { LazyGlobalWidgets } from "@/components/lazy-global-widgets";
import { BrandLogoProvider } from "@/components/brand-logo";
import { extractBrandLogoConfig } from "@/lib/brand-logo";
import { getSkin } from "@/lib/skin";
import { getServerLang } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-tech",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

const frauncesSerif = Fraunces({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const tmSerifFont = Instrument_Serif({
  variable: "--font-tm-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const EN_META = {
  title: "Neeleh | Architecture Academy & BIM Practice",
  description:
    "Neeleh Academy & Office — architecture education and BIM systems beyond tools: from Phase-2 drafting to computational design and AI-augmented architecture.",
};

const FA_META = {
  title: "نیله | آکادمی و دفتر تخصصی معماری",
  description:
    "نیله — آموزش و اجرای سیستم‌های هوشمند معماری فراتر از ابزارها: از نقشه‌کشی فاز ۲ و گردش‌کار BIM تا طراحی محاسباتی و هوش مصنوعی.",
};

export async function generateMetadata(): Promise<Metadata> {
  const [lang, settings] = await Promise.all([
    getServerLang(),
    getSiteSettings().catch(() => ({} as Record<string, string>)),
  ]);
  const m = lang === "fa" ? FA_META : EN_META;
  const customIcon = settings["brand.logoUrl"]?.trim();
  return {
    title: m.title,
    description: m.description,
    keywords: [
      "آکادمی نیله",
      "دفتر معماری نیله",
      "Neeleh Academy",
      "Neeleh Office",
      "architecture education",
      "AutoCAD Phase 2",
      "Revit BIM",
      "Grasshopper",
      "parametric design",
      "AI in architecture",
      "computational design",
    ],
    authors: [{ name: "Neeleh" }],
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
  const [skin, lang, currentUser, settings, themePayload] = await Promise.all([
    getSkin(),
    getServerLang(),
    getCurrentUser().catch(() => null),
    getSiteSettings().catch(() => ({} as Record<string, string>)),
    getCachedThemePayload().catch(() => ({ theme: null, liveRules: [], liveOverridesCss: "" })),
  ]);

  const initialIsAdmin = Boolean(
    currentUser &&
      (currentUser.roles.includes("ADMIN") ||
        currentUser.permissions.includes("theme.manage")),
  );
  const initialBrandLogo = extractBrandLogoConfig(settings);
  const defaultTheme =
    themePayload.theme?.mode === "DARK"
      ? "dark"
      : themePayload.theme?.mode === "AUTO"
        ? "system"
        : "light";

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
          defaultTheme={defaultTheme}
          enableSystem={true}
          disableTransitionOnChange
        >
          <SkinProvider skin={skin}>
            <LanguageProvider initialLang={lang}>
              <BrandLogoProvider initialLogo={initialBrandLogo}>
                <PageTransition>
                  {children}
                </PageTransition>
                <SkinSwitcher />
                <LazyGlobalWidgets
                  initialIsAdmin={initialIsAdmin}
                  initialRules={themePayload.liveRules}
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
