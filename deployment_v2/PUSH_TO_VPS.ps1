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

# 2. Upload Files
Write-Host "[2/4] Uploading deployment artifacts..." -ForegroundColor Yellow
# We assume we are in the repo root
scp -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -r deployment_v2 "$VPS_USER@${VPS_IP}:${TARGET_DIR}/"

# 3. Clean & Deploy
Write-Host "[3/4] Executing Remote Deployment..." -ForegroundColor Yellow

$REMOTE_CMD = "
cd $TARGET_DIR

echo '[Remote] Wiping old code...'
find . -maxdepth 1 ! -name 'deployment_v2' ! -name '.' -exec rm -rf {} +

echo '[Remote] Cloning fresh repository...'
git clone https://github.com/abderrazaqq12/adspark-ai.git .

echo '[Remote] Setting permissions...'
cd deployment_v2
chmod +x *.sh

echo '[Remote] Running DEPLOY.sh...'
./DEPLOY.sh
"

# We pass the block as a single argument. 
# Note: Complex quoting in PowerShell for SSH can be tricky.
# We will send the command encoded or simplified.
# Validating simple transmission first.

ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "cd $TARGET_DIR && rm -rf source && git clone https://github.com/abderrazaqq12/adspark-ai.git source && cp -r deployment_v2 source/ && cd source/deployment_v2 && chmod +x *.sh && ./DEPLOY.sh"

Write-Host "==========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "=========================================="
