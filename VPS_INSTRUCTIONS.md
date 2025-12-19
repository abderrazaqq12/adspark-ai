# Production Deployment Guide (FlowScale SaaS)

Follow these exact steps to restart the VPS from zero and deploy the new version.

## Phase 0: Full Reset (Run on VPS)

**WARNING:** This deletes everything in `/root/adspark-ai`.

1. SSH into your VPS:
   ```bash
   ssh root@72.62.26.4
   ```

2. Run the Reset Script (Copy-Paste this block):
   ```bash
   # Kill all docker containers
   docker stop $(docker ps -aq) 2>/dev/null
   docker rm -f $(docker ps -aq) 2>/dev/null
   docker system prune -af --volumes

   # Cleanup old repo
   rm -rf /root/adspark-ai
   ```

## Phase 1: Setup Repository

1. Clone the repository on VPS:
   ```bash
   cd /root
   git clone https://github.com/abderrazaqq12/adspark-ai.git
   cd adspark-ai
   ```

## Phase 2: Upload Deployment Files

On your **LOCAL MACHINE** (in a separate terminal window):

1. Navigate to your project:
   ```bash
   cd c:\Users\conta\adspark-ai
   ```

2. Upload the `deployment_v2` folder:
   ```bash
   scp -r deployment_v2 root@72.62.26.4:/root/adspark-ai/
   ```

## Phase 3: Deploy

Back on the **VPS**:

1. Run the deployment script:
   ```bash
   cd /root/adspark-ai/deployment_v2
   chmod +x DEPLOY.sh
   ./DEPLOY.sh
   ```

## Phase 4: Validation

Run the validation script:
```bash
./VALIDATE_DEPLOYMENT.sh
```

## Architecture Summary
- **Frontend:** Docker + Nginx (Vite build with Supabase keys baked in).
- **API:** Node.js Express (Port 3000, Internal).
- **RenderFlow:** Dedicated Service (Independently scalable, Port 3001, Internal).
- **Proxy:** Nginx (Port 80) handles routing `/` -> Frontend, `/api` -> Backend.
- **Security:** No internal ports exposed. Supabase keys managed via Env.
