# FlowScale VPS Production Checklist

## Pre-Deployment Requirements

### 1. Server Setup

- [ ] **VPS Specifications**
  - Minimum: 2 vCPU, 4GB RAM, 50GB SSD
  - Recommended: 4 vCPU, 8GB RAM, 100GB SSD
  - Ubuntu 22.04 LTS or Debian 12

- [ ] **Domain & DNS**
  - [ ] Domain points to VPS IP: `flowscale.cloud → YOUR_VPS_IP`
  - [ ] SSL certificate installed (use Certbot)
  
  ```bash
  sudo apt install certbot python3-certbot-nginx
  sudo certbot --nginx -d flowscale.cloud -d www.flowscale.cloud
  ```

### 2. FFmpeg Installation

```bash
# Install FFmpeg
sudo apt update
sudo apt install -y ffmpeg

# Verify installation
ffmpeg -version
which ffmpeg  # Should return /usr/bin/ffmpeg

# Test encoding capability
ffmpeg -i /dev/zero -f lavfi -i testsrc2=d=1:s=640x480:r=30 -t 1 -c:v libx264 -f null -
```

- [ ] FFmpeg version 4.4+ installed
- [ ] libx264 codec available
- [ ] AAC audio codec available

### 3. Node.js Installation

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20.x
npm --version

# Install PM2 globally
sudo npm install -g pm2
```

- [ ] Node.js 20.x installed
- [ ] npm 9.x or higher
- [ ] PM2 installed globally

### 4. Directory Structure

```bash
# Create required directories
sudo mkdir -p /var/www/flowscale/{dist,uploads,outputs,logs}

# Set ownership (replace 'deploy' with your deploy user)
sudo chown -R deploy:deploy /var/www/flowscale

# Set permissions
chmod 755 /var/www/flowscale
chmod 755 /var/www/flowscale/{uploads,outputs,logs}
```

- [ ] `/var/www/flowscale/dist/` - Frontend build
- [ ] `/var/www/flowscale/uploads/` - Video uploads (writable)
- [ ] `/var/www/flowscale/outputs/` - Rendered videos (writable)
- [ ] `/var/www/flowscale/logs/` - Application logs (writable)

### 5. Application Deployment

```bash
cd /var/www/flowscale

# Clone or copy application
git clone YOUR_REPO .

# Install dependencies
npm install --production

# Copy environment file
cp deployment/env.example .env

# Edit environment variables
nano .env

# Build frontend
npm run build

# Start API server with PM2
pm2 start server/api.js --name flowscale-api
pm2 save
pm2 startup  # Run the output command as root
```

- [ ] Application code deployed
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Frontend built to `/dist`
- [ ] PM2 process running

### 6. Nginx Configuration

```bash
# Copy nginx config
sudo cp deployment/nginx/flowscale.conf /etc/nginx/sites-available/flowscale.conf

# Enable site
sudo ln -s /etc/nginx/sites-available/flowscale.conf /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

- [ ] Nginx config installed
- [ ] Config syntax validated
- [ ] SSL certificates configured
- [ ] Nginx reloaded

## Post-Deployment Verification

### 7. Health Checks

```bash
# Test API health endpoint
curl -s https://flowscale.cloud/api/health | jq

# Expected response:
# {
#   "ok": true,
#   "ffmpeg": { "available": true, "path": "/usr/bin/ffmpeg", "version": "..." },
#   "outputsDir": "/var/www/flowscale/outputs",
#   "uploadsDir": "/var/www/flowscale/uploads",
#   "queueLength": 0,
#   "currentJob": null,
#   "uptime": 123.456,
#   "time": "2025-01-01T00:00:00.000Z"
# }
```

- [ ] `/api/health` returns JSON with `ok: true`
- [ ] FFmpeg shows as available
- [ ] Directories accessible

### 8. Upload Test

```bash
# Test file upload
curl -X POST https://flowscale.cloud/api/upload \
  -F "video=@test-video.mp4" \
  -H "Content-Type: multipart/form-data" | jq

# Expected: { "ok": true, "fileId": "...", "filePath": "...", "publicUrl": "..." }
```

- [ ] Upload endpoint accepts files
- [ ] Files saved to uploads directory
- [ ] Response is JSON (not HTML)

### 9. Render Test

```bash
# Queue a render job
curl -X POST https://flowscale.cloud/api/execute \
  -H "Content-Type: application/json" \
  -d '{"sourcePath": "/var/www/flowscale/uploads/YOUR_FILE.mp4"}' | jq

# Poll job status
curl https://flowscale.cloud/api/jobs/YOUR_JOB_ID | jq
```

- [ ] Execute endpoint queues jobs
- [ ] Job status endpoint returns progress
- [ ] Output file created in outputs directory
- [ ] Output URL accessible

## Security Checklist

### 10. Firewall

```bash
# UFW setup
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

- [ ] Only ports 22, 80, 443 open
- [ ] API port 3000 NOT exposed externally

### 11. Process Security

- [ ] API runs as non-root user
- [ ] File paths validated (no path traversal)
- [ ] MIME types validated on upload
- [ ] File size limits enforced
- [ ] Timeout on FFmpeg processes

### 12. Logs

```bash
# View PM2 logs
pm2 logs flowscale-api

# View nginx logs
sudo tail -f /var/log/nginx/flowscale.access.log
sudo tail -f /var/log/nginx/flowscale.error.log
```

- [ ] PM2 logging enabled
- [ ] Nginx access/error logs configured
- [ ] Log rotation configured

## Monitoring

### 13. PM2 Monitoring

```bash
# PM2 status
pm2 status

# PM2 monitoring
pm2 monit

# Enable PM2 startup script
pm2 startup
pm2 save
```

- [ ] PM2 auto-restart on crash
- [ ] PM2 auto-start on server reboot

### 14. Disk Space

```bash
# Check disk usage
df -h

# Check uploads/outputs size
du -sh /var/www/flowscale/uploads
du -sh /var/www/flowscale/outputs
```

- [ ] Adequate disk space (50GB+ free)
- [ ] Consider automated cleanup for old files

## Maintenance

### Regular Tasks

- [ ] **Weekly**: Check disk space, clean old outputs
- [ ] **Monthly**: Review logs, update SSL certs
- [ ] **Quarterly**: Security updates, dependency updates

### Cleanup Script

```bash
# Add to crontab: 0 3 * * * /var/www/flowscale/cleanup.sh

#!/bin/bash
# Delete files older than 7 days
find /var/www/flowscale/outputs -type f -mtime +7 -delete
find /var/www/flowscale/uploads -type f -mtime +7 -delete
```

## Troubleshooting

### Common Issues

| Issue | Check |
|-------|-------|
| HTML instead of JSON | Nginx not proxying /api/* correctly |
| 502 Bad Gateway | Node.js server not running (`pm2 status`) |
| FFmpeg unavailable | Check `which ffmpeg` and permissions |
| Upload fails | Check disk space and directory permissions |
| Render timeout | Increase MAX_RENDER_TIME in .env |

### Debug Commands

```bash
# Check if API is listening
netstat -tlnp | grep 3000

# Test local API
curl http://127.0.0.1:3000/api/health

# Check PM2 logs
pm2 logs flowscale-api --lines 100

# Check nginx error log
sudo tail -100 /var/log/nginx/flowscale.error.log
```
