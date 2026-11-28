#!/usr/bin/env node
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const isWin = process.platform === "win32";
const distDir = process.env.NEXT_DIST_DIR || ".next";

const PRESERVE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const preserveDir = path.join(root, ".next-static-preserve");
const distStaticDir = path.join(root, distDir, "static");

function isHashedStaticAsset(relPath) {
  const norm = relPath.replace(/\\/g, "/");
  if (
    norm.startsWith("chunks/") ||
    norm.startsWith("css/") ||
    norm.startsWith("media/")
  ) {
    return /\.(css|js|mjs|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|avif)$/i.test(norm);
  }
  return false;
}

function copyTreeSafe(src, dst, opts = {}) {
  if (!fs.existsSync(src)) return;
  const { skipNames, onlyNew = false, filterRel, relBase = "", maxAgeMs = 0 } = opts;
  fs.mkdirSync(dst, { recursive: true });
  const now = Date.now();

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipNames && skipNames.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      copyTreeSafe(s, d, { skipNames, onlyNew, filterRel, relBase: rel, maxAgeMs });
    } else if (entry.isFile()) {
      if (filterRel && !filterRel(rel)) continue;
      if (onlyNew && fs.existsSync(d)) continue;
      if (maxAgeMs > 0) {
        try {
          const st = fs.statSync(s);
          if (now - st.mtimeMs > maxAgeMs) continue;
        } catch {
          continue;
        }
      }
      try {
        fs.copyFileSync(s, d);
      } catch (err) {
        if (err && (err.code === "EBUSY" || err.code === "EPERM")) {
          continue;
        }
        throw err;
      }
    }
  }
}

function hasCompiledCss(dir) {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasCompiledCss(full)) return true;
    } else if (entry.isFile() && entry.name.endsWith(".css")) {
      try {
        if (fs.statSync(full).size > 0) return true;
      } catch {
        // ignore
      }
    }
  }
  return false;
}

// Preserve recent hashed CSS/JS chunks before Next clears distDir
fs.rmSync(preserveDir, { recursive: true, force: true });
if (fs.existsSync(distStaticDir)) {
  copyTreeSafe(distStaticDir, preserveDir, {
    filterRel: isHashedStaticAsset,
    maxAgeMs: PRESERVE_MAX_AGE_MS,
  });
}

const buildRes = spawnSync(isWin ? "npx.cmd" : "npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
  env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: distDir },
});

if (buildRes.status !== 0) {
  if (fs.existsSync(preserveDir)) {
    copyTreeSafe(preserveDir, distStaticDir, { onlyNew: true });
    fs.rmSync(preserveDir, { recursive: true, force: true });
  }
  process.exit(buildRes.status ?? 1);
}

// Verify that compiled CSS assets actually exist in the finished bundle
if (!hasCompiledCss(distStaticDir)) {
  console.error(
    `[build-standalone] Build verification failed: no compiled .css files found in ${distStaticDir}`,
  );
  if (fs.existsSync(preserveDir)) {
    copyTreeSafe(preserveDir, distStaticDir, { onlyNew: true });
    fs.rmSync(preserveDir, { recursive: true, force: true });
  }
  process.exit(1);
}

// Restore previous non-colliding hashed CSS/JS assets so active HTML / proxy caches never hit 404
if (fs.existsSync(preserveDir)) {
  copyTreeSafe(preserveDir, distStaticDir, { onlyNew: true });
  fs.rmSync(preserveDir, { recursive: true, force: true });
}

const standaloneDir = path.join(root, distDir, "standalone");
const standaloneNextDir = path.join(standaloneDir, distDir);
const staticDst = path.join(standaloneNextDir, "static");
const publicSrc = path.join(root, "public");
const publicDst = path.join(standaloneDir, "public");

if (fs.existsSync(standaloneDir)) {
  copyTreeSafe(distStaticDir, staticDst);
  copyTreeSafe(publicSrc, publicDst, { skipNames: new Set(["uploads"]) });
  // Ensure standalone never carries stale database or secret snapshots
  for (const stale of ["db", ".env", ".env.local"]) {
    fs.rmSync(path.join(standaloneDir, stale), { recursive: true, force: true });
  }
}

// When building into .next-blue, mirror hashed static CSS/JS chunks additively into .next/static
// so Nginx/reverse proxies aliasing /_next/static to .next/static continue serving styles cleanly.
if (distDir === ".next-blue") {
  const canonicalStatic = path.join(root, ".next", "static");
  copyTreeSafe(distStaticDir, canonicalStatic, {
    onlyNew: true,
    filterRel: isHashedStaticAsset,
  });
}

console.log(`[build-standalone] Next.js production bundle ready in ${distDir}.`);
