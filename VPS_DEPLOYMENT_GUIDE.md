# FlowScale AI - VPS Deployment Guide

**Target Audience:** System Administrators / Developers
**Goal:** Deploy FlowScale AI (Frontend + Node.js Backend + Database + AI Engine) on a Linux VPS.

---

## 🛑 Step 1: Clean Slate (Danger Zone)
**WARNING:** This will DELETE ALL DATA on your VPS related to Docker. Only do this if you want a fresh start.

```bash
# 1. Stop all running containers
docker-compose down

# 2. Remove all unused containers, networks, and images
docker system prune -a --volumes -f

# 3. (Optional) Manually remove persistence folders if they exist
rm -rf supabase/volumes
rm -rf docker/volumes
```

---

## 🚀 Step 2: Setup Codebase

1.  **Clone or Update Repository**
    ```bash
    git clone https://github.com/your-repo/flowscale-ai.git
    cd flowscale-ai
    ```

2.  **Verify New Deployment Files**
    Ensure these files exist (I just created them for you):
    - `Dockerfile.backend`
    - `docker-compose.prod.yml`
    - `docker/nginx-prod.conf`

3.  **Environment Configuration**
    ```bash
    cp .env.example .env
    nano .env
    ```
    **Critical .env Settings for VPS:**
    ```env
    # Database Security
    POSTGRES_PASSWORD=generate_a_strong_password_here
    
    # Supabase Keys (Use the scripts/generate-keys.sh if you have it, or use online generator)
    # MUST be valid JWTs signed with your JWT_SECRET
    JWT_SECRET=generate_a_32_char_secret_here
    SUPABASE_ANON_KEY=...
    SUPABASE_SERVICE_ROLE_KEY=...
    
    # AI Providers (Required)
    OPENAI_API_KEY=sk-...
    GEMINI_API_KEY=...
    
    # Backend URL (Must point to your VPS IP or Domain)
    # For Docker internal, we use relative paths, but for public access:
    VITE_SUPABASE_URL=http://your-vps-ip:8000
    VITE_BACKEND_PROVIDER=local
    VITE_AI_PROVIDER=gemini 
    ```

---

## 🛠️ Step 3: Deploy

We use two compose files: the base one for Supabase/DB and the production override for our custom Node.js backend.

```bash
# Build and Start in Background
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Wait for 1-2 minutes** for the database to initialize and applying migrations.

---

## ✅ Step 4: Verification

1.  **Check Service Status**
    ```bash
    docker-compose ps
    ```
    *You should see: `app`, `backend`, `supabase-db`, `supabase-kong`, `supabase-auth`, etc., all "Up".*

2.  **Check Backend Logs** (If video generation isn't working)
    ```bash
    docker-compose logs -f backend
    ```
    *Look for: `RenderFlow v2 listening on port 3001` and `FFmpeg Found`.*

3.  **Test Endpoints**
    -   **Frontend:** `http://your-vps-ip` (Should see FlowScale AI Login)
    -   **Backend Health:** `http://your-vps-ip/api/health` (Should return `{"status":"healthy"}`)
    -   **Supabase:** `http://your-vps-ip:8000`

---

## 🔧 Troubleshooting

**Issue: "Job stuck in pending"**
- Check if the `backend` service is running.
- View logs: `docker-compose logs --tail=100 backend`
- Ensure `ffmpeg` is installed in the container (our `Dockerfile.backend` does this).

**Issue: "Upload failed"**
- Check Nginx body size limit (set to 500M in `docker/nginx-prod.conf`).
- Check disk space: `df -h`.

**Issue: "502 Bad Gateway"**
- The container might be restarting. Check `docker-compose ps`.
- If `backend` keeps restarting, check logs for crash reason (likely missing ENV variable).
