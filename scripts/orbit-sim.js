/**
 * Orbit-tiles tick() simulator — replicates src/components/orbit-tiles.tsx
 * frame by frame to diagnose the front-tile vanish/swap glitch.
 *
 * Runs two variants:
 *   fix=false  → current code:  progress = Math.round(progress) + 1   (skip bug)
 *   fix=true   → proposed:      progress = Math.round(progress)       (settle only)
 *
 * Detects "teleports": any tile whose |x| jumps > 0.25 * W between two
 * consecutive frames (real eased motion moves ~0.02W per frame max).
 */

const D = 4; // tiles
const W = 461; // base tile width (px)
const STAGGER = 0.075;
const CYCLE = 2.5;
const ROT_DUR = 24;
const FPS = 60;
const SECONDS = 32;

const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const lerp = (a, b, t) => a + (b - a) * t;

function simulate(fix) {
  let cycleTime = [0, 0, 0, 0];
  let progress = [0, 0, 0, 0];
  let nextCycle = [0, 0, 0, 0];
  let listRot = 0;
  const dt = 1 / FPS;

  const tileX = [0, 0, 0, 0];
  const tileScale = [0, 0, 0, 0];
  const tileZ = [0, 0, 0, 0];

  const events = [];
  let frontOccupied = 0;
  let frames = 0;

  for (let frame = 0; frame <= SECONDS * FPS; frame++) {
    const now = frame * dt;
    listRot += (360 / ROT_DUR) * dt;

    // activeIdx — mirrors the reduce() in the component
    let activeIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < D; i++) {
      const p = progress[i];
      const raw = ((i - p) % D + D) % D;
      const distI = Math.min(raw, D - raw);
      if (distI < bestDist) {
        bestDist = distI;
        activeIdx = i;
      }
    }

    for (let i = 0; i < D; i++) {
      const offset = (i - activeIdx + D) % D;
      const startDelay = offset * STAGGER;
      if (now >= nextCycle[i] + startDelay) {
        cycleTime[i] += dt;
        if (cycleTime[i] >= CYCLE) {
          cycleTime[i] -= CYCLE;
          nextCycle[i] = now;
          progress[i] = Math.round(progress[i]) + (fix ? 0 : 1);
          if (progress[i] >= D) progress[i] -= D;
        }
        const t = cycleTime[i] / CYCLE;
        const easedT = easeInOutSine(t);
        const base = Math.floor(progress[i]);
        progress[i] = base + easedT;
      }
    }

    // transforms — mirrors the forEach
    const prevX = tileX.slice();
    const prevScale = tileScale.slice();
    for (let i = 0; i < D; i++) {
      const r = ((i - progress[i]) / D) * Math.PI * 2;
      const a = (Math.cos(r) + 1) / 2;
      const eA = Math.pow(a, 1.3);
      tileX[i] = Math.sin(r) * W;
      tileScale[i] = lerp(0.2, 1, eA);
      tileZ[i] = Math.round(1000 * eA);
    }

    // teleport detection (skip first frame)
    if (frame > 0) {
      for (let i = 0; i < D; i++) {
        const dx = Math.abs(tileX[i] - prevX[i]);
        if (dx > 0.25 * W) {
          const wasFront = prevScale[i] > 0.8;
          const nowFront = tileScale[i] > 0.8;
          events.push({
            t: +now.toFixed(2),
            tile: i,
            kind: wasFront && !nowFront ? "VANISH-from-front" : nowFront ? "POP-into-front" : "hidden-jump",
            x: `${prevX[i].toFixed(0)} → ${tileX[i].toFixed(0)}`,
            scale: `${prevScale[i].toFixed(2)} → ${tileScale[i].toFixed(2)}`,
          });
        }
      }
    }

    // front occupancy: a big tile parked at center
    for (let i = 0; i < D; i++) {
      if (tileScale[i] > 0.85 && Math.abs(tileX[i]) < 0.1 * W) {
        frontOccupied++;
        break;
      }
    }
    frames++;
  }

  return { events, frontPct: (100 * frontOccupied) / frames };
}

for (const fix of [false, true]) {
  const { events, frontPct } = simulate(fix);
  console.log(`\n=========== ${fix ? "FIXED (settle only)" : "CURRENT (round+1)"} ===========`);
  console.log(`teleports detected: ${events.length}`);
  console.log(`front occupancy (big tile at center): ${frontPct.toFixed(1)}% of time`);
  events.slice(0, 14).forEach((e) =>
    console.log(
      `  t=${e.t}s  tile#${e.tile}  ${e.kind}  x: ${e.x}  scale: ${e.scale}`
    )
  );
  if (events.length > 14) console.log(`  … +${events.length - 14} more`);
}
