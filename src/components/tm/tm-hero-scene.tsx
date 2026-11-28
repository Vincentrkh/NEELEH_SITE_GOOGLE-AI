"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { ParticleSphereHandle } from "@/components/tm/particle-sphere-canvas";

const ParticleSphereCanvas = dynamic(
  () => import("@/components/tm/particle-sphere-canvas").then((m) => m.ParticleSphereCanvas),
  { ssr: false },
);

/* ═══════════════════════════════════════════════════════════════════════════
   TmHeroScene — صحنه سه‌بعدی «Particle Sphere 5» با ورود Zoom-In/Fade
   و خروج یکپارچه Zoom-Out/Fade پس از آخرین اسکرول در بخش Hero
   ═══════════════════════════════════════════════════════════════════════════ */

type TmHeroSceneProps = {
  sphereRef: React.RefObject<ParticleSphereHandle | null>;
  onScenesCountChange?: (count: number) => void;
  onActiveSceneChange?: (index: number, label: string) => void;
};

export function TmHeroScene({
  sphereRef,
  onScenesCountChange,
  onActiveSceneChange,
}: TmHeroSceneProps) {
  return (
    <div className="tm-hero-scene">
      <ParticleSphereCanvas
        ref={sphereRef}
        fetchConfig
        interactiveScrollScenes={false}
        scrollDrivenScenes
        heroZoomLayer
        onScenesCountChange={onScenesCountChange}
        onActiveSceneChange={onActiveSceneChange}
        className="h-full w-full"
      />
    </div>
  );
}
