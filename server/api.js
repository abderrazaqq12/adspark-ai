/**
 * FlowScale VPS Render Gateway API
 * Server-Only FFmpeg Rendering with In-Memory Job Queue
 * 
 * All endpoints return JSON only (never HTML).
 * Phase-2 ready for Redis/BullMQ migration.
 * 
 * Endpoints:
 *   GET  /api/health      - Health check with FFmpeg status
 *   POST /api/upload      - Upload video files
 *   POST /api/execute     - Queue FFmpeg job (returns immediately)
 *   POST /api/execute-plan - Queue ExecutionPlan job
 *   GET  /api/jobs/:id    - Check job status
 */

const express = require('express');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/var/www/flowscale/outputs';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/www/flowscale/uploads';
const MAX_RENDER_TIME = parseInt(process.env.MAX_RENDER_TIME) || 600; // 10 min
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024; // 500MB

// Allowed MIME types (whitelist)
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'image/jpeg',
  'image/png',
  'image/webp',
];

// ============================================
// DIRECTORY SETUP
// ============================================

[OUTPUT_DIR, UPLOAD_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Setup] Created directory: ${dir}`);
  }
});

// ============================================
// FFMPEG AVAILABILITY CHECK
// ============================================

let ffmpegPath = null;
let ffmpegVersion = null;

function detectFFmpeg() {
  try {
    const version = execSync('ffmpeg -version 2>&1').toString();
    const match = version.match(/ffmpeg version (\S+)/);
    ffmpegVersion = match ? match[1] : 'unknown';
    
    try {
      ffmpegPath = execSync('which ffmpeg').toString().trim();
    } catch {
      ffmpegPath = '/usr/bin/ffmpeg';
    }
    
    console.log(`[FFmpeg] Found: ${ffmpegPath} (version ${ffmpegVersion})`);
    return true;
  } catch (err) {
    console.error('[FFmpeg] NOT FOUND - video processing will fail');
    return false;
  }
}

const FFMPEG_AVAILABLE = detectFFmpeg();

// ============================================
// IN-MEMORY JOB QUEUE (Phase-2 Ready)
// ============================================

const jobs = new Map(); // jobId -> JobState
const pendingQueue = []; // Array of jobIds waiting to run
let currentJob = null; // Currently executing jobId

/**
 * Job statuses (compatible with frontend contract):
 * - queued: Waiting in queue
 * - running: Currently executing FFmpeg
 * - done: Finished successfully
 * - error: Failed with error
 */

function generateJobId() {
  return `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function generateFileId() {
  return crypto.randomBytes(8).toString('hex');
}

function createJob(jobId, type, input) {
  const job = {
    id: jobId,
    type,
    input,
    status: 'queued',
    progressPct: 0,
    logsTail: '',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    output: null,
    error: null,
  };
  jobs.set(jobId, job);
  return job;
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    jobs.set(jobId, job);
  }
  return job;
}

function appendLog(jobId, message) {
  const job = jobs.get(jobId);
  if (job) {
    job.logsTail = (job.logsTail + '\n' + message).slice(-2000);
  }
}

// Clean old jobs (keep last 100)
function cleanOldJobs() {
  if (jobs.size > 100) {
    const sortedJobs = Array.from(jobs.entries())
      .sort((a, b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));
    
    sortedJobs.slice(100).forEach(([jobId]) => {
      jobs.delete(jobId);
    });
  }
}

// ============================================
// JOB PROCESSOR
// ============================================

async function processNextJob() {
  if (currentJob || pendingQueue.length === 0) {
    return;
  }

  const jobId = pendingQueue.shift();
  const job = getJob(jobId);
  
  if (!job) {
    processNextJob();
    return;
  }

  currentJob = jobId;
  updateJob(jobId, { 
    status: 'running', 
    startedAt: new Date().toISOString() 
  });
  appendLog(jobId, `[${new Date().toISOString()}] Job started`);

  try {
    const result = await executeFFmpegJob(job);
    updateJob(jobId, {
      status: 'done',
      completedAt: new Date().toISOString(),
      output: result,
      progressPct: 100,
    });
    appendLog(jobId, `[${new Date().toISOString()}] Job completed successfully`);
  } catch (err) {
    updateJob(jobId, {
      status: 'error',
      completedAt: new Date().toISOString(),
      error: {
        code: err.code || 'FFMPEG_ERROR',
        message: err.message,
      },
    });
    appendLog(jobId, `[${new Date().toISOString()}] Job failed: ${err.message}`);
  } finally {
    currentJob = null;
    cleanOldJobs();
    setImmediate(processNextJob);
  }
}

async function executeFFmpegJob(job) {
  const { type, input } = job;
  
  if (!FFMPEG_AVAILABLE) {
    const err = new Error('FFmpeg binary not available on server');
    err.code = 'FFMPEG_UNAVAILABLE';
    throw err;
  }

  const outputFilename = `${job.id}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  
  let args;
  if (type === 'execute') {
    args = buildFFmpegArgs(input, outputPath);
  } else if (type === 'execute-plan') {
    args = buildPlanArgs(input, outputPath);
  } else {
    throw new Error(`Unknown job type: ${type}`);
  }

  return new Promise((resolve, reject) => {
    appendLog(job.id, `FFmpeg command: ffmpeg ${args.join(' ')}`);
    
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      ffmpeg.kill('SIGKILL');
      const err = new Error(`FFmpeg timeout after ${MAX_RENDER_TIME}s`);
      err.code = 'TIMEOUT_ERROR';
      reject(err);
    }, MAX_RENDER_TIME * 1000);

    ffmpeg.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      
      // Parse progress
      const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (timeMatch) {
        updateJob(job.id, { progressPct: 50 });
      }
      
      // Keep last 2000 chars of logs
      appendLog(job.id, chunk.trim());
    });

    ffmpeg.on('close', (code) => {
      clearTimeout(timeout);
      
      if (killed) return;

      if (code === 0) {
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          resolve({
            outputPath,
            outputUrl: `/outputs/${outputFilename}`,
            outputSize: stats.size,
            durationMs: Date.now() - new Date(job.startedAt).getTime(),
          });
        } else {
          const err = new Error('FFmpeg completed but output file not found');
          err.code = 'NO_OUTPUT';
          reject(err);
        }
      } else {
        const err = new Error(`FFmpeg exited with code ${code}`);
        err.code = 'FFMPEG_EXIT_ERROR';
        reject(err);
      }
    });

    ffmpeg.on('error', (err) => {
      clearTimeout(timeout);
      err.code = 'FFMPEG_SPAWN_ERROR';
      reject(err);
    });
  });
}

// ============================================
// FFMPEG ARGUMENT BUILDERS (Whitelist-based)
// ============================================

function buildFFmpegArgs(input, outputPath) {
  const args = ['-y']; // Overwrite output
  
  // Validate source path (SECURITY CRITICAL)
  const sourcePath = sanitizePath(input.sourcePath);
  if (!sourcePath) {
    throw new Error('Invalid source path');
  }
  
  args.push('-i', sourcePath);

  // Trim (optional)
  if (input.trim && typeof input.trim === 'object') {
    const start = parseFloat(input.trim.start);
    const end = parseFloat(input.trim.end);
    if (!isNaN(start) && start >= 0) {
      args.push('-ss', String(start));
    }
    if (!isNaN(end) && end > start) {
      args.push('-t', String(end - start));
    }
  }

  const filters = [];
  
  // Speed adjustment (whitelist: 0.25-4.0)
  if (input.speed && typeof input.speed === 'number') {
    const speed = Math.max(0.25, Math.min(4.0, input.speed));
    filters.push(`setpts=${1/speed}*PTS`);
  }

  // Resize (whitelist: 100-4096 pixels)
  if (input.resize && typeof input.resize === 'object') {
    const w = Math.max(100, Math.min(4096, parseInt(input.resize.width) || 0));
    const h = Math.max(100, Math.min(4096, parseInt(input.resize.height) || 0));
    if (w && h) {
      filters.push(`scale=${w}:${h}`);
    }
  }

  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  // Audio options
  if (input.audio) {
    if (input.audio.mute) {
      args.push('-an');
    } else if (input.audio.volume !== undefined) {
      const vol = Math.max(0, Math.min(2, parseFloat(input.audio.volume) || 1));
      args.push('-af', `volume=${vol}`);
    }
  }

  // Output codec (whitelist)
  args.push('-c:v', 'libx264');
  args.push('-c:a', 'aac');
  args.push('-preset', 'fast');
  args.push('-crf', '23');
  args.push('-movflags', '+faststart');
  args.push(outputPath);

  return args;
}

function buildPlanArgs(input, outputPath) {
  const { plan, sourceVideoUrl } = input;
  
  const sourcePath = sanitizePath(sourceVideoUrl);
  if (!sourcePath) {
    throw new Error('Invalid source path');
  }

  const args = ['-y', '-i', sourcePath];
  const filters = [];

  // Process timeline segments
  if (plan.timeline && Array.isArray(plan.timeline) && plan.timeline.length > 0) {
    const segment = plan.timeline[0];
    
    // Trim
    if (segment.trim_start_ms !== undefined && segment.trim_end_ms !== undefined) {
      const startSec = Math.max(0, segment.trim_start_ms / 1000);
      const endSec = Math.max(startSec, segment.trim_end_ms / 1000);
      args.splice(1, 0, '-ss', String(startSec), '-t', String(endSec - startSec));
    }

    // Speed (whitelist: 0.25-4.0)
    if (segment.speed_multiplier && typeof segment.speed_multiplier === 'number') {
      const speed = Math.max(0.25, Math.min(4.0, segment.speed_multiplier));
      filters.push(`setpts=${1/speed}*PTS`);
    }
  }

  // Output format
  if (plan.output_format && typeof plan.output_format === 'object') {
    const w = Math.max(100, Math.min(4096, parseInt(plan.output_format.width) || 0));
    const h = Math.max(100, Math.min(4096, parseInt(plan.output_format.height) || 0));
    if (w && h) {
      filters.push(`scale=${w}:${h}`);
    }
  }

  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

  args.push('-c:v', 'libx264', '-c:a', 'aac', '-preset', 'fast', '-crf', '23', '-movflags', '+faststart');
  args.push(outputPath);

  return args;
}

// ============================================
// SECURITY UTILITIES
// ============================================

function sanitizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }
  
  const normalized = path.normalize(inputPath);
  
  // Prevent path traversal
  if (normalized.includes('..')) {
    return null;
  }
  
  // Only allow paths within allowed directories
  const allowedPrefixes = [UPLOAD_DIR, OUTPUT_DIR, '/var/www/flowscale'];
  const isAllowed = allowedPrefixes.some(prefix => normalized.startsWith(prefix));
  
  if (!isAllowed) {
    return null;
  }
  
  // Check file exists
  if (!fs.existsSync(normalized)) {
    return null;
  }
  
  return normalized;
}

function jsonError(res, status, code, message, details = null) {
  const response = {
    ok: false,
    error: { code, message }
  };
  if (details) {
    response.error.details = details;
  }
  return res.status(status).json(response);
}

// ============================================
// MULTER CONFIGURATION
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.body.projectId;
    let uploadPath = UPLOAD_DIR;
    
    // Optional project subdirectory
    if (projectId && /^[a-zA-Z0-9_-]+$/.test(projectId)) {
      uploadPath = path.join(UPLOAD_DIR, projectId);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileId = generateFileId();
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/gi, '') || '.mp4';
    const filename = `${fileId}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
  }
  
  // Block path traversal in filename
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(new Error('Invalid filename'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// ============================================
// MIDDLEWARE
// ============================================

app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Force JSON Content-Type for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// CORS for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// ============================================
// GET /api/health
// ============================================

app.get('/api/health', (req, res) => {
  const health = {
    ok: FFMPEG_AVAILABLE,
    ffmpeg: {
      available: FFMPEG_AVAILABLE,
      path: ffmpegPath || null,
      version: ffmpegVersion || null,
    },
    outputsDir: OUTPUT_DIR,
    uploadsDir: UPLOAD_DIR,
    queueLength: pendingQueue.length,
    currentJob: currentJob || null,
    uptime: process.uptime(),
    time: new Date().toISOString(),
  };

  if (!FFMPEG_AVAILABLE) {
    health.error = 'FFmpeg binary not found on server';
    return res.status(503).json(health);
  }

  res.json(health);
});

// ============================================
// POST /api/upload
// ============================================

app.post('/api/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return jsonError(res, 413, 'FILE_TOO_LARGE', 
          `File too large. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }
      return jsonError(res, 400, 'UPLOAD_ERROR', err.message);
    }
    
    if (err) {
      return jsonError(res, 400, 'UPLOAD_ERROR', err.message);
    }
    
    if (!req.file) {
      return jsonError(res, 400, 'NO_FILE', 'No file provided. Use field name "file"');
    }
    
    const filePath = path.join(req.file.destination, req.file.filename);
    const publicUrl = `/uploads/${req.body.projectId ? req.body.projectId + '/' : ''}${req.file.filename}`;
    
    console.log(`[Upload] Saved: ${req.file.filename} (${req.file.size} bytes)`);
    
    res.json({
      ok: true,
      fileId: req.file.filename.split('.')[0],
      filePath: filePath,
      publicUrl: publicUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// ============================================
// POST /api/execute
// ============================================

app.post('/api/execute', (req, res) => {
  if (!FFMPEG_AVAILABLE) {
    return jsonError(res, 503, 'FFMPEG_UNAVAILABLE', 'FFmpeg binary not available on server');
  }

  const { sourcePath, projectId, outputName } = req.body;

  if (!sourcePath) {
    return jsonError(res, 400, 'MISSING_SOURCE', 'sourcePath is required');
  }

  const validPath = sanitizePath(sourcePath);
  if (!validPath) {
    return jsonError(res, 400, 'INVALID_PATH', 'Invalid or inaccessible source path');
  }

  const jobId = outputName || generateJobId();
  
  createJob(jobId, 'execute', { ...req.body, sourcePath: validPath });
  pendingQueue.push(jobId);
  
  console.log(`[Queue] Job ${jobId} queued (queue length: ${pendingQueue.length})`);
  
  setImmediate(processNextJob);

  res.status(202).json({
    ok: true,
    jobId,
    status: 'queued',
    queuePosition: pendingQueue.length,
    statusUrl: `/api/jobs/${jobId}`,
  });
});

// ============================================
// POST /api/execute-plan
// ============================================

app.post('/api/execute-plan', (req, res) => {
  if (!FFMPEG_AVAILABLE) {
    return jsonError(res, 503, 'FFMPEG_UNAVAILABLE', 'FFmpeg binary not available on server');
  }

  const { plan, sourceVideoUrl, projectId, outputName } = req.body;

  if (!plan || !sourceVideoUrl) {
    return jsonError(res, 400, 'MISSING_PARAMS', 'plan and sourceVideoUrl are required');
  }

  const validPath = sanitizePath(sourceVideoUrl);
  if (!validPath) {
    return jsonError(res, 400, 'INVALID_PATH', 'Invalid or inaccessible source path');
  }

  const jobId = outputName || generateJobId();
  
  createJob(jobId, 'execute-plan', { plan, sourceVideoUrl: validPath });
  pendingQueue.push(jobId);
  
  console.log(`[Queue] Plan job ${jobId} queued (queue length: ${pendingQueue.length})`);
  
  setImmediate(processNextJob);

  res.status(202).json({
    ok: true,
    jobId,
    status: 'queued',
    queuePosition: pendingQueue.length,
    statusUrl: `/api/jobs/${jobId}`,
  });
});

// ============================================
// GET /api/jobs/:id
// ============================================

app.get('/api/jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  
  if (!job) {
    return jsonError(res, 404, 'JOB_NOT_FOUND', `Job ${req.params.jobId} not found`);
  }

  const response = {
    ok: true,
    jobId: job.id,
    status: job.status,
    progressPct: job.progressPct,
    logsTail: job.logsTail,
    createdAt: job.createdAt,
  };

  if (job.startedAt) {
    response.startedAt = job.startedAt;
  }

  if (job.completedAt) {
    response.completedAt = job.completedAt;
  }

  if (job.status === 'done' && job.output) {
    response.outputUrl = job.output.outputUrl;
    response.outputSize = job.output.outputSize;
    response.durationMs = job.output.durationMs;
  }

  if (job.status === 'error' && job.error) {
    response.error = job.error;
  }

  res.json(response);
});

// ============================================
// 404 HANDLER (JSON only)
// ============================================

app.use((req, res) => {
  jsonError(res, 404, 'NOT_FOUND', `Endpoint ${req.method} ${req.path} not found`);
});

// ============================================
// ERROR HANDLER (JSON only)
// ============================================

app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  jsonError(res, 500, 'INTERNAL_ERROR', err.message || 'Internal server error');
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, HOST, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log(`  FlowScale Render Gateway API`);
  console.log('═══════════════════════════════════════════════════');
  console.log(`  URL:        http://${HOST}:${PORT}`);
  console.log(`  Mode:       server-only (no browser FFmpeg)`);
  console.log(`  FFmpeg:     ${FFMPEG_AVAILABLE ? `✓ ${ffmpegPath}` : '✗ NOT AVAILABLE'}`);
  console.log(`  Uploads:    ${UPLOAD_DIR}`);
  console.log(`  Outputs:    ${OUTPUT_DIR}`);
  console.log(`  Max File:   ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  console.log(`  Timeout:    ${MAX_RENDER_TIME}s`);
  console.log('═══════════════════════════════════════════════════');
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  console.log('[FlowScale API] Shutting down gracefully...');
  if (currentJob) {
    console.log(`[FlowScale API] Warning: Job ${currentJob} was in progress`);
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[FlowScale API] Interrupted');
  process.exit(0);
});
