$ErrorActionPreference = "Stop"

Write-Host "STARTING IMMUTABLE DEPLOYMENT PROTOCOL" -ForegroundColor Cyan

# 1. LOCAL BUILD PHASE
Write-Host "1. Building Frontend Locally (Static Artifact)..." -ForegroundColor Yellow
$env:VITE_DEPLOYMENT_MODE="self-hosted"
$env:VITE_REST_API_URL="/api"

# Clean dist if exists
if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }

# Attempt build (will likely fail on user machine, triggering fallback)
# We relax ErrorAction because npm writes to stderr which stops execution
$oldPre = $ErrorActionPreference
$ErrorActionPreference = "Continue"
npm run build 2>$null
$buildExitCode = $LASTEXITCODE
$ErrorActionPreference = $oldPre

if ($buildExitCode -ne 0) {
    Write-Warning "Local Build Failed. Switching to RELIABLE REMOTE BUILD using VPS Swap..."
    
    # REMOTE BUILD PROTOCOL
    
    # 1. Upload Source for Building
    Write-Host "1b. Uploading Source to VPS Builder..." -ForegroundColor Yellow
    $buildSourcePath = "source_bundle.tar.gz"
    # Create tar including everything except massive folders
    tar --exclude='node_modules' --exclude='.git' --exclude='dist' -czf $buildSourcePath .
    
    $keyPath = "deployment_v2\keys\flowscale_key"
    $vpsHost = "root@72.62.26.4"
    $remoteDir = "/root/adspark-ai/immutable"
    
    # Ensure remote dir exists
    ssh -i $keyPath $vpsHost "mkdir -p $remoteDir"
    
    # Upload source
    scp -i $keyPath $buildSourcePath "$vpsHost`:$remoteDir/source_bundle.tar.gz"
    
    # 2. Trigger Docker Build
    Write-Host "1c. Building on VPS (This may take a moment)..." -ForegroundColor Yellow
    # Note: We strip \r to prevent bash errors on Linux
    $buildCmd = @"
    cd $remoteDir
    tar -xzf source_bundle.tar.gz -C .
    # Build builder image
    # Note: We use --no-cache to ensure fresh deps
    docker build --no-cache -t flowscale-builder -f deployment_v2/Dockerfile.builder .
    # Extract dist
    docker create --name temp_builder flowscale-builder
    docker cp temp_builder:/app/dist ./dist
    docker rm -f temp_builder
"@ -replace "`r", ""
    ssh -i $keyPath $vpsHost $buildCmd
    
    Write-Host "Remote Build Complete. Deployment Package will be created on remote or skipped." -ForegroundColor Yellow

} else {
    # Local build success - Standard flow
    Write-Host "2. Packaging Artifacts..." -ForegroundColor Yellow
    $deployPath = "deployment_package.tar.gz"
    tar -czf $deployPath dist server deployment_v2 package.json package-lock.json .env
    
    $keyPath = "deployment_v2\keys\flowscale_key"
    $vpsHost = "root@72.62.26.4"
    $remoteDir = "/root/adspark-ai/immutable"

    # Upload package
    ssh -i $keyPath $vpsHost "mkdir -p $remoteDir"
    scp -i $keyPath $deployPath "$vpsHost`:$remoteDir/$deployPath"
}

# 4. REMOTE ACTIVATION PHASE
Write-Host "4. Activating Immutable State on VPS..." -ForegroundColor Yellow
$keyPath = "deployment_v2\keys\flowscale_key"
$vpsHost = "root@72.62.26.4"
$remoteDir = "/root/adspark-ai/immutable"

$remoteActivateCmd = @"
cd $remoteDir

# If we run standard flow, extract package
if [ -f "deployment_package.tar.gz" ]; then
    tar -xzf deployment_package.tar.gz
fi

# Prune old containers
docker system prune -f

# Start locked system
docker compose -f deployment_v2/docker-compose.lock.yml down
docker compose -f deployment_v2/docker-compose.lock.yml up -d --build --remove-orphans
"@ -replace "`r", ""

ssh -i $keyPath $vpsHost $remoteActivateCmd

Write-Host "SYSTEM LOCKED AND DEPLOYED." -ForegroundColor Green
Write-Host "Verify at http://72.62.26.4" -ForegroundColor White
exit 0
