#!/usr/bin/env node
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const isWin = process.platform === "win32";
const distDir = process.env.NEXT_DIST_DIR || ".next";

const buildRes = spawnSync(isWin ? "npx.cmd" : "npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
  env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: distDir },
});

if (buildRes.status !== 0) {
  process.exit(buildRes.status ?? 1);
}

function copyTreeSafe(src, dst, skipNames) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipNames && skipNames.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyTreeSafe(s, d);
    } else if (entry.isFile()) {
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

const standaloneDir = path.join(root, distDir, "standalone");
const standaloneNextDir = path.join(standaloneDir, distDir);
const staticSrc = path.join(root, distDir, "static");
const staticDst = path.join(standaloneNextDir, "static");
const publicSrc = path.join(root, "public");
const publicDst = path.join(standaloneDir, "public");

if (fs.existsSync(standaloneDir)) {
  copyTreeSafe(staticSrc, staticDst);
  copyTreeSafe(publicSrc, publicDst, new Set(["uploads"]));
  // Ensure standalone never carries stale database or secret snapshots
  for (const stale of ["db", ".env", ".env.local"]) {
    fs.rmSync(path.join(standaloneDir, stale), { recursive: true, force: true });
  }
}

console.log(`[build-standalone] Next.js production bundle ready in ${distDir}.`);
