#!/bin/bash

# DEPLOY.sh - Production Deployment Script
# Run this from inside the 'deployment_v2' folder on the VPS.

set -e # Exit on error

# ----------------------------
# 1. Install Docker & Docker Compose (If missing)
# ----------------------------
if ! command -v docker &> /dev/null; then
    echo "[Setup] Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

if ! docker compose version &> /dev/null; then
    echo "[Setup] Docker Compose plugin not found. Installing..."
    apt-get update && apt-get install -y docker-compose-plugin
fi

# ----------------------------
# 2. Setup Directories
# ----------------------------
# Ensure data volumes exist (optional, docker handles it, but good for permissions)
# We use named volumes in docker-compose, so we let Docker handle storage.

# ----------------------------
# 3. Validation
# ----------------------------
if [ ! -f ".env" ]; then
    echo "[Error] .env file missing in deployment_v2!"
    exit 1
fi

echo "[Deploy] Building and Starting Services..."

# ----------------------------
# 4. Docker Compose Up
# ----------------------------
# --build: Always rebuild images
# -d: Detached mode
# --remove-orphans: Clean up old containers
docker compose up -d --build --remove-orphans

# ----------------------------
# 5. Verify Deployment
# ----------------------------
echo "[Deploy] Waiting for health checks..."
sleep 10

if curl -s http://localhost:3000/api/health | grep -q '"ok":true'; then
    echo "[Success] API is healthy."
else
    echo "[Warning] API health check failed. Check logs: docker compose logs api"
fi

if curl -s -I http://localhost:80 | grep -q "200 OK"; then
    echo "[Success] Frontend is serving."
else
    echo "[Warning] Frontend check failed. Check logs: docker compose logs frontend"
fi

echo "=========================================="
echo "Deployment Complete!"
echo "App URL: http://flowscale.cloud"
echo "API URL: http://flowscale.cloud/api"
echo "=========================================="
