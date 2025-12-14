# Phase 2: Redis/BullMQ Worker Architecture

## Overview

This document describes the migration path from the current in-memory job queue to a distributed Redis-based queue using BullMQ. This architecture enables horizontal scaling without changing the frontend API contract.

## Current Architecture (Phase 1)

```
┌─────────────┐     ┌───────────────────────────────────────────┐
│   Frontend  │────▶│         Single VPS                        │
│             │     │  ┌─────────────────────────────────────┐  │
│             │     │  │ Node.js API Server                  │  │
│             │     │  │ - Express HTTP endpoints            │  │
│             │     │  │ - In-memory job queue (Map)         │  │
│             │     │  │ - Single FFmpeg process             │  │
│             │     │  └─────────────────────────────────────┘  │
└─────────────┘     └───────────────────────────────────────────┘
```

**Limitations:**
- Single point of failure
- Memory-bound job queue (lost on restart)
- Cannot scale horizontally
- One FFmpeg job at a time

## Target Architecture (Phase 2)

```
                                    ┌─────────────────────┐
                                    │      Redis          │
                                    │   (Job Queue)       │
                                    └─────────┬───────────┘
                                              │
┌─────────────┐     ┌─────────────────────────┼─────────────────────────┐
│   Frontend  │────▶│         API Gateway (Nginx)                       │
│             │     └─────────────────────────┼─────────────────────────┘
│             │                               │
│             │     ┌─────────────────────────┼─────────────────────────┐
└─────────────┘     │   Load Balanced API Servers (stateless)          │
                    │   ┌─────────────┐ ┌─────────────┐                 │
                    │   │   API 1     │ │   API 2     │ ...             │
                    │   └─────────────┘ └─────────────┘                 │
                    └─────────────────────────┼─────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │   Worker Pool (FFmpeg Processors)                 │
                    │   ┌─────────────┐ ┌─────────────┐                 │
                    │   │  Worker 1   │ │  Worker 2   │ ...             │
                    │   │  (FFmpeg)   │ │  (FFmpeg)   │                 │
                    │   └─────────────┘ └─────────────┘                 │
                    └───────────────────────────────────────────────────┘
```

## Migration Strategy

### Frontend Contract (UNCHANGED)

The frontend API contract remains exactly the same:

```typescript
// These endpoints work identically in Phase 1 and Phase 2
POST /api/upload     → { ok, fileId, filePath, publicUrl }
POST /api/execute    → { ok, jobId, status: 'queued' }
GET  /api/jobs/:id   → { ok, jobId, status, progressPct, outputUrl? }
GET  /api/health     → { ok, ffmpeg, queueLength }
```

### Step 1: Add Redis Connection

```javascript
// server/queue.js
const { Queue, Worker } = require('bullmq');

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

const renderQueue = new Queue('flowscale-render', {
  connection: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

module.exports = { renderQueue, REDIS_CONFIG };
```

### Step 2: Modify API Server

```javascript
// server/api.js (Phase 2 modifications)
const { renderQueue } = require('./queue');

// Replace in-memory queue with BullMQ
app.post('/api/execute', async (req, res) => {
  const jobId = `job_${Date.now()}_${uuidv4().split('-')[0]}`;
  
  // Add to Redis queue instead of in-memory
  const job = await renderQueue.add('render', {
    jobId,
    sourcePath: validPath,
    options: req.body,
  });
  
  res.status(202).json({
    ok: true,
    jobId,
    status: 'queued',
    queuePosition: await renderQueue.count(),
    statusUrl: `/api/jobs/${jobId}`,
  });
});

// Get job status from Redis
app.get('/api/jobs/:jobId', async (req, res) => {
  const job = await renderQueue.getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ ok: false, error: 'Job not found' });
  }
  
  const state = await job.getState();
  const progress = job.progress || 0;
  
  res.json({
    ok: true,
    jobId: job.id,
    status: mapState(state),
    progressPct: progress,
    outputUrl: job.returnvalue?.outputUrl,
    error: job.failedReason,
  });
});
```

### Step 3: Create Worker Process

```javascript
// server/worker.js
const { Worker } = require('bullmq');
const { spawn } = require('child_process');
const { REDIS_CONFIG } = require('./queue');

const worker = new Worker('flowscale-render', async (job) => {
  console.log(`[Worker] Processing job ${job.id}`);
  
  const { sourcePath, options } = job.data;
  const outputPath = `/var/www/flowscale/outputs/${job.id}.mp4`;
  
  // Update progress
  await job.updateProgress(10);
  
  // Execute FFmpeg
  const result = await executeFFmpeg(sourcePath, outputPath, options);
  
  await job.updateProgress(100);
  
  return {
    outputUrl: `/outputs/${job.id}.mp4`,
    outputPath,
    size: result.size,
  };
}, {
  connection: REDIS_CONFIG,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 2,
});

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err.message);
});
```

### Step 4: PM2 Ecosystem for Multiple Processes

```javascript
// server/ecosystem.config.js (Phase 2)
module.exports = {
  apps: [
    {
      name: 'flowscale-api',
      script: './server/api.js',
      instances: 2, // Scale API horizontally
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'flowscale-worker',
      script: './server/worker.js',
      instances: 2, // 2 workers = 2 concurrent FFmpeg jobs
      exec_mode: 'fork', // Workers must be fork mode
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: 1, // 1 FFmpeg per worker process
      },
    },
  ],
};
```

## Shared Storage Requirements

For multi-server deployments, uploaded files and outputs must be accessible to all workers:

### Option A: NFS Mount

```bash
# On all servers
sudo mount -t nfs storage-server:/flowscale /var/www/flowscale/shared
```

### Option B: Object Storage (S3/Cloudflare R2)

```javascript
// Upload to S3 instead of local disk
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function uploadToS3(filePath, key) {
  const client = new S3Client({ region: process.env.AWS_REGION });
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: fs.createReadStream(filePath),
  }));
  return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

### Option C: Supabase Storage

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function uploadToSupabase(filePath, filename) {
  const { data, error } = await supabase.storage
    .from('videos')
    .upload(`outputs/${filename}`, fs.createReadStream(filePath));
  
  return supabase.storage.from('videos').getPublicUrl(`outputs/${filename}`).data.publicUrl;
}
```

## Redis Deployment Options

### Option 1: Local Redis (Single VPS)

```bash
sudo apt install redis-server
sudo systemctl enable redis-server
```

### Option 2: Managed Redis

- **Upstash**: Serverless Redis, pay-per-request
- **Redis Cloud**: Managed Redis clusters
- **AWS ElastiCache**: Enterprise-grade

### Option 3: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

  worker:
    build: .
    command: node server/worker.js
    environment:
      - REDIS_HOST=redis
    depends_on:
      - redis

volumes:
  redis_data:
```

## Environment Variables (Phase 2)

```bash
# Add to .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password

# Worker configuration
WORKER_CONCURRENCY=1
MAX_WORKERS=4

# Storage (for multi-server)
STORAGE_TYPE=local  # or 's3' or 'supabase'
S3_BUCKET=flowscale-videos
S3_REGION=us-east-1
```

## Rollback Plan

If Phase 2 issues arise, rollback is simple:

1. Set `QUEUE_MODE=memory` in .env
2. Restart PM2: `pm2 restart all`
3. API falls back to in-memory queue

```javascript
// server/api.js - Fallback support
const QUEUE_MODE = process.env.QUEUE_MODE || 'memory';

if (QUEUE_MODE === 'redis') {
  // Use BullMQ
} else {
  // Use in-memory Map (current Phase 1 behavior)
}
```

## Monitoring (Phase 2)

### BullMQ Dashboard

```bash
npm install bull-board

# Add to api.js
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullMQAdapter(renderQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

### Prometheus Metrics

```javascript
const { register, Counter, Histogram } = require('prom-client');

const jobsProcessed = new Counter({
  name: 'flowscale_jobs_processed_total',
  help: 'Total jobs processed',
  labelNames: ['status'],
});

const processingDuration = new Histogram({
  name: 'flowscale_job_duration_seconds',
  help: 'Job processing duration',
  buckets: [10, 30, 60, 120, 300, 600],
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Timeline

| Phase | Scope | Timeline |
|-------|-------|----------|
| 1 (Current) | In-memory queue, single VPS | Done |
| 2a | Add Redis queue | 1-2 days |
| 2b | Separate worker processes | 1 day |
| 2c | Multi-worker scaling | 1 day |
| 3 | Shared storage (S3/NFS) | 2-3 days |
| 4 | Multi-server deployment | 1 week |

## Summary

The Phase 2 architecture:
- **Does NOT change the frontend API contract**
- Enables horizontal scaling of workers
- Provides job persistence across restarts
- Supports multiple concurrent FFmpeg jobs
- Prepares for multi-server deployment
