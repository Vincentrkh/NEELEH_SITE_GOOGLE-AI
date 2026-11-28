"use client";

import { GooDefs } from "@/components/goo-defs";
import { Preloader } from "@/components/preloader";
import { CustomCursor } from "@/components/custom-cursor";
import { SiteHeader } from "@/components/site-header";
import { AcademyParticleHero } from "@/components/academy-particle-hero";
import { WorkSection } from "@/components/work-section";
import { AwardsSection } from "@/components/awards-section";
import { StickyNameSection } from "@/components/sticky-name-section";
import { PhilosophySection } from "@/components/philosophy-section";
import { ContactSection } from "@/components/contact-section";
import { useLenis } from "@/hooks/use-lenis";
import type { PublicMenuItem } from "@/lib/menu-defaults";
import type { PortalRole } from "@/lib/auth";

export function HomeInteractive({
  menu,
  initialPortalRole,
  children,
}: {
  menu?: PublicMenuItem[];
  initialPortalRole?: PortalRole;
  children?: React.ReactNode;
}) {
  useLenis();

  return (
    <div className="relative min-h-screen flex flex-col grain">
      <GooDefs />
      <Preloader />
      <CustomCursor />
      <SiteHeader menu={menu} initialPortalRole={initialPortalRole} />

      <main className="flex-1 relative">
        <AcademyParticleHero />
        <WorkSection />
        <AwardsSection />
        <StickyNameSection />
        <PhilosophySection />
        {children}
        <ContactSection />
      </main>
    </div>
  );
}
