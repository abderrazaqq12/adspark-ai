#!/bin/bash

# FAILS if not root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

echo "=========================================="
echo "PHASE 0: FULL VPS RESET"
echo "=========================================="
echo "WARNING: This will delete ALL Docker containers, images, volumes, and data in /root/adspark-ai"
echo "Starting in 5 seconds..."
sleep 5

# 1. Stop all containers
echo "[1/5] Stopping containers..."
if [ -n "$(docker ps -aq)" ]; then
  docker stop $(docker ps -aq)
else
  echo "No running containers."
fi

# 2. Remove all containers
echo "[2/5] Removing containers..."
if [ -n "$(docker ps -aq)" ]; then
  docker rm -f $(docker ps -aq)
else
  echo "No containers to remove."
fi

# 3. Remove all images
echo "[3/5] Removing images..."
if [ -n "$(docker images -aq)" ]; then
  docker rmi -f $(docker images -aq)
else
  echo "No images to remove."
fi

# 4. Remove volumes and networks
echo "[4/5] Pruning volumes and networks..."
docker volume prune -f
docker network prune -f

# 5. Cleanup directories
echo "[5/5] Cleaning files..."
# Be careful not to delete the current directory if we are inside it
# We will assume we are deleting artifacts, not the repo itself if possible, 
# But the user said "Start from zero". 
# Usually we run this, then 'git pull'.
rm -rf /var/www/flowscale
# pm2 cleanup just in case
if command -v pm2 &> /dev/null; then
    pm2 kill || true
    rm -rf /root/.pm2
fi

echo "VPS Reset Complete. Ready for Fresh Deployment."
