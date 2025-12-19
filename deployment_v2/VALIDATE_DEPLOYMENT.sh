#!/bin/bash

echo "=========================================="
echo "PHASE 5: VALIDATION CHECKLIST"
echo "=========================================="

# 1. Frontend Load
echo "[Check] internal Nginx..."
if curl -s -I http://localhost:80 | grep -q "200 OK"; then
    echo "PASS: Frontend is reachable."
else
    echo "FAIL: Frontend is not responding."
fi

# 2. API Health
echo "[Check] API Health Endpoint..."
HEALTH=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH" | grep -q '"ok":true'; then
    echo "PASS: API is healthy."
    echo "      Response: $HEALTH"
else
    echo "FAIL: API is unhealthy."
    echo "      Response: $HEALTH"
fi

# 3. Environment Variables (Supabase)
echo "[Check] Supabase Configuration..."
# Inspect running container env (securely)
SUPA_KEY=$(docker exec -it deployment_v2-api-1 printenv SUPABASE_SERVICE_ROLE_KEY)
if [ -n "$SUPA_KEY" ]; then
    echo "PASS: SUPABASE_SERVICE_ROLE_KEY is set in API."
else
    echo "FAIL: SUPABASE_SERVICE_ROLE_KEY is MISSING in API."
fi

# 4. RenderFlow Link
echo "[Check] RenderFlow Connection..."
# We can't curl renderflow from here easily, but API health shows queue/ffmpeg
if echo "$HEALTH" | grep -q '"ffmpeg":{"available":true'; then
    echo "PASS: API detects FFmpeg (Local)."
else
    echo "FAIL: FFmpeg missing in API container."
fi

echo "=========================================="
echo "MANUAL VERIFICATION REQUIRED for:"
echo "- Browser: Go to http://flowscale.cloud"
echo "- Login: Verify Supabase Auth redirects correctly."
echo "- Upload: Test video upload."
echo "=========================================="
