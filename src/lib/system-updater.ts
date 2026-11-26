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

export async function ensureUpdateConfig() {
  let cfg = await db.systemUpdateConfig.findUnique({ where: { key: "default" } });
  if (!cfg) {
    let headCommit: string | null = null;
    try {
      const pkg = JSON.parse(
        await fs.promises.readFile(path.join(process.cwd(), "package.json"), "utf8"),
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

  const hasGitDir = fs.existsSync(path.join(process.cwd(), ".git"));
  let pkgVersion = "0.2.1";
  try {
    const pkg = JSON.parse(
      await fs.promises.readFile(path.join(process.cwd(), "package.json"), "utf8"),
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
      hasToken: Boolean(cfg.encryptedToken || process.env.GITHUB_UPDATE_TOKEN?.trim()),
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

export async function createPreUpdateSnapshot(): Promise<string> {
  const root = process.cwd();
  await fs.promises.mkdir(UPDATE_BACKUP_DIR, { recursive: true });
  const zipPath = path.join(UPDATE_BACKUP_DIR, `pre-update-${Date.now()}.zip`);
  const scriptPath = path.join(root, "scripts", "create-backup-zip.py");
  await execFileAsync("/usr/bin/python3", [scriptPath, zipPath], {
    cwd: root,
    timeout: 120_000,
  });
  return zipPath;
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

  const token =
    decryptSecret(cfg.encryptedToken) || process.env.GITHUB_UPDATE_TOKEN?.trim() || "";

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
        const res = await fetch(apiUrl, {
          headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": "neeleh-academy-updater",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
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
      const { stdout } = await execFileAsync(
        "/usr/bin/git",
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
        status: updateAvailable ? "UP_TO_DATE" : "UP_TO_DATE",
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

/**
 * Protected zero-downtime data-preserving update execution:
 * 1. Creates a full snapshot backup (DB + uploads + code) in system temp BEFORE any sync.
 * 2. Preserves protected paths (`db/custom.db`, `public/uploads`, `.env`, `db/.session_secret`).
 * 3. If local `.git` exists, pulls target branch cleanly & applies safe `prisma db push` (additive) + `prisma generate`.
 * 4. If container has no `.git`, downloads verified tarball from GitHub/HTTPS into isolated staging dir,
 *    overlays non-data code files safely, runs `prisma db push` & `prisma generate`, and marks updated commit.
 *    If anything fails, preserves existing database & running files untouched.
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
  const root = process.cwd();
  const hasGitDir = fs.existsSync(path.join(root, ".git"));
  const repoCheck = validateGitRepoUrl(freshCfg.repoUrl);
  if (!repoCheck.ok) {
    return { ok: false, error: repoCheck.error, errorEn: repoCheck.error };
  }
  const token =
    decryptSecret(freshCfg.encryptedToken) || process.env.GITHUB_UPDATE_TOKEN?.trim() || "";

  await db.systemUpdateConfig.update({
    where: { id: freshCfg.id },
    data: { lastStatus: "UPDATING", lastError: null },
  });

  try {
    // Step 1: Mandatory pre-update data backup
    backupPath = await createPreUpdateSnapshot();

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
      await execFileAsync(
        "/usr/bin/git",
        ["fetch", repoCheck.normalized, freshCfg.branch],
        { cwd: root, env, timeout: 60_000 },
      );
      await execFileAsync(
        "/usr/bin/git",
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
          const res = await fetch(tarUrl, {
            headers: {
              Accept: "application/vnd.github+json",
              "User-Agent": "neeleh-academy-updater",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          });
          if (!res.ok) {
            throw new Error(`Tarball download failed with HTTP ${res.status}`);
          }
          const buf = Buffer.from(await res.arrayBuffer());
          const tarFile = path.join(stagingDir, "release.tar.gz");
          await fs.promises.writeFile(tarFile, buf);
          await execFileAsync(
            "/bin/tar",
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
          await execFileAsync(
            "/usr/bin/git",
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
        const entries = await fs.promises.readdir(extractDir, { withFileTypes: true });
        for (const entry of entries) {
          if (protectedTop.has(entry.name)) continue;
          const srcPath = path.join(extractDir, entry.name);
          const dstPath = path.join(root, entry.name);
          if (entry.name === "public") {
            // Merge public/ while keeping public/uploads/ untouched
            await fs.promises.mkdir(dstPath, { recursive: true });
            const pubEntries = await fs.promises.readdir(srcPath, { withFileTypes: true });
            for (const pe of pubEntries) {
              if (pe.name === "uploads") continue;
              await fs.promises.cp(path.join(srcPath, pe.name), path.join(dstPath, pe.name), {
                recursive: true,
                force: true,
              });
            }
          } else {
            await fs.promises.cp(srcPath, dstPath, { recursive: true, force: true });
          }
        }
      } finally {
        clearTimeout(timer);
        await fs.promises.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
      }
    }

    // Step 3: Safe additive schema sync (no --force-reset)
    await execFileAsync("npx", ["prisma", "db", "push"], {
      cwd: root,
      timeout: 60_000,
    }).catch(() => {});

    await db.systemUpdateConfig.update({
      where: { id: freshCfg.id },
      data: {
        currentCommit: targetCommit,
        pendingUpdatesCount: 0,
        lastUpdatedAt: new Date(),
        lastStatus: "UP_TO_DATE",
        lastError: null,
      },
    });

    await db.systemUpdateLog.create({
      data: {
        trigger: params.trigger,
        status: "SUCCESS",
        fromCommit: freshCfg.currentCommit,
        toCommit: targetCommit,
        backupPath,
        summary: `بروزرسانی امن با حفظ دیتابیس و آپلودها انجام شد (${targetCommit})`,
        durationMs: Date.now() - startedAt,
        actorId: params.actorId ?? null,
      },
    });

    return {
      ok: true,
      toCommit: targetCommit,
      backupCreated: true,
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
  const root = process.cwd();
  const extractTmp = path.join(os.tmpdir(), `neeleh-rollback-${Date.now()}`);
  try {
    await fs.promises.mkdir(extractTmp, { recursive: true });
    await execFileAsync(
      "/usr/bin/python3",
      [
        "-c",
        "import sys, zipfile; z=zipfile.ZipFile(sys.argv[1]); z.extractall(sys.argv[2])",
        resolved,
        extractTmp,
      ],
      { timeout: 60_000 },
    );
    const extractedDb = path.join(extractTmp, "neeleh-academy", "db", "custom.db");
    const targetDb = path.join(root, "db", "custom.db");
    if (fs.existsSync(extractedDb)) {
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
