/**
 * FlowScale Server API - Production VPS Backend
 * Server-Only FFmpeg Rendering with In-Memory Job Queue
 * 
 * Endpoints:
 *   POST /api/upload      - Upload video files
 *   POST /api/execute     - Queue FFmpeg job (returns immediately)
 *   POST /api/execute-plan - Queue ExecutionPlan job
 *   GET  /api/job/:jobId  - Check job status
 *   GET  /api/health      - Health check (JSON only)
 * 
 * Architecture:
 *   - Single concurrent FFmpeg job
 *   - In-memory queue for pending jobs
 *   - All responses are JSON (never HTML)
 *   - Ready for future Redis/BullMQ migration
 */

const express = require('express');
const multer = require('multer');
const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

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

// Allowed MIME types
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
    
    // Get path
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
// IN-MEMORY JOB QUEUE
// ============================================

const jobs = new Map(); // jobId -> JobState
const pendingQueue = []; // Array of jobIds waiting to run
let currentJob = null; // Currently executing jobId

/**
 * Job states:
 * - queued: Waiting in queue
 * - processing: Currently executing FFmpeg
 * - completed: Finished successfully
 * - failed: Failed with error
 */

function createJob(jobId, type, input) {
  const job = {
    id: jobId,
    type,
    input,
    status: 'queued',
    progress: 0,
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
    status: 'processing', 
    startedAt: new Date().toISOString() 
  });

  try {
    const result = await executeFFmpegJob(job);
    updateJob(jobId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      output: result,
      progress: 100,
    });
  } catch (err) {
    updateJob(jobId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: {
        code: err.code || 'FFMPEG_ERROR',
        message: err.message,
      },
    });
  } finally {
    currentJob = null;
    cleanOldJobs();
    // Process next job in queue
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
    console.log(`[Job ${job.id}] Starting FFmpeg: ${args.join(' ')}`);
    
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      ffmpeg.kill('SIGKILL');
      const err = new Error(`FFmpeg timeout after ${MAX_RENDER_TIME}s`);
      err.code = 'TIMEOUT';
      reject(err);
    }, MAX_RENDER_TIME * 1000);

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      // Parse progress from FFmpeg output
      const timeMatch = stderr.match(/time=(\d+:\d+:\d+\.\d+)/);
      if (timeMatch) {
        updateJob(job.id, { progress: 50 }); // Simplified progress
      }
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
            size: stats.size,
            duration: parseFloat(input.duration) || null,
          });
        } else {
          const err = new Error('FFmpeg completed but output file not found');
          err.code = 'NO_OUTPUT';
          reject(err);
        }
      } else {
        const err = new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`);
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
// FFMPEG ARGUMENT BUILDERS
// ============================================

function buildFFmpegArgs(input, outputPath) {
  const args = ['-y'];
  
  // Validate source path
  const sourcePath = sanitizePath(input.sourcePath);
  if (!sourcePath) {
    throw new Error('Invalid source path');
  }
  
  args.push('-i', sourcePath);

  if (input.trim) {
    if (input.trim.start > 0) {
      args.push('-ss', String(input.trim.start));
    }
    if (input.trim.end) {
      args.push('-t', String(input.trim.end - (input.trim.start || 0)));
    }
  }

  const filters = [];
  
  if (input.speed && input.speed !== 1.0) {
    filters.push(`setpts=${1/input.speed}*PTS`);
  }

  if (input.resize) {
    filters.push(`scale=${input.resize.width}:${input.resize.height}`);
  }

  if (filters.length > 0) {
    args.push('-vf', filters.join(','));
  }

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

  if (plan.timeline && plan.timeline.length > 0) {
    const segment = plan.timeline[0];
    
    if (segment.trim_start_ms > 0 || segment.trim_end_ms < segment.source_duration_ms) {
      const startSec = segment.trim_start_ms / 1000;
      const endSec = segment.trim_end_ms / 1000;
      args.splice(1, 0, '-ss', String(startSec), '-t', String(endSec - startSec));
    }

    if (segment.speed_multiplier && segment.speed_multiplier !== 1.0) {
      filters.push(`setpts=${1/segment.speed_multiplier}*PTS`);
    }
  }

  if (plan.output_format) {
    const { width, height } = plan.output_format;
    if (width && height) {
      filters.push(`scale=${width}:${height}`);
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

// ============================================
// MULTER CONFIGURATION
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const uniqueId = uuidv4().split('-')[0];
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '');
    const filename = `upload_${timestamp}_${uniqueId}${safeExt}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
  
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

// Ensure all responses are JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// ============================================
// HEALTH ENDPOINT
// ============================================

app.get('/api/health', (req, res) => {
  const health = {
    ok: FFMPEG_AVAILABLE,
    ffmpeg: FFMPEG_AVAILABLE ? 'ready' : 'unavailable',
    ffmpegPath: ffmpegPath || null,
    ffmpegVersion: ffmpegVersion || null,
    mode: 'server-only',
    queueLength: pendingQueue.length,
    currentJob: currentJob || null,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  if (!FFMPEG_AVAILABLE) {
    health.error = 'FFmpeg binary not found on server';
    return res.status(503).json(health);
  }

  res.json(health);
});

// ============================================
// UPLOAD ENDPOINT
// ============================================

app.post('/api/upload', (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          ok: false,
          code: 'FILE_TOO_LARGE',
          error: `File too large. Maximum: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
      }
      return res.status(400).json({
        ok: false,
        code: 'UPLOAD_ERROR',
        error: err.message,
      });
    }
    
    if (err) {
      return res.status(400).json({
        ok: false,
        code: 'UPLOAD_ERROR',
        error: err.message,
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        code: 'NO_FILE',
        error: 'No file provided. Use field name "video"',
      });
    }
    
    const filePath = path.join(UPLOAD_DIR, req.file.filename);
    
    console.log(`[Upload] Saved: ${req.file.filename} (${req.file.size} bytes)`);
    
    res.json({
      ok: true,
      path: filePath,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// ============================================
// EXECUTE ENDPOINT (Queued)
// ============================================

app.post('/api/execute', (req, res) => {
  if (!FFMPEG_AVAILABLE) {
    return res.status(503).json({
      ok: false,
      code: 'FFMPEG_UNAVAILABLE',
      error: 'FFmpeg binary not available on server',
    });
  }

  const { sourcePath } = req.body;

  if (!sourcePath) {
    return res.status(400).json({
      ok: false,
      code: 'MISSING_SOURCE',
      error: 'sourcePath is required',
    });
  }

  const validPath = sanitizePath(sourcePath);
  if (!validPath) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_PATH',
      error: 'Invalid or inaccessible source path',
    });
  }

  const jobId = req.body.outputName || `job_${Date.now()}_${uuidv4().split('-')[0]}`;
  
  createJob(jobId, 'execute', { ...req.body, sourcePath: validPath });
  pendingQueue.push(jobId);
  
  console.log(`[Queue] Job ${jobId} queued (queue length: ${pendingQueue.length})`);
  
  // Start processing if not already running
  setImmediate(processNextJob);

  res.status(202).json({
    ok: true,
    jobId,
    status: 'queued',
    queuePosition: pendingQueue.length,
    statusUrl: `/api/job/${jobId}`,
  });
});

// ============================================
// EXECUTE PLAN ENDPOINT (Queued)
// ============================================

app.post('/api/execute-plan', (req, res) => {
  if (!FFMPEG_AVAILABLE) {
    return res.status(503).json({
      ok: false,
      code: 'FFMPEG_UNAVAILABLE',
      error: 'FFmpeg binary not available on server',
    });
  }

  const { plan, sourceVideoUrl, outputName } = req.body;

  if (!plan || !sourceVideoUrl) {
    return res.status(400).json({
      ok: false,
      code: 'MISSING_PARAMS',
      error: 'plan and sourceVideoUrl are required',
    });
  }

  const validPath = sanitizePath(sourceVideoUrl);
  if (!validPath) {
    return res.status(400).json({
      ok: false,
      code: 'INVALID_PATH',
      error: 'Invalid or inaccessible source path',
    });
  }

  const jobId = outputName || `plan_${Date.now()}_${uuidv4().split('-')[0]}`;
  
  createJob(jobId, 'execute-plan', { plan, sourceVideoUrl: validPath });
  pendingQueue.push(jobId);
  
  console.log(`[Queue] Plan job ${jobId} queued (queue length: ${pendingQueue.length})`);
  
  setImmediate(processNextJob);

  res.status(202).json({
    ok: true,
    jobId,
    status: 'queued',
    queuePosition: pendingQueue.length,
    statusUrl: `/api/job/${jobId}`,
  });
});

// ============================================
// JOB STATUS ENDPOINT
// ============================================

app.get('/api/job/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({
      ok: false,
      code: 'JOB_NOT_FOUND',
      error: `Job ${req.params.jobId} not found`,
    });
  }

  const response = {
    ok: true,
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  };

  if (job.status === 'completed' && job.output) {
    response.output = job.output;
    response.outputUrl = job.output.outputUrl;
    response.success = true;
  }

  if (job.status === 'failed' && job.error) {
    response.error = job.error;
    response.success = false;
  }

  res.json(response);
});

// ============================================
// 404 HANDLER (JSON)
// ============================================

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    code: 'NOT_FOUND',
    error: `Endpoint ${req.method} ${req.path} not found`,
  });
});

// ============================================
// ERROR HANDLER (JSON)
// ============================================

app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({
    ok: false,
    code: 'INTERNAL_ERROR',
    error: err.message || 'Internal server error',
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, HOST, () => {
  console.log(`[FlowScale API] Server running at http://${HOST}:${PORT}`);
  console.log(`[FlowScale API] Mode: server-only`);
  console.log(`[FlowScale API] FFmpeg: ${FFMPEG_AVAILABLE ? `ready (${ffmpegPath})` : 'NOT AVAILABLE'}`);
  console.log(`[FlowScale API] Upload dir: ${UPLOAD_DIR}`);
  console.log(`[FlowScale API] Output dir: ${OUTPUT_DIR}`);
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
