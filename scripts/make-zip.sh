#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# ساخت فایل zip کامل پروژه (کد + دیتابیس + مدیا) بدون node_modules و .next
# خروجی: backups/neeleh-academy-backup.zip
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p backups
OUT="backups/neeleh-academy-backup.zip"
python3 scripts/create-backup-zip.py "$OUT"
du -h "$OUT"

