#Requires -Version 5.1
<#
.SYNOPSIS
    Deploy script for import-xlsx-tranout (Windows / PowerShell)
.DESCRIPTION
    1. Check new commits from GitHub main branch
    2. npm ci
    3. Next.js build
    4. PM2 start/restart & pm2 save
    5. Remove source directory
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Configuration ---------------------------------------------------
$REPO_URL   = "https://github.com/nateesoft/import-xlsx-tranout.git"
$BRANCH     = "main"
$APP_NAME   = "import-xlsx-tranout"
$DEPLOY_DIR = "C:\apps\import-xlsx-tranout"          # <-- change path to match your server
$WORK_DIR   = Join-Path $env:TEMP "deploy-${APP_NAME}-${PID}"
$ORIG_DIR   = $PWD.Path

# --- Helper functions ------------------------------------------------
function Write-Log   { param($msg) Write-Host "[DEPLOY] $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "[ WARN ] $msg" -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "[ERROR ] $msg" -ForegroundColor Red }

function Invoke-Cmd {
    param([string]$Cmd, [string[]]$CmdArgs, [string]$ErrMsg)
    & $Cmd @CmdArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Err $ErrMsg
        Cleanup
        exit 1
    }
}

function Cleanup {
    Set-Location $ORIG_DIR
    if (Test-Path $WORK_DIR) {
        Write-Log "Cleaning up temp directory..."
        Remove-Item -Recurse -Force $WORK_DIR -ErrorAction SilentlyContinue
    }
}

# --- Header ----------------------------------------------------------
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Deploy: $APP_NAME"                                -ForegroundColor Cyan
Write-Host "  Branch: $BRANCH"                                  -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"       -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# --- Step 1: Check for new commits -----------------------------------
Write-Log "Step 1: Checking for new commits on '$BRANCH'..."

$gitOutput = & git ls-remote $REPO_URL "refs/heads/$BRANCH"
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($gitOutput)) {
    Write-Err "Cannot reach remote or branch '$BRANCH' not found."
    exit 1
}

$LATEST_COMMIT = ($gitOutput -split '\s+')[0]
$COMMIT_SHORT  = $LATEST_COMMIT.Substring(0, 8)

$deployedCommitFile = Join-Path $DEPLOY_DIR ".deployed_commit"
if (Test-Path $deployedCommitFile) {
    $DEPLOYED_COMMIT = (Get-Content $deployedCommitFile).Trim()
    if ($LATEST_COMMIT -eq $DEPLOYED_COMMIT) {
        Write-Warn "No new changes (latest commit: $COMMIT_SHORT). Nothing to deploy."
        Write-Host ""
        exit 0
    }
    Write-Log "New commit: $COMMIT_SHORT (was: $($DEPLOYED_COMMIT.Substring(0,8)))"
} else {
    Write-Log "First deploy - commit: $COMMIT_SHORT"
}

# --- Clone source to temp directory ----------------------------------
Write-Log "Cloning source code to $WORK_DIR..."
Invoke-Cmd git @("clone", "--depth", "1", "--branch", $BRANCH, $REPO_URL, $WORK_DIR) `
    "Failed to clone repository"

Set-Location $WORK_DIR

# Add Git Unix tools to PATH so Unix commands (rm, cp, etc.) work in npm scripts
$gitUnixBin = "C:\Program Files\Git\usr\bin"
if (Test-Path $gitUnixBin) {
    $env:PATH = "$gitUnixBin;$env:PATH"
} else {
    Write-Warn "Git Unix tools not found at '$gitUnixBin' - build may fail if npm scripts use Unix commands"
}

# --- Step 2: npm install ---------------------------------------------
Write-Log "Step 2: Installing dependencies (npm ci)..."
Invoke-Cmd npm @("ci") "npm install failed"

# --- Step 3: Build Next.js -------------------------------------------
Write-Log "Step 3: Building Next.js application (Windows build)..."
Invoke-Cmd npm @("run", "build:win") "Build failed"

# --- Step 3b: Validate standalone output -----------------------------
Write-Log "Step 3b: Validating standalone build output..."
$standaloneDir    = Join-Path $WORK_DIR ".next\standalone"
$standaloneServer = Join-Path $standaloneDir "server.js"
if (-not (Test-Path $standaloneServer)) {
    Write-Err "server.js not found at '$standaloneServer'"
    Write-Err "Fix: add  output: 'standalone'  to next.config.js"
    Cleanup
    exit 1
}

# --- Step 3c: Merge static assets into standalone (same as Jenkinsfile xcopy) ---
Write-Log "Step 3c: Merging static assets into standalone output..."
robocopy (Join-Path $WORK_DIR ".next\static") (Join-Path $standaloneDir ".next\static") /E /NFL /NDL /NJH /NJS /W:1 /R:3
if ($LASTEXITCODE -ge 8) {
    Write-Err "Failed to copy .next/static into standalone (exit code: $LASTEXITCODE)"
    Cleanup
    exit 1
}

$publicSrc = Join-Path $WORK_DIR "public"
if (Test-Path $publicSrc) {
    robocopy $publicSrc (Join-Path $standaloneDir "public") /E /NFL /NDL /NJH /NJS /W:1 /R:3
    if ($LASTEXITCODE -ge 8) {
        Write-Err "Failed to copy public into standalone (exit code: $LASTEXITCODE)"
        Cleanup
        exit 1
    }
}

# --- Step 4: Deploy + PM2 --------------------------------------------
Write-Log "Step 4: Deploying standalone output to $DEPLOY_DIR..."
if (-not (Test-Path $DEPLOY_DIR)) {
    New-Item -ItemType Directory -Path $DEPLOY_DIR -Force | Out-Null
}

# Write PM2 ecosystem config into standalone directory
$ecosystemContent = @'
module.exports = {
  apps: [{
    name: 'import-xlsx-tranout',
    script: 'server.js',
    cwd: __dirname,
    watch: false,
    instances: 1,
    autorestart: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
    },
  }],
}
'@
$ecosystemPath = Join-Path $standaloneDir "ecosystem.config.cjs"
Set-Content -Path $ecosystemPath -Value $ecosystemContent -Encoding UTF8

# Validate server.js is still present before deploying
if (-not (Test-Path $standaloneServer)) {
    Write-Err "server.js missing from standalone before deploy - aborting"
    Cleanup
    exit 1
}

# Stop PM2 before copying to release any file handles (same as Jenkinsfile)
Write-Log "Stopping PM2 process before deploy..."
& pm2 delete $APP_NAME 2>&1 | Out-Null   # suppress output; OK if process doesn't exist yet

# Single robocopy: standalone (already contains .next/static + public) -> DEPLOY_DIR
Write-Log "Syncing standalone to $DEPLOY_DIR..."
robocopy $standaloneDir $DEPLOY_DIR /E /MIR /MT:8 /NFL /NDL /NJH /NJS /W:1 /R:3
# robocopy exit codes: 0-7 = success/warning, 8+ = error
if ($LASTEXITCODE -ge 8) {
    Write-Err "robocopy failed (exit code: $LASTEXITCODE)"
    Cleanup
    exit 1
}

# Record deployed commit
Set-Content -Path (Join-Path $DEPLOY_DIR ".deployed_commit") -Value $LATEST_COMMIT -Encoding UTF8

# Start PM2 fresh (always start, never restart, so cwd/__dirname resolves correctly)
Write-Log "Step 4: Starting PM2..."
$ecosystemDeploy = Join-Path $DEPLOY_DIR "ecosystem.config.cjs"
Invoke-Cmd pm2 @("start", $ecosystemDeploy, "--only", $APP_NAME, "--env", "production") `
    "pm2 start failed"
Write-Log "PM2 started: $APP_NAME"

& pm2 save
if ($LASTEXITCODE -ne 0) { Write-Warn "pm2 save failed (non-fatal)" }

# --- Step 5: Remove source code --------------------------------------
Write-Log "Step 5: Removing source directory..."
Cleanup

# --- Done ------------------------------------------------------------
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Deploy successful!" -ForegroundColor Green
Write-Host "  App    : $APP_NAME"
Write-Host "  Commit : $COMMIT_SHORT"
Write-Host "  Deploy : $DEPLOY_DIR"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
