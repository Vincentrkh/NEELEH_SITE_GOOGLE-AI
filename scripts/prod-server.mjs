#!/usr/bin/env node
/**
 * Neeleh Academy — Zero-Downtime Blue-Green Production Supervisor
 * Works cross-platform (Windows PowerShell, Linux, macOS, Docker) without PM2.
 *
 * - Listens on PORT (default 3000) and proxies traffic to an internal Next.js worker.
 * - Uses dual build slots (`.next` <-> `.next-blue`) so live updates build into the
 *   inactive directory with zero Windows file locks and zero broken chunks.
 * - Watches `db/.reload-trigger` (written after Git/updater builds the inactive slot).
 * - Starts the new worker on a fresh loopback port, waits for healthcheck pass,
 *   atomically swaps live traffic to the new worker (0ms downtime), and drains the old worker.
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import net from "net";
import path from "path";

const root = process.cwd();
const publicPort = Number(process.env.PORT || 3000);
const publicHost = process.env.HOSTNAME || "0.0.0.0";
const dbDir = path.join(root, "db");
const supervisorMetaPath = path.join(dbDir, ".supervisor.json");
const activeDistPath = path.join(dbDir, ".active-dist");
const reloadTriggerPath = path.join(dbDir, ".reload-trigger");
const ALLOWED_DISTS = new Set([".next", ".next-blue"]);

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

function hasBuild(distDir) {
  const hasEntry =
    fs.existsSync(path.join(root, distDir, "BUILD_ID")) ||
    fs.existsSync(path.join(root, distDir, "standalone", "server.js"));
  if (!hasEntry) return false;
  return hasCompiledCss(path.join(root, distDir, "static"));
}

function resolveInitialDist() {
  try {
    if (fs.existsSync(activeDistPath)) {
      const saved = fs.readFileSync(activeDistPath, "utf8").trim();
      if (ALLOWED_DISTS.has(saved) && hasBuild(saved)) {
        return saved;
      }
    }
  } catch {
    // ignore
  }
  if (hasBuild(".next")) return ".next";
  if (hasBuild(".next-blue")) return ".next-blue";
  return ".next";
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

function waitForWorkerHealthy(port, timeoutMs = 45_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Worker on port ${port} did not become healthy within ${timeoutMs}ms`));
        return;
      }
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/",
          method: "HEAD",
          timeout: 3_000,
        },
        (res) => {
          res.resume();
          resolve(true);
        },
      );
      req.on("error", () => {
        setTimeout(attempt, 350);
      });
      req.on("timeout", () => {
        req.destroy();
        setTimeout(attempt, 350);
      });
      req.end();
    };
    attempt();
  });
}

function resolveStandaloneDbUrl() {
  const current = process.env.DATABASE_URL || "";
  if (current.startsWith("postgres")) return current;
  return `file:${path.join(root, "db", "custom.db")}`;
}

function spawnNextWorker(port, distDir) {
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const standaloneEntry = path.join(root, distDir, "standalone", "server.js");

  const env = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NEXT_DIST_DIR: distDir,
    NEELEH_APP_ROOT: root,
    NEELEH_SUPERVISOR_PID: String(process.pid),
  };

  if (fs.existsSync(nextBin) && fs.existsSync(path.join(root, distDir, "BUILD_ID"))) {
    return spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"], {
      cwd: root,
      env,
      windowsHide: true,
      stdio: "inherit",
    });
  }

  if (fs.existsSync(standaloneEntry)) {
    return spawn(process.execPath, [standaloneEntry], {
      cwd: root,
      env: {
        ...env,
        DATABASE_URL: resolveStandaloneDbUrl(),
      },
      windowsHide: true,
      stdio: "inherit",
    });
  }

  return spawn(
    process.execPath,
    [nextBin, "start", "-p", String(port), "-H", "127.0.0.1"],
    {
      cwd: root,
      env,
      windowsHide: true,
      stdio: "inherit",
    },
  );
}

function writeSupervisorMeta(workerPort, activeDist) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(activeDistPath, activeDist, "utf8");
    fs.writeFileSync(
      supervisorMetaPath,
      JSON.stringify(
        {
          pid: process.pid,
          publicPort,
          workerPort,
          activeDist,
          updatedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch {
    // ignore
  }
}

function cleanupSupervisorMeta() {
  try {
    if (fs.existsSync(supervisorMetaPath)) {
      const parsed = JSON.parse(fs.readFileSync(supervisorMetaPath, "utf8"));
      if (parsed?.pid === process.pid) {
        fs.unlinkSync(supervisorMetaPath);
      }
    }
  } catch {
    // ignore
  }
}

let activeDist = resolveInitialDist();
let activeWorker = null; // { child, port, distDir }
let reloading = false;
let shuttingDown = false;
let lastTriggerStamp = "";

try {
  if (fs.existsSync(reloadTriggerPath)) {
    lastTriggerStamp = fs.readFileSync(reloadTriggerPath, "utf8");
  }
} catch {
  // ignore
}

async function startNewWorkerAndSwap(reason, requestedDist) {
  if (reloading || shuttingDown) return;
  reloading = true;
  const targetDist =
    requestedDist && ALLOWED_DISTS.has(requestedDist) && hasBuild(requestedDist)
      ? requestedDist
      : activeDist;

  try {
    const nextPort = await getFreePort();
    console.log(
      `[prod-server] Starting worker on 127.0.0.1:${nextPort} (dist=${targetDist}, reason=${reason})...`,
    );
    const child = spawnNextWorker(nextPort, targetDist);

    let earlyExited = false;
    child.once("exit", (code) => {
      earlyExited = true;
      if (activeWorker && activeWorker.child === child && !shuttingDown) {
        console.error(`[prod-server] Active worker exited unexpectedly (code=${code}); restarting...`);
        activeWorker = null;
        setTimeout(() => void startNewWorkerAndSwap("crash-recovery", activeDist), 500);
      }
    });

    await waitForWorkerHealthy(nextPort);
    if (earlyExited) {
      throw new Error("New worker exited before healthcheck completed");
    }

    const previous = activeWorker;
    activeWorker = { child, port: nextPort, distDir: targetDist };
    activeDist = targetDist;
    writeSupervisorMeta(nextPort, activeDist);
    console.log(`[prod-server] Live traffic switched seamlessly to port ${nextPort} (${activeDist}).`);

    if (previous && previous.child && !previous.child.killed) {
      setTimeout(() => {
        try {
          previous.child.kill("SIGTERM");
          setTimeout(() => {
            if (!previous.child.killed) previous.child.kill("SIGKILL");
          }, 5_000);
        } catch {
          // ignore
        }
      }, 3_000);
    }
  } catch (err) {
    console.error("[prod-server] Blue-green swap failed:", err instanceof Error ? err.message : err);
  } finally {
    reloading = false;
  }
}

const server = http.createServer((req, res) => {
  if (!activeWorker) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Server warming up" }));
    return;
  }

  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: activeWorker.port,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        "x-forwarded-host": req.headers["x-forwarded-host"] || req.headers.host || "",
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on("error", () => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.end("Upstream unavailable");
    } else {
      res.end();
    }
  });

  req.pipe(proxyReq, { end: true });
});

server.on("upgrade", (req, socket, head) => {
  if (!activeWorker) {
    socket.destroy();
    return;
  }
  const upstream = net.connect(activeWorker.port, "127.0.0.1", () => {
    const headerLines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headerLines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    upstream.write(headerLines.join("\r\n") + "\r\n\r\n");
    if (head && head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

function checkReloadTrigger() {
  if (shuttingDown || reloading) return;
  try {
    if (!fs.existsSync(reloadTriggerPath)) return;
    const raw = fs.readFileSync(reloadTriggerPath, "utf8");
    if (raw && raw !== lastTriggerStamp) {
      lastTriggerStamp = raw;
      let requestedDist = activeDist;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.distDir && ALLOWED_DISTS.has(parsed.distDir)) {
          requestedDist = parsed.distDir;
        }
      } catch {
        // ignore parse error
      }
      void startNewWorkerAndSwap("reload-trigger", requestedDist);
    }
  } catch {
    // ignore
  }
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[prod-server] Shutting down (${signal})...`);
  cleanupSupervisorMeta();
  server.close(() => {
    if (activeWorker && activeWorker.child && !activeWorker.child.killed) {
      try {
        activeWorker.child.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => void startNewWorkerAndSwap("SIGHUP", resolveInitialDist()));
process.on("SIGUSR2", () => void startNewWorkerAndSwap("SIGUSR2", resolveInitialDist()));
process.on("exit", cleanupSupervisorMeta);

await startNewWorkerAndSwap("boot", activeDist);

server.listen(publicPort, publicHost, () => {
  console.log(
    `[prod-server] Neeleh Academy listening on http://${publicHost}:${publicPort} (dist=${activeDist}, zero-downtime supervisor ready)`,
  );
});

const pollTimer = setInterval(checkReloadTrigger, 1_500);
pollTimer.unref();
