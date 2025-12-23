$ErrorActionPreference = "Stop"
$VPS_IP = "72.62.26.4"
$VPS_USER = "root"
$KEY_PATH = Resolve-Path "deployment_v2/keys/flowscale_key"
$KEY_PATH_ARG = $KEY_PATH.Path

# Create the remote check script
$remoteScript = @"
#!/bin/bash
cd /root/adspark-ai/deployment_v2
echo 'Health Check:'
docker compose exec -T api curl -s http://localhost:3000/api/health
echo -e '\n\nProject Creation:'
docker compose exec -T api curl -s -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "x-user-id: 170d6fb1-4e4f-4704-ab9a-a917dc86cba5" \
  -d '{"name": "Gate Check Project"}'
"@

$remoteScript | Out-File -FilePath "remote_verify.sh" -Encoding ascii

# Upload and Run
scp -i $KEY_PATH_ARG -o StrictHostKeyChecking=no remote_verify.sh "$VPS_USER@$VPS_IP:/tmp/remote_verify.sh"
ssh -i $KEY_PATH_ARG -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "bash /tmp/remote_verify.sh"
