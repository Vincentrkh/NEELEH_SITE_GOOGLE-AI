import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";
import { db } from "@/lib/db";
import {
  decryptSecret,
  validateGitBranchName,
  validateGitRepoUrl,
} from "@/lib/crypto-vault";

const execFileAsync = promisify(execFile);

export const UPDATE_BACKUP_DIR = path.join(os.tmpdir(), "neeleh-update-backups");

/**
 * Resolves the true project root whether running via `next dev`, `next start`,
 * or `node .next/standalone/server.js`.
 */
export function resolveAppRoot(): string {
  const cwd = process.cwd();
  if (
    fs.existsSync(path.join(cwd, "package.json")) &&
    fs.existsSync(path.join(cwd, "src"))
  ) {
    return cwd;
  }
  const parentTwo = path.resolve(cwd, "../..");
  if (
    fs.existsSync(path.join(parentTwo, "package.json")) &&
    fs.existsSync(path.join(parentTwo, "src"))
  ) {
    return parentTwo;
  }
  return cwd;
}

async function sha256File(filePath: string): Promise<string | null> {
  try {
    const buf = await fs.promises.readFile(filePath);
    return crypto.createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

export async function ensureUpdateConfig() {
  let cfg = await db.systemUpdateConfig.findUnique({ where: { key: "default" } });
  if (!cfg) {
    let headCommit: string | null = null;
    try {
      const root = resolveAppRoot();
      const pkg = JSON.parse(
        await fs.promises.readFile(path.join(root, "package.json"), "utf8"),
      ) as { version?: string };
      headCommit = pkg.version ? `v${pkg.version}` : null;
    } catch {
      headCommit = null;
    }
    cfg = await db.systemUpdateConfig.create({
      data: {
        key: "default",
        branch: "main",
        currentCommit: headCommit,
      },
    });
  }
  return cfg;
}

export async function getSafeUpdateStatus() {
  const cfg = await ensureUpdateConfig();
  const logs = await db.systemUpdateLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const root = resolveAppRoot();
  const hasGitDir = fs.existsSync(path.join(root, ".git"));
  const isProduction = process.env.NODE_ENV === "production";
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);
  const hasPm2 = Boolean(process.env.pm_id !== undefined || process.env.PM2_HOME);
  const hasSupervisor = isSupervisorActive(root);
  let pkgVersion = "0.2.1";
  try {
    const pkg = JSON.parse(
      await fs.promises.readFile(path.join(root, "package.json"), "utf8"),
    ) as { version?: string };
    if (pkg.version) pkgVersion = pkg.version;
  } catch {
    // ignore
  }

  return {
    config: {
      repoUrl: cfg.repoUrl,
      branch: cfg.branch,
      authMethod: cfg.authMethod,
      hasToken: Boolean(cfg.encryptedToken),
      tokenHint: cfg.tokenHint,
      hasWebhookSecret: Boolean(cfg.encryptedWebhookKey || process.env.UPDATE_WEBHOOK_SECRET?.trim()),
      webhookHint: cfg.webhookHint,
      autoCheckEnabled: cfg.autoCheckEnabled,
      autoApplyEnabled: cfg.autoApplyEnabled,
      checkIntervalMins: cfg.checkIntervalMins,
      preserveDataPaths: cfg.preserveDataPaths,
      currentCommit: cfg.currentCommit,
      remoteCommit: cfg.remoteCommit,
      remoteCommitMessage: cfg.remoteCommitMessage,
      remoteCommitAuthor: cfg.remoteCommitAuthor,
      remoteCommitDate: cfg.remoteCommitDate?.toISOString() ?? null,
      pendingUpdatesCount: cfg.pendingUpdatesCount,
      lastCheckedAt: cfg.lastCheckedAt?.toISOString() ?? null,
      lastUpdatedAt: cfg.lastUpdatedAt?.toISOString() ?? null,
      lastStatus: cfg.lastStatus,
      lastError: cfg.lastError,
    },
    environment: {
      hasGitDir,
      appVersion: pkgVersion,
      dbEngine: process.env.DATABASE_URL?.startsWith("postgres") ? "PostgreSQL" : "SQLite",
      runtimeMode: isProduction ? "production" : "development",
      isCloudRun,
      hasPm2,
      hasSupervisor,
      platform: process.platform,
    },
    logs: logs.map((l) => ({
      id: l.id,
      trigger: l.trigger,
      status: l.status,
      fromCommit: l.fromCommit,
      toCommit: l.toCommit,
      hasBackup: Boolean(l.backupPath && fs.existsSync(l.backupPath)),
      summary: l.summary,
      errorMessage: l.errorMessage,
      durationMs: l.durationMs,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

const IS_WIN = process.platform === "win32";

function isSupervisorActive(root: string): boolean {
  const envPid = Number(process.env.NEELEH_SUPERVISOR_PID || 0);
  const candidates: number[] = [];
  if (envPid > 0) candidates.push(envPid);
  try {
    const metaPath = path.join(root, "db", ".supervisor.json");
    if (fs.existsSync(metaPath)) {
      const parsed = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { pid?: number };
      if (parsed.pid && parsed.pid > 0) candidates.push(parsed.pid);
    }
  } catch {
    // ignore
  }
  for (const pid of candidates) {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      // process not running
    }
  }
  return false;
}

async function execCmd(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {},
) {
  return execFileAsync(cmd, args, {
    cwd: opts.cwd,
    env: opts.env,
    timeout: opts.timeout,
    shell: IS_WIN && (cmd === "npm" || cmd === "npx" || cmd === "pm2"),
  });
}

export async function createPreUpdateSnapshot(): Promise<string> {
  const root = resolveAppRoot();
  await fs.promises.mkdir(UPDATE_BACKUP_DIR, { recursive: true });
  const zipPath = path.join(UPDATE_BACKUP_DIR, `pre-update-${Date.now()}.zip`);
  const scriptPath = path.join(root, "scripts", "create-backup-zip.py");

  for (const py of IS_WIN ? ["python", "python3"] : ["python3", "python"]) {
    try {
      await execFileAsync(py, [scriptPath, zipPath], { cwd: root, timeout: 120_000 });
      return zipPath;
    } catch {
      // try next python binary or PowerShell fallback
    }
  }

  if (IS_WIN) {
    const safeTargets = ["src", "prisma", "public", "scripts", "package.json", "db\\custom.db"]
      .filter((rel) => fs.existsSync(path.join(root, rel)))
      .map((rel) => `'${rel}'`)
      .join(", ");
    await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path ${safeTargets} -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
      ],
      { cwd: root, timeout: 120_000 },
    );
    return zipPath;
  }

  throw new Error("Python 3 is required to create pre-update archive.");
}

export async function checkForRemoteUpdates(params: {
  trigger: "MANUAL" | "SCHEDULED" | "WEBHOOK";
  actorId?: string | null;
}) {
  const startedAt = Date.now();
  const cfg = await ensureUpdateConfig();

  if (!cfg.repoUrl.trim()) {
    return {
      ok: false,
      error: "آدرس مخزن گیت تنظیم نشده است.",
      errorEn: "Git repository URL is not configured.",
    };
  }

  const repoCheck = validateGitRepoUrl(cfg.repoUrl);
  if (!repoCheck.ok) {
    return { ok: false, error: repoCheck.error, errorEn: repoCheck.error };
  }
  if (!validateGitBranchName(cfg.branch)) {
    return { ok: false, error: "نام شاخه (Branch) نامعتبر است.", errorEn: "Invalid branch name." };
  }

  const dbToken = cfg.authMethod === "PAT" ? decryptSecret(cfg.encryptedToken) : "";
  const envToken = cfg.authMethod === "PAT" && !dbToken ? (process.env.GITHUB_UPDATE_TOKEN?.trim() || "") : "";
  const token = dbToken || envToken;

  let remoteSha = "";
  let commitMessage = "";
  let commitAuthor = "";
  let commitDate: Date | null = null;

  try {
    if (repoCheck.githubOwnerRepo) {
      const apiUrl = `https://api.github.com/repos/${repoCheck.githubOwnerRepo}/commits/${encodeURIComponent(cfg.branch)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      try {
        let res = await fetch(apiUrl, {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "neeleh-academy-updater",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (res.status === 401 && !dbToken && envToken) {
          // Stale container env token should never block public GitHub repositories
          res = await fetch(apiUrl, {
            headers: {
              Accept: "application/vnd.github+json",
              "User-Agent": "neeleh-academy-updater",
            },
            signal: controller.signal,
          });
        }
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          if (res.status === 401) {
            throw new Error(
              "توکن دسترسی گیت (PAT) نامعتبر یا منقضی شده است (GitHub 401). اگر مخزن عمومی است، نوع دسترسی را روی «عمومی (Public HTTPS)» بگذارید؛ در غیر این صورت توکن جدید معتبر وارد کنید.",
            );
          }
          throw new Error(`GitHub API HTTP ${res.status}: ${msg.slice(0, 140)}`);
        }
        const json = (await res.json()) as {
          sha?: string;
          commit?: {
            message?: string;
            author?: { name?: string; date?: string };
          };
        };
        remoteSha = (json.sha ?? "").slice(0, 12);
        commitMessage = (json.commit?.message ?? "").split("\n")[0].slice(0, 200);
        commitAuthor = (json.commit?.author?.name ?? "").slice(0, 100);
        if (json.commit?.author?.date) {
          const parsed = new Date(json.commit.author.date);
          if (!Number.isNaN(parsed.getTime())) commitDate = parsed;
        }
      } finally {
        clearTimeout(timer);
      }
    } else {
      // Generic HTTPS Git remote via git ls-remote without shell interpolation
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
      };
      if (token) {
        const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
        env.GIT_CONFIG_COUNT = "1";
        env.GIT_CONFIG_KEY_0 = "http.extraHeader";
        env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${basic}`;
      }
      const { stdout } = await execCmd(
        "git",
        ["ls-remote", repoCheck.normalized, `refs/heads/${cfg.branch}`],
        { env, timeout: 15_000 },
      );
      const firstLine = stdout.trim().split("\n")[0] ?? "";
      remoteSha = firstLine.split(/\s+/)[0]?.slice(0, 12) ?? "";
      if (!remoteSha) {
        throw new Error(`Branch '${cfg.branch}' not found in remote repository`);
      }
      commitMessage = `Remote HEAD (${cfg.branch})`;
    }

    const updateAvailable = Boolean(
      remoteSha && cfg.currentCommit !== remoteSha,
    );
    const nextStatus = updateAvailable ? "UPDATE_AVAILABLE" : "UP_TO_DATE";

    await db.systemUpdateConfig.update({
      where: { id: cfg.id },
      data: {
        remoteCommit: remoteSha,
        remoteCommitMessage: commitMessage || null,
        remoteCommitAuthor: commitAuthor || null,
        remoteCommitDate: commitDate,
        pendingUpdatesCount: updateAvailable ? 1 : 0,
        lastCheckedAt: new Date(),
        lastStatus: nextStatus,
        lastError: null,
      },
    });

    await db.systemUpdateLog.create({
      data: {
        trigger: params.trigger,
        status: updateAvailable ? "UPDATE_AVAILABLE" : "UP_TO_DATE",
        fromCommit: cfg.currentCommit,
        toCommit: remoteSha,
        summary: updateAvailable
          ? `بروزرسانی جدید شناسایی شد (${remoteSha}): ${commitMessage}`
          : `سیستم به‌روز است (${remoteSha})`,
        durationMs: Date.now() - startedAt,
        actorId: params.actorId ?? null,
      },
    });

    return {
      ok: true,
      updateAvailable,
      remoteCommit: remoteSha,
      commitMessage,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to inspect remote repository";
    await db.systemUpdateConfig.update({
      where: { id: cfg.id },
      data: {
        lastCheckedAt: new Date(),
        lastStatus: "ERROR",
        lastError: msg.slice(0, 240),
      },
    });
    await db.systemUpdateLog.create({
      data: {
        trigger: params.trigger,
        status: "FAILED",
        fromCommit: cfg.currentCommit,
        summary: "خطا در بررسی مخزن گیت",
        errorMessage: msg.slice(0, 240),
        durationMs: Date.now() - startedAt,
        actorId: params.actorId ?? null,
      },
    });
    return { ok: false, error: msg, errorEn: msg };
  }
}

async function syncDirectoryDiffAware(
  srcDir: string,
  dstDir: string,
  relPrefix: string,
  changedFiles: string[],
  now: Date,
  skipNames?: Set<string>,
) {
  await fs.promises.mkdir(dstDir, { recursive: true });
  const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (skipNames?.has(entry.name)) continue;
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const childSkip = entry.name === "public" && !relPrefix ? new Set(["uploads"]) : undefined;
      await syncDirectoryDiffAware(srcPath, dstPath, relPath, changedFiles, now, childSkip);
    } else if (entry.isSymbolicLink()) {
      const linkTarget = await fs.promises.readlink(srcPath);
      await fs.promises.rm(dstPath, { force: true }).catch(() => {});
      await fs.promises.symlink(linkTarget, dstPath);
      changedFiles.push(relPath);
    } else if (entry.isFile()) {
      const srcBuf = await fs.promises.readFile(srcPath);
      const srcHash = crypto.createHash("sha256").update(srcBuf).digest("hex");
      const dstHash = await sha256File(dstPath);
      if (srcHash !== dstHash) {
        await fs.promises.writeFile(dstPath, srcBuf);
        await fs.promises.utimes(dstPath, now, now).catch(() => {});
        changedFiles.push(relPath);
      }
    }
  }
}

async function detectPm2AppName(): Promise<string | null> {
  if (process.env.pm_id === undefined && !process.env.PM2_HOME) return null;
  if (process.env.PM2_APP_NAME?.trim()) return process.env.PM2_APP_NAME.trim();
  if (process.env.name?.trim()) return process.env.name.trim();
  try {
    const { stdout } = await execCmd("pm2", ["jlist"], { timeout: 5_000 });
    const list = JSON.parse(stdout) as Array<{ name?: string; pid?: number }>;
    const match = list.find((item) => item.pid === process.pid);
    return match?.name || list[0]?.name || null;
  } catch {
    return null;
  }
}

/**
 * Protected zero-downtime data-preserving update execution:
 * 1. Creates a full snapshot backup (DB + uploads + code) in system temp BEFORE any sync.
 * 2. Preserves protected paths (`db/custom.db`, `public/uploads`, `.env`, `db/.session_secret`).
 * 3. Diff-syncs changed source/public/config files and refreshes mtime so Next.js detects changes.
 * 4. Installs dependencies if `package.json` changed and runs safe additive `prisma db push` + `prisma generate`.
 * 5. In production, runs `npm run build` (`.next` + `.next/standalone`) and triggers PM2/custom reload when available.
 *    Honestly reports whether live traffic was reloaded or requires a server restart / re-publish.
 */
export async function applyZeroDowntimeUpdate(params: {
  trigger: "MANUAL" | "SCHEDULED" | "WEBHOOK";
  actorId?: string | null;
}) {
  const startedAt = Date.now();
  const cfg = await ensureUpdateConfig();

  const checkRes = await checkForRemoteUpdates(params);
  if (!checkRes.ok) {
    return checkRes;
  }

  const freshCfg = await ensureUpdateConfig();
  const targetCommit = freshCfg.remoteCommit || checkRes.remoteCommit || "";
  if (!targetCommit) {
    return {
      ok: false,
      error: "شناسه کامیت مقصد در دسترس نیست.",
      errorEn: "Remote commit hash unavailable.",
    };
  }

  let backupPath = "";
  const root = resolveAppRoot();
  const hasGitDir = fs.existsSync(path.join(root, ".git"));
  const repoCheck = validateGitRepoUrl(freshCfg.repoUrl);
  if (!repoCheck.ok) {
    return { ok: false, error: repoCheck.error, errorEn: repoCheck.error };
  }
  const dbToken = freshCfg.authMethod === "PAT" ? decryptSecret(freshCfg.encryptedToken) : "";
  const envToken = freshCfg.authMethod === "PAT" && !dbToken ? (process.env.GITHUB_UPDATE_TOKEN?.trim() || "") : "";
  const token = dbToken || envToken;

  const isProduction = process.env.NODE_ENV === "production";
  const isCloudRun = Boolean(process.env.K_SERVICE || process.env.K_REVISION);

  await db.systemUpdateConfig.update({
    where: { id: freshCfg.id },
    data: { lastStatus: "UPDATING", lastError: null },
  });

  try {
    // Step 1: Mandatory pre-update data backup
    backupPath = await createPreUpdateSnapshot();

    const pkgHashBefore = await sha256File(path.join(root, "package.json"));
    const schemaHashBefore = await sha256File(path.join(root, "prisma", "schema.prisma"));
    const changedFiles: string[] = [];

    if (hasGitDir) {
      // Step 2A: Native Git repository pull while preserving db/ & public/uploads/ & .env
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
      };
      if (token) {
        const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
        env.GIT_CONFIG_COUNT = "1";
        env.GIT_CONFIG_KEY_0 = "http.extraHeader";
        env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${basic}`;
      }
      await execCmd(
        "git",
        ["fetch", repoCheck.normalized, freshCfg.branch],
        { cwd: root, env, timeout: 60_000 },
      );
      const { stdout: diffOut } = await execCmd(
        "git",
        ["diff", "--name-only", "HEAD", "FETCH_HEAD"],
        { cwd: root, env, timeout: 15_000 },
      ).catch(() => ({ stdout: "" }));
      for (const line of diffOut.split("\n")) {
        const clean = line.trim();
        if (clean) changedFiles.push(clean);
      }
      await execCmd(
        "git",
        ["checkout", "-B", freshCfg.branch, "FETCH_HEAD"],
        { cwd: root, env, timeout: 30_000 },
      );
    } else {
      // Step 2B: Staging sync (container-friendly, zero DB/uploads loss)
      const stagingDir = path.join(os.tmpdir(), `neeleh-stage-${Date.now()}`);
      const extractDir = path.join(stagingDir, "extracted");
      await fs.promises.mkdir(extractDir, { recursive: true });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45_000);
      try {
        if (repoCheck.githubOwnerRepo) {
          const tarUrl = `https://api.github.com/repos/${repoCheck.githubOwnerRepo}/tarball/${encodeURIComponent(freshCfg.branch)}`;
          let res = await fetch(tarUrl, {
            headers: {
              Accept: "application/vnd.github+json",
              "User-Agent": "neeleh-academy-updater",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          });
          if (res.status === 401 && !dbToken && envToken) {
            res = await fetch(tarUrl, {
              headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "neeleh-academy-updater",
              },
              signal: controller.signal,
            });
          }
          if (!res.ok) {
            if (res.status === 401) {
              throw new Error(
                "توکن دسترسی گیت (PAT) نامعتبر یا منقضی شده است (GitHub 401).",
              );
            }
            throw new Error(`Tarball download failed with HTTP ${res.status}`);
          }
          const buf = Buffer.from(await res.arrayBuffer());
          const tarFile = path.join(stagingDir, "release.tar.gz");
          await fs.promises.writeFile(tarFile, buf);
          await execCmd(
            "tar",
            ["-xzf", tarFile, "-C", extractDir, "--strip-components=1"],
            { timeout: 30_000 },
          );
        } else {
          // Generic HTTPS Git remote (GitLab / Gitea / Bitbucket / Self-hosted)
          const env: NodeJS.ProcessEnv = {
            ...process.env,
            GIT_TERMINAL_PROMPT: "0",
          };
          if (token) {
            const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
            env.GIT_CONFIG_COUNT = "1";
            env.GIT_CONFIG_KEY_0 = "http.extraHeader";
            env.GIT_CONFIG_VALUE_0 = `Authorization: Basic ${basic}`;
          }
          await execCmd(
            "git",
            ["clone", "--depth", "1", "--branch", freshCfg.branch, repoCheck.normalized, extractDir],
            { env, timeout: 60_000 },
          );
        }

        // Only sync non-data project directories if repo actually contains full Next.js app (has src/ & package.json)
        const hasAppCode =
          fs.existsSync(path.join(extractDir, "package.json")) &&
          fs.existsSync(path.join(extractDir, "src"));

        if (!hasAppCode) {
          throw new Error(
            "مخزن گیت فاقد فایل‌های اصلی پروژه (src و package.json) است؛ برای جلوگیری از آسیب به سایت، جایگزینی انجام نشد.",
          );
        }

        const protectedTop = new Set([
          "db",
          ".env",
          ".env.local",
          ".next",
          "node_modules",
          "backups",
          ".git",
          ".aistudio",
        ]);
        await syncDirectoryDiffAware(
          extractDir,
          root,
          "",
          changedFiles,
          new Date(),
          protectedTop,
        );
      } finally {
        clearTimeout(timer);
        await fs.promises.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    // Step 3A: Install dependencies only if package.json changed
    const pkgHashAfter = await sha256File(path.join(root, "package.json"));
    if (pkgHashAfter && pkgHashAfter !== pkgHashBefore) {
      await execCmd("npm", ["install", "--no-audit", "--no-fund"], {
        cwd: root,
        timeout: 180_000,
      });
    }

    // Step 3B: Safe additive schema sync & Prisma client regen
    const schemaHashAfter = await sha256File(path.join(root, "prisma", "schema.prisma"));
    if (schemaHashAfter && schemaHashAfter !== schemaHashBefore) {
      await execCmd("npx", ["prisma", "db", "push"], {
        cwd: root,
        timeout: 90_000,
      });
      await execCmd("npx", ["prisma", "generate"], {
        cwd: root,
        timeout: 90_000,
      });
    } else {
      await execCmd("npx", ["prisma", "db", "push"], {
        cwd: root,
        timeout: 60_000,
      }).catch(() => {});
    }

    // Step 4: Production build & zero-downtime reload handling
    let built = false;
    let reloaded = false;
    let reloadMethod: "dev-live" | "supervisor" | "pm2" | "custom" | "restart-required" = "dev-live";

    if (isProduction) {
      await execCmd("npm", ["run", "build"], {
        cwd: root,
        timeout: 240_000,
      });
      built = true;

      const pm2Name = await detectPm2AppName();
      const supervisorActive = isSupervisorActive(root);
      const customRestartCmd = process.env.UPDATE_RESTART_CMD?.trim();

      if (pm2Name) {
        reloadMethod = "pm2";
        reloaded = true;
        setTimeout(() => {
          void execCmd("pm2", ["reload", pm2Name, "--update-env"], { cwd: root }).catch(() => {});
        }, 700);
      } else if (supervisorActive) {
        reloadMethod = "supervisor";
        reloaded = true;
        const triggerFile = path.join(root, "db", ".reload-trigger");
        await fs.promises.writeFile(
          triggerFile,
          JSON.stringify({ commit: targetCommit, triggeredAt: new Date().toISOString() }),
          "utf8",
        );
      } else if (customRestartCmd) {
        reloadMethod = "custom";
        reloaded = true;
        setTimeout(() => {
          execFile(
            IS_WIN ? "powershell" : "/bin/bash",
            IS_WIN ? ["-NoProfile", "-Command", customRestartCmd] : ["-lc", customRestartCmd],
            { cwd: root },
            () => {},
          );
        }, 700);
      } else {
        reloadMethod = "restart-required";
        reloaded = false;
      }
    } else {
      // Dev runtime watches src/ directly on next request
      reloadMethod = "dev-live";
      reloaded = true;
    }

    const changedCount = changedFiles.length;
    const samplePaths = changedFiles.slice(0, 4).join("، ");
    const needsRestart = isProduction && !reloaded;

    let summary = "";
    let userMessage = "";
    if (changedCount === 0 && !isProduction) {
      summary = `فایل‌های مخزن با نسخه فعلی یکسان بودند (${targetCommit}) — تغییری روی فایل‌های پروژه وجود نداشت.`;
      userMessage = summary;
    } else if (needsRestart && isCloudRun) {
      summary = `${changedCount} فایل همگام‌سازی و بیلد شد (${targetCommit})، اما روی سرویس Cloud Run/Shared پیش‌نمایش برای اعمال روی ترافیک زنده باید Publish مجدد شود (${samplePaths}).`;
      userMessage = `تغییرات (${changedCount} فایل) دریافت و بیلد شدند، اما در محیط Shared App (Cloud Run) فرآیند سرور به‌صورت خودکار ری‌استارت نمی‌شود؛ برای دیدن تغییر در سایت اصلی باید اپلیکیشن را دوباره Publish کنید یا روی سرور با اسکریپت npm run start اجرا نمایید.`;
    } else if (needsRestart) {
      summary = `${changedCount} فایل بروز شد و بیلد تولیدی ساخته شد (${targetCommit})؛ برای فعال‌سازی روی ترافیک زنده سرویس را با npm run start اجرا کنید یا یک‌بار ری‌استارت نمایید.`;
      userMessage = `${changedCount} فایل بروزرسانی و بیلد شدند. چون سوپروایزر داخلی (npm run start) یا PM2 فعال نیست، یک‌بار سرویس سرور را ری‌استارت کنید.`;
    } else if (isProduction && reloadMethod === "supervisor") {
      summary = `${changedCount} فایل همگام‌سازی، بیلد و توسط سوپروایزر داخلی بدون قطعی جایگزین شد (${targetCommit}): ${samplePaths}`;
      userMessage = `بروزرسانی کامل انجام شد (${changedCount} فایل تغییر یافت، بیلد جدید ساخته شد و سرویس بدون قطعی به‌طور خودکار ریلود شد).`;
    } else if (isProduction) {
      summary = `${changedCount} فایل همگام‌سازی، بیلد و بدون قطعی ریلود شد (${targetCommit}): ${samplePaths}`;
      userMessage = `بروزرسانی کامل انجام شد (${changedCount} فایل تغییر یافت، بیلد جدید ساخته شد و سرویس بدون قطعی ریلود شد).`;
    } else {
      summary = `${changedCount} فایل از مخزن بروز شد (${targetCommit}): ${samplePaths}`;
      userMessage = `${changedCount} فایل با موفقیت از مخزن روی محیط توسعه اعمال شد. صفحه سایت اصلی را رفرش کامل (Ctrl+F5) کنید.`;
    }

    await db.systemUpdateConfig.update({
      where: { id: freshCfg.id },
      data: {
        currentCommit: targetCommit,
        pendingUpdatesCount: 0,
        lastUpdatedAt: new Date(),
        lastStatus: needsRestart ? "RESTART_REQUIRED" : "UP_TO_DATE",
        lastError: null,
      },
    });

    await db.systemUpdateLog.create({
      data: {
        trigger: params.trigger,
        status: needsRestart ? "RESTART_REQUIRED" : "SUCCESS",
        fromCommit: freshCfg.currentCommit,
        toCommit: targetCommit,
        backupPath,
        summary: summary.slice(0, 350),
        durationMs: Date.now() - startedAt,
        actorId: params.actorId ?? null,
      },
    });

    return {
      ok: true,
      toCommit: targetCommit,
      backupCreated: true,
      changedFilesCount: changedCount,
      changedFilesSample: changedFiles.slice(0, 6),
      built,
      reloaded,
      reloadMethod,
      needsRestart,
      isCloudRun,
      message: userMessage,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    await db.systemUpdateConfig.update({
      where: { id: freshCfg.id },
      data: {
        lastStatus: "ERROR",
        lastError: msg.slice(0, 240),
      },
    });
    await db.systemUpdateLog.create({
      data: {
        trigger: params.trigger,
        status: "FAILED",
        fromCommit: freshCfg.currentCommit,
        toCommit: targetCommit,
        backupPath: backupPath || null,
        summary: "بروزرسانی متوقف شد — دیتابیس و نسخه فعلی بدون تغییر حفظ شدند.",
        errorMessage: msg.slice(0, 240),
        durationMs: Date.now() - startedAt,
        actorId: params.actorId ?? null,
      },
    });
    return { ok: false, error: msg, errorEn: msg };
  }
}

export async function rollbackDatabaseFromLog(logId: string, actorId: string) {
  const log = await db.systemUpdateLog.findUnique({ where: { id: logId } });
  if (!log || !log.backupPath) {
    return { ok: false, error: "فایل بکاپ برای این رکورد یافت نشد.", errorEn: "Backup archive not found." };
  }
  const resolved = path.resolve(log.backupPath);
  const baseDir = path.resolve(UPDATE_BACKUP_DIR);
  if (!resolved.startsWith(baseDir + path.sep) || !fs.existsSync(resolved)) {
    return { ok: false, error: "مسیر بکاپ معتبر یا موجود نیست.", errorEn: "Invalid or missing backup file." };
  }

  const startedAt = Date.now();
  const root = resolveAppRoot();
  const extractTmp = path.join(os.tmpdir(), `neeleh-rollback-${Date.now()}`);
  try {
    await fs.promises.mkdir(extractTmp, { recursive: true });
    let extractedOk = false;
    for (const py of IS_WIN ? ["python", "python3"] : ["python3", "python"]) {
      try {
        await execFileAsync(
          py,
          [
            "-c",
            "import sys, zipfile; z=zipfile.ZipFile(sys.argv[1]); z.extractall(sys.argv[2])",
            resolved,
            extractTmp,
          ],
          { timeout: 60_000 },
        );
        extractedOk = true;
        break;
      } catch {
        // try next
      }
    }
    if (!extractedOk && IS_WIN) {
      await execFileAsync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -Path '${resolved.replace(/'/g, "''")}' -DestinationPath '${extractTmp.replace(/'/g, "''")}' -Force`,
        ],
        { timeout: 60_000 },
      );
      extractedOk = true;
    }
    if (!extractedOk) {
      throw new Error("Could not extract backup zip archive.");
    }
    const candidates = [
      path.join(extractTmp, "neeleh-academy", "db", "custom.db"),
      path.join(extractTmp, "db", "custom.db"),
      path.join(extractTmp, "custom.db"),
    ];
    const extractedDb = candidates.find((c) => fs.existsSync(c));
    const targetDb = path.join(root, "db", "custom.db");
    if (extractedDb) {
      await fs.promises.copyFile(extractedDb, targetDb);
    }

    await db.systemUpdateLog.create({
      data: {
        trigger: "ROLLBACK",
        status: "ROLLED_BACK",
        fromCommit: log.toCommit,
        toCommit: log.fromCommit,
        backupPath: resolved,
        summary: `بازگردانی دیتابیس از بکاپ پیش از بروزرسانی (${log.fromCommit ?? "snapshot"})`,
        durationMs: Date.now() - startedAt,
        actorId,
      },
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Rollback failed";
    return { ok: false, error: msg, errorEn: msg };
  } finally {
    await fs.promises.rm(extractTmp, { recursive: true, force: true }).catch(() => {});
  }
}

const globalForScheduler = globalThis as unknown as {
  __neelehUpdateSchedulerStarted?: boolean;
  __neelehUpdateCheckInFlight?: boolean;
};

/**
 * In-process periodic update scheduler: checks every 60s whether `autoCheckEnabled`
 * is due according to `checkIntervalMins`, and auto-applies when `autoApplyEnabled` is true.
 */
export function startPeriodicUpdateScheduler() {
  if (globalForScheduler.__neelehUpdateSchedulerStarted) return;
  globalForScheduler.__neelehUpdateSchedulerStarted = true;

  const timer = setInterval(async () => {
    if (globalForScheduler.__neelehUpdateCheckInFlight) return;
    globalForScheduler.__neelehUpdateCheckInFlight = true;
    try {
      const cfg = await ensureUpdateConfig();
      if (!cfg.autoCheckEnabled || !cfg.repoUrl.trim()) return;
      const intervalMs = Math.max(15, cfg.checkIntervalMins) * 60_000;
      const lastMs = cfg.lastCheckedAt?.getTime() ?? 0;
      if (Date.now() - lastMs < intervalMs) return;

      if (cfg.autoApplyEnabled) {
        await applyZeroDowntimeUpdate({ trigger: "SCHEDULED" });
      } else {
        await checkForRemoteUpdates({ trigger: "SCHEDULED" });
      }
    } catch {
      // Never crash background scheduler loop
    } finally {
      globalForScheduler.__neelehUpdateCheckInFlight = false;
    }
  }, 60_000);

  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
