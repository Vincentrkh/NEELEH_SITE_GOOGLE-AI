import * as THREE from "three";
import { CITY_ROAD_POLYLINES } from "./city-data";

export type CityMaterialPalette = {
  groundMat: THREE.MeshStandardMaterial;
  groundTex: THREE.CanvasTexture;
  facadeDecoTex: THREE.CanvasTexture;
  facadeCurtainTex: THREE.CanvasTexture;
  facadeLoftTex: THREE.CanvasTexture;
  facadeBungalowTex: THREE.CanvasTexture;
  roofTex: THREE.CanvasTexture;
  fillerMat: THREE.MeshStandardMaterial;
  fillerGlassMat: THREE.MeshStandardMaterial;
  fillerLoftMat: THREE.MeshStandardMaterial;
  fillerBungalowMat: THREE.MeshStandardMaterial;
  fillerCapMat: THREE.MeshStandardMaterial;
  fillerRoofSlopeMat: THREE.MeshStandardMaterial;
  rooftopUnitMat: THREE.MeshStandardMaterial;
  freewayDeckMat: THREE.MeshStandardMaterial;
  freewayPierMat: THREE.MeshStandardMaterial;
  plazaMat: THREE.MeshStandardMaterial;
  treeMat: THREE.MeshStandardMaterial;
  palmTrunkMat: THREE.MeshStandardMaterial;
  palmFrondMat: THREE.MeshStandardMaterial;
  carMat: THREE.MeshStandardMaterial;
  humanMat: THREE.MeshStandardMaterial;
  inkLineMat: THREE.LineBasicMaterial;
  radialInkLineMat: THREE.LineBasicMaterial;
  inkFaintLineMat: THREE.LineBasicMaterial;
  plinthMat: THREE.MeshStandardMaterial;
  landmarkShellMat: THREE.MeshStandardMaterial;
  landmarkGlassMat: THREE.MeshStandardMaterial;
  landmarkRibMat: THREE.MeshStandardMaterial;
  glowCoreMat: THREE.MeshStandardMaterial;
  conduitBaseMat: THREE.MeshStandardMaterial;
  pulseMat: THREE.MeshBasicMaterial;
  haloRingMat: THREE.MeshBasicMaterial;
  dispose: () => void;
};

const WORLD_GROUND_SIZE = 140;

function worldToCanvas(x: number, z: number, size: number): [number, number] {
  const px = ((x + WORLD_GROUND_SIZE * 0.5) / WORLD_GROUND_SIZE) * size;
  const py = ((z + WORLD_GROUND_SIZE * 0.5) / WORLD_GROUND_SIZE) * size;
  return [px, py];
}

function strokeSmoothRoad(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  size: number,
  closed = false
) {
  if (points.length < 2) return;
  const pts = points.map(([x, z]) => worldToCanvas(x, z, size));

  ctx.beginPath();
  if (closed) {
    const last = pts[pts.length - 1];
    const first = pts[0];
    ctx.moveTo((last[0] + first[0]) * 0.5, (last[1] + first[1]) * 0.5);
    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[(i + 1) % pts.length];
      ctx.quadraticCurveTo(
        curr[0],
        curr[1],
        (curr[0] + next[0]) * 0.5,
        (curr[1] + next[1]) * 0.5
      );
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      ctx.quadraticCurveTo(
        curr[0],
        curr[1],
        (curr[0] + next[0]) * 0.5,
        (curr[1] + next[1]) * 0.5
      );
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }
  ctx.stroke();
}

/**
 * تکسچر کامل نقشه شهر لس‌آنجلس با پیاده‌روها، جدول جوهر، خط‌کشی عابر و محوشدگی نرم حاشیه
 */
function createLAStreetMapTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 2048;
  const pxPerUnit = size / WORLD_GROUND_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#ecece8";
    ctx.fillRect(0, 0, size, size);

    // بافت نقطه‌ای ظریف کاغذ معماری
    ctx.fillStyle = "rgba(42, 42, 42, 0.048)";
    for (let i = 0; i < 15000; i++) {
      const rx = (i * 397) % size;
      const ry = (i * 613) % size;
      ctx.fillRect(rx, ry, 1.25, 1.25);
    }

    const [cx, cy] = worldToCanvas(0, 0, size);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // ۱. باند پیاده‌رو روشن در کنار خیابان‌ها
    for (const road of CITY_ROAD_POLYLINES) {
      ctx.strokeStyle = "#f5f5f0";
      ctx.lineWidth = (road.width + 1.05) * pxPerUnit;
      strokeSmoothRoad(ctx, road.points, size, road.closed);
    }

    // ۲. جدول جوهر پیاده‌رو (خط تیره پررنگ)
    for (const road of CITY_ROAD_POLYLINES) {
      ctx.strokeStyle = "#262626";
      ctx.lineWidth = (road.width + 0.18) * pxPerUnit;
      strokeSmoothRoad(ctx, road.points, size, road.closed);
    }

    // ۳. سطح آسفالت روشن اسکیس
    for (const road of CITY_ROAD_POLYLINES) {
      ctx.strokeStyle = "#d8d8d2";
      ctx.lineWidth = road.width * pxPerUnit;
      strokeSmoothRoad(ctx, road.points, size, road.closed);
    }

    // ۴. خط‌کشی وسط خیابان‌ها
    ctx.save();
    ctx.strokeStyle = "rgba(48, 48, 48, 0.52)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([12, 11]);
    for (const road of CITY_ROAD_POLYLINES) {
      strokeSmoothRoad(ctx, road.points, size, road.closed);
    }
    ctx.restore();

    // ۵. خط‌کشی عابر پیاده (Zebra Crossings) در تقاطع‌ها
    const crosswalks: Array<[number, number, number]> = [
      [-4.8, 4.1, 0.0],
      [4.8, 4.0, 0.0],
      [-14.4, 4.2, 0.05],
      [15.8, 2.9, -0.08],
      [-5.2, -5.2, 0.04],
      [4.5, -5.4, -0.04],
      [-14.8, -6.4, 0.08],
      [16.0, -7.2, -0.08],
      [-4.0, 13.0, 0.02],
      [4.8, 12.9, 0.0],
      [-14.2, 13.4, 0.05],
      [16.2, 13.2, -0.05],
      [-5.2, -1.0, Math.PI * 0.5],
      [5.1, -0.5, Math.PI * 0.5],
      [-14.8, -1.2, Math.PI * 0.5],
      [15.8, -0.6, Math.PI * 0.5],
    ];

    for (const [wx, wz, rot] of crosswalks) {
      const [px, py] = worldToCanvas(wx, wz, size);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillStyle = "#f7f7f2";
      ctx.strokeStyle = "#303030";
      ctx.lineWidth = 1.0;
      for (let s = -15; s <= 15; s += 7.5) {
        ctx.fillRect(s - 2.2, -10, 4.4, 20);
        ctx.strokeRect(s - 2.2, -10, 4.4, 20);
      }
      ctx.restore();
    }

    // ۶. محو شدن تدریجی و نرم خیابان‌های خروجی روی حاشیه نقشه به سمت کاغذ (#ecece8)
    const fadeGrad = ctx.createRadialGradient(
      cx,
      cy,
      24 * pxPerUnit,
      cx,
      cy,
      46 * pxPerUnit
    );
    fadeGrad.addColorStop(0.0, "rgba(236, 236, 232, 0)");
    fadeGrad.addColorStop(0.35, "rgba(236, 236, 232, 0.34)");
    fadeGrad.addColorStop(0.68, "rgba(236, 236, 232, 0.80)");
    fadeGrad.addColorStop(0.9, "rgba(236, 236, 232, 0.98)");
    fadeGrad.addColorStop(1.0, "rgba(236, 236, 232, 1)");
    ctx.fillStyle = fadeGrad;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * تیپ ۱: نمای آرت‌دکو سنگ‌آهکی با ستون‌های عمودی، کتیبه طبقات و پنجره‌های قاب‌دار
 */
function createDecoFacadeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#f4f3ee";
    ctx.fillRect(0, 0, size, size);

    const cols = 6;
    const rows = 9;
    const cellW = size / cols;
    const cellH = size / rows;

    ctx.fillStyle = "#e6e4dc";
    for (let c = 0; c <= cols; c++) {
      ctx.fillRect(c * cellW - 4, 0, 8, size);
    }

    ctx.strokeStyle = "rgba(40, 40, 40, 0.45)";
    ctx.lineWidth = 1.6;
    for (let r = 0; r <= rows; r++) {
      const y = r * cellH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + cellW * 0.22;
        const wy = r * cellH + cellH * 0.18;
        const ww = cellW * 0.56;
        const wh = cellH * 0.64;

        ctx.fillStyle = "#d9dde3";
        ctx.fillRect(wx, wy, ww, wh);

        ctx.strokeStyle = "rgba(45, 45, 45, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(wx + ww * 0.5, wy);
        ctx.lineTo(wx + ww * 0.5, wy + wh);
        ctx.stroke();

        ctx.strokeStyle = "#262626";
        ctx.lineWidth = 2.0;
        ctx.strokeRect(wx, wy, ww, wh);

        ctx.fillStyle = "#262626";
        ctx.fillRect(wx - 2, wy + wh, ww + 4, 2.4);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * تیپ ۲: نمای برج شیشه‌ای کرتن‌وال داون‌تاون لس‌آنجلس
 */
function createCurtainWallFacadeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#e3e8ee";
    ctx.fillRect(0, 0, size, size);

    const cols = 8;
    const rows = 12;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r++) {
      const y = r * cellH;
      ctx.fillStyle = "#c9d0da";
      ctx.fillRect(0, y, size, cellH * 0.24);

      ctx.strokeStyle = "rgba(45, 58, 74, 0.18)";
      ctx.lineWidth = 1.2;
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 3 === 0) {
          const gx = c * cellW + 4;
          const gy = y + cellH * 0.28;
          ctx.beginPath();
          ctx.moveTo(gx, gy + cellH * 0.62);
          ctx.lineTo(gx + cellW - 8, gy);
          ctx.stroke();
        }
      }
    }

    ctx.strokeStyle = "rgba(38, 42, 48, 0.72)";
    ctx.lineWidth = 1.8;
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cellW, 0);
      ctx.lineTo(c * cellW, size);
      ctx.stroke();
    }
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(size, r * cellH);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * تیپ ۳: نمای لافت‌های آرتز دیستریکت و آپارتمان‌های میان‌رده
 */
function createLoftFacadeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#efede7";
    ctx.fillRect(0, 0, size, size);

    const cols = 4;
    const rows = 6;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r++) {
      ctx.strokeStyle = "rgba(44, 44, 44, 0.38)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, r * cellH);
      ctx.lineTo(size, r * cellH);
      ctx.stroke();

      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + cellW * 0.16;
        const wy = r * cellH + cellH * 0.22;
        const ww = cellW * 0.68;
        const wh = cellH * 0.56;

        ctx.fillStyle = "#dce0e5";
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = "#2b2b2b";
        ctx.lineWidth = 2.1;
        ctx.strokeRect(wx, wy, ww, wh);

        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(wx + ww * 0.33, wy);
        ctx.lineTo(wx + ww * 0.33, wy + wh);
        ctx.moveTo(wx + ww * 0.66, wy);
        ctx.lineTo(wx + ww * 0.66, wy + wh);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * تیپ ۴: نمای ساده ویلاها و بنگالوهای حاشیه
 */
function createBungalowFacadeTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#f7f6f2";
    ctx.fillRect(0, 0, size, size);

    const cols = 3;
    const rows = 2;
    const cellW = size / cols;
    const cellH = size / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * cellW + cellW * 0.26;
        const wy = r * cellH + cellH * 0.28;
        const ww = cellW * 0.48;
        const wh = cellH * 0.44;
        ctx.fillStyle = "#dfe2e6";
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = "#2d2d2d";
        ctx.lineWidth = 1.9;
        ctx.strokeRect(wx, wy, ww, wh);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

/**
 * تکسچر پشت‌بام اسکیس معماری
 */
function createVectorRoofTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#f1f1ed";
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "rgba(38, 38, 38, 0.16)";
    for (let i = 0; i < 1100; i++) {
      const rx = (i * 89) % size;
      const ry = (i * 157) % size;
      ctx.fillRect(rx, ry, 1.3, 1.3);
    }

    ctx.strokeStyle = "rgba(38, 38, 38, 0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, size - 12, size - 12);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createCityMaterials(maxAnisotropy: number): CityMaterialPalette {
  const groundTex = createLAStreetMapTexture(maxAnisotropy);
  const facadeDecoTex = createDecoFacadeTexture(maxAnisotropy);
  const facadeCurtainTex = createCurtainWallFacadeTexture(maxAnisotropy);
  const facadeLoftTex = createLoftFacadeTexture(maxAnisotropy);
  const facadeBungalowTex = createBungalowFacadeTexture(maxAnisotropy);
  const roofTex = createVectorRoofTexture();

  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    roughness: 0.96,
    metalness: 0.0,
  });

  const fillerMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: facadeDecoTex,
    roughness: 0.94,
    metalness: 0.0,
  });

  const fillerGlassMat = new THREE.MeshStandardMaterial({
    color: "#f5f7fb",
    map: facadeCurtainTex,
    roughness: 0.72,
    metalness: 0.06,
  });

  const fillerLoftMat = new THREE.MeshStandardMaterial({
    color: "#faf8f3",
    map: facadeLoftTex,
    roughness: 0.95,
    metalness: 0.0,
  });

  const fillerBungalowMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: facadeBungalowTex,
    roughness: 0.96,
    metalness: 0.0,
  });

  const fillerCapMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: roofTex,
    roughness: 0.94,
    metalness: 0.0,
  });

  const fillerRoofSlopeMat = new THREE.MeshStandardMaterial({
    color: "#d8d8d0",
    map: roofTex,
    roughness: 0.92,
    metalness: 0.0,
  });

  const rooftopUnitMat = new THREE.MeshStandardMaterial({
    color: "#dfdfd9",
    roughness: 0.88,
    metalness: 0.04,
  });

  // متریال بزرگراه با vertexColors برای محو شدن تدریجی در حاشیه نقشه بدون نیاز به شیدر اختصاصی
  const freewayDeckMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  });

  const freewayPierMat = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.0,
  });

  const plazaMat = new THREE.MeshStandardMaterial({
    color: "#f4f4ef",
    roughness: 0.92,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const treeMat = new THREE.MeshStandardMaterial({
    color: "#e6ece1",
    roughness: 0.9,
    metalness: 0.0,
  });

  const palmTrunkMat = new THREE.MeshStandardMaterial({
    color: "#4a4842",
    roughness: 0.9,
    metalness: 0.0,
  });

  const palmFrondMat = new THREE.MeshStandardMaterial({
    color: "#76876f",
    roughness: 0.86,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const carMat = new THREE.MeshStandardMaterial({
    color: "#f3f3ef",
    roughness: 0.8,
    metalness: 0.08,
  });

  const humanMat = new THREE.MeshStandardMaterial({
    color: "#222225",
    roughness: 0.78,
    metalness: 0.04,
  });

  // خطوط جوهر استاندارد برای ساختمان‌های شاخص
  const inkLineMat = new THREE.LineBasicMaterial({
    color: "#262626",
    transparent: true,
    opacity: 0.88,
  });

  // خطوط جوهر با vertexColors برای محو شدن تدریجی لبه بیرونی شهر و دو سر بزرگراه به رنگ کاغذ (#ecece8)
  const radialInkLineMat = new THREE.LineBasicMaterial({
    color: "#ffffff",
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  });

  const inkFaintLineMat = new THREE.LineBasicMaterial({
    color: "#525252",
    transparent: true,
    opacity: 0.52,
  });

  const plinthMat = new THREE.MeshStandardMaterial({
    color: "#f3f1ec",
    roughness: 0.88,
    metalness: 0.02,
  });

  const landmarkShellMat = new THREE.MeshStandardMaterial({
    color: "#decbb0",
    map: facadeDecoTex,
    roughness: 0.86,
    metalness: 0.02,
  });

  const landmarkGlassMat = new THREE.MeshStandardMaterial({
    color: "#d4e0ec",
    roughness: 0.42,
    metalness: 0.06,
    transparent: true,
    opacity: 0.9,
  });

  const landmarkRibMat = new THREE.MeshStandardMaterial({
    color: "#b7a58c",
    roughness: 0.82,
    metalness: 0.06,
  });

  const glowCoreMat = new THREE.MeshStandardMaterial({
    color: "#60a5fa",
    emissive: new THREE.Color("#2563eb"),
    emissiveIntensity: 1.25,
    roughness: 0.25,
    metalness: 0.08,
  });

  const conduitBaseMat = new THREE.MeshStandardMaterial({
    color: "#60a5fa",
    emissive: new THREE.Color("#3b82f6"),
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.08,
    transparent: true,
    opacity: 0.82,
  });

  const pulseMat = new THREE.MeshBasicMaterial({
    color: "#e0f2fe",
    transparent: true,
    opacity: 0.98,
  });

  const haloRingMat = new THREE.MeshBasicMaterial({
    color: "#2563eb",
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
  });

  return {
    groundMat,
    groundTex,
    facadeDecoTex,
    facadeCurtainTex,
    facadeLoftTex,
    facadeBungalowTex,
    roofTex,
    fillerMat,
    fillerGlassMat,
    fillerLoftMat,
    fillerBungalowMat,
    fillerCapMat,
    fillerRoofSlopeMat,
    rooftopUnitMat,
    freewayDeckMat,
    freewayPierMat,
    plazaMat,
    treeMat,
    palmTrunkMat,
    palmFrondMat,
    carMat,
    humanMat,
    inkLineMat,
    radialInkLineMat,
    inkFaintLineMat,
    plinthMat,
    landmarkShellMat,
    landmarkGlassMat,
    landmarkRibMat,
    glowCoreMat,
    conduitBaseMat,
    pulseMat,
    haloRingMat,
    dispose: () => {
      groundTex.dispose();
      facadeDecoTex.dispose();
      facadeCurtainTex.dispose();
      facadeLoftTex.dispose();
      facadeBungalowTex.dispose();
      roofTex.dispose();
      groundMat.dispose();
      fillerMat.dispose();
      fillerGlassMat.dispose();
      fillerLoftMat.dispose();
      fillerBungalowMat.dispose();
      fillerCapMat.dispose();
      fillerRoofSlopeMat.dispose();
      rooftopUnitMat.dispose();
      freewayDeckMat.dispose();
      freewayPierMat.dispose();
      plazaMat.dispose();
      treeMat.dispose();
      palmTrunkMat.dispose();
      palmFrondMat.dispose();
      carMat.dispose();
      humanMat.dispose();
      inkLineMat.dispose();
      radialInkLineMat.dispose();
      inkFaintLineMat.dispose();
      plinthMat.dispose();
      landmarkShellMat.dispose();
      landmarkGlassMat.dispose();
      landmarkRibMat.dispose();
      glowCoreMat.dispose();
      conduitBaseMat.dispose();
      pulseMat.dispose();
      haloRingMat.dispose();
    },
  };
}
