$ErrorActionPreference = "Stop"

$VPS_USER = "root"
$VPS_IP = "72.62.26.4"
$KEY_PATH = Resolve-Path "deployment_v2/keys/flowscale_key"
$KEY_PATH_ARG = $KEY_PATH.Path

Write-Host "Fetching API Logs..." -ForegroundColor Yellow

ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "cd /root/adspark-ai/deployment_v2 && docker compose logs api --tail 100"
