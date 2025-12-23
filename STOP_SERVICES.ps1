$ErrorActionPreference = "Stop"
$VPS_IP = "72.62.26.4"
$VPS_USER = "root"
$KEY_PATH = Resolve-Path "deployment_v2/keys/flowscale_key"
$KEY_PATH_ARG = $KEY_PATH.Path

Write-Host "--- STOPPING SERVICES (COLD SHUTDOWN) ---"
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" "cd /root/adspark-ai/deployment_v2 && docker compose down"
Write-Host "Services stopped."
