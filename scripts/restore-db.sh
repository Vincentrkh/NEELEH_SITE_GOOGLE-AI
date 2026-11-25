#!/usr/bin/env bash
# Restore Neeleh Academy dev DB from committed seed scripts.
# Run after a sandbox recycle wipes db/custom.db.
# Usage:  bash scripts/restore-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "🧹 Removing stale SQLite sidecars..."
rm -f db/custom.db db/custom.db-wal db/custom.db-shm

echo "📤 Pushing Prisma schema..."
bunx prisma db push --accept-data-loss 2>&1 | tail -3
bunx prisma generate 2>&1 | tail -2

echo "🌱 Seeding base (admin, roles, perms, theme, settings, menu)..."
bun scripts/seed.ts 2>&1 | tail -5

echo "🌱 Seeding 9 courses (FA)..."
bun scripts/seed-courses.ts 2>&1 | tail -3

echo "🌱 Seeding EN course translations..."
bun scripts/seed-en-translations.ts 2>&1 | tail -3

echo "🌐 Logging in as admin for API-driven seed..."
LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"phone":"09121234567","password":"Neeleh@1404"}')
if ! echo "$LOGIN" | grep -q '"roles"'; then
  echo "❌ Login failed — is the dev server running on :3000?"
  echo "$LOGIN"
  exit 1
fi

echo "🌱 Seeding categories, posts, static pages via API..."
ADMIN_PHONE=09121234567 ADMIN_PASSWORD='Neeleh@1404' node scripts/seed-content.mjs 2>&1 | tail -5

echo "🌱 Seeding EN cats/tags, posts, page excerpts..."
bun scripts/seed-en-cats-tags.ts 2>&1 | tail -2
bun scripts/seed-en-posts.ts 2>&1 | tail -3
bun scripts/seed-en-excerpts.ts 2>&1 | tail -2

echo "📦 Taking local backup..."
mkdir -p db/backups
STAMP=$(date +%Y%m%d-%H%M%S)
cp db/custom.db "db/backups/custom-${STAMP}.db"
echo "  ✔ db/backups/custom-${STAMP}.db"

echo ""
echo "✅ DB restored — login with 09121234567 / Neeleh@1404"
