# ENV Validation Checklist

This checklist ensures secrets parity across all FlowScale environments.

## Environments

- **Local Development** - Your local machine
- **Lovable Preview** - lovable.dev project settings
- **VPS Production** - Production server

## Required Backend Secrets

These MUST exist in all backend environments (Local, VPS):

### Local Development

```bash
cd c:\Users\conta\adspark-ai
cat .env
```

Check for:
- [ ] `SUPABASE_URL=https://...supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=eyJhbG...` (NOT a VITE_ variable)

### VPS Production

```bash
ssh user@your-vps-ip
cd /path/to/flowscale
cat .env  # Should require sudo if permissions are correct
```

Check for:
- [ ] `SUPABASE_URL=https://...supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=eyJhbG...` (NOT a VITE_ variable)
- [ ] File permissions: `ls -la .env` should show `-rw-------` (600)

## Frontend Public Variables

These are safe to expose in all environments:

### Local Development

```bash
cat .env
```

Check for:
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...` (anon key, safe)
- [ ] `VITE_SUPABASE_PROJECT_ID=your-project-id`

### Lovable Preview

Go to Lovable project settings → Environment Variables:

Check for:
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key)
- [ ] `VITE_SUPABASE_PROJECT_ID`
- [ ] **VERIFY:** No `VITE_SUPABASE_SERVICE_ROLE_KEY` (dangerous!)

### VPS Production

```bash
cat .env
```

Check for:
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...`
- [ ] `VITE_SUPABASE_PROJECT_ID=your-project-id`

## Optional Features

### Google Drive Integration

If enabled, verify in **backend** environments only:

#### Local

- [ ] `GOOGLE_CLIENT_ID=...apps.googleusercontent.com`
- [ ] `GOOGLE_CLIENT_SECRET=GOCSPX-...` (NOT a VITE_ variable)
- [ ] `GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback`

#### VPS

- [ ] `GOOGLE_CLIENT_ID=...apps.googleusercontent.com`
- [ ] `GOOGLE_CLIENT_SECRET=GOCSPX-...` (NOT a VITE_ variable)
- [ ] `GOOGLE_REDIRECT_URI=https://your-domain.com/api/oauth/google/callback`

### OAuth Token Encryption

If using encrypted OAuth storage:

#### Local & VPS

- [ ] `OAUTH_ENCRYPTION_KEY=...` (32 bytes = 64 hex chars)

Generate key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### AI Service Keys

Check based on which services you're using:

#### Local & VPS

- [ ] `OPENAI_API_KEY=sk-...` (if using OpenAI)
- [ ] `ANTHROPIC_API_KEY=sk-ant-...` (if using Anthropic)
- [ ] `ELEVENLABS_API_KEY=...` (if using ElevenLabs)
- [ ] `FAL_API_KEY=...` (if using Fal.ai)

## Verification Commands

### Test ENV Validator Locally

```bash
cd c:\Users\conta\adspark-ai
node server/env-validator.js
```

Expected output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 FlowScale Security: Environment Validation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Checking REQUIRED secrets...
   ✅ SUPABASE_URL
   ✅ SUPABASE_SERVICE_ROLE_KEY

💡 Checking RECOMMENDED secrets...
   ✅ GOOGLE_CLIENT_ID
   ...

🚫 Scanning for FORBIDDEN patterns...
   ✅ No forbidden patterns detected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Environment validation PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Test Server Startup

```bash
cd c:\Users\conta\adspark-ai
node server/api.js
```

Should NOT exit immediately. If it does, check ENV validation output.

### Verify .gitignore Protection

```bash
cd c:\Users\conta\adspark-ai
git check-ignore .env
# Expected output: .env

git check-ignore .env.local
# Expected output: .env.local

# Verify .env is not tracked
git status | grep .env
# Should see nothing (or only untracked .env if not yet committed)
```

### Scan Frontend Bundle

After building:

```bash
npm run build
Get-ChildItem -Recurse dist | Select-String "SERVICE_ROLE" -CaseSensitive
# Expected: No matches found
```

## Parity Checklist Summary

Use this quick checklist before deployment:

### Pre-Deployment

- [ ] All required secrets exist in VPS `.env`
- [ ] No `VITE_` prefix on service role keys
- [ ] `.env` file permissions are `600` on VPS
- [ ] ENV validator passes on VPS: `node server/env-validator.js`
- [ ] OAuth callback URLs match VPS domain

### Post-Deployment

- [ ] Server starts without ENV validation errors
- [ ] `/api/health` endpoint returns 200 OK
- [ ] Supabase connection is established (check logs)
- [ ] OAuth flows work (if configured)

## Troubleshooting

### ENV Validator Fails

**Error:** `MISSING REQUIRED SECRET: SUPABASE_SERVICE_ROLE_KEY`

**Solution:**
1. Check `.env` file exists
2. Verify key is spelled correctly (no typos)
3. Ensure no extra spaces or quotes around value
4. Run: `cat .env | grep SUPABASE_SERVICE_ROLE_KEY`

### Server Won't Start

**Error:** `Environment validation failed`

**Solution:**
1. Run ENV validator directly: `node server/env-validator.js`
2. Fix any reported errors
3. Restart server

### OAuth Not Working

**Error:** `Google OAuth is not configured`

**Solution:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend `.env`
2. Check `GOOGLE_REDIRECT_URI` matches your domain
3. Ensure Google Cloud Console has correct redirect URI configured

## Security Notes

🔒 **Never share `.env` files via:**
- Email
- Slack/Discord
- Git commits
- Unencrypted cloud storage

✅ **Secure methods to transfer secrets:**
- Encrypted password managers (1Password, Bitwarden)
- Encrypted file transfer (GPG, age)
- SSH with key authentication
- Secrets management services (HashiCorp Vault, AWS Secrets Manager)
