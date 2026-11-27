#!/usr/bin/env node
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const isWin = process.platform === "win32";

const buildRes = spawnSync(isWin ? "npx.cmd" : "npx", ["next", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: isWin,
  env: { ...process.env, NODE_ENV: "production" },
});

if (buildRes.status !== 0) {
  process.exit(buildRes.status ?? 1);
}

const standaloneDir = path.join(root, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const staticSrc = path.join(root, ".next", "static");
const staticDst = path.join(standaloneNextDir, "static");
const publicSrc = path.join(root, "public");
const publicDst = path.join(standaloneDir, "public");

if (fs.existsSync(standaloneDir)) {
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(standaloneNextDir, { recursive: true });
    fs.cpSync(staticSrc, staticDst, { recursive: true, force: true });
  }
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDst, { recursive: true, force: true });
  }
}

console.log("[build-standalone] Next.js production & standalone bundle ready.");
