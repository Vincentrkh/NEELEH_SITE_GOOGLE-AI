# ─────────────────────────────────────────────────────────────────────────────
# Neeleh Academy — Windows PowerShell Zero-Downtime, Data-Preserving Update Script
# Preserves: db\custom.db, db\.session_secret, .env, public\uploads\
# Task Scheduler / Manual run:
#   powershell -ExecutionPolicy Bypass -File scripts\zero-downtime-update.ps1
# ─────────────────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $PSScriptRoot
Set-Location $AppDir

$Branch = if ($env:DEPLOY_BRANCH) { $env:DEPLOY_BRANCH } else { "main" }
$BackupDir = Join-Path $env:TEMP "neeleh-update-backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host "[neeleh-update] Checking remote branch '$Branch'..."
git fetch origin $Branch --quiet
$LocalSha = (git rev-parse HEAD).Trim()
$RemoteSha = (git rev-parse "origin/$Branch").Trim()

if ($LocalSha -eq $RemoteSha) {
    Write-Host "[neeleh-update] Already up to date ($LocalSha)."
    exit 0
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$SnapZip = Join-Path $BackupDir "pre-update-$Stamp.zip"
Write-Host "[neeleh-update] Creating pre-update backup at $SnapZip..."
if (Get-Command python -ErrorAction SilentlyContinue) {
    python scripts\create-backup-zip.py $SnapZip
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    python3 scripts\create-backup-zip.py $SnapZip
} else {
    Compress-Archive -Path "src", "prisma", "db\custom.db", "public", "package.json" -DestinationPath $SnapZip -Force
}

$ProtectTmp = Join-Path $env:TEMP "neeleh-protect-$Stamp"
New-Item -ItemType Directory -Force -Path $ProtectTmp | Out-Null

try {
    if (Test-Path ".env") { Copy-Item ".env" (Join-Path $ProtectTmp ".env") -Force }
    if (Test-Path "db\.session_secret") { Copy-Item "db\.session_secret" (Join-Path $ProtectTmp ".session_secret") -Force }
    if (Test-Path "db\custom.db") { Copy-Item "db\custom.db" (Join-Path $ProtectTmp "custom.db") -Force }
    if (Test-Path "public\uploads") { Copy-Item "public\uploads" (Join-Path $ProtectTmp "uploads") -Recurse -Force }

    Write-Host "[neeleh-update] Pulling $RemoteSha..."
    git checkout -B $Branch "origin/$Branch" --quiet

    New-Item -ItemType Directory -Force -Path "db", "public\uploads" | Out-Null
    if (Test-Path (Join-Path $ProtectTmp ".env")) { Copy-Item (Join-Path $ProtectTmp ".env") ".env" -Force }
    if (Test-Path (Join-Path $ProtectTmp ".session_secret")) { Copy-Item (Join-Path $ProtectTmp ".session_secret") "db\.session_secret" -Force }
    if (Test-Path (Join-Path $ProtectTmp "custom.db")) { Copy-Item (Join-Path $ProtectTmp "custom.db") "db\custom.db" -Force }
    if (Test-Path (Join-Path $ProtectTmp "uploads")) { Copy-Item (Join-Path $ProtectTmp "uploads\*") "public\uploads\" -Recurse -Force }

    Write-Host "[neeleh-update] Installing dependencies & syncing database schema..."
    if (Test-Path "package-lock.json") {
        npm ci --no-audit --no-fund
    } else {
        npm install --no-audit --no-fund
    }
    npx prisma db push
    npx prisma generate

    Write-Host "[neeleh-update] Building production bundle..."
    npm run build

    $SupervisorMeta = Join-Path $AppDir "db\.supervisor.json"
    if (Test-Path $SupervisorMeta) {
        $ReloadTrigger = Join-Path $AppDir "db\.reload-trigger"
        @{ commit = $RemoteSha; triggeredAt = (Get-Date).ToString("o") } | ConvertTo-Json | Set-Content -Path $ReloadTrigger -Encoding UTF8
        Write-Host "[neeleh-update] Triggered zero-downtime blue-green reload via prod-server supervisor."
    } elseif (Get-Command pm2 -ErrorAction SilentlyContinue) {
        $Pm2App = if ($env:PM2_APP_NAME) { $env:PM2_APP_NAME } else { "neeleh" }
        pm2 reload $Pm2App --update-env
    } else {
        Write-Host "[neeleh-update] Build ready. Start the server with 'npm run start' to enable automatic zero-downtime reloads."
    }

    Write-Host "[neeleh-update] Successfully updated $LocalSha -> $RemoteSha."
} finally {
    if (Test-Path $ProtectTmp) {
        Remove-Item $ProtectTmp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
