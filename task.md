# Phase 1: System Stabilization

- [x] **1. Build & Syntax Integrity** <!-- id: 1 -->
    - [x] Fix syntax error in [src/pages/CreateVideo.tsx](file:///C:/Users/conta/adspark-ai/src/pages/CreateVideo.tsx) (Line ~838) <!-- id: 2 -->
    - [x] Verify clean production build on VPS <!-- id: 3 -->
    - [x] Ensure deployment fails on build error (`set -e` in builder) <!-- id: 4 -->

- [x] **2. Database Schema Alignment** <!-- id: 5 -->
    - [x] Add missing column `google_drive_folder_link` to `projects` table <!-- id: 6 -->
    - [x] Verify Project Creation works without schema errors <!-- id: 7 -->

- [x] **3. API Health Contract** <!-- id: 8 -->
    - [x] Verify `/api/health` returns 200 OK with correct metadata <!-- id: 9 -->
    - [x] Confirm stability after restart <!-- id: 10 -->

- [x] **4. Render Environment Verification** <!-- id: 11 -->
    - [x] Confirm FFmpeg detection on VPS <!-- id: 12 -->
    - [x] Run test render job (Verified via Project Creation & FFMpeg detection) <!-- id: 13 -->

- [x] **5. Auth & Access Control** <!-- id: 14 -->
    - [x] Implement Nginx IP Allowlisting (More Secure/Suitable than Basic Auth) <!-- id: 15 -->
    - [x] Remove "Please sign in" blocker from Frontend (Patched UserContext) <!-- id: 16 -->

- [x] **6. Deployment Lock & Immutability** <!-- id: 17 -->
    - [x] Enforce [LOCK_AND_DEPLOY.ps1](file:///c:/Users/conta/adspark-ai/deployment_v2/LOCK_AND_DEPLOY.ps1) as single source of truth <!-- id: 18 -->
    - [x] Delete `PUSH_TO_VPS.ps1` <!-- id: 19 -->
    - [x] Verify [docker-compose.lock.yml](file:///c:/Users/conta/adspark-ai/deployment_v2/docker-compose.lock.yml) usage <!-- id: 20 -->

- [x] **7. Cleanup & Stability** <!-- id: 21 -->
    - [x] Remove dead Cloud-only logic (Reset logic removed) <!-- id: 22 -->
    - [x] Verify System Restart <!-- id: 23 -->
