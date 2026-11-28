import crypto from "crypto";
import { execFile, spawn } from "child_process";
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

import {
  LEGACY_UPDATE_BACKUP_DIR,
  deleteSafeBackupArchive,
  ensureWritableBackupDir,
  extractAndRestoreBackupArchive,
  isPathInsideAllowedBackupDirs,
  listBackupArchives,
  resolveSafeBackupPath,
} from "@/lib/backup-manager";

const execFileAsync = promisify(execFile);

export const UPDATE_BACKUP_DIR = LEGACY_UPDATE_BACKUP_DIR;

function isAppRootCandidate(dir: string): boolean {
  const parts = path.resolve(dir).split(path.sep);
  if (parts.includes(".next") || parts.includes(".next-blue") || parts.includes(".next-live")) {
    return false;
  }
  return (
    fs.existsSync(path.join(dir, "package.json")) &&
    fs.existsSync(path.join(dir, "src"))
  );
}

/**
 * Resolves the true project root whether running via `next dev`, `next start`,
 * or `.next/standalone/server.js` (which changes cwd to `.next/standalone`).
 */
export function resolveAppRoot(): string {
  const envRoot = process.env.NEELEH_APP_ROOT?.trim();
  if (envRoot && isAppRootCandidate(envRoot)) {
    return path.resolve(envRoot);
  }
  let cur = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (isAppRootCandidate(cur)) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return process.cwd();
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

  const archives = await listBackupArchives(root);
  const logByFile = new Map<
    string,
    { trigger: string; commit: string | null; summary: string | null }
  >();
  for (const l of logs) {
    if (l.backupPath) {
      logByFile.set(path.basename(l.backupPath), {
        trigger: l.trigger,
        commit: l.toCommit || l.fromCommit,
        summary: l.summary,
      });
    }
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
    backups: archives.map((a) => {
      const matched = logByFile.get(a.filename);
      return {
        filename: a.filename,
        source: a.source,
        sizeBytes: a.sizeBytes,
        createdAt: a.createdAt,
        modifiedAt: a.modifiedAt,
        trigger: matched?.trigger ?? null,
        commit: matched?.commit ?? null,
      };
    }),
  };
}

const IS_WIN = process.platform === "win32";

function readSupervisorMeta(root: string): { pid?: number; activeDist?: string } | null {
  try {
    const metaPath = path.join(root, "db", ".supervisor.json");
    if (!fs.existsSync(metaPath)) return null;
    return JSON.parse(fs.readFileSync(metaPath, "utf8")) as { pid?: number; activeDist?: string };
  } catch {
    return null;
  }
}

function isSupervisorActive(root: string): boolean {
  const envPid = Number(process.env.NEELEH_SUPERVISOR_PID || 0);
  const candidates: number[] = [];
  if (envPid > 0) candidates.push(envPid);
  const meta = readSupervisorMeta(root);
  if (meta?.pid && meta.pid > 0) candidates.push(meta.pid);
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

function readActiveDist(root: string): ".next" | ".next-blue" {
  const envDist = process.env.NEXT_DIST_DIR?.trim();
  if (envDist === ".next" || envDist === ".next-blue") return envDist;
  if (isSupervisorActive(root)) {
    const meta = readSupervisorMeta(root);
    if (meta?.activeDist === ".next" || meta?.activeDist === ".next-blue") {
      return meta.activeDist;
    }
  }
  try {
    const saved = fs.readFileSync(path.join(root, "db", ".active-dist"), "utf8").trim();
    if (saved === ".next" || saved === ".next-blue") return saved;
  } catch {
    // ignore
  }
  return ".next";
}

function detectCurrentPort(): string {
  if (process.env.PORT?.trim()) return process.env.PORT.trim();
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if ((arg === "-p" || arg === "--port") && process.argv[i + 1]) {
      return process.argv[i + 1];
    }
    if (arg.startsWith("--port=")) {
      return arg.slice("--port=".length);
    }
  }
  return "3000";
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
    maxBuffer: 16 * 1024 * 1024,
    shell: IS_WIN && (cmd === "npm" || cmd === "npx" || cmd === "pm2"),
  });
}

function buildGitArgs(root: string, args: string[]): string[] {
  const normRoot = root.replace(/\\/g, "/");
  return ["-c", "safe.directory=*", "-c", `safe.directory=${normRoot}`, ...args];
}

export async function createPreUpdateSnapshot(prefix = "pre-update"): Promise<string> {
  const root = resolveAppRoot();
  const targetDir = await ensureWritableBackupDir(root);
  const safePrefix = /^[a-zA-Z0-9_-]+$/.test(prefix) ? prefix : "snapshot";
  const zipPath = path.join(targetDir, `${safePrefix}-${Date.now()}.zip`);
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
  skipLog?: boolean;
  preserveStatus?: boolean;
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
        buildGitArgs(resolveAppRoot(), ["ls-remote", repoCheck.normalized, `refs/heads/${cfg.branch}`]),
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
        ...(params.preserveStatus ? {} : { lastStatus: nextStatus }),
        lastError: null,
      },
    });

    if (!params.skipLog) {
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
    }

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
    if (!params.skipLog) {
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
    }
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
async function updateStageLog(logId: string | null, summary: string, toCommit?: string | null) {
  if (!logId) return;
  await db.systemUpdateLog
    .update({
      where: { id: logId },
      data: {
        summary: summary.slice(0, 350),
        ...(toCommit ? { toCommit } : {}),
      },
    })
    .catch(() => {});
}

export async function applyZeroDowntimeUpdate(params: {
  trigger: "MANUAL" | "SCHEDULED" | "WEBHOOK";
  actorId?: string | null;
  existingLogId?: string | null;
}) {
  const startedAt = Date.now();
  const cfg = await ensureUpdateConfig();
  let activeLogId: string | null = params.existingLogId ?? null;

  await updateStageLog(activeLogId, "۰/۴ در حال بررسی آخرین تغییرات مخزن گیت...");
  const checkRes = await checkForRemoteUpdates({
    ...params,
    skipLog: true,
    preserveStatus: true,
  });
  if (!checkRes.ok) {
    const errMsg = ("error" in checkRes && checkRes.error) ? String(checkRes.error) : "بررسی مخزن ناموفق بود";
    await db.systemUpdateConfig.update({
      where: { id: cfg.id },
      data: { lastStatus: "ERROR", lastError: errMsg.slice(0, 240) },
    }).catch(() => {});
    if (activeLogId) {
      await db.systemUpdateLog
        .update({
          where: { id: activeLogId },
          data: {
            status: "FAILED",
            summary: "خطا در بررسی مخزن گیت",
            errorMessage: errMsg.slice(0, 240),
            durationMs: Date.now() - startedAt,
          },
        })
        .catch(() => {});
    }
    return checkRes;
  }

  const freshCfg = await ensureUpdateConfig();
  const targetCommit = freshCfg.remoteCommit || checkRes.remoteCommit || "";
  if (!targetCommit) {
    await db.systemUpdateConfig.update({
      where: { id: freshCfg.id },
      data: { lastStatus: "ERROR", lastError: "Remote commit hash unavailable." },
    }).catch(() => {});
    if (activeLogId) {
      await db.systemUpdateLog
        .update({
          where: { id: activeLogId },
          data: {
            status: "FAILED",
            summary: "شناسه کامیت مقصد در دسترس نیست.",
            durationMs: Date.now() - startedAt,
          },
        })
        .catch(() => {});
    }
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
    await db.systemUpdateConfig.update({
      where: { id: freshCfg.id },
      data: { lastStatus: "ERROR", lastError: repoCheck.error.slice(0, 240) },
    }).catch(() => {});
    if (activeLogId) {
      await db.systemUpdateLog
        .update({
          where: { id: activeLogId },
          data: {
            status: "FAILED",
            summary: "آدرس مخزن گیت نامعتبر است.",
            errorMessage: repoCheck.error.slice(0, 240),
            durationMs: Date.now() - startedAt,
          },
        })
        .catch(() => {});
    }
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

  if (!activeLogId) {
    const created = await db.systemUpdateLog.create({
      data: {
        trigger: params.trigger,
        status: "UPDATING",
        fromCommit: freshCfg.currentCommit,
        toCommit: targetCommit,
        summary: `۱/۴ در حال تهیه بکاپ فوری پیش از بروزرسانی (${targetCommit})...`,
        durationMs: 0,
        actorId: params.actorId ?? null,
      },
    });
    activeLogId = created.id;
  } else {
    await updateStageLog(
      activeLogId,
      `۱/۴ در حال تهیه بکاپ فوری پیش از بروزرسانی (${targetCommit})...`,
      targetCommit,
    );
  }

  try {
    // Step 1: Mandatory pre-update data backup
    backupPath = await createPreUpdateSnapshot();
    await updateStageLog(
      activeLogId,
      `۲/۴ در حال دریافت و همگام‌سازی فایل‌ها از مخزن گیت (${targetCommit})...`,
    );

    const pkgHashBefore = await sha256File(path.join(root, "package.json"));
    const schemaHashBefore = await sha256File(path.join(root, "prisma", "schema.prisma"));
    const changedFiles: string[] = [];

    const protectedTop = new Set([
      "db",
      ".env",
      ".env.local",
      ".next",
      ".next-blue",
      ".next-live",
      "node_modules",
      "backups",
      ".git",
      ".aistudio",
    ]);

    let syncedViaNativeGit = false;
    if (hasGitDir) {
      // Step 2A: Native Git fetch + protected staging sync (never overwrites or locks db/ & public/uploads/ & .env)
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
      const stagingDir = path.join(os.tmpdir(), `neeleh-git-stage-${Date.now()}`);
      const extractDir = path.join(stagingDir, "extracted");
      const archiveFile = path.join(stagingDir, "head.tar");
      try {
        await execCmd(
          "git",
          buildGitArgs(root, ["fetch", repoCheck.normalized, freshCfg.branch]),
          { cwd: root, env, timeout: 60_000 },
        );
        const { stdout: statusOut } = await execCmd(
          "git",
          buildGitArgs(root, ["diff", "--name-status", "HEAD", "FETCH_HEAD"]),
          { cwd: root, env, timeout: 15_000 },
        ).catch(() => ({ stdout: "" }));

        const deletedRelPaths: string[] = [];
        for (const rawLine of statusOut.split("\n")) {
          const line = rawLine.trim();
          if (!line) continue;
          const parts = line.split(/\t+/);
          if (parts[0]?.startsWith("D") && parts[1]) {
            deletedRelPaths.push(parts[1].trim());
          }
        }

        await fs.promises.mkdir(extractDir, { recursive: true });
        await execCmd(
          "git",
          buildGitArgs(root, ["archive", "--format=tar", `--output=${archiveFile}`, "FETCH_HEAD"]),
          { cwd: root, env, timeout: 45_000 },
        );
        await execCmd(
          "tar",
          ["-xf", archiveFile, "-C", extractDir],
          { cwd: root, timeout: 30_000 },
        );
        await syncDirectoryDiffAware(
          extractDir,
          root,
          "",
          changedFiles,
          new Date(),
          protectedTop,
        );
        for (const rel of deletedRelPaths) {
          const norm = rel.replace(/\\/g, "/");
          const top = norm.split("/")[0];
          if (protectedTop.has(top) || norm.startsWith("public/uploads/")) continue;
          const target = path.resolve(root, norm);
          if (target.startsWith(path.resolve(root) + path.sep) && fs.existsSync(target)) {
            await fs.promises.rm(target, { force: true }).catch(() => {});
            changedFiles.push(norm);
          }
        }
        await execCmd(
          "git",
          buildGitArgs(root, ["update-ref", `refs/heads/${freshCfg.branch}`, "FETCH_HEAD"]),
          { cwd: root, env, timeout: 15_000 },
        ).catch(() => {});
        await execCmd(
          "git",
          buildGitArgs(root, ["symbolic-ref", "HEAD", `refs/heads/${freshCfg.branch}`]),
          { cwd: root, env, timeout: 15_000 },
        ).catch(() => {});
        await execCmd(
          "git",
          buildGitArgs(root, ["reset", "--mixed", "HEAD"]),
          { cwd: root, env, timeout: 15_000 },
        ).catch(() => {});
        syncedViaNativeGit = true;
      } catch (gitErr) {
        const msg = gitErr instanceof Error ? gitErr.message : String(gitErr);
        console.warn(
          "[system-updater] Native git fetch skipped; falling back to clean staging sync:",
          msg,
        );
        changedFiles.length = 0;
      } finally {
        await fs.promises.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    if (!syncedViaNativeGit) {
      // Step 2B: Clean staging sync in OS temp (immune to .git ownership/permission issues)
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
            buildGitArgs(root, [
              "clone",
              "--depth",
              "1",
              "--branch",
              freshCfg.branch,
              repoCheck.normalized,
              extractDir,
            ]),
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
    await updateStageLog(activeLogId, "۳/۴ در حال بررسی وابستگی‌ها و همگام‌سازی دیتابیس...");
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
      try {
        await execCmd("npx", ["prisma", "generate"], {
          cwd: root,
          timeout: 90_000,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!(IS_WIN && /EPERM|EBUSY|query_engine/i.test(msg))) {
          throw err;
        }
        console.warn("[system-updater] Windows locked Prisma DLL during generate; continuing build.");
      }
    } else {
      await execCmd("npx", ["prisma", "db", "push"], {
        cwd: root,
        timeout: 60_000,
      }).catch(() => {});
    }

    // Step 4: Production build & zero-downtime reload handling
    let built = false;
    let reloaded = false;
    let reloadMethod:
      | "dev-live"
      | "supervisor"
      | "handoff"
      | "pm2"
      | "custom"
      | "restart-required" = "dev-live";
    let pendingHandoff = false;
    let buildDistDir: ".next" | ".next-blue" = ".next";

    if (isProduction) {
      const pm2Name = await detectPm2AppName();
      const supervisorActive = isSupervisorActive(root);
      const customRestartCmd = process.env.UPDATE_RESTART_CMD?.trim();
      const canHandoff =
        !pm2Name &&
        !supervisorActive &&
        !customRestartCmd &&
        !isCloudRun &&
        fs.existsSync(path.join(root, "scripts", "handoff-restart.mjs")) &&
        fs.existsSync(path.join(root, "scripts", "prod-server.mjs"));

      if (supervisorActive || canHandoff) {
        const currentDist = readActiveDist(root);
        buildDistDir = currentDist === ".next" ? ".next-blue" : ".next";
      }

      await updateStageLog(
        activeLogId,
        `۴/۴ در حال ساخت بیلد تولیدی (${buildDistDir}) و آماده‌سازی ریلود خودکار...`,
      );

      await execCmd("npm", ["run", "build"], {
        cwd: root,
        env: { ...process.env, NODE_ENV: "production", NEXT_DIST_DIR: buildDistDir },
        timeout: 240_000,
      });
      built = true;

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
          JSON.stringify({
            commit: targetCommit,
            distDir: buildDistDir,
            triggeredAt: new Date().toISOString(),
          }),
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
      } else if (canHandoff) {
        reloadMethod = "handoff";
        reloaded = true;
        pendingHandoff = true;
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
      summary = `${changedCount} فایل بروز شد و بیلد تولیدی ساخته شد (${targetCommit})؛ برای فعال‌سازی روی ترافیک زنده سرویس را ری‌استارت نمایید.`;
      userMessage = `${changedCount} فایل بروزرسانی و بیلد شدند، اما فرآیند سرور امکان ری‌استارت خودکار نداشت.`;
    } else if (isProduction && reloadMethod === "handoff") {
      summary = `${changedCount} فایل همگام‌سازی، بیلد و به‌طور خودکار به سوپروایزر بدون قطعی منتقل شد (${targetCommit}): ${samplePaths}`;
      userMessage = `بروزرسانی کامل انجام شد (${changedCount} فایل تغییر یافت، بیلد جدید ساخته شد و سرور به‌طور خودکار به حالت بدون قطعی سوئیچ و ریلود شد).`;
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

    await db.systemUpdateLog.update({
      where: { id: activeLogId },
      data: {
        status: needsRestart ? "RESTART_REQUIRED" : "SUCCESS",
        fromCommit: freshCfg.currentCommit,
        toCommit: targetCommit,
        backupPath,
        summary: summary.slice(0, 350),
        durationMs: Date.now() - startedAt,
      },
    });

    if (pendingHandoff) {
      const handoffScript = path.join(root, "scripts", "handoff-restart.mjs");
      const child = spawn(
        process.execPath,
        [
          handoffScript,
          `--old-pid=${process.pid}`,
          `--port=${detectCurrentPort()}`,
          `--root=${root}`,
          `--dist-dir=${buildDistDir}`,
        ],
        {
          cwd: root,
          detached: true,
          windowsHide: true,
          stdio: "ignore",
          env: {
            ...process.env,
            NEELEH_APP_ROOT: root,
          },
        },
      );
      child.unref();
    }

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
    if (activeLogId) {
      await db.systemUpdateLog
        .update({
          where: { id: activeLogId },
          data: {
            status: "FAILED",
            fromCommit: freshCfg.currentCommit,
            toCommit: targetCommit,
            backupPath: backupPath || null,
            summary: "بروزرسانی متوقف شد — دیتابیس و نسخه فعلی بدون تغییر حفظ شدند.",
            errorMessage: msg.slice(0, 240),
            durationMs: Date.now() - startedAt,
          },
        })
        .catch(() => {});
    }
    return { ok: false, error: msg, errorEn: msg };
  }
}

const globalForUpdateJob = globalThis as unknown as {
  __neelehManualUpdateInFlight?: { startedAt: number; logId: string } | null;
};

/**
 * Starts the update pipeline asynchronously so long `npm run build` runs never
 * hit reverse-proxy / browser HTTP request timeouts (502/504).
 */
export async function startBackgroundUpdate(params: {
  trigger: "MANUAL" | "SCHEDULED" | "WEBHOOK";
  actorId?: string | null;
  onFinished?: () => void;
}) {
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

  const inFlight = globalForUpdateJob.__neelehManualUpdateInFlight;
  if (inFlight && Date.now() - inFlight.startedAt < 5 * 60_000) {
    return {
      ok: true,
      started: true,
      alreadyRunning: true,
      logId: inFlight.logId,
      message: "یک عملیات بروزرسانی در حال اجراست...",
    };
  }

  // Mark any orphaned older UPDATING logs as FAILED before starting a fresh run
  await db.systemUpdateLog
    .updateMany({
      where: { status: "UPDATING" },
      data: {
        status: "FAILED",
        summary: "عملیات قبلی ناتمام متوقف شد.",
        errorMessage: "Interrupted before completion (server restarted or timed out).",
      },
    })
    .catch(() => {});

  await db.systemUpdateConfig.update({
    where: { id: cfg.id },
    data: { lastStatus: "UPDATING", lastError: null },
  });

  const log = await db.systemUpdateLog.create({
    data: {
      trigger: params.trigger,
      status: "UPDATING",
      fromCommit: cfg.currentCommit,
      toCommit: cfg.remoteCommit,
      summary: "۰/۴ شروع عملیات بروزرسانی خودکار...",
      durationMs: 0,
      actorId: params.actorId ?? null,
    },
  });

  globalForUpdateJob.__neelehManualUpdateInFlight = {
    startedAt: Date.now(),
    logId: log.id,
  };

  setTimeout(() => {
    void applyZeroDowntimeUpdate({
      trigger: params.trigger,
      actorId: params.actorId,
      existingLogId: log.id,
    })
      .then(() => {
        try {
          params.onFinished?.();
        } catch {
          // ignore
        }
      })
      .catch(() => {})
      .finally(() => {
        globalForUpdateJob.__neelehManualUpdateInFlight = null;
      });
  }, 15);

  return {
    ok: true,
    started: true,
    alreadyRunning: false,
    logId: log.id,
    message: "فرآیند بروزرسانی، بکاپ‌گیری و بیلد خودکار آغاز شد...",
  };
}

export async function rollbackDatabaseFromLog(logId: string, actorId: string) {
  const log = await db.systemUpdateLog.findUnique({ where: { id: logId } });
  if (!log || !log.backupPath) {
    return { ok: false, error: "فایل بکاپ برای این رکورد یافت نشد.", errorEn: "Backup archive not found." };
  }
  const root = resolveAppRoot();
  const resolved = path.resolve(log.backupPath);
  if (!isPathInsideAllowedBackupDirs(resolved, root) || !fs.existsSync(resolved)) {
    return { ok: false, error: "مسیر بکاپ معتبر یا موجود نیست.", errorEn: "Invalid or missing backup file." };
  }

  const startedAt = Date.now();
  try {
    // Take a safety snapshot before overwriting db/custom.db
    await createPreUpdateSnapshot("pre-restore").catch(() => "");
    await extractAndRestoreBackupArchive(resolved, root);

    await db.systemUpdateLog.create({
      data: {
        trigger: "ROLLBACK",
        status: "ROLLED_BACK",
        fromCommit: log.toCommit,
        toCommit: log.fromCommit,
        backupPath: resolved,
        summary: `بازگردانی دیتابیس از بکاپ (${path.basename(resolved)})`,
        durationMs: Date.now() - startedAt,
        actorId,
      },
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Rollback failed";
    return { ok: false, error: msg, errorEn: msg };
  }
}

export async function restoreBackupByFilename(filename: string, actorId: string) {
  const root = resolveAppRoot();
  const found = await resolveSafeBackupPath(filename, root);
  if (!found) {
    return {
      ok: false,
      error: "فایل بکاپ در مسیر مجاز یافت نشد.",
      errorEn: "Backup archive not found.",
    };
  }

  const startedAt = Date.now();
  const cfg = await ensureUpdateConfig();
  try {
    const safetyZip = await createPreUpdateSnapshot("pre-restore").catch(() => "");
    const { uploadsRestoredCount } = await extractAndRestoreBackupArchive(found.path, root);
    const safetyNote = safetyZip ? ` (بکاپ ایمنی قبلی: ${path.basename(safetyZip)})` : "";
    const uploadsNote =
      uploadsRestoredCount > 0 ? ` · ${uploadsRestoredCount} فایل آپلود بازگردانی شد` : "";

    await db.systemUpdateLog.create({
      data: {
        trigger: "ROLLBACK",
        status: "ROLLED_BACK",
        fromCommit: cfg.currentCommit,
        toCommit: cfg.currentCommit,
        backupPath: found.path,
        summary: `بازگردانی از بکاپ ${filename}${uploadsNote}${safetyNote}`.slice(0, 350),
        durationMs: Date.now() - startedAt,
        actorId,
      },
    });

    return {
      ok: true,
      message: `دیتابیس و فایل‌ها با موفقیت از «${filename}» بازگردانی شدند${safetyNote}.`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Restore failed";
    return { ok: false, error: msg, errorEn: msg };
  }
}

export async function deleteBackupByFilename(filename: string) {
  const root = resolveAppRoot();
  const deleted = await deleteSafeBackupArchive(filename, root);
  if (!deleted) {
    return {
      ok: false,
      error: "فایل بکاپ برای حذف یافت نشد.",
      errorEn: "Backup archive not found.",
    };
  }
  return {
    ok: true,
    message: `فایل بکاپ «${filename}» حذف شد.`,
  };
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
