$ErrorActionPreference = "Stop"
$VPS_IP = "72.62.26.4"
$VPS_USER = "root"
$KEY_PATH = Resolve-Path "deployment_v2/keys/flowscale_key"
$KEY_PATH_ARG = $KEY_PATH.Path

Write-Host "--- GATE 1: HEALTH CHECK ---"
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" 'cd /root/adspark-ai/deployment_v2 && docker compose exec -T api curl -s http://localhost:3000/api/health'

Write-Host "`n--- GATE 1: PROJECT CREATION ---"
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$VPS_USER@$VPS_IP" 'cd /root/adspark-ai/deployment_v2 && docker compose exec -T api curl -s -X POST http://localhost:3000/api/projects -H "Content-Type: application/json" -H "x-user-id: 170d6fb1-4e4f-4704-ab9a-a917dc86cba5" -d "{\"name\": \"Gate Check Docker\"}"'
