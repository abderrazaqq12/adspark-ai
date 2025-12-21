Write-Host "Connecting to VPS to apply fixes..."
ssh root@72.62.26.4 "cd /root && echo 'Backing up env...' && cp adspark-ai/.env .env.backup 2>/dev/null; echo 'Removing broken folder...' && rm -rf adspark-ai && echo 'Cloning fresh code...' && git clone https://github.com/abderrazaqq12/adspark-ai.git && cd adspark-ai && echo 'Restoring env...' && cp ../.env.backup .env && echo 'Rebuilding app...' && docker compose up -d --build app"
Write-Host "Done! Please verify by uploading a large file."
