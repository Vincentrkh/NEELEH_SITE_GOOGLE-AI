#!/usr/bin/env python3
"""
Create a clean, portable full-project ZIP backup of Neeleh Academy.
Includes: src/, prisma/, db/custom.db (with WAL/SHM if any), public/, scripts/,
tests/, package.json, configs, and .env.example.
Excludes: node_modules/, .next/, .git/, backups/, download/, .env, db/.session_secret.
"""

import os
import sys
import zipfile

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PREFIX = "neeleh-academy"

EXCLUDE_DIRS = {
    "node_modules",
    ".next",
    ".git",
    ".aistudio",
    "backups",
    "download",
    "__pycache__",
    ".turbo",
    ".vercel",
    ".cache",
}

EXCLUDE_REL_PATHS = {
    ".env",
    ".env.local",
    ".env.production.local",
    ".env.development.local",
    "db/.session_secret",
    "db/backups",
}

EXCLUDE_SUFFIXES = (".log", ".tmp", ".DS_Store")

RESTORE_GUIDE = """Neeleh Academy — Full Project Backup
=====================================

1. Extract this archive.
2. Inside the `neeleh-academy` directory, copy environment template:
   cp .env.example .env
   (and set DATABASE_URL="file:../db/custom.db" plus optional SMTP / GEMINI_API_KEY)
3. Install dependencies & generate Prisma client:
   npm install
   npx prisma generate
4. Start development server (port 3000):
   npm run dev
   Or build & run production:
   npm run build
   npm start
"""


PRECOMPRESSED_EXTS = (
    ".mp4",
    ".webm",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".woff2",
    ".gz",
    ".zip",
    ".otf",
    ".ttf",
)


def should_skip(rel_path: str, is_dir: bool) -> bool:
    norm = rel_path.replace("\\", "/")
    while norm.startswith("./"):
        norm = norm[2:]
    norm = norm.lstrip("/")
    if not norm or norm == ".":
        return False
    parts = norm.split("/")
    if any(p in EXCLUDE_DIRS for p in parts):
        return True
    if norm in EXCLUDE_REL_PATHS:
        return True
    if not is_dir and norm.endswith(EXCLUDE_SUFFIXES):
        return True
    return False


def create_backup(output_zip_path: str) -> tuple[int, int]:
    out_abs = os.path.abspath(output_zip_path)
    os.makedirs(os.path.dirname(out_abs), exist_ok=True)
    tmp_abs = out_abs + ".tmp"

    file_count = 0
    with zipfile.ZipFile(tmp_abs, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=3) as zf:
        zf.writestr(f"{PREFIX}/RESTORE_INSTRUCTIONS.txt", RESTORE_GUIDE)
        file_count += 1

        for root, dirs, files in os.walk(ROOT_DIR):
            rel_root = os.path.relpath(root, ROOT_DIR)
            if rel_root == ".":
                rel_root = ""

            # Prune excluded directories in-place
            kept_dirs = []
            for d in sorted(dirs):
                rel_d = os.path.join(rel_root, d) if rel_root else d
                if not should_skip(rel_d, True):
                    kept_dirs.append(d)
            dirs[:] = kept_dirs

            for fname in sorted(files):
                rel_f = os.path.join(rel_root, fname) if rel_root else fname
                abs_f = os.path.join(root, fname)
                if abs_f == out_abs or abs_f == tmp_abs:
                    continue
                if should_skip(rel_f, False):
                    continue
                if os.path.islink(abs_f) or not os.path.isfile(abs_f):
                    continue
                arcname = f"{PREFIX}/{rel_f.replace(os.sep, '/')}"
                comp = (
                    zipfile.ZIP_STORED
                    if fname.lower().endswith(PRECOMPRESSED_EXTS)
                    else zipfile.ZIP_DEFLATED
                )
                zf.write(abs_f, arcname, compress_type=comp)
                file_count += 1

    os.replace(tmp_abs, out_abs)
    return file_count, os.path.getsize(out_abs)


def main() -> int:
    if len(sys.argv) < 2:
        default_out = os.path.join(ROOT_DIR, "backups", "neeleh-academy-backup.zip")
        out_path = default_out
    else:
        out_path = sys.argv[1]

    count, size_bytes = create_backup(out_path)
    print(f"OK {out_path} files={count} bytes={size_bytes}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
