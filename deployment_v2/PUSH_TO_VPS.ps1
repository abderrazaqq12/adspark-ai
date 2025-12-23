$ErrorActionPreference = "Stop"

$VPS_USER = "root"
$VPS_IP = "72.62.26.4"
$TARGET_DIR = "/root/adspark-ai"
$KEY_PATH = Resolve-Path "deployment_v2/keys/flowscale_key"
$KEY_PATH_ARG = $KEY_PATH.Path

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  FlowScale Automatic Deployment Pusher" -ForegroundColor Cyan
Write-Host "=========================================="
Write-Host "Target: $VPS_USER@$VPS_IP"
Write-Host "Auth: Key-based (No password required if key is added)"
Write-Host ""

# Check key permissions (Windows permissions are loose, usually fine for OpenSSH on Windows typically, but script handles logic)

# 1. Create Remote Directory
Write-Host "[1/4] Preparing Remote Directory..." -ForegroundColor Yellow
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "mkdir -p $TARGET_DIR"

# 2. Upload Files (Direct Sync)
Write-Host "[2/4] Uploading LOCAL source code (Bypassing Git)..." -ForegroundColor Yellow

# Create source directory
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "mkdir -p $TARGET_DIR/source"

# Upload everything EXCLUDING node_modules, .git, data, artifacts
# We use tar to respect excludes and one-shot transfer
tar --exclude='node_modules' --exclude='.git' --exclude='data' --exclude='deployment_v2/keys' -czf - . | ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "tar -xzf - -C $TARGET_DIR/source"

# 3. Clean & Deploy
Write-Host "[3/4] Executing Remote Deployment..." -ForegroundColor Yellow

# Updated remote logic: Use uploaded source
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "cd $TARGET_DIR/source/deployment_v2 && chmod +x *.sh && ./DEPLOY.sh"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "=========================================="
