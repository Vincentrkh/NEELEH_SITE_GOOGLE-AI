"use client";

import { useEffect, useRef } from "react";

/**
 * FluidReveal — WebGL2 fluid simulation that paints a "mask color" trail
 * following the cursor. Reverse-engineered 1:1 from bleibtgleich.dev's
 * `initFluidReveal()` in slater-main.js.
 *
 * === HOW IT WORKS ===
 * The component renders a full-viewport <canvas data-fluid-canvas> behind the
 * page content (z-index: 3). On every mousemove, a radial gaussian "blob" of
 * density+velocity is splatted into a low-res (512×N) "field" texture. Every
 * frame, the field is updated by a fluid simulation shader (advection +
 * spread + decay + friction + FBM wobble). Finally, a mask shader reads the
 * field's density channel and renders solid `maskColor` (the page's background
 * color) where density is high, fading out via smoothstep.
 *
 * The visual effect: as the cursor moves, a soft "fluid" trail of the
 * background colour appears, smearing and decaying organically — like ink
 * dropped in water, but in the background colour, so it looks like the
 * foreground content is being "wiped away" to reveal the bg.
 *
 * === SHADERS (verbatim from source) ===
 * - Vertex: trivial triangle-strip, passes vUv = aPos * 0.5 + 0.5
 * - Splat shader (H): radial gaussian, adds density r and lerps velocity gb
 * - Field sim shader (U): advection + neighbor spread + decay + friction +
 *   FBM wobble + grain
 * - Mask shader (N): smoothstep on density → alpha of maskColor, with a
 *   bottomFade and time-animated FBM
 *
 * === CONSTANTS (from source) ===
 *   f=512      field texture resolution
 *   v=1.6      velocity multiplier for splat
 *   y=3        friction
 *   w=0.79     spread
 *   b=1.5      decay
 *   E=0.004    splat radius (gaussian) — default, adjustable via `brushRadius` prop
 *   _=3.5      splat color intensity
 *   x=2.6      wobble
 *   T=0.7      grain
 *   S=0.39     edge smoothstep start
 *   k=0.4      edge smoothstep end
 *   M=4        max velocity clamp
 *   A=0.18     bottomFade
 *   C=1200ms  re-render hold after body class change
 */

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const SPLAT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform sampler2D uField;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
void main () {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  float g = exp(-dot(p, p) / radius);
  vec4 f = texture(uField, vUv);
  float w = clamp(g * color.x, 0.0, 1.0);
  fragColor = vec4(
    f.r + g * color.x,
    mix(f.g, color.y, w),
    mix(f.b, color.z, w),
    1.0
  );
}`;

const FIELD_SHADER = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform sampler2D uField;
uniform vec2 texelSize;
uniform float dt;
uniform float friction;
uniform float spread;
uniform float decay;
uniform float wobble;
uniform float grain;
uniform float time;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  return noise(p) * 0.55 + noise(p * 2.6) * 0.3 + noise(p * 6.3) * 0.15;
}

void main () {
  vec2 vel = texture(uField, vUv).gb;
  vec2 coord = vUv - vel * dt;
  vec4 s = texture(uField, coord);

  float t = time * 0.3;
  vec2 warp = (vec2(
    fbm(vUv * 11.0 + t),
    fbm(vUv * 11.0 + 37.2 - t)
  ) - 0.5) * 2.0 * wobble * texelSize;

  vec4 nL = texture(uField, coord + vec2(-texelSize.x, 0.0) + warp);
  vec4 nR = texture(uField, coord + vec2( texelSize.x, 0.0) + warp);
  vec4 nT = texture(uField, coord + vec2(0.0,  texelSize.y) + warp);
  vec4 nB = texture(uField, coord + vec2(0.0, -texelSize.y) + warp);
  float avgD = (nL.r + nR.r + nT.r + nB.r) * 0.25;
  vec2 avgV = (nL.gb + nR.gb + nT.gb + nB.gb) * 0.25;

  float d = mix(s.r, avgD, spread);
  vec2 v = mix(s.gb, avgV, spread * 0.5);

  float g = fbm(vUv * 15.0 + 5.1 + t * 0.6);
  d *= 1.0 / (1.0 + (decay + grain * decay * (g - 0.5) * 2.0) * dt);
  v *= 1.0 / (1.0 + friction * dt);

  fragColor = vec4(max(d, 0.0), v, 1.0);
}`;

const MASK_SHADER = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 fragColor;
uniform sampler2D uField;
uniform vec3 maskColor;
uniform vec2 edge;
uniform float bottomFade;
uniform float time;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  return noise(p) * 0.55 + noise(p * 2.6) * 0.3 + noise(p * 6.3) * 0.15;
}

void main () {
  // 5-tap curl-warped sampling spreads density smoothly into a misty halo
  vec2 aspectUv = vec2(vUv.x * 1.6, vUv.y);
  float t = time * 0.22;
  float n1 = fbm(aspectUv * 6.5 + vec2(t, -t * 1.2));
  float n2 = fbm(aspectUv * 13.0 - vec2(t * 1.4, t * 0.8) + n1 * 1.6);
  vec2 curl = vec2(n1 - 0.5, n2 - 0.5) * 0.032;

  float d0 = texture(uField, vUv).r;
  float d1 = texture(uField, vUv + curl + vec2(0.015, 0.009)).r;
  float d2 = texture(uField, vUv - curl + vec2(-0.015, 0.011)).r;
  float d3 = texture(uField, vUv + curl * 1.5 + vec2(0.009, -0.016)).r;
  float d4 = texture(uField, vUv - curl * 1.4 + vec2(-0.011, -0.013)).r;
  float d = d0 * 0.36 + (d1 + d2 + d3 + d4) * 0.16;

  // Optional bottom-fade so the mask is slightly less visible at the
  // very bottom of the viewport.
  float n = fbm(vec2(vUv.x * 9.0, time * 0.25));
  float localFade = bottomFade * (0.35 + n * 1.3);
  d *= smoothstep(0.0, localFade, vUv.y);

  // Wispy smoke modulation along the outer perimeter
  float smokeNoise = (n1 * 0.55 + n2 * 0.45) - 0.5;
  float halo = smoothstep(0.0, 0.9, d) * (1.0 - smoothstep(0.8, 2.2, d));
  float smokyD = max(0.0, d + smokeNoise * 0.42 * halo);

  // Wide, single-pass vaporous falloff so edges dissolve like smoke
  float reveal = smoothstep(edge.x, edge.y, smokyD);
  float alpha = 1.0 - reveal;
  fragColor = vec4(maskColor, alpha);
}`;

// Simulation constants — tuned for soft, smoke-like edge diffusion.
const FIELD_RES = 512;
const VEL_MULT = 1.6;
const FRICTION = 3;
const SPREAD = 0.9;
const DECAY = 1.35;
const SPLAT_RADIUS = 0.004;
const SPLAT_COLOR = 2.6;
const WOBBLE = 5.5;
const GRAIN = 0.9;
const EDGE_START = 0.02;
const EDGE_END = 1.75;
const MAX_VEL = 4;
const BOTTOM_FADE = 0.18;

type FluidRevealProps = {
  /** CSS color used as the "mask" — usually the page background color. */
  maskColor?: string;
  /**
   * Splat radius of the cursor trail (gaussian variance). Bigger = wider
   * trail. Defaults to the source value (0.004). Live-adjustable — changing
   * it does NOT re-initialize the WebGL context.
   */
  brushRadius?: number;
  /** Optional className to add to the wrapping element. */
  className?: string;
  /** Children rendered ON TOP of the canvas (the page content / hero text). */
  children?: React.ReactNode;
  /**
   * Optional content rendered BEHIND the canvas (between canvas and the
   * page background). Used for the orbit-tiles layer — when the cursor
   * moves, the fluid mask is "scratched away" revealing this layer.
   */
  revealContent?: React.ReactNode;
  /**
   * Optional CSS background (solid color / `url(...)` image / gradient)
   * applied to the `.fluid-reveal-content` layer — visible wherever the
   * fluid mask is scratched away by the cursor. Live-adjustable.
   */
  revealBackground?: string;
};

export const DEFAULT_BRUSH_RADIUS = SPLAT_RADIUS;

export function FluidReveal({
  maskColor,
  brushRadius = SPLAT_RADIUS,
  className,
  children,
  revealContent,
  revealBackground,
}: FluidRevealProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Live brush radius — read every frame by the render loop so the slider
  // can change it without tearing down / re-creating the simulation.
  const radiusRef = useRef(brushRadius);

  useEffect(() => {
    radiusRef.current = brushRadius;
  }, [brushRadius]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    // NOTE: unlike the reference site (which skips the effect below 992px),
    // the simulation runs on EVERY viewport. On phones the canvas backing
    // store stays at CSS-pixel resolution (DPR 1 — see onResize), so a
    // 375×667 screen simulates a ~250k-pixel field: light enough for mobile
    // GPUs, and touch input is fed through onDocTouchMove below.
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: false,
    }) as WebGL2RenderingContext | null;
    if (!gl) {
      // WebGL2 unavailable (rare, older devices): hide the reveal layers so
      // the page falls back to a clean static look instead of showing the
      // unmasked orbit-tiles behind the content.
      wrap.classList.add("fluid-disabled");
      return () => wrap.classList.remove("fluid-disabled");
    }
    gl.getExtension("EXT_color_buffer_float");
    const linearFilter = gl.getExtension("OES_texture_float_linear")
      ? gl.LINEAR
      : gl.NEAREST;

    // ---- shader compile helpers ----
    function compileShader(type: number, src: string): WebGLShader {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl!.getShaderInfoLog(sh));
      }
      return sh;
    }
    function createProgram(fragSrc: string) {
      const prog = gl!.createProgram()!;
      gl!.attachShader(prog, vertexShader);
      gl!.attachShader(prog, compileShader(gl!.FRAGMENT_SHADER, fragSrc));
      gl!.linkProgram(prog);
      if (!gl!.getProgramParameter(prog, gl!.LINK_STATUS)) {
        console.error("Program link error:", gl!.getProgramInfoLog(prog));
      }
      const uniforms: Record<string, WebGLUniformLocation | null> = {};
      const n = gl!.getProgramParameter(prog, gl!.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl!.getActiveUniform(prog, i)!.name;
        uniforms[name] = gl!.getUniformLocation(prog, name);
      }
      return { p: prog, uniforms };
    }
    const vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const splatProg = createProgram(SPLAT_SHADER);
    const fieldProg = createProgram(FIELD_SHADER);
    const maskProg = createProgram(MASK_SHADER);

    // ---- vertex array + buffer (aPos: triangle strip covering viewport) ----
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // ---- ping-pong field textures (RGBA16F float) ----
    function createField(w: number, h: number) {
      const tex = gl!.createTexture()!;
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, tex);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, linearFilter);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, linearFilter);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      gl!.texImage2D(
        gl!.TEXTURE_2D,
        0,
        gl!.RGBA16F,
        w,
        h,
        0,
        gl!.RGBA,
        gl!.HALF_FLOAT,
        null
      );
      const fbo = gl!.createFramebuffer()!;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
      gl!.framebufferTexture2D(
        gl!.FRAMEBUFFER,
        gl!.COLOR_ATTACHMENT0,
        gl!.TEXTURE_2D,
        tex,
        0
      );
      gl!.viewport(0, 0, w, h);
      gl!.clearColor(0, 0, 0, 1);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      return {
        tex,
        fbo,
        w,
        h,
        attach(slot: number) {
          gl!.activeTexture(gl!.TEXTURE0 + slot);
          gl!.bindTexture(gl!.TEXTURE_2D, this.tex);
          return slot;
        },
      };
    }

    // ---- ping-pong field state with read/write swap ----
    // fieldState.read = currently-bound field texture (input to shaders)
    // fieldState.write = the one we render into (output)
    // After each render, swap them.
    const fieldState = {
      read: null as ReturnType<typeof createField> | null,
      write: null as ReturnType<typeof createField> | null,
      swap() {
        const tmp = this.read;
        this.read = this.write;
        this.write = tmp;
      },
      texelX: 1 / FIELD_RES,
      texelY: 1 / FIELD_RES,
    };

    function resizeField() {
      const aspect = canvas!.width / Math.max(canvas!.height, 1);
      let w: number, h: number;
      if (aspect >= 1) {
        h = FIELD_RES;
        w = Math.min(Math.round(FIELD_RES * aspect), 1440);
      } else {
        w = FIELD_RES;
        h = Math.min(Math.round(FIELD_RES / aspect), 1440);
      }
      if (fieldState.read && fieldState.read.w === w && fieldState.read.h === h) return;
      if (fieldState.read) {
        gl!.deleteTexture(fieldState.read.tex);
        gl!.deleteFramebuffer(fieldState.read.fbo);
        gl!.deleteTexture(fieldState.write!.tex);
        gl!.deleteFramebuffer(fieldState.write!.fbo);
      }
      fieldState.read = createField(w, h);
      fieldState.write = createField(w, h);
      fieldState.texelX = 1 / w;
      fieldState.texelY = 1 / h;
    }

    // ---- cursor state (in field-UV space) ----
    const cursor = {
      x: 0.5,
      y: 0.5,
      px: 0.5,
      py: 0.5,
      vx: 0,
      vy: 0,
      moved: false,
      init: false,
    };
    let blockRect = wrap.getBoundingClientRect();
    let lastTime = performance.now();

    function onMove(clientX: number, clientY: number) {
      const now = performance.now();
      const dt = Math.max((now - lastTime) / 1000, 0.004);
      lastTime = now;
      const rx = (clientX - blockRect.left) / blockRect.width;
      const ry = 1 - (clientY - blockRect.top) / blockRect.height;
      if (cursor.init) {
        cursor.px = cursor.x;
        cursor.py = cursor.y;
      } else {
        cursor.px = rx;
        cursor.py = ry;
        cursor.init = true;
      }
      cursor.vx = (rx - cursor.px) / dt;
      cursor.vy = (ry - cursor.py) / dt;
      cursor.x = rx;
      cursor.y = ry;
      cursor.moved = true;
    }
    // Listen on document so events bubble through the content layer.
    // (In the reference, the .reveal-block sits ABOVE its content so its
    // mousemove listener receives events directly. Here our content layer
    // is on top of the canvas, so we listen at the document level and
    // filter by whether the cursor is over the wrap.)
    function onDocMouseMove(e: MouseEvent) {
      const r = wrap.getBoundingClientRect();
      if (
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom
      ) {
        onMove(e.clientX, e.clientY);
      }
    }
    function onDocTouchMove(e: TouchEvent) {
      if (e.touches[0]) {
        const r = wrap.getBoundingClientRect();
        const t = e.touches[0];
        if (
          t.clientX >= r.left &&
          t.clientX <= r.right &&
          t.clientY >= r.top &&
          t.clientY <= r.bottom
        ) {
          onMove(t.clientX, t.clientY);
        }
      }
    }
    function onMouseLeave() {
      cursor.init = false;
    }
    function onResize() {
      const rect = wrap.getBoundingClientRect();
      blockRect = rect;
      canvas!.width = Math.round(rect.width);
      canvas!.height = Math.round(rect.height);
      resizeField();
    }
    function onScroll() {
      blockRect = wrap.getBoundingClientRect();
    }

    document.addEventListener("mousemove", onDocMouseMove);
    document.addEventListener("touchmove", onDocTouchMove, { passive: true });
    wrap.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onResize);
    ro.observe(wrap);

    // ---- render loop ----
    function bindTarget(
      f: ReturnType<typeof createField> | null
    ) {
      if (f) {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, f.fbo);
        gl!.viewport(0, 0, f.w, f.h);
      } else {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
        gl!.viewport(0, 0, canvas!.width, canvas!.height);
      }
      // Re-bind VAO in case it was lost
      gl!.bindVertexArray(vao);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
    }

    function splat(x: number, y: number, color: number, vx: number, vy: number) {
      gl!.useProgram(splatProg.p);
      gl!.uniform1i(splatProg.uniforms.uField, fieldState.read!.attach(0));
      gl!.uniform1f(splatProg.uniforms.aspectRatio, canvas!.width / canvas!.height);
      gl!.uniform2f(splatProg.uniforms.point, x, y);
      gl!.uniform3f(splatProg.uniforms.color, color, vx, vy);
      gl!.uniform1f(splatProg.uniforms.radius, radiusRef.current);
      // Render into write, then swap
      bindTarget(fieldState.write);
      fieldState.swap();
    }

    function step() {
      rafId = requestAnimationFrame(step);
      const now = performance.now();
      const dt = Math.min((now - simTime) / 1000, 0.033);
      simTime = now;

      gl!.disable(gl!.BLEND);

      // Splat if moved
      if (cursor.moved) {
        const aspect = canvas!.width / Math.max(canvas!.height, 1);
        const vx = Math.max(-MAX_VEL, Math.min(MAX_VEL, cursor.vx)) * VEL_MULT;
        const vy = Math.max(-MAX_VEL, Math.min(MAX_VEL, cursor.vy)) * VEL_MULT;
        const dist = Math.hypot((cursor.x - cursor.px) * aspect, cursor.y - cursor.py);
        const steps = Math.max(
          1,
          Math.ceil(dist / (0.4 * Math.sqrt(radiusRef.current)))
        );
        for (let i = 0; i < steps; i++) {
          const t = steps === 1 ? 1 : i / (steps - 1);
          splat(
            cursor.px + (cursor.x - cursor.px) * t,
            cursor.py + (cursor.y - cursor.py) * t,
            SPLAT_COLOR,
            vx,
            vy
          );
        }
        cursor.moved = false;
      }

      // Field sim step
      gl!.useProgram(fieldProg.p);
      gl!.uniform2f(fieldProg.uniforms.texelSize, fieldState.texelX, fieldState.texelY);
      gl!.uniform1f(fieldProg.uniforms.dt, dt);
      gl!.uniform1f(fieldProg.uniforms.friction, FRICTION);
      gl!.uniform1f(fieldProg.uniforms.spread, SPREAD);
      gl!.uniform1f(fieldProg.uniforms.decay, DECAY);
      gl!.uniform1f(fieldProg.uniforms.wobble, WOBBLE);
      gl!.uniform1f(fieldProg.uniforms.grain, GRAIN);
      gl!.uniform1f(fieldProg.uniforms.time, 0.001 * now);
      gl!.uniform1i(fieldProg.uniforms.uField, fieldState.read!.attach(0));
      bindTarget(fieldState.write);
      fieldState.swap();

      // Mask render to screen
      gl!.useProgram(maskProg.p);
      gl!.uniform1i(maskProg.uniforms.uField, fieldState.read!.attach(0));
      gl!.uniform3f(maskProg.uniforms.maskColor, maskRGB[0], maskRGB[1], maskRGB[2]);
      gl!.uniform2f(maskProg.uniforms.edge, EDGE_START, EDGE_END);
      gl!.uniform1f(maskProg.uniforms.bottomFade, BOTTOM_FADE);
      gl!.uniform1f(maskProg.uniforms.time, 0.001 * now);
      bindTarget(null);
    }

    // Parse maskColor CSS → RGB [0..1].
    // We use a temp <div> with backgroundColor=resolved color, which forces the
    // browser to compute the final sRGB value (handles oklch/lab() → rgb()).
    let maskRGB: [number, number, number] = [1, 1, 1];
    function updateMaskColor() {
      const source = maskColor
        ? maskColor
        : getComputedStyle(canvas!).color;
      const probe = document.createElement("div");
      probe.style.backgroundColor = source;
      probe.style.display = "none";
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const m = resolved.match(/[\d.]+/g);
      if (m && m.length >= 3) {
        maskRGB = [
          parseFloat(m[0]) / 255,
          parseFloat(m[1]) / 255,
          parseFloat(m[2]) / 255,
        ];
      }
    }
    updateMaskColor();
    // Re-parse on theme changes
    const themeObserver = new MutationObserver(updateMaskColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    onResize();
    let rafId = requestAnimationFrame(step);
    let simTime = performance.now();

    // ---- visibility observer: pause when off-screen ----
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          cursor.init = false;
          if (!rafId) {
            simTime = performance.now();
            rafId = requestAnimationFrame(step);
          }
        } else {
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
          }
        }
      },
      { threshold: 0 }
    );
    io.observe(wrap);

    return () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
      document.removeEventListener("mousemove", onDocMouseMove);
      document.removeEventListener("touchmove", onDocTouchMove);
      wrap.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      const lose = gl.getExtension("WEBGL_lose_context");
      lose?.loseContext();
    };
  }, [maskColor]);

  return (
    <div
      ref={wrapRef}
      data-fluid-reveal
      className={className}
      style={{
        position: "relative",
        // Clip the orbit-tiles that fly past the viewport edges on narrow
        // screens (overflow-x on <body> alone doesn't stop the viewport
        // from panning a few px). `clip` — not `hidden` — creates no
        // scrollport. Desktop tiles stay inside the viewport anyway, so
        // wide-screen rendering is unchanged.
        overflow: "clip",
      }}
    >
      {/* Layer 0: orbit-tiles / reveal content (BEHIND canvas).
          At rest, covered by the opaque canvas. When the cursor moves,
          the canvas becomes transparent where the cursor went, revealing
          these images. z-index 0. */}
      {revealContent && (
        <div
          className="fluid-reveal-content"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background: revealBackground || undefined,
          }}
        >
          {revealContent}
        </div>
      )}
      <canvas
        ref={canvasRef}
        data-fluid-canvas
        className="fluid-canvas"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          // z-index 1 — canvas sits ABOVE orbit-tiles but BELOW hero text.
          // At rest, alpha = 1 (opaque white, covers images).
          // Where cursor moved, alpha → 0 (transparent, reveals images).
          zIndex: 1,
          pointerEvents: "none",
          color: maskColor || "rgb(255, 255, 255)",
        }}
      />
      {/* Layer 2: page content / hero text (ON TOP of canvas).
          Always visible — the canvas only affects the orbit-tiles below it. */}
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}
