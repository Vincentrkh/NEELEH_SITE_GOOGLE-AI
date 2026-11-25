"use client";

import { useEffect, useState } from "react";
import { GooDefs } from "@/components/goo-defs";
import { Preloader } from "@/components/preloader";
import { CustomCursor } from "@/components/custom-cursor";
import { SiteHeader } from "@/components/site-header";
import { HeroSection } from "@/components/hero-section";
import {
  FluidReveal,
  DEFAULT_BRUSH_RADIUS,
} from "@/components/fluid-reveal";
import {
  BrushSettings,
  DEFAULT_REVEAL_BG,
  type RevealBg,
} from "@/components/brush-settings";
import { OrbitTiles, type OrbitTile } from "@/components/orbit-tiles";
import { WorkSection } from "@/components/work-section";
import { AwardsSection } from "@/components/awards-section";
import { StickyNameSection } from "@/components/sticky-name-section";
import { PhilosophySection } from "@/components/philosophy-section";
import { ContactSection } from "@/components/contact-section";
import { useLenis } from "@/hooks/use-lenis";
import type { PublicMenuItem } from "@/lib/menu-defaults";

const PROJECT_TILES: OrbitTile[] = [
  { src: "/images/hero.png", alt: "Neeleh studio", href: "#top" },
  { src: "/images/tier-beginner.svg", alt: "Tier 1 — Foundation (Phase 2, SketchUp, Revit BIM)", href: "#work" },
  { src: "/images/tier-intermediate.svg", alt: "Tier 2 — Intermediate (Rhino, Enscape/V-Ray, Excel)", href: "#work" },
  { src: "/images/tier-pro.svg", alt: "Tier 3 — Advanced (Grasshopper, Automation, AI)", href: "#awards" },
];

export function HomeInteractive({
  menu,
  children,
}: {
  menu?: PublicMenuItem[];
  children?: React.ReactNode;
}) {
  useLenis();

  const [brushRadius, setBrushRadius] = useState(DEFAULT_BRUSH_RADIUS);
  const [revealBg, setRevealBg] = useState<RevealBg>(DEFAULT_REVEAL_BG);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col grain">
      <GooDefs />
      <Preloader />
      <CustomCursor />
      <SiteHeader menu={menu} />

      <main className="flex-1 relative">
        <FluidReveal
          maskColor="rgb(255, 255, 255)"
          brushRadius={brushRadius}
          revealBackground={revealBg.value}
          revealContent={<OrbitTiles tiles={PROJECT_TILES} />}
        >
          <HeroSection />
        </FluidReveal>
        <WorkSection />
        <AwardsSection />
        <StickyNameSection />
        <PhilosophySection />
        {children}
        <ContactSection />
      </main>

      <BrushSettings
        value={brushRadius}
        onChange={setBrushRadius}
        bg={revealBg}
        onBgChange={setRevealBg}
      />
    </div>
  );
}
