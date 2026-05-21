#!/bin/bash
set -e

# ─── Configuration ────────────────────────────────────────────────
REPO_URL="https://github.com/nateesoft/import-xlsx-tranout.git"
BRANCH="main"
APP_NAME="import-xlsx-tranout"
DEPLOY_DIR="/opt/apps/import-xlsx-tranout"   # ← เปลี่ยน path ตามเซิร์ฟเวอร์
WORK_DIR="/tmp/deploy-${APP_NAME}-$$"

# ─── Colors ───────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()   { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn()  { echo -e "${YELLOW}[ WARN ]${NC} $1"; }
error() { echo -e "${RED}[ERROR ]${NC} $1"; rm -rf "$WORK_DIR" 2>/dev/null; exit 1; }

# ─── Trap: cleanup on unexpected exit ─────────────────────────────
trap 'rm -rf "$WORK_DIR" 2>/dev/null; echo -e "${RED}[ERROR ]${NC} Deploy interrupted."' ERR

echo ""
echo "=================================================="
echo "  Deploy: ${APP_NAME}"
echo "  Branch: ${BRANCH}"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="

# ─── Step 1: Check for new commits ────────────────────────────────
log "Step 1: Checking for new commits on '${BRANCH}'..."

# Fetch latest commit SHA from remote without cloning
LATEST_COMMIT=$(git ls-remote "$REPO_URL" "refs/heads/${BRANCH}" | awk '{print $1}')
[ -z "$LATEST_COMMIT" ] && error "Cannot reach remote or branch '${BRANCH}' not found."

COMMIT_SHORT="${LATEST_COMMIT:0:8}"

if [ -f "${DEPLOY_DIR}/.deployed_commit" ]; then
  DEPLOYED_COMMIT=$(cat "${DEPLOY_DIR}/.deployed_commit")
  if [ "$LATEST_COMMIT" = "$DEPLOYED_COMMIT" ]; then
    warn "No new changes (latest commit: ${COMMIT_SHORT}). Nothing to deploy."
    echo ""
    exit 0
  fi
  log "New commit: ${COMMIT_SHORT} (was: ${DEPLOYED_COMMIT:0:8})"
else
  log "First deploy — commit: ${COMMIT_SHORT}"
fi

# ─── Clone source to temp directory ───────────────────────────────
log "Cloning source code..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$WORK_DIR" \
  || error "Failed to clone repository"

# ─── Step 2: npm install ──────────────────────────────────────────
log "Step 2: Installing dependencies (npm ci)..."
cd "$WORK_DIR"
npm ci --omit=dev=false \
  || error "npm install failed"

# ─── Step 3: Build Next.js ────────────────────────────────────────
log "Step 3: Building Next.js application..."
npm run build \
  || error "Build failed"

# ─── Step 4: Deploy + PM2 ─────────────────────────────────────────
log "Step 4: Deploying standalone output to ${DEPLOY_DIR}..."
mkdir -p "$DEPLOY_DIR"

# Write PM2 ecosystem config into standalone directory
cat > "${WORK_DIR}/.next/standalone/ecosystem.config.cjs" << 'ECOSYSTEM'
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
ECOSYSTEM

# Sync standalone → deploy dir (atomic-ish: rsync then commit hash)
rsync -a --delete \
  "${WORK_DIR}/.next/standalone/" \
  "${DEPLOY_DIR}/" \
  || error "Failed to copy build output"

# Record deployed commit
echo "$LATEST_COMMIT" > "${DEPLOY_DIR}/.deployed_commit"

# Start or restart PM2
log "Step 4: Starting PM2..."
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 restart "${DEPLOY_DIR}/ecosystem.config.cjs" \
    --only "$APP_NAME" \
    --env production \
    || error "pm2 restart failed"
  log "PM2 restarted: ${APP_NAME}"
else
  pm2 start "${DEPLOY_DIR}/ecosystem.config.cjs" \
    --only "$APP_NAME" \
    --env production \
    || error "pm2 start failed"
  log "PM2 started: ${APP_NAME}"
fi

pm2 save || warn "pm2 save failed (non-fatal)"

# ─── Step 5: Remove source code ───────────────────────────────────
log "Step 5: Removing source directory (${WORK_DIR})..."
rm -rf "$WORK_DIR"

# Disable ERR trap (clean exit)
trap - ERR

echo ""
echo "=================================================="
echo -e "  ${GREEN}Deploy successful!${NC}"
echo "  App    : ${APP_NAME}"
echo "  Commit : ${COMMIT_SHORT}"
echo "  Deploy : ${DEPLOY_DIR}"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo ""
