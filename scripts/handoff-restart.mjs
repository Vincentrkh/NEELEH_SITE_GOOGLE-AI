#!/usr/bin/env node
/**
 * Detached self-upgrade handoff helper:
 * Used once when an older production server (started directly via `next start` or
 * `.next/standalone/server.js` without `prod-server.mjs` or PM2) applies an update.
 *
 * 1. Waits briefly so the HTTP JSON response reaches the admin's browser.
 * 2. Persists `db/.active-dist` so the supervisor boots the newly built slot.
 * 3. Stops the old Node server PID so the public port (e.g. 3000) is freed.
 * 4. Spawns `scripts/prod-server.mjs` detached on the exact same port so this
 *    update AND all future updates run with 0ms Blue-Green swapping.
 */
import { spawn } from "child_process";
import fs from "fs";
import net from "net";
import path from "path";

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq > 2) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    }
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isPortFree(port, host = "0.0.0.0") {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.unref();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, host);
  });
}

function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const oldPid = Number(args["old-pid"] || 0);
  const port = Number(args.port || process.env.PORT || 3000);
  const host = process.env.HOSTNAME || "0.0.0.0";
  const root = args.root ? path.resolve(args.root) : process.cwd();
  const distDir = args["dist-dir"] || "";

  if (distDir === ".next" || distDir === ".next-blue") {
    try {
      fs.mkdirSync(path.join(root, "db"), { recursive: true });
      fs.writeFileSync(path.join(root, "db", ".active-dist"), distDir, "utf8");
    } catch {
      // ignore
    }
  }

  // Let the HTTP JSON response finish flushing to the client browser
  await sleep(900);

  if (oldPid > 0 && oldPid !== process.pid && isPidAlive(oldPid)) {
    try {
      process.kill(oldPid, "SIGTERM");
    } catch {
      // ignore
    }
    for (let i = 0; i < 20; i++) {
      if (!isPidAlive(oldPid)) break;
      await sleep(200);
    }
    if (isPidAlive(oldPid)) {
      try {
        process.kill(oldPid, "SIGKILL");
      } catch {
        // ignore
      }
    }
  }

  for (let i = 0; i < 30; i++) {
    if (await isPortFree(port, host)) break;
    await sleep(250);
  }

  const supervisorScript = path.join(root, "scripts", "prod-server.mjs");
  const child = spawn(process.execPath, [supervisorScript], {
    cwd: root,
    detached: true,
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: host,
      NEELEH_APP_ROOT: root,
    },
  });
  child.unref();
}

void main().finally(() => {
  setTimeout(() => process.exit(0), 200);
});
