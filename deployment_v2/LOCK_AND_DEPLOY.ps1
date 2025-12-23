$ErrorActionPreference = "Stop"

Write-Host "STARTING IMMUTABLE DEPLOYMENT PROTOCOL" -ForegroundColor Cyan

# 1. LOCAL BUILD PHASE
Write-Host "1. Building Frontend Locally (Static Artifact)..." -ForegroundColor Yellow
$env:VITE_DEPLOYMENT_MODE = "self-hosted"
$env:VITE_REST_API_URL = "/api"

# Clean dist if exists
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend Build Failed. Deployment Aborted."
}

# 2. PACKAGING PHASE
Write-Host "2. Packaging Artifacts..." -ForegroundColor Yellow
$deployPath = "deployment_package.tar.gz"
# Create tarball of dist, server, deployment_v2, package.json
tar -czf $deployPath dist server deployment_v2 package.json package-lock.json .env

# 3. UPLOAD PHASE
Write-Host "3. Uploading to VPS..." -ForegroundColor Yellow
$keyPath = "deployment_v2\keys\flowscale_key"
$vpsHost = "root@72.62.26.4"
$remoteDir = "/root/adspark-ai/immutable"

# Create remote dir
ssh -i $keyPath -o StrictHostKeyChecking=no $vpsHost "mkdir -p $remoteDir"
# Upload
scp -i $keyPath -o StrictHostKeyChecking=no $deployPath "$vpsHost`:$remoteDir/$deployPath"

# 4. REMOTE ACTIVATION PHASE
Write-Host "4. Activating Immutable State on VPS..." -ForegroundColor Yellow

# We construct the command carefully
$cmds = "cd $remoteDir && tar -xzf $deployPath && docker system prune -f && docker compose -f deployment_v2/docker-compose.lock.yml down && docker compose -f deployment_v2/docker-compose.lock.yml up -d --build --remove-orphans"

ssh -i $keyPath -o StrictHostKeyChecking=no $vpsHost $cmds

Write-Host "SYSTEM LOCKED AND DEPLOYED." -ForegroundColor Green
Write-Host "Verify at http://72.62.26.4" -ForegroundColor White
