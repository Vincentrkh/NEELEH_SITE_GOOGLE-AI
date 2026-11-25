"use client";

import * as React from "react";
import { useLang } from "@/components/language-provider";
import {
  extractBrandLogoConfig,
  hasCustomBrandLogo,
  type BrandLogoConfig,
} from "@/lib/brand-logo";

const DEFAULT_LOGO: BrandLogoConfig = {
  logoUrl: "",
  logoSvg: "",
  logoHeight: 28,
  showText: true,
  alt: "",
};

const BrandLogoContext = React.createContext<BrandLogoConfig>(DEFAULT_LOGO);

export const BRAND_LOGO_UPDATED_EVENT = "neeleh-brand-logo-updated";

export function BrandLogoProvider({
  initialLogo,
  children,
}: {
  initialLogo: BrandLogoConfig;
  children: React.ReactNode;
}) {
  const [logo, setLogo] = React.useState<BrandLogoConfig>(initialLogo);

  React.useEffect(() => {
    setLogo(initialLogo);
  }, [initialLogo]);

  React.useEffect(() => {
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<BrandLogoConfig | undefined>).detail;
      if (detail && typeof detail === "object") {
        setLogo(detail);
      }
    };
    window.addEventListener(BRAND_LOGO_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(BRAND_LOGO_UPDATED_EVENT, onUpdated);
  }, []);

  return (
    <BrandLogoContext.Provider value={logo}>
      {children}
    </BrandLogoContext.Provider>
  );
}

export function useBrandLogo(): BrandLogoConfig {
  return React.useContext(BrandLogoContext);
}

export function BrandLogoGraphic({
  config,
  maxHeight,
  className = "",
  fallback = null,
}: {
  config?: BrandLogoConfig;
  maxHeight?: number;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const ctx = useBrandLogo();
  const { lang } = useLang();
  const resolved = config ?? ctx;

  if (!hasCustomBrandLogo(resolved)) {
    return <>{fallback}</>;
  }

  const targetH = maxHeight ? Math.min(resolved.logoHeight, maxHeight) : resolved.logoHeight;
  const altText =
    resolved.alt || (lang === "fa" ? "لوگوی آکادمی نیله" : "Neeleh Academy logo");

  if (resolved.logoSvg) {
    return (
      <span
        role="img"
        aria-label={altText}
        style={{ height: targetH }}
        className={`inline-flex items-center justify-center shrink-0 [&>svg]:h-full [&>svg]:w-auto [&>svg]:max-w-[200px] ${className}`}
        dangerouslySetInnerHTML={{ __html: resolved.logoSvg }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved.logoUrl}
      alt={altText}
      style={{ height: targetH }}
      className={`w-auto max-w-[200px] object-contain shrink-0 block ${className}`}
    />
  );
}

export { extractBrandLogoConfig, hasCustomBrandLogo, type BrandLogoConfig };
