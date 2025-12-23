# Walkthrough: VPS Stabilization Fixes

## Overview
This document describes the steps taken to stabilize the FlowScale AI VPS deployment, solving critical 502/500 errors and securing the instance.

## 1. 502 Bad Gateway Fix
**Symptoms:** The API container was crashing repeatedly, causing Nginx to return 502 Bad Gateway.
**Root Cause:** The `local-db.js` file contained "Emergency Reset" logic that deleted the `flowscale.db` file on every startup. This was intended for recovery but caused instability.
**Fix:** Removed the file deletion lines (`fs.unlinkSync`) in `server/local-db.js`.

## 2. 500 Project Creation Error Fix
**Symptoms:** Creating a project returned "500 Internal Server Error".
**Debug Process:**
1. Added temporary logging to `server/api.js` to capture the error to `uploads/last_error.txt`.
2. Retrieved the log via SSH.
3. **Error:** `TypeError: Cannot destructure property 'name' of 'data' as it is undefined.`
**Root Cause:** The Express app was missing the `express.json()` middleware, so `req.body` was undefined for JSON POST requests.
**Fix:** Added `app.use(express.json({ limit: '500mb' }));` to `server/api.js`.

## 3. Security Hardening
**Requirement:** Single User Mode.
**Implementation:** Configured `deployment_v2/nginx.conf` to allow only:
- User IP: `160.176.134.163`
- Localhost: `127.0.0.1`
- Docker Network: `172.16.0.0/12`
- **Denied all other traffic.**

## 4. Verification
- **API Health:** `https://72.62.26.4/api/health` -> 200 OK.
- **Project Creation:** Verified via script. Success.
