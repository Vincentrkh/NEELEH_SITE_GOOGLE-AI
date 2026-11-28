import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);
const IS_WIN = process.platform === "win32";

export const LEGACY_UPDATE_BACKUP_DIR = path.join(os.tmpdir(), "neeleh-update-backups");

const SAFE_BACKUP_FILENAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,139}\.zip$/;

export type BackupArchiveInfo = {
  filename: string;
  source: "backups" | "temp";
  sizeBytes: number;
  createdAt: string;
  modifiedAt: string;
};

/**
 * Pure validator: strictly allow single-segment `.zip` filenames with safe ASCII chars.
 * Blocks `..`, `/`, `\`, whitespace, control chars, or null bytes.
 */
export function isValidBackupFilename(filename: unknown): filename is string {
  if (typeof filename !== "string") return false;
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return false;
  }
  return SAFE_BACKUP_FILENAME_RE.test(filename);
}

/**
 * Pure Zip Slip validator: ensures every entry path inside a backup archive resolves
 * strictly inside the target extraction directory.
 */
export function validateZipMemberPaths(memberNames: string[], extractDir: string): boolean {
  const baseResolved = path.resolve(extractDir);
  const baseWithSep = baseResolved.endsWith(path.sep) ? baseResolved : baseResolved + path.sep;
  for (const rawName of memberNames) {
    if (!rawName || rawName.includes("\0")) return false;
    // Normalize Windows separators inside zip entries
    const normalizedRel = rawName.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!normalizedRel) continue;
    const segments = normalizedRel.split("/");
    if (segments.includes("..")) return false;
    const resolved = path.resolve(baseResolved, ...segments);
    if (resolved !== baseResolved && !resolved.startsWith(baseWithSep)) {
      return false;
    }
  }
  return true;
}

/** Pure byte formatter for clean UI & testability */
export function formatBackupSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

export function getPrimaryBackupDir(appRoot: string): string {
  return path.join(path.resolve(appRoot), "backups");
}

export function getAllowedBackupDirs(appRoot: string): Array<{ dir: string; source: "backups" | "temp" }> {
  const primary = path.resolve(getPrimaryBackupDir(appRoot));
  const legacy = path.resolve(LEGACY_UPDATE_BACKUP_DIR);
  if (primary === legacy) {
    return [{ dir: primary, source: "backups" }];
  }
  return [
    { dir: primary, source: "backups" },
    { dir: legacy, source: "temp" },
  ];
}

/**
 * Picks a writable persistent backup directory (`<appRoot>/backups` first, falling back to `os.tmpdir()`).
 */
export async function ensureWritableBackupDir(appRoot: string): Promise<string> {
  const primary = getPrimaryBackupDir(appRoot);
  try {
    await fs.promises.mkdir(primary, { recursive: true });
    await fs.promises.access(primary, fs.constants.W_OK);
    return primary;
  } catch {
    await fs.promises.mkdir(LEGACY_UPDATE_BACKUP_DIR, { recursive: true });
    return LEGACY_UPDATE_BACKUP_DIR;
  }
}

/**
 * Resolves a validated backup archive path strictly inside allowed backup directories.
 * Rejects traversal, symlinks escaping root, and missing files.
 */
export async function resolveSafeBackupPath(
  filename: string,
  appRoot: string,
): Promise<{ path: string; source: "backups" | "temp" } | null> {
  if (!isValidBackupFilename(filename)) return null;

  for (const entry of getAllowedBackupDirs(appRoot)) {
    const baseDir = path.resolve(entry.dir);
    const baseWithSep = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;
    const candidate = path.resolve(baseDir, filename);
    if (!candidate.startsWith(baseWithSep)) continue;
    try {
      const stat = await fs.promises.lstat(candidate);
      if (stat.isFile() && !stat.isSymbolicLink()) {
        return { path: candidate, source: entry.source };
      }
    } catch {
      // check next directory
    }
  }
  return null;
}

/**
 * Resolves an absolute backup file path stored in DB logs safely within allowed backup dirs.
 */
export function isPathInsideAllowedBackupDirs(filePath: string, appRoot: string): boolean {
  const resolved = path.resolve(filePath);
  for (const entry of getAllowedBackupDirs(appRoot)) {
    const baseDir = path.resolve(entry.dir);
    const baseWithSep = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep;
    if (resolved.startsWith(baseWithSep)) {
      return true;
    }
  }
  return false;
}

export async function listBackupArchives(appRoot: string): Promise<BackupArchiveInfo[]> {
  const seen = new Set<string>();
  const results: BackupArchiveInfo[] = [];

  for (const entry of getAllowedBackupDirs(appRoot)) {
    let names: string[];
    try {
      names = await fs.promises.readdir(entry.dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!isValidBackupFilename(name) || seen.has(name)) continue;
      const fullPath = path.join(entry.dir, name);
      try {
        const stat = await fs.promises.lstat(fullPath);
        if (!stat.isFile() || stat.isSymbolicLink()) continue;
        seen.add(name);
        results.push({
          filename: name,
          source: entry.source,
          sizeBytes: stat.size,
          createdAt: (stat.birthtimeMs > 0 ? stat.birthtime : stat.mtime).toISOString(),
          modifiedAt: stat.mtime.toISOString(),
        });
      } catch {
        // skip unreadable entry
      }
    }
  }

  results.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  return results;
}

/**
 * Extracts a verified backup ZIP safely to a temporary directory (checking Zip Slip before extraction)
 * and restores `db/custom.db` (plus `public/uploads` if present in archive), never touching `.env` or secrets.
 */
export async function extractAndRestoreBackupArchive(
  zipPath: string,
  appRoot: string,
): Promise<{ dbRestored: boolean; uploadsRestoredCount: number }> {
  const resolvedZip = path.resolve(zipPath);
  if (!isPathInsideAllowedBackupDirs(resolvedZip, appRoot) || !fs.existsSync(resolvedZip)) {
    throw new Error("مسیر فایل بکاپ معتبر یا در دسترس نیست.");
  }

  const extractTmp = path.join(os.tmpdir(), `neeleh-restore-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  try {
    await fs.promises.mkdir(extractTmp, { recursive: true });

    let listedAndExtracted = false;
    for (const py of IS_WIN ? ["python", "python3"] : ["python3", "python"]) {
      try {
        const { stdout: listOut } = await execFileAsync(
          py,
          [
            "-c",
            "import json, sys, zipfile; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps([i.filename for i in z.infolist()]))",
            resolvedZip,
          ],
          { timeout: 30_000 },
        );
        const members = JSON.parse(listOut) as string[];
        if (!Array.isArray(members) || !validateZipMemberPaths(members, extractTmp)) {
          throw new Error("فایل بکاپ حاوی مسیرهای ناامن است (Zip Slip مسدود شد).");
        }
        await execFileAsync(
          py,
          [
            "-c",
            "import sys, zipfile; z=zipfile.ZipFile(sys.argv[1]); z.extractall(sys.argv[2])",
            resolvedZip,
            extractTmp,
          ],
          { timeout: 90_000 },
        );
        listedAndExtracted = true;
        break;
      } catch (err) {
        if (err instanceof Error && err.message.includes("Zip Slip")) {
          throw err;
        }
      }
    }

    if (!listedAndExtracted && IS_WIN) {
      await execFileAsync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -Path '${resolvedZip.replace(/'/g, "''")}' -DestinationPath '${extractTmp.replace(/'/g, "''")}' -Force`,
        ],
        { timeout: 90_000 },
      );
      listedAndExtracted = true;
    }

    if (!listedAndExtracted) {
      throw new Error("امکان باز کردن فایل فشرده بکاپ در سرور وجود ندارد.");
    }

    const dbCandidates = [
      path.join(extractTmp, "neeleh-academy", "db", "custom.db"),
      path.join(extractTmp, "db", "custom.db"),
      path.join(extractTmp, "custom.db"),
    ];
    const extractedDb = dbCandidates.find((c) => fs.existsSync(c));
    if (!extractedDb) {
      throw new Error("فایل دیتابیس (db/custom.db) داخل این آرشیو بکاپ یافت نشد.");
    }

    const dbDir = path.join(appRoot, "db");
    await fs.promises.mkdir(dbDir, { recursive: true });
    const targetDb = path.join(dbDir, "custom.db");

    // Remove SQLite WAL/SHM sidecar files before replacing DB so no stale journal corrupts restored DB
    await fs.promises.rm(`${targetDb}-wal`, { force: true }).catch(() => {});
    await fs.promises.rm(`${targetDb}-shm`, { force: true }).catch(() => {});
    await fs.promises.copyFile(extractedDb, targetDb);

    // Restore uploaded assets if present inside the backup archive (additive / safe)
    const uploadCandidates = [
      path.join(extractTmp, "neeleh-academy", "public", "uploads"),
      path.join(extractTmp, "public", "uploads"),
    ];
    const extractedUploads = uploadCandidates.find((c) => fs.existsSync(c));
    let uploadsRestoredCount = 0;
    if (extractedUploads) {
      const targetUploads = path.join(appRoot, "public", "uploads");
      uploadsRestoredCount = await copyDirectoryAdditive(extractedUploads, targetUploads);
    }

    return { dbRestored: true, uploadsRestoredCount };
  } finally {
    await fs.promises.rm(extractTmp, { recursive: true, force: true }).catch(() => {});
  }
}

async function copyDirectoryAdditive(src: string, dest: string): Promise<number> {
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      count += await copyDirectoryAdditive(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);
      count += 1;
    }
  }
  return count;
}

export async function deleteSafeBackupArchive(filename: string, appRoot: string): Promise<boolean> {
  const found = await resolveSafeBackupPath(filename, appRoot);
  if (!found) return false;
  await fs.promises.unlink(found.path);
  return true;
}
