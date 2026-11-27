#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Neeleh Academy — Zero-Downtime, Data-Preserving Production Update Script
# Preserves: db/custom.db, db/.session_secret, .env, public/uploads/
# Recommended cron: */30 * * * * /var/www/neeleh/scripts/zero-downtime-update.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP="${PM2_APP_NAME:-neeleh}"
BACKUP_DIR="/tmp/neeleh-update-backups"
mkdir -p "$BACKUP_DIR"

safe_git() {
  git -c safe.directory='*' -c "safe.directory=$APP_DIR" "$@"
}

echo "[neeleh-update] Checking remote branch $BRANCH..."
safe_git fetch origin "$BRANCH" --quiet
LOCAL_SHA="$(safe_git rev-parse HEAD)"
REMOTE_SHA="$(safe_git rev-parse "origin/$BRANCH")"

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  echo "[neeleh-update] Already up to date ($LOCAL_SHA)."
  exit 0
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
SNAP_ZIP="$BACKUP_DIR/pre-update-$STAMP.zip"
echo "[neeleh-update] Creating pre-update snapshot at $SNAP_ZIP..."
python3 scripts/create-backup-zip.py "$SNAP_ZIP"

# Protect runtime data files before git checkout
PROTECT_TMP="/tmp/neeleh-protect-$STAMP"
mkdir -p "$PROTECT_TMP"
[ -f ".env" ] && cp -a ".env" "$PROTECT_TMP/.env"
[ -f "db/.session_secret" ] && cp -a "db/.session_secret" "$PROTECT_TMP/.session_secret"
[ -f "db/custom.db" ] && cp -a "db/custom.db" "$PROTECT_TMP/custom.db"
[ -d "public/uploads" ] && cp -a "public/uploads" "$PROTECT_TMP/uploads"

cleanup() {
  rm -rf "$PROTECT_TMP"
}
trap cleanup EXIT

echo "[neeleh-update] Pulling $REMOTE_SHA..."
safe_git checkout -B "$BRANCH" "origin/$BRANCH" --quiet

# Restore protected data files strictly
mkdir -p db public/uploads
[ -f "$PROTECT_TMP/.env" ] && cp -a "$PROTECT_TMP/.env" ".env"
[ -f "$PROTECT_TMP/.session_secret" ] && cp -a "$PROTECT_TMP/.session_secret" "db/.session_secret"
[ -f "$PROTECT_TMP/custom.db" ] && cp -a "$PROTECT_TMP/custom.db" "db/custom.db"
[ -d "$PROTECT_TMP/uploads" ] && cp -rn "$PROTECT_TMP/uploads/." "public/uploads/" || true

echo "[neeleh-update] Installing dependencies & syncing database schema..."
if [ -f "package-lock.json" ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi
npx prisma db push
npx prisma generate

NEXT_DIST=".next"
if [ -f "db/.supervisor.json" ] && grep -q '"activeDist"[[:space:]]*:[[:space:]]*".next"' db/.supervisor.json 2>/dev/null; then
  NEXT_DIST=".next-blue"
fi

echo "[neeleh-update] Building next production bundle into $NEXT_DIST..."
NEXT_DIST_DIR="$NEXT_DIST" npm run build

if [ -f "db/.supervisor.json" ]; then
  echo "[neeleh-update] Triggering zero-downtime blue-green reload via supervisor ($NEXT_DIST)..."
  printf '{"commit":"%s","distDir":"%s","triggeredAt":"%s"}\n' "$REMOTE_SHA" "$NEXT_DIST" "$(date -Iseconds)" > db/.reload-trigger
elif command -v pm2 >/dev/null 2>&1; then
  echo "[neeleh-update] Reloading PM2 cluster gracefully (0ms downtime)..."
  pm2 reload "$PM2_APP" --update-env
else
  echo "[neeleh-update] Build ready. Start the server with 'npm run start' to enable automatic zero-downtime reloads."
fi

echo "[neeleh-update] Successfully updated $LOCAL_SHA -> $REMOTE_SHA."
