# FlowScale Self-Hosting Guide

This guide explains how to deploy FlowScale on your own infrastructure.

## Deployment Options

### Option 1: Lovable Cloud (Recommended)
The easiest option - everything is pre-configured and managed for you.
- No setup required
- Automatic scaling
- Built-in AI via Lovable AI Gateway
- Managed database and storage

### Option 2: Docker Compose (Self-Hosted)
Full self-hosted deployment with all services running locally.

### Option 3: Vercel/Netlify + External Supabase
Frontend on edge, backend on your own Supabase project.

### Option 4: VPS/Bare Metal
Complete control with manual setup.

---

## Docker Compose Deployment

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 20GB disk space

### Quick Start

1. **Clone and configure**
```bash
git clone <your-repo>
cd flowscale

# Copy environment template
cp .env.example .env
```

2. **Edit `.env` with your settings**
```env
# Required
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-min-32-chars
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
SITE_URL=http://localhost:3000
```

3. **Generate Supabase keys**
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate anon and service keys using supabase CLI or online tool
# See: https://supabase.com/docs/guides/self-hosting
```

4. **Start all services**
```bash
# Basic deployment
docker-compose up -d

# With AI (Ollama) support
docker-compose --profile ai up -d

# With n8n automation
docker-compose --profile automation up -d

# All features
docker-compose --profile ai --profile automation up -d
```

5. **Apply database migrations**
```bash
# Migrations are auto-applied from supabase/migrations/
# Or manually:
docker exec -i flowscale-supabase-db-1 psql -U postgres < supabase/migrations/001_initial.sql
```

6. **Access the application**
- App: http://localhost:3000
- Supabase API: http://localhost:8000
- n8n (if enabled): http://localhost:5678

### Updating
```bash
git pull
docker-compose build
docker-compose up -d
```

### Backup
```bash
# Database backup
docker exec flowscale-supabase-db-1 pg_dump -U postgres > backup.sql

# Full backup
docker-compose down
tar -czf flowscale-backup.tar.gz supabase-db-data supabase-storage-data
```

---

## Vercel + Supabase Deployment

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note your project URL and anon key

### 2. Apply Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-id

# Apply migrations
supabase db push
```

### 3. Deploy to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
vercel env add VITE_SUPABASE_PROJECT_ID
```

---

## AI Configuration

### Using Lovable AI (Cloud Only)
When deployed on Lovable Cloud, AI is automatically configured via the Lovable AI Gateway. No API keys needed.

### Using OpenAI
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Set in environment:
```env
VITE_AI_PROVIDER=openai
```
3. Users enter their API key in Settings → API Keys

### Using Gemini
1. Get API key from [aistudio.google.com](https://aistudio.google.com)
2. Set in environment:
```env
VITE_AI_PROVIDER=gemini
```
3. Users enter their API key in Settings → API Keys

### Using Ollama (Self-Hosted LLMs)
1. Install Ollama: [ollama.com](https://ollama.com)
2. Pull a model:
```bash
ollama pull llama3.2
```
3. Set in environment:
```env
VITE_AI_PROVIDER=ollama
VITE_OLLAMA_URL=http://localhost:11434
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | - | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | - | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Yes | - | Supabase project ID |
| `VITE_BACKEND_PROVIDER` | No | `supabase` | Backend: supabase, rest, local |
| `VITE_AI_PROVIDER` | No | `lovable` | AI: lovable, openai, gemini, ollama |
| `VITE_OLLAMA_URL` | No | `http://localhost:11434` | Ollama server URL |
| `VITE_DEBUG` | No | `false` | Enable debug logging |
| `VITE_DOCKER_MODE` | No | `false` | Docker deployment flag |

---

## Troubleshooting

### Database connection issues
```bash
# Check database logs
docker logs flowscale-supabase-db-1

# Verify connection
docker exec -it flowscale-supabase-db-1 psql -U postgres -c "SELECT 1"
```

### API not responding
```bash
# Check Kong gateway
docker logs flowscale-supabase-kong-1

# Verify services
docker-compose ps
```

### AI not working
1. Check AI provider is configured correctly
2. Verify API keys in Settings → API Keys
3. Check browser console for errors
4. For Ollama, ensure model is pulled: `ollama list`

---

## Security Considerations

1. **Change default passwords** - Never use default values in production
2. **Use HTTPS** - Configure SSL/TLS for production
3. **Firewall** - Only expose necessary ports (80/443)
4. **Backup regularly** - Automate database backups
5. **Update dependencies** - Keep Docker images updated
6. **RLS policies** - Verify Row Level Security is enabled

---

## Support

- Documentation: [docs.lovable.dev](https://docs.lovable.dev)
- Discord: [Lovable Community](https://discord.com/channels/1119885301872070706)
- Issues: Create issue in repository
