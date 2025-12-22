# FlowScale Security Architecture

## Overview

This document defines the security architecture for FlowScale SaaS, establishing strict boundaries between frontend and backend components to prevent credential leakage and enforce secure secret management practices.

## Architectural Security Contract (NON-NEGOTIABLE)

### 1. Secret Classification

**Backend Secrets (NEVER exposed to frontend)**
- Supabase Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`)
- OAuth Client Secrets (`GOOGLE_CLIENT_SECRET`, etc.)
- API Keys for third-party services
- OAuth Encryption Key (`OAUTH_ENCRYPTION_KEY`)

**Frontend Public Keys (Safe to expose)**
- Supabase Publishable/Anon Key (`VITE_SUPABASE_PUBLISHABLE_KEY`)
- Supabase Project ID (`VITE_SUPABASE_PROJECT_ID`)
- Public API endpoints

### 2. Environment Variable Naming Convention

```bash
# Backend-only secrets (NO VITE_ prefix)
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_CLIENT_SECRET=...

# Frontend-safe values (VITE_ prefix)
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

**CRITICAL RULE:** Service role keys and secrets MUST NEVER use `VITE_` prefix, as this exposes them in the frontend bundle.

### 3. OAuth Flow Architecture

OAuth flows are **server-side only**:

```
User → Frontend → Backend API → OAuth Provider
                        ↓
                  Token Storage (Encrypted)
                        ↓
                  Backend Services
```

**Key Principles:**
- Frontend NEVER sees access tokens or refresh tokens
- Tokens stored encrypted in Supabase `oauth_tokens` table
- Tokens scoped per user + project ID
- Backend API manages all OAuth operations

### 4. Startup Validation

The server **MUST** validate all required environment variables on startup:

```javascript
// server/env-validator.js runs FIRST
try {
  validateEnvironment();
} catch (error) {
  console.error('[FATAL] Environment validation failed');
  process.exit(1);
}
```

**Required Secrets:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Recommended Secrets:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (for Google Drive)
- `OAUTH_ENCRYPTION_KEY` (32 bytes for token encryption)
- Third-party AI service keys

### 5. No Fallback Keys

If a required secret is missing, the system MUST fail immediately with a clear error message. **No defaults, no fallbacks.**

### 6. Git Protection

`.gitignore` MUST include:

```gitignore
# Environment files - NEVER commit
.env
.env.*
!.env.example
```

**Pre-commit verification:**
```bash
git diff --cached --name-only | grep -E '^\.env$'
# Should return nothing (empty)
```

## Implementation Components

### ENV Validator (`server/env-validator.js`)

Validates environment on server boot:
- Checks required secrets exist and are non-empty
- Scans for forbidden `VITE_*SERVICE_ROLE` patterns
- Warns about missing optional secrets
- Exits immediately if validation fails

### Hardened Supabase Client (`server/supabase.js`)

- Only accepts `SUPABASE_SERVICE_ROLE_KEY` (no VITE_ fallback)
- Throws error if secrets missing
- Uses service role key for backend operations only

### OAuth Token Storage (`server/oauth-storage.js`)

- AES-256-GCM encryption for tokens
- Project-scoped storage (user_id + project_id + provider)
- Row Level Security (RLS) policies
- Never logs decrypted tokens

### API Server (`server/api.js`)

- Validates ENV before starting
- OAuth callbacks never log tokens
- Connection status API exposes only boolean status (no keys)

## Security Checklist

### Development
- [ ] `.env` file created from `.env.example`
- [ ] All required secrets populated
- [ ] `.env` is gitignored (verify: `git check-ignore .env`)
- [ ] No `VITE_` prefix on service role keys

### Deployment (VPS)
- [ ] `.env` file deployed to VPS via secure method (SSH, encrypted transfer)
- [ ] File permissions: `chmod 600 .env` (owner read/write only)
- [ ] Secrets never in Docker images (use volumes or env injection)
- [ ] OAuth encryption key is 32 bytes (64 hex chars)

### Lovable.dev
- [ ] Only `VITE_*` prefixed variables in Lovable project settings
- [ ] Service role keys ONLY in Supabase project (never Lovable config)
- [ ] Backend API calls use Supabase functions (server-side execution)

### Code Review
- [ ] No `console.log()` of secrets or tokens
- [ ] No `localStorage` or cookies for sensitive data
- [ ] Frontend code never imports `server/*` modules
- [ ] OAuth flows redirect through backend API

## Threat Model

### Prevented Threats

✅ **Frontend Bundle Leakage**
- Service role keys cannot end up in `dist/` build via `VITE_` naming enforcement

✅ **Token Theft via Console**
- OAuth tokens never logged or exposed to browser

✅ **Accidental Git Commits**
- `.env` protection in `.gitignore` prevents credential leaks

✅ **Missing Configuration**
- ENV validator prevents server from starting with incomplete config

### Remaining Considerations

⚠️ **Server Compromise**
- If VPS is compromised, `.env` secrets are accessible
- **Mitigation:** File permissions (`chmod 600`), principle of least privilege

⚠️ **Supabase RLS Bypass**
- Service role key bypasses Row Level Security
- **Mitigation:** Use anon key in frontend, service key only in trusted backend

⚠️ **OAuth Token Expiry**
- Refresh tokens may expire or be revoked
- **Mitigation:** Handle token refresh gracefully, prompt re-auth if needed

## Monitoring & Alerts

### Recommended Monitoring

1. **ENV Validation Failures**
   - Alert on server startup failures due to missing ENV vars

2. **OAuth Token Operations**
   - Log (but don't expose) token storage/retrieval attempts
   - Alert on repeated failures

3. **Supabase Connection Status**
   - Monitor `/api/health` endpoint
   - Alert if Supabase client fails to initialize

## References

- Implementation Plan: `implementation_plan.md`
- ENV Example: `.env.example`
- Validation Module: `server/env-validator.js`
- OAuth Storage: `server/oauth-storage.js`
- Deployment Guide: `VPS_DEPLOYMENT_GUIDE.md`

## Emergency Response

### If Secrets Are Exposed

1. **Rotate immediately:**
   - Regenerate Supabase service role key
   - Revoke OAuth tokens
   - Rotate third-party API keys

2. **Audit:**
   - Check git history for leaked credentials
   - Review server logs for unauthorized access
   - Review Supabase audit logs

3. **Remediate:**
   - Update `.env` with new secrets
   - Restart all services
   - Re-validate with ENV validator

4. **Document:**
   - Log incident details
   - Update security procedures if needed
