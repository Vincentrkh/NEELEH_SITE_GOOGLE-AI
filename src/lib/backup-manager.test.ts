import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  formatBackupSize,
  isPathInsideAllowedBackupDirs,
  isValidBackupFilename,
  validateZipMemberPaths,
} from "./backup-manager";

test("isValidBackupFilename accepts safe .zip filenames and rejects traversal", () => {
  assert.equal(isValidBackupFilename("pre-update-1732700000000.zip"), true);
  assert.equal(isValidBackupFilename("manual-snapshot_2026-11-28.zip"), true);

  assert.equal(isValidBackupFilename("../secret.zip"), false);
  assert.equal(isValidBackupFilename("dir/backup.zip"), false);
  assert.equal(isValidBackupFilename("dir\\backup.zip"), false);
  assert.equal(isValidBackupFilename("backup.tar.gz"), false);
  assert.equal(isValidBackupFilename(".env.zip"), false);
  assert.equal(isValidBackupFilename(""), false);
  assert.equal(isValidBackupFilename("bad space.zip"), false);
  assert.equal(isValidBackupFilename(null), false);
});

test("validateZipMemberPaths prevents Zip Slip traversal", () => {
  const extractDir = path.resolve("/tmp/neeleh-extract-test");
  assert.equal(
    validateZipMemberPaths(
      ["neeleh-academy/db/custom.db", "neeleh-academy/public/uploads/hero.png"],
      extractDir,
    ),
    true,
  );
  assert.equal(
    validateZipMemberPaths(["../../etc/passwd"], extractDir),
    false,
  );
  assert.equal(
    validateZipMemberPaths(["sub/../../../outside.txt"], extractDir),
    false,
  );
  assert.equal(
    validateZipMemberPaths(["bad\0file.txt"], extractDir),
    false,
  );
});

test("isPathInsideAllowedBackupDirs enforces strict backup root confinement", () => {
  const appRoot = "/app/applet";
  assert.equal(
    isPathInsideAllowedBackupDirs("/app/applet/backups/snap-1.zip", appRoot),
    true,
  );
  assert.equal(
    isPathInsideAllowedBackupDirs("/app/applet/backups/../.env", appRoot),
    false,
  );
  assert.equal(
    isPathInsideAllowedBackupDirs("/etc/passwd", appRoot),
    false,
  );
});

test("formatBackupSize produces human-readable tabular units", () => {
  assert.equal(formatBackupSize(512), "512 B");
  assert.equal(formatBackupSize(2048), "2.0 KB");
  assert.equal(formatBackupSize(3 * 1024 * 1024), "3.00 MB");
});
