"use client";

import * as React from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* ═══════════════════════════════════════════════════════════════════════════
   ParticleSphereCanvas — موتور WebGL صحنه «Particle Sphere 5» با رفلکس HDRI
   ───────────────────────────────────────────────────────────────────────────
   • رندر مستقیم بدون iframe با پشتیبانی کامل از تمام تنظیمات Particle Sphere 5
   • متریال شیشه واقع‌گرایانه با محیط HDRI استودیویی (فقط رفلکس روی شیشه،
     بدون نمایش HDRI در پس‌زمینه — پس‌زمینه شفاف با گوی‌های تعاملی)
   • ذرات کم‌پولی سه‌بعدی Instanced (نقطه / هشت‌وجهی / بیست‌وجهی) + هم‌محور کامل
     با کره (spx, spy, spz)
   • محصورسازی قطعی ذرات درون کره (r <= Ri) و تبعیت کامل نوشته و مدل از مکان کره
   ═══════════════════════════════════════════════════════════════════════════ */

export type SphereSettings = Record<string, string | number | boolean>;

export type ParticleSphereHandle = {
  stepScene: (dir: number) => void;
  goScene: (index: number) => void;
  getSceneCount: () => number;
};

type Props = {
  settings?: SphereSettings | null;
  fetchConfig?: boolean;
  interactiveScrollScenes?: boolean;
  scrollDrivenScenes?: boolean;
  heroZoomLayer?: boolean;
  onScenesCountChange?: (count: number) => void;
  onActiveSceneChange?: (index: number, label: string) => void;
  className?: string;
};

type CompiledModel = {
  t: Float32Array;
  cum: Float64Array;
  sum: number;
  nt: number;
};

type SceneItem = { t?: string; m?: CompiledModel };

const DEFAULT_SETTINGS = {
  texts: "CAD\nBIM\nAI",
  showModel: true,
  modelDataUri: "",
  rm: 1,
  sp: 1.5,
  rk: 5.5,
  sr: 1.55,
  ss: 5.2,
  al: 0,
  ps: 0.75,
  dp: 0.25,
  pm: 1,
  sat: 1,
  ac: "#4c8694",
  gl: 0,
  fl: 0.85,
  df: 1,
  gr: 0.08,
  vg: 0,
  sk: true,
  ml: true,
  sz: 5,
  spx: 0,
  spy: -3.8,
  spz: 0,
  gpr: 2,
  gcm: true,
  gc1: "#ff9d7d",
  gc2: "#ffd6dc",
  ga: 0.05,
  gp: 3.4,
  gk: 0.55,
  gsp: 0,
  gsh: 40,
  gin: 1,
  ghd: 0.44,
  ghr: 25,
  gfr: 0,
  fs: 1.26,
  ms: 1,
  tpx: 0,
  tpy: 1.7,
  tpz: 0,
  mpx: 0,
  mpy: 2.75,
  mpz: 0,
  bm: 2,
  b1: "#c99673",
  b2: "#ffffff",
  ba: 165,
  fd: 1,
  fh: 43,
  fm: false,
  fc: "#ffffff",
  ob: 0.39,
  os: 44,
  olg: 3.4,
  obl: 0,
  oc1: "#ffffff",
  oc2: "#ffae00",
  bp: 1,
  au: true,
  ai: 6,
};

const R = 3;

const NOISE_SVG_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Generates an equirectangular procedural Studio HDRI texture in memory
 * (overhead softbox dome + tall key architectural window + rim strip + horizon bounce).
 * Alpha channel carries encoded HDR energy multiplier so softboxes shimmer realistically
 * on curved glass without showing any background image in the scene.
 */
function createStudioHdriTexture(): THREE.DataTexture {
  const W = 512;
  const H = 256;
  const data = new Uint8Array(W * H * 4);

  const smoothstep = (e0: number, e1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };

  for (let y = 0; y < H; y++) {
    const v = (y + 0.5) / H; // 0 = bottom, 1 = zenith
    const lat = (v - 0.5) * Math.PI;
    const up = Math.sin(lat);

    for (let x = 0; x < W; x++) {
      const u = (x + 0.5) / W;

      // Deep dark studio cyclorama between softboxes so reflections have high-contrast optical clarity
      const horizonBounce = smoothstep(-0.28, 0.05, up) * (1 - smoothstep(0.05, 0.42, up));
      let r = 0.025 + 0.14 * horizonBounce;
      let g = 0.028 + 0.15 * horizonBounce;
      let b = 0.036 + 0.18 * horizonBounce;
      let hdrBoost = 0.04 + 0.14 * horizonBounce;

      // Overhead crisp studio ceiling diffuser arc (azimuth-isotropic near zenith pole to avoid equirectangular pinch)
      const poleFade = 1 - smoothstep(0.82, 0.96, up);
      const azBias = 1 + (0.38 + 0.62 * Math.max(0, Math.cos((u - 0.34) * Math.PI * 2)) - 1) * poleFade;
      const overheadArc = smoothstep(0.56, 0.78, up) * azBias;
      const ov = Math.max(0, overheadArc);
      r += ov * 0.96;
      g += ov * 0.95;
      b += ov * 0.92;
      hdrBoost += ov * 0.85;

      // Key architectural softbox window (left) with sharp crisp edges & interior mullion divider
      const duKey = Math.abs(((u - 0.21 + 1.5) % 1) - 0.5);
      const keyRect =
        (1 - smoothstep(0.062, 0.078, duKey)) *
        smoothstep(-0.12, -0.02, up) *
        (1 - smoothstep(0.52, 0.62, up));
      if (keyRect > 0.001) {
        const mullionH = Math.exp(-Math.pow((up - 0.24) * 30, 2)) * 0.82;
        const mullionV = Math.exp(-Math.pow(duKey * 120, 2)) * 0.55;
        const pane = keyRect * (1 - Math.max(mullionH, mullionV));
        r += pane * 1.0;
        g += pane * 0.99;
        b += pane * 0.98;
        hdrBoost += pane * 1.0;
      }

      // Cool right architectural rim strip
      const duRim = Math.abs(((u - 0.74 + 1.5) % 1) - 0.5);
      const rimRect =
        (1 - smoothstep(0.026, 0.042, duRim)) *
        smoothstep(-0.22, -0.08, up) *
        (1 - smoothstep(0.42, 0.56, up));
      r += rimRect * 0.86;
      g += rimRect * 0.93;
      b += rimRect * 1.0;
      hdrBoost += rimRect * 0.92;

      // Crisp small back kicker specular strip
      const duBack = Math.abs(((u - 0.52 + 1.5) % 1) - 0.5);
      const backSpot =
        (1 - smoothstep(0.018, 0.036, duBack)) *
        smoothstep(0.32, 0.44, up) *
        (1 - smoothstep(0.6, 0.72, up));
      r += backSpot * 0.98;
      g += backSpot * 0.92;
      b += backSpot * 0.88;
      hdrBoost += backSpot * 0.78;

      const idx = (y * W + x) * 4;
      data[idx] = Math.min(255, Math.max(0, Math.round(r * 255)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
      data[idx + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
      data[idx + 3] = Math.min(255, Math.max(0, Math.round(Math.min(1, hdrBoost) * 255)));
    }
  }

  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export const ParticleSphereCanvas = React.forwardRef<ParticleSphereHandle, Props>(
  function ParticleSphereCanvas(
    {
      settings,
      fetchConfig = false,
      interactiveScrollScenes = false,
      scrollDrivenScenes = false,
      heroZoomLayer = false,
      onScenesCountChange,
      onActiveSceneChange,
      className = "",
    },
    ref
  ) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const ob1Ref = React.useRef<HTMLDivElement>(null);
    const ob2Ref = React.useRef<HTMLDivElement>(null);
    const fadeRef = React.useRef<HTMLDivElement>(null);
    const vigRef = React.useRef<HTMLDivElement>(null);
    const grainRef = React.useRef<HTMLDivElement>(null);

    const onScenesCountChangeRef = React.useRef(onScenesCountChange);
    onScenesCountChangeRef.current = onScenesCountChange;
    const onActiveSceneChangeRef = React.useRef(onActiveSceneChange);
    onActiveSceneChangeRef.current = onActiveSceneChange;

    const apiRef = React.useRef<{
      applyExternal: (cfg: SphereSettings, isLive: boolean) => void;
      step: (dir: number) => void;
      go: (idx: number, fast?: number) => void;
      getCount: () => number;
    } | null>(null);

    const initialSettingsRef = React.useRef(settings);
    const hasLiveOverrideRef = React.useRef(Boolean(settings));

    React.useImperativeHandle(
      ref,
      () => ({
        stepScene: (dir: number) => apiRef.current?.step(dir),
        goScene: (index: number) => apiRef.current?.go(index),
        getSceneCount: () => apiRef.current?.getCount() ?? 4,
      }),
      []
    );

    React.useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      THREE.ColorManagement.enabled = false;

      const isCoarse =
        typeof window !== "undefined" &&
        window.matchMedia("(pointer:coarse)").matches;
      const N = isCoarse ? 14000 : 24000;

      const o = {
        ...DEFAULT_SETTINGS,
        ...(initialSettingsRef.current ?? {}),
      };
      // Handle legacy gx/gy/gz if passed directly
      if (initialSettingsRef.current) {
        if ("gx" in initialSettingsRef.current && !("spx" in initialSettingsRef.current)) {
          o.spx = Number(initialSettingsRef.current.gx) || 0;
        }
        if ("gy" in initialSettingsRef.current && !("spy" in initialSettingsRef.current)) {
          o.spy = Number(initialSettingsRef.current.gy) || 0;
        }
        if ("gz" in initialSettingsRef.current && !("spz" in initialSettingsRef.current)) {
          o.spz = Number(initialSettingsRef.current.gz) || 0;
        }
      }

      const toNum = (v: unknown, fb: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : fb;
      };
      const toBoolNum = (v: unknown) => (v === true || v === 1 || v === "1" ? 1 : 0);

      let txText = String(o.texts || "CAD\nBIM\nAI");
      let showModel = Boolean(o.showModel);
      let currentModelUri = "";

      let rd: THREE.WebGLRenderer | null = null;
      let isSoftwareGl = false;
      try {
        rd = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
      } catch {
        try {
          rd = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
        } catch {
          rd = null;
        }
      }

      if (rd) {
        rd.setClearColor(0x000000, 0);
        try {
          const gl = rd.getContext();
          const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
          const rendererName = dbg ? gl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
          if (
            /SwiftShader|llvmpipe|Software Rasterizer|Microsoft Basic Render/i.test(
              String(rendererName)
            )
          ) {
            isSoftwareGl = true;
          }
        } catch {
          // Ignore renderer probe error
        }
      }

      const updateOrbSizes = () => {
        const w = Math.max(container.clientWidth, 1);
        const h = Math.max(container.clientHeight, 1);
        const r = (toNum(o.os, 24) * Math.min(w, h)) / 200;
        if (ob1Ref.current) {
          ob1Ref.current.style.width = `${2 * r}px`;
          ob1Ref.current.style.height = `${2 * r}px`;
        }
        if (ob2Ref.current) {
          ob2Ref.current.style.width = `${3.4 * r}px`;
          ob2Ref.current.style.height = `${3.4 * r}px`;
        }
        return r;
      };

      const applyVisualLayers = () => {
        if (vigRef.current) vigRef.current.style.opacity = String(toNum(o.vg, 0.73));
        if (grainRef.current) grainRef.current.style.opacity = String(toNum(o.gr, 0.41));

        const isDark =
          typeof document !== "undefined" &&
          document.documentElement.classList.contains("dark");
        const m = toNum(o.bm, 0);
        const b1 = String(o.b1 || "#c6c6c6");
        const b2 = String(o.b2 || "#7a7a7a");
        const ba = toNum(o.ba, 165);
        const bot = m === 1 ? b1 : m === 2 ? b2 : "#7a7a7a";

        if (isDark) {
          container.style.backgroundImage = `linear-gradient(${ba}deg, #1a1514, #0c0d10)`;
          container.style.backgroundColor = "#0c0d10";
        } else {
          container.style.backgroundImage =
            m === 1
              ? "none"
              : m === 2
                ? `linear-gradient(${ba}deg, ${b1}, ${b2})`
                : "linear-gradient(165deg, #c6c6c6, #7a7a7a)";
          container.style.backgroundColor = m === 1 ? b1 : "";
        }
        container.style.backgroundSize = "130% 130%";
        container.style.backgroundRepeat = "no-repeat";

        if (fadeRef.current) {
          fadeRef.current.style.height = `${toNum(o.fh, 28)}%`;
          fadeRef.current.style.opacity = String(toNum(o.fd, 0.45));
          const fc = isDark
            ? "#0c0d10"
            : toBoolNum(o.fm)
              ? bot
              : String(o.fc || "#ffffff");
          fadeRef.current.style.background = `linear-gradient(to top, ${fc}, transparent)`;
        }

        const oc1 = String(o.oc1 || "#ffffff");
        const oc2 = String(o.oc2 || "#9db4ff");
        const obl = toNum(o.obl, 40);
        if (ob1Ref.current) {
          ob1Ref.current.style.background = `radial-gradient(circle, ${oc1} 0%, transparent 68%)`;
          ob1Ref.current.style.filter = `blur(${obl}px)`;
        }
        if (ob2Ref.current) {
          ob2Ref.current.style.background = `radial-gradient(circle, ${oc2} 0%, transparent 68%)`;
          ob2Ref.current.style.filter = `blur(${obl * 1.4}px)`;
        }
        updateOrbSizes();
      };

      // 2D Canvas fallback only if WebGL completely fails
      if (!rd) {
        applyVisualLayers();
        const ctx = canvas.getContext("2d");
        let rafId = 0;
        const drawFallback = (ts: number) => {
          const w = Math.max(container.clientWidth, 1);
          const h = Math.max(container.clientHeight, 1);
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          if (ctx) {
            ctx.clearRect(0, 0, w, h);
            const rad = Math.min(w, h) * 0.34;
            const cx = w / 2;
            const cy = h / 2;
            const grad = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.35, rad * 0.08, cx, cy, rad);
            grad.addColorStop(0, "rgba(255,255,255,0.45)");
            grad.addColorStop(0.55, "rgba(200,210,225,0.12)");
            grad.addColorStop(0.92, "rgba(255,255,255,0.48)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "rgba(255,255,255,0.6)";
            ctx.stroke();

            const firstLine = txText.split("\n").map((s) => s.trim()).filter(Boolean)[0] || "CAD";
            ctx.fillStyle = `rgba(36, 56, 128, ${0.8 + 0.15 * Math.sin(ts * 0.002)})`;
            ctx.font = `800 ${Math.round(rad * 0.42)}px Tahoma, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(firstLine, cx, cy);
          }
          rafId = requestAnimationFrame(drawFallback);
        };
        rafId = requestAnimationFrame(drawFallback);
        return () => cancelAnimationFrame(rafId);
      }

      const sc = new THREE.Scene();
      sc.background = null; // Studio HDRI is NEVER shown in background

      const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      const U = {
        uS: { value: toNum(o.ps, 0.35) },
        uK: { value: 1 },
        uT: { value: 0 },
        uGl: { value: toNum(o.gl, 0.46) },
        uFl: { value: toNum(o.fl, 0.85) },
        uDf: { value: toNum(o.df, 0) },
        uF: { value: 14 },
        uPx: { value: 0.001 },
      };

      const studioHdri = createStudioHdriTexture();

      // Master group positioned at (spx, spy, spz) so sphere, halo, particles, text & 3D model move together
      const sphereGroup = new THREE.Group();
      sc.add(sphereGroup);

      // Inner rotating group holds BOTH flat points (pts) and 3D instanced low-poly balls (bm)
      const innerGroup = new THREE.Group();
      sphereGroup.add(innerGroup);

      // Realistic optical glass sphere with procedural studio HDRI reflections (zero background skybox leak)
      const glassGeo = new THREE.SphereGeometry(R, 72, 54);
      const glassMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uC: { value: new THREE.Color("#d9dde3") },
          uR: { value: new THREE.Color("#ffffff") },
          uA: { value: 0.28 },
          uL: { value: new THREE.Vector3(-0.5, 0.7, 0.6) },
          uW: { value: new THREE.Vector4() },
          uP: { value: 2.2 },
          uK2: { value: 0.6 },
          uSp: { value: 1.0 },
          uSh: { value: 48.0 },
          uIn: { value: 1.0 },
          uFr: { value: 0.0 },
          uEnv: { value: studioHdri },
          uHdri: { value: 1.15 },
          uHdriRot: { value: THREE.MathUtils.degToRad(25) },
        },
        vertexShader: `
          varying vec3 vNormalView, vViewDir, vWorldNormal, vWorldPos, vLocalPos;
          void main() {
            vLocalPos = position;
            vNormalView = normalize(normalMatrix * normal);
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vec4 mvPos = viewMatrix * worldPos;
            vViewDir = -mvPos.xyz;
            gl_Position = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          #define PI 3.14159265359
          uniform vec3 uC, uR, uL;
          uniform vec4 uW;
          uniform float uA, uP, uK2, uSp, uSh, uIn, uFr, uHdri, uHdriRot;
          uniform sampler2D uEnv;
          varying vec3 vNormalView, vViewDir, vWorldNormal, vWorldPos, vLocalPos;

          float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }

          vec3 rotY(vec3 d, float ang) {
            float c = cos(ang), s = sin(ang);
            return vec3(d.x * c - d.z * s, d.y, d.x * s + d.z * c);
          }

          vec3 sampleStudio(vec3 dir) {
            vec3 d = normalize(rotY(dir, uHdriRot));
            float u = atan(d.z, d.x) / (2.0 * PI) + 0.5;
            float v = asin(clamp(d.y, -1.0, 1.0)) / PI + 0.5;
            vec4 tex = texture2D(uEnv, vec2(u, v));
            // Decode HDR energy encoded in alpha channel
            return tex.rgb * (0.55 + tex.a * 2.65);
          }

          void main() {
            vec3 Nv = normalize(vNormalView);
            vec3 Vv = normalize(vViewDir);
            vec3 Nw = normalize(vWorldNormal);
            vec3 Vw = normalize(cameraPosition - vWorldPos);

            // Micro-roughness normal perturbation when frost > 0
            float grain = hash21(floor(gl_FragCoord.xy * 0.75)) - 0.5;
            vec3 Np = normalize(Nv + vec3(grain, -grain, grain * 0.4) * uFr * 0.24);
            vec3 Nwp = normalize(Nw + vec3(grain, -grain, grain * 0.4) * uFr * 0.24);

            float ndv = clamp(abs(dot(Np, Vv)), 0.0, 1.0);
            float f = pow(1.0 - ndv, max(0.35, uP));
            // Physical dielectric optical glass Schlick Fresnel (F0 = 0.04)
            float schlick = 0.04 + 0.96 * pow(1.0 - ndv, max(1.0, uP * 1.6));

            // Studio HDRI primary reflection + curved back-wall refraction near grazing edge
            vec3 Rdir = reflect(-Vw, Nwp);
            vec3 Tdir = refract(-Vw, -Nwp, 0.92);
            vec3 envSharp = sampleStudio(Rdir);
            vec3 envRefract = sampleStudio(Tdir);
            vec3 envSoft = (
              sampleStudio(Rdir + vec3(0.055, 0.038, 0.0)) +
              sampleStudio(Rdir + vec3(-0.055, -0.038, 0.0)) +
              sampleStudio(Rdir + vec3(0.0, 0.048, 0.048))
            ) / 3.0;
            vec3 envCol = mix(envSharp, envSoft, clamp(uFr * 0.95 + 0.04, 0.0, 1.0));
            envCol = mix(envCol, envRefract, (1.0 - ndv) * 0.28);

            // Chromatic grazing dispersion on curved glass rim
            float disp = (1.0 - ndv) * 0.028;
            vec3 envChromatic = vec3(
              sampleStudio(Rdir + vec3(disp, 0.0, 0.0)).r,
              envCol.g,
              sampleStudio(Rdir - vec3(disp, 0.0, 0.0)).b
            );
            envCol = mix(envCol, envChromatic, 0.62) * uHdri;

            // Directional studio key & rim glints
            float shin = mix(max(8.0, uSh * 1.15), 12.0, uFr * 0.85);
            float s = pow(max(dot(reflect(-normalize(uL), Np), Vv), 0.0), shin) * uSp;
            float s2 = pow(max(dot(reflect(-normalize(vec3(0.62, -0.42, 0.55)), Np), Vv), 0.0), shin * 0.55) * uSp * 0.34;

            // Internal glass volume tint & grazing depth
            float h = smoothstep(-0.2, 1.0, Np.y * 0.5 - Np.x * 0.3 + 0.5);
            vec3 body = uC * (1.0 - 0.22 * uIn + 0.34 * uIn * h);
            body = mix(body, mix(uC, vec3(0.96), 0.42), uFr * (0.4 + 0.35 * (1.0 - ndv)));

            // Shockwave ring centered on local sphere coordinates
            float q = (length(vLocalPos.xy - uW.xy) - uW.z * 7.0) * 3.0;
            float rg = exp(-q * q) * max(0.0, 1.0 - uW.z * 1.1) * uW.w;

            // Keep center crystal-clear optical glass while HDRI softboxes, refraction & Fresnel rim pop cleanly
            vec3 glassTint = mix(body, uR, f);
            float envLuma = dot(envCol, vec3(0.299, 0.587, 0.114));
            float reflWeight = 0.22 + schlick * 0.98;
            vec3 finalRgb = glassTint * (0.55 + 0.45 * f) + envCol * reflWeight + vec3(s * 0.78 + s2) + uR * rg * 0.55;

            float centerAlpha = uA * (0.045 + uFr * 0.42);
            float reflAlpha = schlick * (0.28 + envLuma * 0.38 * uHdri) + envLuma * (0.14 + 0.22 * uA);
            float rimAlpha = f * max(0.18, uK2) * 0.88;
            float alpha = clamp(centerAlpha + reflAlpha + rimAlpha + (s + s2) * 0.56 + rg * 0.45, 0.0, 0.96);

            gl_FragColor = vec4(finalRgb, alpha);
          }
        `,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.renderOrder = 2;
      sphereGroup.add(glass);

      // Particle buffers
      const P = new Float32Array(N * 3);
      const V = new Float32Array(N * 3);
      const T = new Float32Array(N * 3);
      const T2 = new Float32Array(N * 3);
      const ph = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      const sd = new Float32Array(N);
      const tw = new Float32Array(N);
      const cl = new Uint8Array(N);
      const dl = new Float32Array(N);
      const pd = new Uint8Array(N);
      const ac = new Uint8Array(N);
      const VL = new Float32Array(N);
      const AX = new Float32Array(N * 3);
      const tg = new Uint8Array(N);
      const SCa = new Float32Array(2);
      const OFa = new Float32Array(6);

      const cs = Math.cos(0.8);
      const sn = Math.sin(0.8);
      const initR = Math.max(0.5, toNum(o.sz, 3)) * 0.92;
      // Spawn ALL initial particles inside sphere radius so none are ever outside the glass
      for (let i = 0; i < N; i++) {
        const r = Math.random();
        const c = r < 0.4 ? 0 : r < 0.7 ? 1 : r < 0.9 ? 2 : 3;
        cl[i] = c;
        tw[i] = c === 2 ? 1 : 0;
        sd[i] = Math.random();
        for (let k = 0; k < 3; k++) ph[i * 3 + k] = Math.random() * 6.283;
        const rr = (0.18 + Math.pow(Math.random(), 0.75) * 0.74) * initR;
        const a = Math.random() * 6.283 + rr * 0.6;
        const w = 0.5477;
        const x = rr * Math.cos(a);
        const y = (Math.random() - 0.5) * rr * 0.28;
        const z = rr * Math.sin(a);
        const vx = -w * z;
        const vz = w * x;
        P.set([x, y * cs - z * sn, y * sn + z * cs], i * 3);
        V.set([vx, -vz * sn, vz * cs], i * 3);
        ac[i] = 2; // immediately trapped inside sphere
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute("col", new THREE.BufferAttribute(col, 3));
      g.setAttribute("sd", new THREE.BufferAttribute(sd, 1));
      g.setAttribute("tw", new THREE.BufferAttribute(tw, 1));
      g.setAttribute("vl", new THREE.BufferAttribute(VL, 1).setUsage(THREE.DynamicDrawUsage));

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: U,
        vertexShader: `
          attribute vec3 col;
          attribute float sd, tw, vl;
          uniform float uS, uK, uT, uGl, uFl, uDf, uF;
          varying vec3 c;
          varying float a, b, gg;
          void main() {
            float f = min(vl * uFl * 0.3, 1.5);
            a = (tw > 0.5 ? 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * (1.5 + sd * 4.0) + sd * 60.0), 2.0) : 1.0) * (1.0 + f * 0.4);
            c = mix(col, vec3(1.0), min(f, 1.0) * 0.6);
            vec4 m = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * m;
            b = uDf * abs(-m.z - uF) * 0.45;
            gg = tw * uGl;
            gl_PointSize = uS * uK * (0.75 + sd * sd * 1.6) * (1.0 + f * 1.1) * (1.0 + gg * 3.5) * (1.0 + b * 1.6) * 14.0 / -m.z;
          }
        `,
        fragmentShader: `
          varying vec3 c;
          varying float a, b, gg;
          void main() {
            vec2 p = abs(gl_PointCoord - 0.5);
            float d = max(p.x, p.y), r = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float sq = 1.0 - smoothstep(0.36, 0.5, d);
            float so = exp(-r * r * 16.0) * (1.0 - smoothstep(0.42, 0.5, r));
            gl_FragColor = vec4(c, a * mix(sq, so, clamp(gg + b, 0.0, 1.0)) * 0.96 / (1.0 + b * 1.2));
          }
        `,
      });
      const pts = new THREE.Points(g, mat);
      pts.frustumCulled = false;
      pts.renderOrder = 1;

      // Instanced 3D low-poly ball particles (6 or 12 shared vertices per ball, lit per vertex)
      const ib = (a: Float32Array, n: number) => new THREE.InstancedBufferAttribute(a, n);
      const iaO = ib(P, 3).setUsage(THREE.DynamicDrawUsage);
      const iaV = ib(VL, 1).setUsage(THREE.DynamicDrawUsage);
      const iaC = ib(col, 3);
      const iaS = ib(sd, 1);
      const iaT = ib(tw, 1);

      const mkLowPoly = (v: number[][], f: number[][]) => {
        const b = new THREE.BufferGeometry();
        const a = new Float32Array(v.length * 3);
        v.forEach((p, idx) => {
          const l = Math.hypot(p[0], p[1], p[2]);
          a.set([p[0] / l, p[1] / l, p[2] / l], idx * 3);
        });
        b.setAttribute("position", new THREE.BufferAttribute(a, 3));
        b.setIndex(f.flat());
        const ig = new THREE.InstancedBufferGeometry();
        ig.index = b.index;
        ig.setAttribute("position", b.attributes.position);
        ig.setAttribute("off", iaO);
        ig.setAttribute("col", iaC);
        ig.setAttribute("sd", iaS);
        ig.setAttribute("tw", iaT);
        ig.setAttribute("vl", iaV);
        ig.instanceCount = N;
        return ig;
      };

      const phi = (1 + Math.sqrt(5)) / 2;
      const gI = mkLowPoly(
        [
          [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
          [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
          [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
        ],
        [
          [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
          [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
          [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
          [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
        ]
      );
      const gO = mkLowPoly(
        [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]],
        [
          [0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4],
          [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5],
        ]
      );

      const bmMat = new THREE.ShaderMaterial({
        uniforms: U,
        side: THREE.DoubleSide,
        vertexShader: `
          attribute vec3 off, col;
          attribute float sd, tw, vl;
          uniform float uS, uT, uFl, uPx;
          varying vec3 c;
          void main() {
            float f = min(vl * uFl * 0.3, 1.5);
            vec4 m = modelViewMatrix * vec4(off, 1.0);
            float r = max(uS * 0.0136 * (0.7 + sd * sd * 1.6) * (1.0 + f * 1.1), 0.75 * uPx * (-m.z));
            float lam = 0.5 + 0.5 * dot(position, normalize(vec3(-0.4, 0.6, 0.7)));
            float pu = tw > 0.5 ? 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uT * (1.5 + sd * 4.0) + sd * 60.0), 2.0) : 1.0;
            c = mix(col, vec3(1.0), min(f, 1.0) * 0.6) * (0.52 + 0.72 * lam) * pu;
            m.xyz += position * r;
            gl_Position = projectionMatrix * m;
          }
        `,
        fragmentShader: `
          varying vec3 c;
          void main() {
            gl_FragColor = vec4(c, 1.0);
          }
        `,
      });
      const bm = new THREE.Mesh(gI, bmMat);
      bm.frustumCulled = false;
      bm.renderOrder = 1;

      if (isSoftwareGl) {
        const swCount = Math.min(N, 3200);
        g.setDrawRange(0, swCount);
        gI.instanceCount = swCount;
        gO.instanceCount = swCount;
      }

      // Both particle representations share innerGroup rotation + sphereGroup (spx, spy, spz)
      innerGroup.add(pts, bm);

      // Halo sparkles outside sphere rim
      const M = 4200;
      const H = new Float32Array(M * 3);
      const hs = new Float32Array(M);
      const tf: [number, number][] = [];
      for (let t = 0; t < 70; t++) tf.push([Math.random() * 6.283, 0.1 + Math.random() * 0.22]);
      const gs = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
      for (let i = 0; i < M; i++) {
        let a: number;
        let h: number;
        if (i < M * 0.85) {
          const f = tf[i % 70];
          const t = Math.pow(Math.random(), 1.7);
          a = f[0] + gs() * (0.015 + 0.1 * t);
          h = 0.04 + t * f[1];
        } else {
          a = Math.random() * 6.283;
          h = 0.04 + Math.pow(Math.random(), 2) * 0.38;
        }
        const r = R * (1 + h);
        H[i * 3] = r * Math.cos(a);
        H[i * 3 + 1] = r * Math.sin(a);
        H[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        hs[i] = Math.random();
      }
      const hg = new THREE.BufferGeometry();
      hg.setAttribute("position", new THREE.BufferAttribute(H, 3));
      hg.setAttribute("sd", new THREE.BufferAttribute(hs, 1));
      const hm = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uK: U.uK, uT: U.uT, uE: { value: 0 }, uM: { value: new THREE.Vector3() } },
        vertexShader: `
          attribute float sd;
          uniform float uT, uK, uE;
          uniform vec3 uM;
          varying float a;
          void main() {
            vec3 p = position;
            float w = sd * 50.0;
            p += normalize(p) * sin(uT * 0.7 + w) * 0.06 + vec3(sin(uT * 0.9 + w * 1.3), cos(uT * 0.8 + w * 0.7), sin(uT * 0.6 + w)) * 0.05;
            vec2 q = p.xy - uM.xy;
            p.xy += normalize(q + 1e-4) * smoothstep(1.4, 0.0, length(q)) * uE * 1.2;
            a = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uT * (2.0 + sd * 5.0) + sd * 90.0), 2.0);
            vec4 m = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * m;
            gl_PointSize = uK * (0.5 + sd * sd * 1.1) * 14.0 / -m.z;
          }
        `,
        fragmentShader: `
          varying float a;
          void main() {
            vec2 p = abs(gl_PointCoord - 0.5);
            float d = max(p.x, p.y);
            if (d > 0.5) discard;
            gl_FragColor = vec4(1.0, 1.0, 1.0, a * 0.9 * (1.0 - smoothstep(0.36, 0.5, d)));
          }
        `,
      });
      const halo = new THREE.Points(hg, hm);
      halo.frustumCulled = false;
      sphereGroup.add(halo);

      const paint = () => {
        const gv = [0.08, 0.28, 1, 0.52];
        const k = glass.material.uniforms;
        const sat = toNum(o.sat, 1);
        const tc = new THREE.Color(String(o.ac || "#3d6eff"));
        for (let i = 0; i < N; i++) {
          const v = gv[cl[i]];
          const q = cl[i] === 2 ? 0 : sat;
          const t = 0.35 + 0.65 * v;
          const j = i * 3;
          col[j] = v * (1 - q) + q * tc.r * t;
          col[j + 1] = v * (1 - q) + q * tc.g * t;
          col[j + 2] = v * (1 - q) + q * tc.b * t;
        }
        g.attributes.col.needsUpdate = true;
        iaC.needsUpdate = true;

        const ga = toNum(o.ga, 1);
        if (toBoolNum(o.gcm)) {
          k.uC.value.set(String(o.gc1 || "#d9dde3"));
          k.uR.value.set(String(o.gc2 || "#ffffff"));
        } else {
          k.uC.value.setScalar(0.66);
          k.uR.value.setScalar(0.98);
        }
        k.uA.value = ga <= 0.005 ? 0 : 0.28 * (0.35 + ga * 1.3);
        k.uP.value = toNum(o.gp, 2.2);
        k.uK2.value = toNum(o.gk, 0.6);
        k.uSp.value = toNum(o.gsp, 1);
        k.uSh.value = toNum(o.gsh, 48);
        k.uIn.value = toNum(o.gin, 1);
        k.uFr.value = toNum(o.gfr, 0);
        k.uHdri.value = toNum(o.ghd, 1.15);
        k.uHdriRot.value = THREE.MathUtils.degToRad(toNum(o.ghr, 25));
      };

      const setAxes = () => {
        const m = toNum(o.rm, 1);
        for (let i = 0; i < N; i++) {
          let x = 0;
          let y = 0;
          let z = 0;
          if (m === 1) z = 1;
          else if (m === 2) {
            y = cs;
            z = sn;
          } else if (m === 3) {
            z = 1 - (2 * (i + 0.5)) / N;
            const r = Math.sqrt(1 - z * z);
            const t = i * 2.399963;
            x = r * Math.cos(t);
            y = r * Math.sin(t);
          }
          AX[i * 3] = x;
          AX[i * 3 + 1] = y;
          AX[i * 3 + 2] = z;
        }
      };

      paint();
      setAxes();

      const tText = (s: string, d: number) => {
        const W = 1400;
        const H = 420;
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const x = c.getContext("2d", { willReadFrequently: true });
        if (!x) return new Float32Array(N * 3);
        const F = '800 300px Tahoma,"Segoe UI",system-ui,sans-serif';
        x.font = F;
        const fs = 300 * Math.min(1, (W - 90) / Math.max(1, x.measureText(s).width));
        x.font = F.replace("300", fs.toFixed(0));
        x.textAlign = "center";
        x.textBaseline = "middle";
        x.fillText(s, W / 2, H / 2);
        const D = x.getImageData(0, 0, W, H).data;
        const a: number[] = [];
        let x0 = W;
        let x1 = 0;
        let y0 = H;
        let y1 = 0;
        for (let p = 0; p < W * H; p++) {
          if (D[p * 4 + 3] > 128) {
            a.push(p);
            const px = p % W;
            const py = (p / W) | 0;
            if (px < x0) x0 = px;
            if (px > x1) x1 = px;
            if (py < y0) y0 = py;
            if (py > y1) y1 = py;
          }
        }
        if (!a.length) {
          a.push(0);
          x1 = 1;
          y1 = 1;
        }
        const u = Math.min((R * 1.48) / (x1 - x0 + 1), (R * 0.78) / (y1 - y0 + 1));
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        const r = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          const p = a[(Math.random() * a.length) | 0];
          r[i * 3] = (p % W - cx + Math.random() - 0.5) * u;
          r[i * 3 + 1] = -(((p / W) | 0) - cy + Math.random() - 0.5) * u;
          r[i * 3 + 2] =
            Math.random() < 0.55
              ? Math.random() < 0.5
                ? -d / 2
                : d / 2
              : (Math.random() - 0.5) * d;
        }
        return r;
      };

      const mkModel = (obj: THREE.Object3D): CompiledModel => {
        obj.updateMatrixWorld(true);
        const a: number[] = [];
        const v = new THREE.Vector3();
        obj.traverse((m) => {
          const mesh = m as THREE.Mesh;
          if (!mesh.isMesh || !mesh.geometry?.attributes?.position) return;
          const p = mesh.geometry.attributes.position;
          const ix = mesh.geometry.index;
          const n = ix ? ix.count : p.count;
          for (let i = 0; i < n; i++) {
            v.fromBufferAttribute(p, ix ? ix.getX(i) : i).applyMatrix4(mesh.matrixWorld);
            a.push(v.x, v.y, v.z);
          }
        });
        if (!a.length) {
          const fallbackGeo = new THREE.TorusKnotGeometry(1, 0.32, 220, 24);
          const out = mkModel(new THREE.Mesh(fallbackGeo));
          fallbackGeo.dispose();
          return out;
        }
        const t = new Float32Array(a);
        const mn = [1e9, 1e9, 1e9];
        const mx = [-1e9, -1e9, -1e9];
        for (let i = 0; i < t.length; i++) {
          const k = i % 3;
          mn[k] = Math.min(mn[k], t[i]);
          mx[k] = Math.max(mx[k], t[i]);
        }
        const c = mn.map((q, k) => (q + mx[k]) / 2);
        let rad = 1e-6;
        for (let i = 0; i < t.length; i += 3) {
          rad = Math.max(rad, Math.hypot(t[i] - c[0], t[i + 1] - c[1], t[i + 2] - c[2]));
        }
        const s = (R * 0.62) / rad;
        for (let i = 0; i < t.length; i++) t[i] = (t[i] - c[i % 3]) * s;
        const ntCount = Math.floor(t.length / 9);
        const cum = new Float64Array(ntCount);
        let sum = 0;
        for (let i = 0; i < ntCount; i++) {
          const b = i * 9;
          const ux = t[b + 3] - t[b];
          const uy = t[b + 4] - t[b + 1];
          const uz = t[b + 5] - t[b + 2];
          const wx = t[b + 6] - t[b];
          const wy = t[b + 7] - t[b + 1];
          const wz = t[b + 8] - t[b + 2];
          sum += Math.hypot(
            uy * wz - uz * wy,
            uz * wx - ux * wz,
            ux * wy - uy * wx
          );
          cum[i] = sum;
        }
        return { t, cum, sum, nt: ntCount };
      };

      const tModel = (m: CompiledModel) => {
        const r = new Float32Array(N * 3);
        for (let i = 0; i < N; i++) {
          const u = Math.random() * m.sum;
          let lo = 0;
          let hi = m.nt - 1;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (m.cum[mid] < u) lo = mid + 1;
            else hi = mid;
          }
          let a = Math.random();
          let b = Math.random();
          if (a + b > 1) {
            a = 1 - a;
            b = 1 - b;
          }
          const q = lo * 9;
          const t = m.t;
          for (let k = 0; k < 3; k++) {
            r[i * 3 + k] =
              t[q + k] +
              (t[q + 3 + k] - t[q + k]) * a +
              (t[q + 6 + k] - t[q + k]) * b +
              (Math.random() - 0.5) * 0.03;
          }
        }
        return r;
      };

      const defaultKnotGeo = new THREE.TorusKnotGeometry(1, 0.32, 220, 24);
      const defaultMd = mkModel(new THREE.Mesh(defaultKnotGeo));
      defaultKnotGeo.dispose();

      let md: CompiledModel = defaultMd;
      let scenes: SceneItem[] = [];
      let cur = -1;
      let first = true;
      let clock = 0;
      let sw = 0;
      let spin = 0;
      let mE = 0;
      let nt = 0;
      let at = 0;
      let bst = 0;

      const notifyActiveScene = () => {
        if (!scenes.length || cur < 0) return;
        const S = scenes[cur];
        onActiveSceneChangeRef.current?.(cur, S?.t ?? "3D Model");
      };

      const go = (i: number, f?: number) => {
        if (!scenes.length) return;
        const clamped = Math.max(0, Math.min(scenes.length - 1, i));
        if (clamped === cur && !f) return;
        cur = clamped;
        const S = scenes[cur];
        nt = S.t != null ? 0 : 1;
        T2.set(S.t != null ? tText(S.t, toNum(o.dp, 0.25)) : tModel(S.m!));
        for (let k = 0; k < N; k++) {
          pd[k] = 1;
          dl[k] =
            clock +
            (first
              ? 0.02 + Math.random() * 0.35
              : Math.random() * (f ? 0.2 : scrollDrivenScenes ? 0.16 : 0.55));
        }
        sw = first ? 0.35 : f ? 0.35 : scrollDrivenScenes ? 0.85 : 2.0;
        first = false;
        notifyActiveScene();
      };

      const build = () => {
        const lines = txText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        scenes = lines.map((t) => ({ t }));
        if (showModel && md) scenes.push({ m: md });
        if (!scenes.length) scenes.push({ t: "✦" });
        onScenesCountChangeRef.current?.(scenes.length);
        go(Math.min(Math.max(cur, 0), scenes.length - 1), 1);
      };

      const step = (d: number) => {
        const n = scenes.length;
        at = 0;
        if (n > 1) go((cur + d + n) % n);
      };

      const gltfLoader = new GLTFLoader();
      const loadModelFromUri = async (uri: string) => {
        if (!uri) {
          if (currentModelUri !== "") {
            currentModelUri = "";
            md = defaultMd;
            build();
          }
          return;
        }
        if (uri === currentModelUri) return;
        currentModelUri = uri;
        try {
          const res = await fetch(uri);
          const buf = await res.arrayBuffer();
          gltfLoader.parse(
            buf,
            "",
            (gl) => {
              md = mkModel(gl.scene);
              build();
            },
            () => {
              md = defaultMd;
              build();
            }
          );
        } catch {
          md = defaultMd;
          build();
        }
      };

      const applyExternal = (cfg: SphereSettings, isLive: boolean) => {
        if (!cfg || typeof cfg !== "object") return;
        const prevTexts = txText;
        const prevShowModel = showModel;
        const prevDp = toNum(o.dp, 0.25);
        const prevRm = toNum(o.rm, 1);

        const nextCfg: Record<string, unknown> = { ...cfg };
        if ("gx" in nextCfg && !("spx" in nextCfg)) nextCfg.spx = nextCfg.gx;
        if ("gy" in nextCfg && !("spy" in nextCfg)) nextCfg.spy = nextCfg.gy;
        if ("gz" in nextCfg && !("spz" in nextCfg)) nextCfg.spz = nextCfg.gz;
        if ("gc" in nextCfg && !("gc1" in nextCfg)) nextCfg.gc1 = nextCfg.gc;
        if ("grc" in nextCfg && !("gc2" in nextCfg)) nextCfg.gc2 = nextCfg.grc;
        if ("gfp" in nextCfg && !("gp" in nextCfg)) nextCfg.gp = nextCfg.gfp;

        for (const [k, val] of Object.entries(nextCfg)) {
          if (k === "texts" && typeof val === "string") {
            txText = val;
          } else if (k === "showModel") {
            showModel = Boolean(val);
          } else if (k === "modelDataUri" && typeof val === "string") {
            void loadModelFromUri(val);
          } else if (k in o) {
            (o as Record<string, string | number | boolean>)[k] =
              typeof (o as Record<string, unknown>)[k] === "string"
                ? String(val)
                : typeof val === "boolean"
                  ? val
                  : Number(val);
          }
        }

        U.uS.value = toNum(o.ps, 0.35);
        paint();
        if (toNum(o.rm, 1) !== prevRm) setAxes();
        applyVisualLayers();

        if (txText !== prevTexts || showModel !== prevShowModel) {
          build();
        } else if (isLive && toNum(o.dp, 0.25) !== prevDp) {
          go(cur, 1);
        }
      };

      apiRef.current = {
        applyExternal,
        step,
        go,
        getCount: () => scenes.length,
      };

      const resize = () => {
        if (!rd) return;
        const w = Math.max(container.clientWidth, 1);
        const h = Math.max(container.clientHeight, 1);
        const pr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        rd.setPixelRatio(pr);
        rd.setSize(w, h, false);
        cam.aspect = w / h;
        cam.position.z =
          (R * 1.32) /
          (Math.tan(THREE.MathUtils.degToRad(17.5)) * Math.min(1, w / h));
        cam.updateProjectionMatrix();
        U.uK.value = (pr * h) / 650 * 2;
        U.uF.value = cam.position.z;
        U.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(17.5))) / (h * pr);
        updateOrbSizes();
      };

      const ro = new ResizeObserver(resize);
      ro.observe(container);

      const LT = new THREE.Vector3();
      const _vHalo = new THREE.Vector3();
      const _vShock = new THREE.Vector3();
      const mw = new THREE.Vector3();
      const ml = new THREE.Vector3();
      const ray = new THREE.Vector3();
      const mn = { x: 0, y: 0 };
      const lm = { s: 0, x: 0, y: 0 };
      const ob1State = {
        x: Math.max(container.clientWidth, 1) * 0.6,
        y: Math.max(container.clientHeight, 1) * 0.5,
        v: 0,
      };
      const ob2State = {
        x: Math.max(container.clientWidth, 1) * 0.6,
        y: Math.max(container.clientHeight, 1) * 0.5,
      };
      let bpx = 0;
      let bpy = 0;

      const updatePointer = (clientX: number, clientY: number) => {
        const rect = container.getBoundingClientRect();
        const w = Math.max(rect.width, 1);
        const h = Math.max(rect.height, 1);
        const lx = clientX - rect.left;
        const ly = clientY - rect.top;
        const nx = (lx / w) * 2 - 1;
        const ny = 1 - (ly / h) * 2;
        if (lm.s) mE = Math.min(1, mE + Math.hypot(lx - lm.x, ly - lm.y) / 70);
        lm.s = 1;
        lm.x = lx;
        lm.y = ly;
        mn.x = nx;
        mn.y = ny;
        ray.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
        const denom = Math.abs(ray.z) < 1e-4 ? (ray.z >= 0 ? 1e-4 : -1e-4) : ray.z;
        const spz = toNum(o.spz, 0);
        const tHit = (spz - cam.position.z) / denom;
        mw.copy(cam.position).addScaledVector(ray, tHit);
      };

      const onPointerMove = (e: PointerEvent) => {
        updatePointer(e.clientX, e.clientY);
      };
      const onPointerDown = (e: PointerEvent) => {
        updatePointer(e.clientX, e.clientY);
        if (toBoolNum(o.sk)) {
          bst = 1;
          _vShock.copy(mw);
          glass.worldToLocal(_vShock);
          glass.material.uniforms.uW.value.set(_vShock.x, _vShock.y, 0, 1);
        }
      };

      let wl = 0;
      let ty = 0;
      const onWheel = (e: WheelEvent) => {
        if (!interactiveScrollScenes) return;
        e.preventDefault();
        const t = performance.now();
        const idle = t > wl;
        wl = t + 450;
        if (idle && Math.abs(e.deltaY) > 2) step(e.deltaY > 0 ? 1 : -1);
      };
      const onTouchStart = (e: TouchEvent) => {
        ty = e.touches[0]?.clientY ?? 0;
      };
      const onTouchEnd = (e: TouchEvent) => {
        if (!interactiveScrollScenes) return;
        const dy = ty - (e.changedTouches[0]?.clientY ?? 0);
        if (Math.abs(dy) > 40) step(dy > 0 ? 1 : -1);
      };

      if (interactiveScrollScenes) {
        container.addEventListener("pointermove", onPointerMove, { passive: true });
        container.addEventListener("pointerdown", onPointerDown);
        container.addEventListener("wheel", onWheel, { passive: false });
        container.addEventListener("touchstart", onTouchStart, { passive: true });
        container.addEventListener("touchend", onTouchEnd, { passive: true });
      } else {
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        container.addEventListener("pointerdown", onPointerDown);
      }

      let disposed = false;
      let rafId = 0;
      let timerId: ReturnType<typeof setTimeout> | null = null;
      let last = 0;

      const scheduleNext = () => {
        if (disposed) return;
        if (isSoftwareGl) {
          timerId = setTimeout(() => {
            if (!disposed) rafId = requestAnimationFrame(tick);
          }, 40);
        } else {
          rafId = requestAnimationFrame(tick);
        }
      };

      const stepPhysics = (dt: number, uploadAttrs: boolean) => {
        clock += dt;

        const sz = Math.max(0.5, toNum(o.sz, 3));
        const spx = toNum(o.spx, 0);
        const spy = toNum(o.spy, 0);
        const spz = toNum(o.spz, 0);
        // Safe interior wall inside the glass sphere so low-poly particles never poke through the outer shell
        const Ri = sz * 0.94;
        const fitFactor = Math.min(1, Ri / 2.75);

        sphereGroup.position.set(spx, spy, spz);
        glass.scale.setScalar(sz / R);
        halo.scale.setScalar(sz / R);

        const pmd = Math.round(toNum(o.pm, 2));
        pts.visible = pmd === 0;
        bm.visible = pmd !== 0;
        if (pmd !== 0) {
          const targetGeo = pmd === 1 ? gO : gI;
          if (bm.geometry !== targetGeo) bm.geometry = targetGeo;
        }

        // Update interactive background orbs & gradient parallax
        if (uploadAttrs) {
          const cw = Math.max(container.clientWidth, 1);
          const ch = Math.max(container.clientHeight, 1);
          const k5 = 1 - Math.exp(-4 * dt);
          const tx = lm.s ? lm.x : cw * 0.6;
          const tz = lm.s ? lm.y : ch * 0.5;
          const olg = toNum(o.olg, 2.2);
          const a1 = 1 - Math.exp(-dt * olg);
          const a2 = 1 - Math.exp(-dt * olg * 0.45);
          const px = ob1State.x;
          const py = ob1State.y;
          ob1State.x += (tx - ob1State.x) * a1;
          ob1State.y += (tz - ob1State.y) * a1;
          ob2State.x += (tx - ob2State.x) * a2;
          ob2State.y += (tz - ob2State.y) * a2;
          const vxOrb = (ob1State.x - px) / dt;
          const vyOrb = (ob1State.y - py) / dt;
          const spOrb = Math.hypot(vxOrb, vyOrb);
          const rOrb = (toNum(o.os, 24) * Math.min(cw, ch)) / 200;
          const stOrb = Math.min(0.9, spOrb / 900);
          ob1State.v += (Math.min(1, spOrb / 500) - ob1State.v) * (1 - Math.exp(-dt * 3));
          const obAlpha = toNum(o.ob, 0.7);
          if (ob1Ref.current) {
            ob1Ref.current.style.transform = `translate(${ob1State.x - rOrb}px, ${ob1State.y - rOrb}px) rotate(${Math.atan2(vyOrb, vxOrb)}rad) scale(${1 + stOrb}, ${1 - stOrb * 0.35})`;
            ob1Ref.current.style.opacity = String(obAlpha * (0.3 + 0.7 * ob1State.v));
          }
          if (ob2Ref.current) {
            ob2Ref.current.style.transform = `translate(${ob2State.x - 1.7 * rOrb}px, ${ob2State.y - 1.7 * rOrb}px)`;
            ob2Ref.current.style.opacity = String(obAlpha * 0.55 * (0.5 + 0.5 * ob1State.v));
          }
          bpx += (mn.x - bpx) * k5;
          bpy += (mn.y - bpy) * k5;
          const bp = toNum(o.bp, 0.5);
          container.style.backgroundPosition = `${50 + bpx * bp * 8}% ${50 - bpy * bp * 8}%`;
        }

        const isM = Boolean(scenes[cur] && scenes[cur].m);
        spin +=
          ((isM ? spin + dt * 0.3 : Math.round(spin / 6.2832) * 6.2832) - spin) *
          (isM ? 1 : 1 - Math.exp(-3 * dt));
        const k4 = 1 - Math.exp(-4 * dt);
        innerGroup.rotation.y += (mn.x * 0.3 + spin - innerGroup.rotation.y) * k4;
        innerGroup.rotation.x += (-mn.y * 0.2 - innerGroup.rotation.x) * k4;

        sphereGroup.updateMatrixWorld();
        ml.copy(mw);
        innerGroup.worldToLocal(ml);

        U.uT.value = clock;
        hm.uniforms.uE.value = mE;
        _vHalo.copy(mw);
        halo.worldToLocal(_vHalo);
        hm.uniforms.uM.value.copy(_vHalo);

        U.uGl.value = toNum(o.gl, 0.46);
        U.uFl.value = toNum(o.fl, 0.85);
        U.uDf.value = toNum(o.df, 0);

        const gu = glass.material.uniforms;
        const wv = gu.uW.value;
        if (wv.w) {
          wv.z += dt;
          if (wv.z > 1.2) wv.w = 0;
        }
        gu.uL.value.lerp(
          LT.set(
            toBoolNum(o.ml) ? (mw.x - spx) / sz : -0.5,
            toBoolNum(o.ml) ? (mw.y - spy) / sz : 0.7,
            toBoolNum(o.ml) ? 1.1 : 0.6
          ),
          0.1
        );

        // Auto-advance only when NOT externally scroll-driven on Hero
        if (uploadAttrs && !scrollDrivenScenes && toBoolNum(o.au) && (at += dt) > toNum(o.ai, 15)) {
          at = 0;
          step(1);
        }

        const rm = toNum(o.rm, 1);
        const kk = toNum(o.rk, 4.5) * (scrollDrivenScenes ? 1.55 : 1);
        const gm = rm ? Math.max(2.6, 1.9 * Math.sqrt(kk)) : Math.max(2.2, 1.55 * Math.sqrt(kk));
        const dm = Math.exp(-gm * dt);
        const cc0 = rm ? toNum(o.sp, 1.5) * 0.36 * 2.6 * Math.sqrt(kk) : 0;
        const amp = toNum(o.al, 0) * 0.22;
        const sr = toNum(o.sr, 1.55);
        const ss = toNum(o.ss, 5.2);
        const r2 = sr * sr;
        const imp = ss * dt * 55;
        const sk = sw * dt * 2;
        const Q = Ri * Ri;
        const maxTargetR = Ri * 0.91;
        const maxTargetQ = maxTargetR * maxTargetR;
        const rb = sr * 2.4;
        const bi = bst * ss * dt * 165;

        sw *= Math.exp(-1.1 * dt);
        mE *= Math.exp(-3.5 * dt);
        bst *= Math.exp(-8 * dt);
        SCa[0] = toNum(o.fs, 1);
        SCa[1] = toNum(o.ms, 1);
        OFa.set([
          toNum(o.tpx, 0),
          toNum(o.tpy, 0),
          toNum(o.tpz, 0),
          toNum(o.mpx, 0),
          toNum(o.mpy, 0),
          toNum(o.mpz, 0),
        ]);

        for (let i = 0, j = 0; i < N; i++, j += 3) {
          if (pd[i] && clock >= dl[i]) {
            pd[i] = 0;
            tg[i] = nt;
            ac[i] = 2;
            T[j] = T2[j];
            T[j + 1] = T2[j + 1];
            T[j + 2] = T2[j + 2];
          }
          let x = P[j];
          let y = P[j + 1];
          let z = P[j + 2];
          let vx = V[j];
          let vy = V[j + 1];
          let vz = V[j + 2];

          const e = clock * (0.6 + sd[i] * 1.2);
          const a4 = amp * 0.25;
          const tq = tg[i];
          const sl = SCa[tq] * fitFactor;
          const ox = OFa[tq * 3];
          const oy = OFa[tq * 3 + 1];
          const oz = OFa[tq * 3 + 2];

          let txP =
            T[j] * sl +
            ox +
            Math.sin(T[j + 1] * 1.9 + clock * 0.55) * amp +
            Math.sin(e + ph[j]) * a4;
          let tyP =
            T[j + 1] * sl +
            oy +
            Math.sin(T[j + 2] * 1.7 + clock * 0.47 + 1.3) * amp +
            Math.sin(e * 1.3 + ph[j + 1]) * a4;
          let tzP =
            T[j + 2] * sl +
            oz +
            Math.sin(T[j] * 1.5 + clock * 0.5 + 2.1) * amp +
            Math.sin(e * 0.8 + ph[j + 2]) * a4;

          // Keep target point strictly inside the glass sphere even with large fs/ms/tpx/mpx
          const tq2 = txP * txP + tyP * tyP + tzP * tzP;
          if (tq2 > maxTargetQ) {
            const invR = maxTargetR / Math.sqrt(tq2);
            txP *= invR;
            tyP *= invR;
            tzP *= invR;
          }

          const ex = txP - x;
          const ey = tyP - y;
          const ez = tzP - z;

          vx += ex * kk * dt - z * sk;
          vy += ey * kk * dt;
          vz += ez * kk * dt + x * sk;

          if (cc0) {
            let cc = cc0;
            if (rm === 2) {
              cc *= 0.45 + 0.55 / (1 + Math.sqrt(ex * ex + ey * ey + ez * ez) * 0.5);
            }
            const ax = AX[j];
            const ay = AX[j + 1];
            const az = AX[j + 2];
            vx += (ay * ez - az * ey) * cc * dt;
            vy += (az * ex - ax * ez) * cc * dt;
            vz += (ax * ey - ay * ex) * cc * dt;
          }
          if (mE > 0.02) {
            const dx = x - ml.x;
            const dy = y - ml.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < r2) {
              const d = Math.sqrt(d2) + 1e-4;
              const w = 1 - d / sr;
              const f = w * w * imp * mE * (0.5 + sd[i]);
              vx += (dx / d) * f;
              vy += (dy / d) * f;
              vz += (ph[j + 2] - 3.14) * 0.32 * f;
            }
          }
          if (bst > 0.02) {
            const dx = x - ml.x;
            const dy = y - ml.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < rb * rb) {
              const d = Math.sqrt(d2) + 1e-4;
              const w = 1 - d / rb;
              const f = w * w * bi * (0.5 + sd[i]);
              vx += (dx / d) * f;
              vy += (dy / d) * f;
              vz += (ph[j + 2] - 3.14) * 0.32 * f;
            }
          }
          vx *= dm;
          vy *= dm;
          vz *= dm;

          x += vx * dt;
          y += vy * dt;
          z += vz * dt;

          // Unconditional spherical confinement: zero particles ever escape outside Ri
          const q = x * x + y * y + z * z;
          if (q > Q) {
            const r = Math.sqrt(q);
            const nx = x / r;
            const ny = y / r;
            const nz = z / r;
            const vn = vx * nx + vy * ny + vz * nz;
            x = nx * Ri;
            y = ny * Ri;
            z = nz * Ri;
            if (vn > 0) {
              vx -= 1.6 * vn * nx;
              vy -= 1.6 * vn * ny;
              vz -= 1.6 * vn * nz;
            }
          }
          P[j] = x;
          P[j + 1] = y;
          P[j + 2] = z;
          V[j] = vx;
          V[j + 1] = vy;
          V[j + 2] = vz;
          VL[i] = Math.sqrt(vx * vx + vy * vy + vz * vz);
        }

        if (uploadAttrs) {
          g.attributes.position.needsUpdate = true;
          g.attributes.vl.needsUpdate = true;
          iaO.needsUpdate = true;
          iaV.needsUpdate = true;
        }
      };

      const tick = (ts: number) => {
        if (disposed || !rd) return;
        const rawDt = last ? Math.max(0.001, (ts - last) / 1000) : 0.016;
        last = ts;
        if (rawDt > 0.034) {
          const steps = Math.min(10, Math.ceil(rawDt / 0.025));
          const subDt = Math.min(0.033, rawDt / steps);
          for (let s = 0; s < steps; s++) {
            stepPhysics(subDt, s === steps - 1);
          }
        } else {
          stepPhysics(Math.min(0.033, rawDt), true);
        }
        rd.render(sc, cam);
        scheduleNext();
      };

      // Boot immediately without blocking on network fetch
      applyVisualLayers();
      resize();
      build();
      if (o.modelDataUri) {
        void loadModelFromUri(String(o.modelDataUri));
      }
      // Pre-roll so CAD letters spiral into crisp focus inside the sphere on frame 1
      for (let warm = 0; warm < 320; warm++) {
        stepPhysics(0.028, warm === 319);
      }
      rd.render(sc, cam);
      rafId = requestAnimationFrame(tick);

      if (fetchConfig) {
        fetch("/api/tm/globe-config/", { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!disposed && data?.settings && !hasLiveOverrideRef.current) {
              applyExternal(data.settings as SphereSettings, false);
            }
          })
          .catch(() => {});
      }

      const onGlobeUpdated = (ev: Event) => {
        const detail = (ev as CustomEvent<SphereSettings>).detail;
        if (!disposed && detail && typeof detail === "object") {
          hasLiveOverrideRef.current = true;
          applyExternal(detail, false);
        }
      };
      window.addEventListener("neeleh-globe-updated", onGlobeUpdated);
      const darkObserver = new MutationObserver(() => applyVisualLayers());
      darkObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      return () => {
        disposed = true;
        darkObserver.disconnect();
        window.removeEventListener("neeleh-globe-updated", onGlobeUpdated);
        cancelAnimationFrame(rafId);
        if (timerId) clearTimeout(timerId);
        ro.disconnect();
        if (interactiveScrollScenes) {
          container.removeEventListener("pointermove", onPointerMove);
          container.removeEventListener("pointerdown", onPointerDown);
          container.removeEventListener("wheel", onWheel);
          container.removeEventListener("touchstart", onTouchStart);
          container.removeEventListener("touchend", onTouchEnd);
        } else {
          window.removeEventListener("pointermove", onPointerMove);
          container.removeEventListener("pointerdown", onPointerDown);
        }
        glassGeo.dispose();
        glassMat.dispose();
        studioHdri.dispose();
        g.dispose();
        mat.dispose();
        gI.dispose();
        gO.dispose();
        bmMat.dispose();
        hg.dispose();
        hm.dispose();
        rd?.dispose();
        apiRef.current = null;
      };
    }, [fetchConfig, interactiveScrollScenes, scrollDrivenScenes]);

    // Sync live settings updates in admin preview without recreating WebGL context
    React.useEffect(() => {
      if (!settings) return;
      hasLiveOverrideRef.current = true;
      apiRef.current?.applyExternal(settings, true);
    }, [settings]);

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden select-none ${
          heroZoomLayer ? "tm-hero-backdrop" : ""
        } ${className}`}
        style={{ background: "linear-gradient(165deg, #c6c6c6, #7a7a7a)" }}
      >
        {/* Interactive background glow orbs behind WebGL canvas */}
        <div
          ref={ob1Ref}
          className="pointer-events-none absolute left-0 top-0 z-0 rounded-full"
        />
        <div
          ref={ob2Ref}
          className="pointer-events-none absolute left-0 top-0 z-0 rounded-full"
        />
        <div className={heroZoomLayer ? "tm-hero-sphere-layer" : "relative z-[1] h-full w-full"}>
          <div className={heroZoomLayer ? "tm-hero-scene__enter" : "h-full w-full"}>
            <canvas
              ref={canvasRef}
              className="relative z-[1] block h-full w-full touch-none"
            />
          </div>
        </div>
        <div
          ref={fadeRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2]"
        />
        <div
          ref={vigRef}
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            background: "radial-gradient(ellipse at center, transparent 45%, #000 135%)",
            opacity: 0.73,
          }}
        />
        <div
          ref={grainRef}
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{
            opacity: 0.41,
            mixBlendMode: "overlay",
            backgroundImage: NOISE_SVG_URI,
          }}
        />
      </div>
    );
  }
);
