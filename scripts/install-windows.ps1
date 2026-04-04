# =============================================================
#  install-windows.ps1
#  Setup script for: import-xlsx-tranout (Local Desktop - Windows)
#
#  Steps:
#    1. Install PM2 globally
#    2. Clone project from GitHub
#    3. Install dependencies & build
#    4. Start app with PM2 + register PM2 on Windows startup
#
#  Run as Administrator in PowerShell:
#    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
#    .\scripts\install-windows.ps1
# =============================================================

$REPO_URL   = "https://github.com/nateesoft/import-xlsx-tranout.git"
$APP_DIR    = "C:\Apps\import-xlsx-tranout"
$APP_NAME   = "import-xlsx"
$APP_PORT   = "3000"

# ---------------------------------------------------------------------------
# Helper: print colored messages
# ---------------------------------------------------------------------------
function Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Warn  { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Fatal { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------------------
# Step 0 — Pre-flight checks
# ---------------------------------------------------------------------------
Info "Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fatal "Node.js is not installed. Download from https://nodejs.org (v20 LTS recommended)"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fatal "npm is not found. Reinstall Node.js from https://nodejs.org"
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Fatal "Git is not installed. Download from https://git-scm.com"
}

$nodeVer = node --version
$npmVer  = npm --version
Ok "Node.js $nodeVer | npm $npmVer"

# ---------------------------------------------------------------------------
# Step 1 — Install PM2 globally
# ---------------------------------------------------------------------------
Info "Step 1: Installing PM2 globally..."

npm install -g pm2
if ($LASTEXITCODE -ne 0) { Fatal "Failed to install PM2" }
Ok "PM2 installed"

# Install pm2-windows-startup to register PM2 as Windows startup task
Info "Installing pm2-windows-startup..."
npm install -g pm2-windows-startup
if ($LASTEXITCODE -ne 0) { Warn "pm2-windows-startup install failed — startup registration may not work" }

# ---------------------------------------------------------------------------
# Step 2 — Clone project from GitHub
# ---------------------------------------------------------------------------
Info "Step 2: Cloning project from GitHub..."
Info "Target directory: $APP_DIR"

if (Test-Path $APP_DIR) {
    Warn "Directory $APP_DIR already exists."
    $choice = Read-Host "Overwrite? (y/n)"
    if ($choice -eq "y") {
        Remove-Item -Recurse -Force $APP_DIR
    } else {
        Info "Using existing directory."
    }
}

if (-not (Test-Path $APP_DIR)) {
    git clone $REPO_URL $APP_DIR
    if ($LASTEXITCODE -ne 0) { Fatal "Git clone failed. Check your internet connection or repo URL." }
    Ok "Project cloned to $APP_DIR"
} else {
    Set-Location $APP_DIR
    git pull
    Ok "Project updated (git pull)"
}

Set-Location $APP_DIR

# ---------------------------------------------------------------------------
# Step 3 — Create .env.production.local
# ---------------------------------------------------------------------------
Info "Step 3: Configuring environment variables..."

$envFile = Join-Path $APP_DIR ".env.production.local"

if (-not (Test-Path $envFile)) {
    Write-Host ""
    Write-Host "Set your login credentials:" -ForegroundColor Yellow
    $loginUser = Read-Host "  LOGIN_USERNAME (default: admin)"
    $loginPass = Read-Host "  LOGIN_PASSWORD (default: 1234)"

    if ([string]::IsNullOrWhiteSpace($loginUser)) { $loginUser = "admin" }
    if ([string]::IsNullOrWhiteSpace($loginPass)) { $loginPass = "1234" }

    @"
LOGIN_USERNAME=$loginUser
LOGIN_PASSWORD=$loginPass
PORT=$APP_PORT
"@ | Set-Content $envFile -Encoding UTF8

    Ok ".env.production.local created"
} else {
    Ok ".env.production.local already exists — skipping"
}

# ---------------------------------------------------------------------------
# Step 3 — Install dependencies & build
# ---------------------------------------------------------------------------
Info "Step 3: Installing dependencies..."
npm ci
if ($LASTEXITCODE -ne 0) { Fatal "npm ci failed" }
Ok "Dependencies installed"

Info "Building production app..."
npm run build
if ($LASTEXITCODE -ne 0) { Fatal "npm run build failed" }
Ok "Build complete"

# ---------------------------------------------------------------------------
# Step 4 — Start with PM2 & register startup
# ---------------------------------------------------------------------------
Info "Step 4: Starting app with PM2..."

# Stop existing instance if running
pm2 delete $APP_NAME 2>$null

pm2 start npm --name $APP_NAME -- start
if ($LASTEXITCODE -ne 0) { Fatal "PM2 failed to start the app" }

pm2 save
if ($LASTEXITCODE -ne 0) { Warn "pm2 save failed — app may not persist after reboot" }
Ok "PM2 started and saved"

# Register PM2 to run on Windows startup
Info "Registering PM2 in Windows startup..."
pm2-windows-startup install
if ($LASTEXITCODE -ne 0) {
    Warn "Could not register PM2 startup automatically."
    Warn "To do it manually: run 'pm2-windows-startup install' as Administrator"
} else {
    Ok "PM2 registered in Windows startup"
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host "  App running at: http://localhost:$APP_PORT" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Cyan
Write-Host "  pm2 status                  — check app status"
Write-Host "  pm2 logs $APP_NAME          — view logs"
Write-Host "  pm2 restart $APP_NAME       — restart app"
Write-Host "  pm2 stop $APP_NAME          — stop app"
Write-Host ""
