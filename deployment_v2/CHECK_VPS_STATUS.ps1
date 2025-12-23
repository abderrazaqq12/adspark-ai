$ErrorActionPreference = "Stop"

$VPS_USER = "root"
$VPS_IP = "72.62.22.13"
$KEY_PATH = Resolve-Path "deployment_v2/keys/flowscale_key"
$KEY_PATH_ARG = $KEY_PATH.Path

Write-Host "=== VPS Container Status ===" -ForegroundColor Cyan

# Check container status
Write-Host "`n[1] Container Status:" -ForegroundColor Yellow
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "cd /root/adspark-ai/source/deployment_v2 && docker compose ps"

# Check API logs (last 30 lines)
Write-Host "`n[2] API Container Logs (last 30 lines):" -ForegroundColor Yellow
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "cd /root/adspark-ai/source/deployment_v2 && docker compose logs api --tail 30"
