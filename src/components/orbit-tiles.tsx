"use client";

import { useEffect, useRef, useState } from "react";

/**
 * OrbitTiles — a carousel of project cover images arranged in a circular
 * "orbit" pattern, with the closest tile large + sharp and distant tiles
 * small + blurred. Reverse-engineered 1:1 from bleibtgleich.dev's
 * `initOrbitTiles()` (slater-main.js).
 *
 * === Behaviour ===
 * The list wraps rotates 360° over 24s; each tile counter-rotates -360°
 * so images stay upright while orbiting. Tiles are positioned along the X
 * axis at offsets [-461, -412, 261, 314] px (approx) from center, then
 * orbit-rotated — so they appear at different angular positions on the
 * circle.
 *
 * The "active" tile (the one currently closest to the front of the orbit)
 * has scale → 1, blur → 0, brightness → 1; the others scale down and
 * blur out based on how far around the orbit they are. This is what
 * gives the orbit its "depth" feel — one image always in focus while
 * the rest recede.
 *
 * Each tile's `progress` advances by 1 over 2.5s (with 0.075s stagger
 * between tiles), cycling the orbit. The "active" index = the tile with
 * progress closest to its own index.
 *
 * The component activates only when in viewport (IntersectionObserver).
 *
 * === Source constants ===
 *   u=1, p=0, m=0.04, g=0.2, f=1, h=0.3, v=2.5, w=0.075, b=24
 *   (orbit rotation duration 24s, tile orbit cycle 2.5s + stagger)
 */

export type OrbitTile = {
  src: string;
  alt: string;
  href?: string;
};

type OrbitTilesProps = {
  tiles: OrbitTile[];
  /** Diameter of the orbit in CSS pixels (defaults to 461px from source). */
  orbitRadius?: number;
  /** Full rotation duration in seconds. */
  rotationDuration?: number;
  className?: string;
};

const DEFAULT_RADIUS = 230; // half of 461px from source
const DEFAULT_ROTATION_DURATION = 24; // seconds (b=24 in source)

export function OrbitTiles({
  tiles,
  orbitRadius = DEFAULT_RADIUS,
  rotationDuration = DEFAULT_ROTATION_DURATION,
  className,
}: OrbitTilesProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(true);

  // Responsive orbit: on narrow viewports shrink the radius so the front
  // tile fits inside the screen (radius = min(requested, 34vw)). On ≥677px
  // viewports 34vw ≥ 230px → the desktop geometry is untouched.
  const [radius, setRadius] = useState(orbitRadius);
  useEffect(() => {
    const update = () =>
      setRadius(Math.min(orbitRadius, Math.round(window.innerWidth * 0.34)));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, [orbitRadius]);

  // Pause when off-screen — matches source's ScrollTrigger toggle.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  // Drive the orbit rotation + per-tile progress each frame.
  // State: listRotation (deg), tileCycleTime[i] (0..cycleDuration, eased → progress)
  const tileCycleTimeRef = useRef<number[]>(tiles.map(() => 0));
  const tileProgressRef = useRef<number[]>(tiles.map(() => 0));
  const listRotRef = useRef(0);
  const nextCycleRef = useRef<number[]>(tiles.map(() => 0));
  const lastTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const staggerDelay = 0.075;
  const cycleDuration = 2.5;

  useEffect(() => {
    if (!active) {
      lastTimeRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      // List rotation: 360deg per rotationDuration seconds. Linear (matches source: ease "none").
      listRotRef.current += (360 / rotationDuration) * dt;

      const d = tiles.length;
      const now = timestamp / 1000;

      // Determine the "active" tile index (closest to integer progress = at front).
      const activeIdx = tileProgressRef.current.reduce((best, _prog, i) => {
        const prog = tileProgressRef.current[i];
        const distI = Math.min(
          ((i - prog) % d + d) % d,
          d - ((i - prog) % d + d) % d
        );
        const distBest = Math.min(
          ((best - tileProgressRef.current[best]) % d + d) % d,
          d - ((best - tileProgressRef.current[best]) % d + d) % d
        );
        return distI < distBest ? i : best;
      }, 0);

      // Advance each tile's cycle time, then convert to eased progress.
      // The "osmo" ease from GSAP creates slow-in/slow-out: tiles slow down
      // dramatically as they approach the "front" position (progress near integer)
      // and speed up during transit. We approximate "osmo" with easeInOutSine.
      for (let i = 0; i < d; i++) {
        const offset = (i - activeIdx + d) % d;
        const startDelay = offset * staggerDelay;
        if (now >= nextCycleRef.current[i] + startDelay) {
          // Advance cycle time linearly
          tileCycleTimeRef.current[i] += dt;
          if (tileCycleTimeRef.current[i] >= cycleDuration) {
            tileCycleTimeRef.current[i] -= cycleDuration;
            nextCycleRef.current[i] = now;
            // Settle progress onto the slot the eased motion just reached.
            // The eased fraction already carried the tile from slot k to k+1,
            // so we must NOT advance an extra slot here. The old `+ 1` made
            // every tile skip the slot it had just arrived at — which teleported
            // the front image away the instant it reached the front (slowest
            // point) and popped the next image in from the far side a frame later.
            tileProgressRef.current[i] = Math.round(tileProgressRef.current[i]);
            if (tileProgressRef.current[i] >= d) tileProgressRef.current[i] -= d;
          }
          // Convert cycle time (0..1) to eased progress delta.
          // easeInOutSine: slow at start (front), fast in middle (transit), slow at end (front).
          const t = tileCycleTimeRef.current[i] / cycleDuration; // 0..1
          const easedT = easeInOutSine(t);
          // Progress = integer base + eased fraction
          const baseProgress = Math.floor(tileProgressRef.current[i]);
          tileProgressRef.current[i] = baseProgress + easedT;
        }
      }

      // Apply transforms
      if (listRef.current) {
        listRef.current.style.transform = `rotate(${listRotRef.current}deg)`;
      }
      const baseTileWidth = tileRefs.current[0]?.offsetWidth || 461;
      const u = 1;
      const p = 0;
      tileRefs.current.forEach((tile, i) => {
        if (!tile) return;
        const progress = tileProgressRef.current[i];
        const r = ((i - progress) / d) * Math.PI * 2;
        const a = (Math.cos(r) + 1) / 2;
        const easedA = Math.pow(a, 1.3);
        const scale = lerp(0.2, 1, easedA);
        const blur = lerp(0.04 * baseTileWidth, 0, easedA);
        const brightness = lerp(0.3, 1, easedA);
        const x = Math.sin(r) * baseTileWidth * u;
        const y = Math.cos(r) * baseTileWidth * p;
        const z = Math.round(1000 * easedA);
        tile.style.transform = `translate(${x}px, ${y}px) rotate(${-listRotRef.current}deg) scale(${scale}, ${scale})`;
        tile.style.zIndex = String(z);
        tile.style.filter = `blur(${blur}px) brightness(${brightness})`;
      });

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
      lastTimeRef.current = null;
    };
  }, [active, rotationDuration, tiles.length]);

  return (
    <div
      ref={wrapRef}
      className={`orbit-tiles ${className || ""}`}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
      data-orbit-tiles-init
    >
      <div
        ref={listRef}
        className="orbit-tiles__list"
        style={{
          position: "relative",
          width: `${radius * 2}px`,
          height: `${radius * 2 * 0.75}px`, // 4:3 aspect (matches 1011x680 source images)
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        {tiles.map((tile, i) => (
          <div
            key={i}
            ref={(el) => {
              tileRefs.current[i] = el;
            }}
            className="orbit-tiles__item"
            data-orbit-tiles-item
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "100%",
              height: "100%",
              marginLeft: `-${radius}px`,
              marginTop: `-${radius * 0.75}px`,
              willChange: "transform, filter, opacity",
              transformOrigin: "center center",
            }}
          >
            <img
              src={tile.src}
              alt={tile.alt}
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * easeInOutSine — slow start, fast middle, slow end.
 * Approximates GSAP's "osmo" ease: tiles slow down dramatically as they
 * approach the front position (progress near integer values) and speed
 * up during transit between positions.
 */
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
