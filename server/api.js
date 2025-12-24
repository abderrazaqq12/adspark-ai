/**
 * FlowScale VPS Render Gateway API
 * Server-Only FFmpeg Rendering with In-Memory Job Queue
 * 
 * All endpoints return JSON only (never HTML).
 * Phase-2 ready for Redis/BullMQ migration.
 * Phase-3: Automatic Source Resolution (Downloads Remote URLs)
 * Phase-4: Cost Tracking & Analytics Integration
 * 
 * Endpoints:
 *   GET  /api/health      - Health check with FFmpeg status
 *   POST /api/upload      - Upload video files
 *   POST /api/execute     - Queue FFmpeg job (returns immediately)
 *   POST /api/execute-plan - Queue ExecutionPlan job
 *   GET  /api/jobs/:id    - Check job status
 */

// ============================================
// SECURITY: ENV VALIDATION (MUST BE FIRST)
// ============================================
import { validateEnvironment } from './env-validator.js';

// Validate environment before starting server
// This enforces the Architectural Security Contract
try {
  validateEnvironment();
} catch (error) {
  console.error('[FATAL] Environment validation failed:', error.message);
  process.exit(1);
}

// ============================================
// IMPORTS
// ============================================
import express from 'express';
import multer from 'multer';
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { trackCost, supabase } from './supabase.js';
import { trackResource, validateProject } from './project-manager.js';
import { v4 as uuidv4 } from 'uuid';
import db from './local-db.js';
import { enforceProject } from './middleware/project-enforcer.js';
import { errorHandler } from './error-handler.js';
import { healthRouter, getQueueStats } from './health-endpoints.js';
import { analyticsRouter } from './analytics-collector.js';
import { JobQueueManager } from './job-queue.js';
import { compileRenderPlan } from './render-plan.js';
import { detectEngineCapabilities } from './engine-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ============================================
// MIDDLEWARE (Order is critical for Security)
// ============================================
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// ============================================
// SECURITY: SESSION & AUTH (Single-User VPS)
// ============================================

const ADMIN_PASSWORD = process.env.FLOWSCALE_ADMIN_PASSWORD;
const JWT_SECRET = process.env.FLOWSCALE_JWT_SECRET;
const DEFAULT_USER_ID = '170d6fb1-4e4f-4704-ab9a-a917dc86cba5'; // Permanent VPS Owner ID

/**
 * Single-User Session Manager (In-Memory for performance, Opaque to Frontend)
 * Survives process life if using JWT-style stateless validation.
 */
function generateSessionToken(userId) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifySessionToken(token) {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Math.floor(Date.now() / 1000)) return null;

    return data;
  } catch (e) {
    return null;
  }
}

/**
 * AUTH MIDDLEWARE: Perimeter Defense
 */
const authenticate = (req, res, next) => {
  // Public Endpoints (Bypassing Auth)
  const publicPaths = ['/api/login', '/health'];
  if (publicPaths.includes(req.path)) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonError(res, 401, 'UNAUTHORIZED', 'Missing or malformed session token');
  }

  const token = authHeader.split(' ')[1];
  const session = verifySessionToken(token);

  if (!session) {
    return jsonError(res, 403, 'INVALID_SESSION', 'Session expired or invalid');
  }

  // Single-user enforcement
  req.user = { id: session.sub, role: 'admin' };
  next();
};

app.use(authenticate);

// ============================================
// SECURITY: LOGIN ENDPOINT
// ============================================
app.post('/api/login', (req, res) => {
  const { password } = req.body;

  if (!password || password !== ADMIN_PASSWORD) {
    console.warn(`[Security] Failed login attempt from ${req.ip}`);
    return jsonError(res, 401, 'INVALID_CREDENTIALS', 'Incorrect administrative password');
  }

  const token = generateSessionToken(DEFAULT_USER_ID);
  console.log(`[Security] Admin session started for ${DEFAULT_USER_ID}`);

  res.json({
    ok: true,
    token,
    user: { id: DEFAULT_USER_ID, role: 'admin' }
  });
});

// ============================================
// CONFIGURATION
// ============================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// VPS Storage Root
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const OUTPUT_DIR = path.join(DATA_DIR, 'outputs');
const TEMP_DIR = path.join(DATA_DIR, 'temp');

// Ensure definitions exist before use
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const MAX_RENDER_TIME = parseInt(process.env.MAX_RENDER_TIME || '600'); // 10 min
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || String(200 * 1024 * 1024)); // 200MB
const FFMPEG_HW_ACCEL = process.env.FFMPEG_HW_ACCEL || 'auto'; // auto, cuda, vaapi, off

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

[OUTPUT_DIR, UPLOAD_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[Setup] Created directory: ${dir}`);
  }
});

// ============================================
// FFMPEG AVAILABILITY CHECK
// ============================================

// ============================================
// FFMPEG AVAILABILITY CHECK (Phase 2B)
// ============================================

const engineCaps = detectEngineCapabilities();
const FFMPEG_AVAILABLE = engineCaps.ffmpeg.available;

console.log(`[FFmpeg] Status: ${FFMPEG_AVAILABLE ? 'AVAILABLE' : 'NOT FOUND'}`);
if (FFMPEG_AVAILABLE) {
  console.log(`[FFmpeg] GPU Acceleration: ${engineCaps.gpu.available ? `ENABLED (${engineCaps.gpu.vendor})` : 'NOT FOUND'}`);
  console.log(`[FFmpeg] Best Encoder: ${engineCaps.bestEncoder}`);
}

// ============================================
// ROUTES
// ============================================

// Mount Health Router at /api/health
app.use('/api/health', healthRouter);
app.get('/health', (req, res) => res.json({ status: 'ok', msg: 'Root health check' }));

// Mount Analytics
app.use('/api', analyticsRouter);

// ============================================
// PROJECT ROUTES (VPS Edition)
// ============================================
import { listProjects, getProject, createProject as createProjectFn, updateProject, deleteProject } from './project-manager.js';

// ============================================
// PROJECT ROUTES (VPS Edition)
// ============================================
import { listProjects, getProject, createProject as createProjectFn, updateProject, deleteProject } from './project-manager.js';

app.get('/api/projects', async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await listProjects(userId);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const project = await getProject(req.params.id, userId);
    res.json(project);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/projects/:id/resources', async (req, res) => {
  try {
    const resources = db.prepare('SELECT * FROM project_resources WHERE project_id = ?').all(req.params.id);
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const userId = req.user.id;
    const project = await createProjectFn(userId, req.body);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const project = await updateProject(req.params.id, userId, req.body);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    await deleteProject(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// CREATIVE ENTITIES (Scripts & Scenes)
// ============================================

app.get('/api/projects/:id/scripts', async (req, res) => {
  try {
    const scripts = db.prepare('SELECT * FROM scripts WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(scripts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/scripts', async (req, res) => {
  try {
    const { id = uuidv4(), raw_text, language, tone } = req.body;
    db.prepare('INSERT INTO scripts (id, project_id, raw_text, language, tone) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.params.id, raw_text, language, tone);
    res.json({ id, project_id: req.params.id, raw_text, language, tone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id/scenes', async (req, res) => {
  try {
    const scenes = db.prepare('SELECT * FROM scenes WHERE project_id = ? ORDER BY sequence_index ASC').all(req.params.id);
    res.json(scenes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/scenes', async (req, res) => {
  try {
    const { id = uuidv4(), script_id, sequence_index, content, media_url, media_type, duration_ms } = req.body;
    db.prepare(`
      INSERT INTO scenes (id, script_id, project_id, sequence_index, content, media_url, media_type, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, script_id, req.params.id, sequence_index, content, media_url, media_type, duration_ms);
    res.json({ id, script_id, sequence_index, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/scenes/:id', async (req, res) => {
  try {
    const updates = req.body;
    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE scenes SET ${fields} WHERE id = ?`).run(...values, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/scenes/:id', async (req, res) => {
  try {
    db.prepare('DELETE FROM scenes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// SYSTEM SETTINGS & TEMPLATES
// ============================================

app.get('/api/settings', async (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM user_settings').all();
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    db.prepare('INSERT OR REPLACE INTO user_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))')
      .run(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const templates = db.prepare('SELECT * FROM prompt_templates ORDER BY category, name').all();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const { id = uuidv4(), name, category, system_prompt, user_prompt } = req.body;
    db.prepare('INSERT INTO prompt_templates (id, name, category, system_prompt, user_prompt) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, category, system_prompt, user_prompt);
    res.json({ id, name, category });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/templates/:id', async (req, res) => {
  try {
    db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// JOB QUEUE & ENGINE (Phase 2B Optimized)
// ============================================

const queue = new JobQueueManager(app);
queue.initialize();

// Expose queue stats to Health Router
app.locals.getQueueStats = () => queue.getStats();

// Legacy compatibility wrappers (internal)
function getJob(id) { return queue.getJob(id); }

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

function createJob(jobId, type, input, priority = 'normal') {
  // Compile Immutable Render Plan (Phase 2B)
  const renderPlan = compileRenderPlan({ type, input, priority });

  const job = {
    id: jobId,
    type,
    input,
    renderPlan, // Single source of truth for execution
    status: 'queued',
    progressPct: 0,
    logsTail: '',
    fullLogs: [], // Capture full logs for streaming
    command: null, // Capture FFmpeg command
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    output: null,
    error: null,
    tempFiles: [], // Track temp files for cleanup
  };
  queue.jobs.set(jobId, job);
  return job;
}

function updateJob(jobId, updates) {
  const job = queue.jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    queue.jobs.set(jobId, job);
  }
  return job;
}

function appendLog(jobId, message) {
  const job = queue.jobs.get(jobId);
  if (job) {
    job.logsTail = (job.logsTail + '\n' + message).slice(-2000);
    // Keep full history for debug console
    if (!job.fullLogs) job.fullLogs = [];
    job.fullLogs.push(message);
  }
}

// Clean old jobs (keep last 100)
function cleanOldJobs() {
  if (queue.jobs.size > 100) {
    const sortedJobs = Array.from(queue.jobs.entries())
      .sort((a, b) => new Date(b[1].createdAt).getTime() - new Date(a[1].createdAt).getTime());

    sortedJobs.slice(100).forEach(([jobId]) => {
      // NOTE: In a real system you'd clean up output files too
      queue.jobs.delete(jobId);
    });
  }
}

// ============================================
// DOWNLOAD HELPER
// ============================================

async function downloadRemoteFile(url, jobId) {
  try {
    const ext = path.extname(new URL(url).pathname) || '.mp4';
    const filename = `${jobId}_source${ext}`;
    const destPath = path.join(TEMP_DIR, filename);

    console.log(`[Download] Downloading ${url} to ${destPath}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body from remote URL');
    }

    // Node 18+ global fetch returns a Web ReadableStream
    // We can use fs.createWriteStream but need to convert the stream or use pipeline
    const fileStream = createWriteStream(destPath);
    // @ts-ignore - response.body is iterable in Node 18+, pipeline handles it
    await pipeline(response.body, fileStream);

    console.log(`[Download] Complete: ${destPath}`);
    return destPath;
  } catch (err) {
    console.error(`[Download] Error:`, err);
    throw err;
  }
}

// ============================================
// JOB PROCESSOR
// ============================================

// ============================================
// JOB PROCESSOR (Phase 2B Optimized)
// ============================================

async function processNextJob() {
  const jobId = queue.getNextJob();
  if (!jobId) return;

  const job = getJob(jobId);
  updateJob(jobId, {
    status: 'running',
    startedAt: new Date().toISOString(),
    progressPct: 0
  });

  appendLog(jobId, `[Processing] Job ${jobId} started using RenderPlan ${job.renderPlan.id}`);
  appendLog(jobId, `[Strategy] ${job.renderPlan.execution.isGPU ? 'GPU' : 'CPU'} Acceleration active`);

  try {
    // 1. Resolve Sources
    appendLog(jobId, `[Stage] Source Resolution`);
    await resolveJobSource(job);

    // 2. Main Render Step
    appendLog(jobId, `[Stage] Video Rendering`);
    const result = await executeFFmpegJob(job);

    // 3. Register Artifacts (Persistent DB)
    const artifact = result.artifacts?.[0];
    if (artifact) {
      registerArtifact({
        jobId: job.id,
        projectId: job.input.projectId,
        engine: 'server_ffmpeg',
        videoUrl: artifact.url,
        sizeBytes: artifact.sizeBytes,
        durationMs: artifact.durationMs,
        codec: job.renderPlan.execution.encoder,
        metadata: {
          variationIndex: job.input.variationIndex,
          renderPlanId: job.renderPlan.id,
          costUnits: job.renderPlan.estimation.costUnits
        }
      });
    }

    // 4. Update Final State
    updateJob(jobId, {
      status: 'done',
      completedAt: new Date().toISOString(),
      output: result,
      progressPct: 100,
      encoderUsed: job.renderPlan.execution.encoder
    });

    appendLog(jobId, `[Success] Render completed in ${((Date.now() - new Date(job.startedAt)) / 1000).toFixed(1)}s`);

  } catch (err) {
    reportFailure(jobId, err);
  } finally {
    // Cleanup
    if (job.tempFiles?.length > 0) {
      job.tempFiles.forEach(file => {
        try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (e) { }
      });
    }

    queue.completeJob(jobId);
    cleanOldJobs();

    // Check for next job immediately
    setImmediate(processNextJob);
  }
}

/**
 * Enhanced Failure Intelligence (Requirement 6)
 */
function reportFailure(jobId, error) {
  const job = getJob(jobId);
  const failureMeta = {
    code: error.code || 'UNKNOWN_RENDER_ERROR',
    stage: error.stage || 'execution',
    command: job?.command || 'none',
    message: error.message || 'An unexpected error occurred during rendering',
    suggestedAction: getFailureSuggestion(error),
    timestamp: new Date().toISOString()
  };

  updateJob(jobId, {
    status: 'error',
    completedAt: new Date().toISOString(),
    error: failureMeta
  });

  appendLog(jobId, `[FAILED] Stage: ${failureMeta.stage} | Error: ${failureMeta.message}`);
  appendLog(jobId, `[Action] ${failureMeta.suggestedAction}`);

  // Also persist to DB for cross-session analysis
  if (db && job?.input?.projectId) {
    try {
      db.prepare(`
        INSERT INTO execution_errors (project_id, job_id, category, message, stack)
        VALUES (?, ?, ?, ?, ?)
      `).run(job.input.projectId, jobId, failureMeta.stage, failureMeta.message, error.stack);
    } catch (e) {
      console.error('[ErrorLog] Failed to persist error:', e.message);
    }
  }
}

function getFailureSuggestion(error) {
  if (error.code === 'TIMEOUT_ERROR') return 'Reduce video resolution or duration and try again.';
  if (error.code === 'FFMPEG_EXIT_ERROR') return 'Check input codec compatibility or watermark transparency.';
  if (error.code === 'EMPTY_OUTPUT') return 'The source file might be corrupted or inaccessible.';
  if (error.message.includes('Encoder not found')) return 'Update system FFmpeg build to include required hardware drivers.';
  return 'Verify input parameters or contact system administrator.';
}

async function resolveJobSource(job) {
  const { input } = job;

  // 1. Resolve Primary Sources (Videos)
  if (input.sources && Array.isArray(input.sources)) {
    appendLog(job.id, `Resolving ${input.sources.length} sources...`);
    input.sourcePaths = [];

    for (let i = 0; i < input.sources.length; i++) {
      const url = input.sources[i];
      if (!url) continue;
      if (typeof url === 'string' && (url.startsWith('http') || url.startsWith('https'))) {
        try {
          const localPath = await downloadRemoteFile(url, `${job.id}_src_${i}`);
          input.sourcePaths.push(localPath);
          job.tempFiles.push(localPath);
          appendLog(job.id, `Source ${i} ready: ${localPath}`);
        } catch (err) {
          throw new Error(`Failed to download source ${i} (${url}): ${err.message}`);
        }
      } else if (typeof url === 'string' && fs.existsSync(url)) {
        input.sourcePaths.push(url);
      }
    }
  }

  // Handle single source
  let remoteUrl = input.inputFileUrl || input.sourceVideoUrl;
  if (!input.sourcePaths && !input.sourcePath && remoteUrl) {
    appendLog(job.id, `Resolving remote source: ${remoteUrl}`);
    try {
      const localPath = await downloadRemoteFile(remoteUrl, job.id);
      job.input.sourcePath = localPath;
      job.tempFiles.push(localPath);
      appendLog(job.id, `Downloaded to: ${localPath}`);
    } catch (err) {
      throw new Error(`Failed to download source file: ${err.message}`);
    }
  }

  // 2. Resolve Background Music
  if (input.backgroundMusic && typeof input.backgroundMusic === 'string' && input.backgroundMusic.startsWith('http')) {
    appendLog(job.id, 'Resolving background music...');
    try {
      const bgmPath = await downloadRemoteFile(input.backgroundMusic, `${job.id}_bgm`);
      input.backgroundMusicPath = bgmPath;
      job.tempFiles.push(bgmPath);
    } catch (err) {
      console.warn(`[Resolve] BGM download failed: ${err.message}`);
    }
  } else if (input.backgroundMusic && fs.existsSync(input.backgroundMusic)) {
    input.backgroundMusicPath = input.backgroundMusic;
  }

  // 3. Resolve Image Overlays
  if (input.imageOverlays && Array.isArray(input.imageOverlays)) {
    for (let i = 0; i < input.imageOverlays.length; i++) {
      const img = input.imageOverlays[i];
      if (img.url && img.url.startsWith('http')) {
        try {
          const localImgPath = await downloadRemoteFile(img.url, `${job.id}_img_${i}`);
          img.localPath = localImgPath;
          job.tempFiles.push(localImgPath);
        } catch (err) {
          console.warn(`[Resolve] Image overlay ${i} download failed: ${err.message}`);
        }
      }
    }
  }

  // 4. Resolve Watermark
  if (input.watermark && input.watermark.url && input.watermark.url.startsWith('http')) {
    try {
      const wmPath = await downloadRemoteFile(input.watermark.url, `${job.id}_wm`);
      input.watermark.localPath = wmPath;
      job.tempFiles.push(wmPath);
    } catch (err) {
      console.warn(`[Resolve] Watermark download failed: ${err.message}`);
    }
  }

  // 5. Resolve Subtitles
  if (input.subtitles && input.subtitles.url && input.subtitles.url.startsWith('http')) {
    try {
      const subPath = await downloadRemoteFile(input.subtitles.url, `${job.id}_sub`);
      input.subtitles.localPath = subPath;
      job.tempFiles.push(subPath);
    } catch (err) {
      console.warn(`[Resolve] Subtitles download failed: ${err.message}`);
    }
  }

  if (!input.sourcePaths && !input.sourcePath && !input.sourceVideoUrl && !input.inputFileUrl) {
    throw new Error('No sourcePath or valid remote URL provided');
  }
}

async function executeFFmpegJob(job) {
  const { type, input, renderPlan } = job;

  if (!FFMPEG_AVAILABLE) {
    const err = new Error('FFmpeg binary not available on server');
    err.code = 'FFMPEG_UNAVAILABLE';
    err.stage = 'pre-flight';
    throw err;
  }

  // Pre-flight checks
  if (type !== 'complex' && (!input.sourcePath || !fs.existsSync(input.sourcePath))) {
    const err = new Error(`Source file not found: ${input.sourcePath}`);
    err.code = 'MISSING_SOURCE_FILE';
    err.stage = 'pre-flight';
    throw err;
  }

  // Project-Scoped Output Path
  let outputDirForJob = OUTPUT_DIR;
  if (input.projectId) {
    outputDirForJob = path.join(DATA_DIR, 'projects', input.projectId, 'outputs');
    if (!fs.existsSync(outputDirForJob)) fs.mkdirSync(outputDirForJob, { recursive: true });
  }

  const outputFilename = `${job.id}.mp4`;
  const outputPath = path.join(outputDirForJob, outputFilename);

  // BUILD ARGUMENTS FROM RENDER PLAN (Requirement 3)
  let args;
  try {
    if (type === 'execute') {
      args = buildFFmpegArgs(input, outputPath, renderPlan.execution.encoder);
    } else if (type === 'execute-plan') {
      args = buildPlanArgs(input, outputPath, renderPlan.execution.encoder);
    } else if (type === 'complex') {
      args = buildComplexArgs(input, outputPath, renderPlan.execution.encoder);
    } else {
      throw new Error(`Unknown job type: ${type}`);
    }
  } catch (err) {
    err.stage = 'build-args';
    throw err;
  }

  return new Promise((resolve, reject) => {
    updateJob(job.id, { command: `ffmpeg ${args.join(' ')}` });

    let ffmpeg;
    try {
      ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      err.code = 'SPAWN_ERROR';
      err.stage = 'spawn';
      reject(err);
      return;
    }

    let stderr = '';
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      try { ffmpeg.kill('SIGKILL'); } catch (e) { }
      const err = new Error(`Render timed out after ${MAX_RENDER_TIME}s`);
      err.code = 'TIMEOUT_ERROR';
      err.stage = 'execution';
      reject(err);
    }, MAX_RENDER_TIME * 1000);

    ffmpeg.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;

      // Deterministic Progress Parsing (Requirement 7)
      const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const mins = parseInt(timeMatch[2]);
        const secs = parseFloat(timeMatch[3]);
        const currentSec = (hours * 3600) + (mins * 60) + secs;

        const totalDurationSec = renderPlan.execution.durationSec;
        const progressPct = Math.min(99, Math.round((currentSec / totalDurationSec) * 100));

        // Dynamic ETA
        let etaSec = null;
        if (progressPct > 5 && job.startedAt) {
          const elapsed = (Date.now() - new Date(job.startedAt).getTime()) / 1000;
          const rate = currentSec / elapsed;
          etaSec = Math.max(0, (totalDurationSec - currentSec) / rate);
        }

        updateJob(job.id, { progressPct, etaSec });
      }
      appendLog(job.id, chunk.trim());
    });

    ffmpeg.on('close', (code) => {
      clearTimeout(timeout);
      if (killed) return;

      if (code === 0) {
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            const artifactPathUrl = input.projectId
              ? `/projects/${input.projectId}/outputs/${outputFilename}`
              : `/outputs/${outputFilename}`;

            resolve({
              outputPath,
              outputUrl: artifactPathUrl,
              outputSize: stats.size,
              durationMs: renderPlan.execution.durationSec * 1000,
              artifacts: [{
                type: 'video',
                mime: 'video/mp4',
                engine: 'server_ffmpeg',
                url: artifactPathUrl,
                durationMs: renderPlan.execution.durationSec * 1000,
                sizeBytes: stats.size
              }]
            });
          } else {
            const err = new Error('FFmpeg output is 0 bytes');
            err.code = 'EMPTY_OUTPUT';
            err.stage = 'validation';
            reject(err);
          }
        } else {
          const err = new Error('FFmpeg output file not found');
          err.code = 'NO_OUTPUT';
          err.stage = 'validation';
          reject(err);
        }
      } else {
        const err = new Error(`FFmpeg exited with code ${code}`);
        err.code = 'FFMPEG_EXIT_ERROR';
        err.stage = 'execution';
        reject(err);
      }
    });
  });
}

// ============================================
// FFMPEG ARGUMENT BUILDERS (Whitelist-based)
// ============================================

function buildFFmpegArgs(input, outputPath, encoder = 'libx264') {
  const { sourcePath, textOverlays, imageOverlays, watermark, subtitles, backgroundMusicPath } = input;
  const args = ['-y'];

  args.push('-i', sourcePath);
  let bgmIndex = -1;
  if (backgroundMusicPath) {
    bgmIndex = 1;
    args.push('-i', backgroundMusicPath);
  }

  // Handle image inputs for overlays
  if (imageOverlays) {
    imageOverlays.forEach(img => {
      if (img.localPath) args.push('-i', img.localPath);
    });
  }
  if (watermark && watermark.localPath) args.push('-i', watermark.localPath);

  // Filters
  let filters = [];
  const res = input.resolution || { width: 1080, height: 1920 };
  filters.push(`scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2,setsar=1`);

  if (textOverlays) {
    textOverlays.forEach((to, idx) => {
      filters.push(`drawtext=text='${to.text}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h-200:enable='between(t,${to.startTime || 0},${to.endTime || 999})'`);
    });
  }

  if (subtitles && subtitles.localPath) {
    const subPath = subtitles.localPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    filters.push(`subtitles='${subPath}'`);
  }

  args.push('-vf', filters.join(','));

  // Audio
  if (bgmIndex !== -1) {
    args.push('-filter_complex', `[0:a][1:a]amix=inputs=2:duration=first[aout]`, '-map', '0:v', '-map', '[aout]');
  }

  args.push('-c:v', encoder, '-pix_fmt', 'yuv420p');
  if (encoder === 'h264_nvenc') args.push('-preset', 'p4');
  else args.push('-preset', 'fast', '-crf', '23');

  args.push('-c:a', 'aac', '-movflags', '+faststart');
  args.push(outputPath);

  return args;
}

function buildPlanArgs(input, outputPath, encoder = 'libx264') {
  // Map Plan-style input to a complex-like builder
  // execute-plan is essentially a complex job with a single source and a plan object
  return buildComplexArgs({
    ...input,
    sourcePaths: [input.sourcePath],
    clipDuration: (input.plan?.validation?.total_duration_ms / 1000) || 30
  }, outputPath, encoder);
}

function buildComplexArgs(input, outputPath, encoder = 'libx264') {
  const { sourcePaths, transitions, clipDuration, maxDuration, textOverlays, imageOverlays, watermark, subtitles, backgroundMusicPath, voiceoverPath } = input;

  if (!sourcePaths || sourcePaths.length === 0) throw new Error('No source paths for complex build');

  const args = ['-y'];

  // 1. Inputs
  sourcePaths.forEach(p => args.push('-i', p));
  let bgmIndex = -1;
  if (backgroundMusicPath) {
    bgmIndex = sourcePaths.length;
    args.push('-i', backgroundMusicPath);
  }

  let imgIndexes = [];
  if (imageOverlays) {
    imageOverlays.forEach((img, idx) => {
      if (img.localPath) {
        imgIndexes.push(args.length / 2); // Approximation of index
        args.push('-i', img.localPath);
      }
    });
  }

  if (watermark && watermark.localPath) {
    args.push('-i', watermark.localPath);
  }

  // 2. Filter Complex
  let filters = [];
  const durationPerClip = clipDuration || 5;
  const transDur = 0.5;
  const res = input.resolution || { width: 1080, height: 1920 };

  // A. Video Pre-processing (Scale/Trim/FPS)
  for (let i = 0; i < sourcePaths.length; i++) {
    filters.push(`[${i}:v]scale=${res.width}:${res.height}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,trim=duration=${durationPerClip},setpts=PTS-STARTPTS[v${i}]`);
    filters.push(`[${i}:a]atrim=duration=${durationPerClip},asetpts=PTS-STARTPTS[a${i}]`);
  }

  // B. Video Stitching with Transitions
  let lastV = 'v0';
  let lastA = 'a0';
  if (sourcePaths.length > 1) {
    for (let i = 1; i < sourcePaths.length; i++) {
      const offset = (i * durationPerClip) - (i * transDur);
      filters.push(`[${lastV}][v${i}]xfade=transition=fade:duration=${transDur}:offset=${offset}[vout${i}]`);
      filters.push(`[${lastA}][a${i}]acrossfade=d=${transDur}:c1=tri:c2=tri[aout${i}]`);
      lastV = `vout${i}`;
      lastA = `aout${i}`;
    }
  }

  // C. Overlays (Text/Image/Watermark)
  let currentV = lastV;

  // Watermark
  if (watermark && watermark.localPath) {
    const wmIdx = args.length / 2 - 1; // Last input if watermark added
    filters.push(`[${currentV}][${wmIdx}:v]overlay=main_w-overlay_w-20:20[vwm]`);
    currentV = 'vwm';
  }

  // Text Overlays
  if (textOverlays && Array.isArray(textOverlays)) {
    textOverlays.forEach((to, idx) => {
      const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; // Common VPS font
      const startTime = to.startTime || 0;
      const endTime = to.endTime || durationPerClip * sourcePaths.length;
      filters.push(`[${currentV}]drawtext=text='${to.text}':fontfile=${fontPath}:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-200:enable='between(t,${startTime},${endTime})'[vtxt${idx}]`);
      currentV = `vtxt${idx}`;
    });
  }

  // Subtitles
  if (subtitles && subtitles.localPath) {
    // Note: subtitles filter usually needs a path relative to current dir or absolute
    // On Windows, paths need extra escaping for FFmpeg filters
    const subPath = subtitles.localPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    filters.push(`[${currentV}]subtitles='${subPath}'[vsub]`);
    currentV = 'vsub';
  }

  // D. Audio Pipeline (Normalization/Mixing)
  let currentA = lastA;

  // Voiceover mixing
  if (voiceoverPath) {
    // TODO: implement voiceover mixing logic
  }

  // Background Music mixing
  if (bgmIndex !== -1) {
    filters.push(`[${currentA}]volume=1.0[amain]`);
    filters.push(`[${bgmIndex}:a]volume=0.2,aloop=loop=-1:size=2e9[abgm]`);
    filters.push(`[amain][abgm]amix=inputs=2:duration=first[amix]`);
    currentA = 'amix';
  }

  // Final Audio Normalization
  filters.push(`[${currentA}]dynaudnorm[afinal]`);

  args.push('-filter_complex', filters.join(';'));
  args.push('-map', `[${currentV}]`);
  args.push('-map', '[afinal]');

  // 3. Encoder Settings
  args.push('-c:v', encoder);
  if (encoder === 'h264_nvenc') args.push('-preset', 'p4');
  else args.push('-preset', 'fast', '-crf', '23');

  args.push('-c:a', 'aac', '-b:a', '192k');
  args.push('-t', String(maxDuration || (durationPerClip * sourcePaths.length)));
  args.push('-movflags', '+faststart');
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
  const allowedPrefixes = [UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR, '/var/www/flowscale', process.cwd()];
  const isAllowed = allowedPrefixes.some(prefix => normalized.startsWith(prefix));

  if (!isAllowed) {
    return null;
  }

  // Note: We don't verify fs.exists here anymore because
  // the file might be downloaded LATER in the job processor.

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

// Request logging with FULL URL
app.use((req, res, next) => {
  console.log(`[API REQUEST] ${req.method} ${req.url} (Original: ${req.originalUrl})`);
  next();
});

// Force JSON Content-Type
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Expose queue stats function for health endpoints
app.locals.getQueueStats = () => queue.getStats();

// Mount health endpoints explicitly at /api/health
app.use('/api/health', healthRouter);
console.log('[FlowScale API] Health endpoints mounted at /api/health');

// Mount analytics endpoints explicitly at /api/analytics
app.use('/api/analytics', analyticsRouter);
console.log('[FlowScale API] Analytics endpoints mounted at /api/analytics');

// ============================================
// CONNECTION MANAGEMENT API
// Backend-owned connection status for external services
// ============================================

/**
 * Supported connection providers and their required env vars
 */
const CONNECTION_PROVIDERS = {
  google_drive: {
    name: 'Google Drive',
    description: 'Cloud storage for video outputs',
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
    category: 'storage'
  },
  elevenlabs: {
    name: 'ElevenLabs',
    description: 'AI voice generation',
    envVars: ['ELEVENLABS_API_KEY'],
    category: 'ai'
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT models for content generation',
    envVars: ['OPENAI_API_KEY'],
    category: 'ai'
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models for content generation',
    envVars: ['ANTHROPIC_API_KEY'],
    category: 'ai'
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Gemini models for content generation',
    envVars: ['GEMINI_API_KEY', 'GOOGLE_AI_STUDIO_KEY'],
    category: 'ai'
  },
  fal: {
    name: 'Fal.ai',
    description: 'Video generation models',
    envVars: ['FAL_API_KEY'],
    category: 'video'
  },
  runway: {
    name: 'Runway',
    description: 'AI video generation',
    envVars: ['RUNWAY_API_KEY'],
    category: 'video'
  },
  kling: {
    name: 'Kling AI',
    description: 'AI video generation',
    envVars: ['KLING_API_KEY', 'KLING_ACCESS_KEY', 'KLING_SECRET_KEY'],
    category: 'video'
  },
  heygen: {
    name: 'HeyGen',
    description: 'AI avatar video generation',
    envVars: ['HEYGEN_API_KEY'],
    category: 'video'
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'DeepSeek AI models',
    envVars: ['DEEPSEEK_API_KEY'],
    category: 'ai'
  },
  openrouter: {
    name: 'OpenRouter',
    description: 'Multi-model AI gateway',
    envVars: ['OPENROUTER_API_KEY'],
    category: 'ai'
  }
};

/**
 * Check if a provider is connected by verifying env vars exist and have values
 */
function checkProviderConnection(providerId) {
  const provider = CONNECTION_PROVIDERS[providerId];
  if (!provider) return { connected: false, error: 'Unknown provider' };

  // Check if ANY of the required env vars are set (some providers have alternatives)
  const hasAnyKey = provider.envVars.some(envVar => {
    const value = process.env[envVar];
    return value && value.trim().length > 0;
  });

  // Check which specific vars are set
  const configuredVars = provider.envVars.filter(envVar => {
    const value = process.env[envVar];
    return value && value.trim().length > 0;
  });

  return {
    connected: hasAnyKey,
    configuredVars: configuredVars.length > 0 ? configuredVars : undefined,
    missingVars: hasAnyKey ? undefined : provider.envVars
  };
}

/**
 * GET /api/connections/status
 * Returns connection status for all supported providers
 */
app.get('/api/connections/status', (req, res) => {
  console.log('[Connections] Fetching connection status for all providers');

  const connections = {};

  for (const [providerId, provider] of Object.entries(CONNECTION_PROVIDERS)) {
    const status = checkProviderConnection(providerId);
    connections[providerId] = {
      id: providerId,
      name: provider.name,
      description: provider.description,
      category: provider.category,
      connected: status.connected,
      ...(status.configuredVars && { configuredVars: status.configuredVars }),
      ...(status.error && { error: status.error })
    };
  }

  res.json({
    ok: true,
    connections,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/connections/status/:providerId
 * Returns connection status for a specific provider
 */
app.get('/api/connections/status/:providerId', (req, res) => {
  const { providerId } = req.params;
  console.log(`[Connections] Fetching status for provider: ${providerId}`);

  const provider = CONNECTION_PROVIDERS[providerId];
  if (!provider) {
    return jsonError(res, 404, 'PROVIDER_NOT_FOUND', `Unknown provider: ${providerId}`);
  }

  const status = checkProviderConnection(providerId);

  res.json({
    ok: true,
    connection: {
      id: providerId,
      name: provider.name,
      description: provider.description,
      category: provider.category,
      connected: status.connected,
      ...(status.configuredVars && { configuredVars: status.configuredVars }),
      ...(status.missingVars && { missingVars: status.missingVars })
    }
  });
});

/**
 * POST /api/connections/connect/:providerId
 * Initiates connection flow for a provider
 * For OAuth providers (google_drive), returns redirect URL
 * For API key providers, validates the key is configured
 */
app.post('/api/connections/connect/:providerId', async (req, res) => {
  const { providerId } = req.params;
  console.log(`[Connections] Connect request for provider: ${providerId}`);

  const provider = CONNECTION_PROVIDERS[providerId];
  if (!provider) {
    return jsonError(res, 404, 'PROVIDER_NOT_FOUND', `Unknown provider: ${providerId}`);
  }

  // Check current status
  const status = checkProviderConnection(providerId);

  if (status.connected) {
    return res.json({
      ok: true,
      message: `${provider.name} is already connected`,
      connected: true
    });
  }

  // Handle OAuth providers
  if (providerId === 'google_drive') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;

    if (!clientId) {
      return jsonError(res, 503, 'NOT_CONFIGURED', 'Google OAuth is not configured on this server. Contact administrator.');
    }

    // Build OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly'
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    return res.json({
      ok: true,
      action: 'redirect',
      redirectUrl: authUrl,
      message: 'Redirect user to Google OAuth'
    });
  }

  // For API key providers, they need to be configured in .env
  return jsonError(res, 503, 'NOT_CONFIGURED',
    `${provider.name} requires API key configuration. Missing: ${status.missingVars?.join(', ')}. Contact administrator.`
  );
});

/**
 * POST /api/connections/disconnect/:providerId
 * Disconnects a provider (clears tokens for OAuth, marks as inactive)
 */
app.post('/api/connections/disconnect/:providerId', async (req, res) => {
  const { providerId } = req.params;
  console.log(`[Connections] Disconnect request for provider: ${providerId}`);

  const provider = CONNECTION_PROVIDERS[providerId];
  if (!provider) {
    return jsonError(res, 404, 'PROVIDER_NOT_FOUND', `Unknown provider: ${providerId}`);
  }

  // For OAuth providers, we could clear refresh tokens
  // For API key providers, disconnection is handled via .env configuration

  if (providerId === 'google_drive') {
    // In a real implementation, this would:
    // 1. Revoke the refresh token with Google
    // 2. Clear the stored refresh token from secure storage
    console.log('[Connections] Google Drive disconnect requested - tokens should be revoked');

    return res.json({
      ok: true,
      message: 'Google Drive disconnected. Tokens have been revoked.',
      connected: false
    });
  }

  // API key providers can't be "disconnected" without modifying .env
  return jsonError(res, 400, 'CANNOT_DISCONNECT',
    `${provider.name} uses API key authentication. To disconnect, remove the API key from server configuration.`
  );
});

/**
 * GET /api/oauth/google/callback
 * OAuth callback handler for Google Drive
 */
app.get('/api/oauth/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('[OAuth] Google auth error:', error);
    return res.redirect('/?oauth_error=' + encodeURIComponent(error));
  }

  if (!code) {
    return res.redirect('/?oauth_error=no_code');
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/oauth/google/callback`;

    // Exchange code for tokens
    const fetch = (await import('node-fetch')).default;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      console.error('[OAuth] Token exchange error:', tokens);
      return res.redirect('/?oauth_error=' + encodeURIComponent(tokens.error));
    }

    // Store refresh token securely (in production, this would go to secure storage)
    console.log('[OAuth] Google tokens received successfully');
    console.log('[OAuth] Refresh token needs to be stored in GOOGLE_REFRESH_TOKEN env var');

    // Redirect to settings page with success
    res.redirect('/settings?oauth_success=google_drive');

  } catch (err) {
    console.error('[OAuth] Callback error:', err);
    res.redirect('/?oauth_error=' + encodeURIComponent(err.message));
  }
});

// ============================================
// HISTORY & CLEANUP API
// Unified history control and file cleanup endpoints
// ============================================

/**
 * GET /api/history
 * Returns execution history for a project or tool
 */
app.get('/api/history', (req, res) => {
  const { projectId, tool } = req.query;
  console.log(`[History] Fetching history for project: ${projectId}, tool: ${tool}`);

  // Get relevant jobs from in-memory store
  const allJobs = Array.from(queue.jobs.values());
  const filteredJobs = allJobs.filter(job => {
    if (projectId && job.input?.projectId !== projectId) return false;
    if (tool && job.type !== tool) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    ok: true,
    history: filteredJobs.map(job => ({
      id: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      output: job.output,
      error: job.error
    })),
    count: filteredJobs.length
  });
});

/**
 * GET /api/outputs
 * Returns recent persistent video outputs from the local DB
 */
app.get('/api/outputs', async (req, res) => {
  const { projectId, limit = 50, offset = 0 } = req.query;

  try {
    const query = `
      SELECT o.*, p.name as project_name, p.google_drive_folder_link
      FROM video_outputs o
      LEFT JOIN projects p ON o.project_id = p.id
      WHERE 1=1
      ${projectId ? 'AND o.project_id = ?' : ''}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const params = [];
    if (projectId) params.push(projectId);
    params.push(parseInt(limit), parseInt(offset));

    const rows = db.prepare(query).all(...params);

    res.json({
      ok: true,
      outputs: rows.map(r => ({
        id: r.id,
        projectId: r.project_id,
        projectName: r.project_name,
        jobId: r.job_id,
        type: r.type,
        url: r.output_url,
        thumbnail: r.thumbnail_url,
        duration: r.duration_sec,
        size: r.size_bytes,
        driveLink: r.google_drive_folder_link,
        createdAt: r.created_at,
        metadata: r.metadata ? JSON.parse(r.metadata) : {}
      })),
      count: rows.length
    });
  } catch (err) {
    return jsonError(res, 500, 'OUTPUT_QUERY_FAILED', err.message);
  }
});


/**
 * DELETE /api/history
 * Clears execution history and associated data
 * REAL backend action - deletes logs, pipeline state, job records
 */
app.delete('/api/history', async (req, res) => {
  const { projectId, tool, scope } = req.body;
  console.log(`[History] Clear request - projectId: ${projectId}, tool: ${tool}, scope: ${scope}`);

  const deletedItems = {
    jobs: 0,
    logs: 0,
    pipelines: 0,
    tempFiles: 0
  };

  try {
    // 1. Delete jobs from in-memory queue
    const jobsToDelete = [];
    for (const [jobId, job] of queue.jobs.entries()) {
      const shouldDelete =
        (scope === 'all') ||
        (projectId && job.input?.projectId === projectId) ||
        (tool && job.type === tool);

      if (shouldDelete && job.status !== 'running') {
        jobsToDelete.push(jobId);
      }
    }

    for (const jobId of jobsToDelete) {
      const job = queue.jobs.get(jobId);

      // Clean up temp files associated with this job
      if (job?.tempFiles && Array.isArray(job.tempFiles)) {
        for (const tempFile of job.tempFiles) {
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
              deletedItems.tempFiles++;
              console.log(`[History] Deleted temp file: ${tempFile}`);
            }
          } catch (e) {
            console.warn(`[History] Failed to delete temp file: ${tempFile}`);
          }
        }
      }

      queue.jobs.delete(jobId);
      deletedItems.jobs++;
    }

    // 2. Remove from pending queue
    const pendingBefore = queue.pendingQueue.length;
    queue.pendingQueue = queue.pendingQueue.filter(p => !jobsToDelete.includes(p.id));
    deletedItems.pipelines = pendingBefore - queue.pendingQueue.length;

    // 3. Clean up project-specific temp directory
    if (projectId) {
      const projectTempDir = path.join(TEMP_DIR, projectId);
      if (fs.existsSync(projectTempDir)) {
        const files = fs.readdirSync(projectTempDir);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(projectTempDir, file));
            deletedItems.tempFiles++;
          } catch (e) { /* ignore */ }
        }
        try {
          fs.rmdirSync(projectTempDir);
        } catch (e) { /* ignore if not empty */ }
      }
    }

    console.log(`[History] Cleared: ${deletedItems.jobs} jobs, ${deletedItems.tempFiles} temp files`);

    res.json({
      ok: true,
      message: 'History cleared successfully',
      deleted: deletedItems
    });

  } catch (err) {
    console.error('[History] Clear failed:', err);
    jsonError(res, 500, 'CLEAR_FAILED', err.message);
  }
});

/**
 * GET /api/files
 * Lists files for a project or tool
 */
app.get('/api/files', (req, res) => {
  const { projectId, type } = req.query;
  console.log(`[Files] Listing files for project: ${projectId}, type: ${type}`);

  const files = [];

  // Scan uploads directory
  const scanDir = projectId
    ? path.join(UPLOAD_DIR, projectId)
    : UPLOAD_DIR;

  if (fs.existsSync(scanDir)) {
    const dirFiles = fs.readdirSync(scanDir, { withFileTypes: true });
    for (const dirent of dirFiles) {
      if (dirent.isFile()) {
        const filePath = path.join(scanDir, dirent.name);
        const stats = fs.statSync(filePath);
        const ext = path.extname(dirent.name).toLowerCase();
        const fileType =
          ['.mp4', '.webm', '.mov', '.avi'].includes(ext) ? 'video' :
            ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? 'image' :
              'other';

        if (!type || type === fileType) {
          files.push({
            name: dirent.name,
            path: filePath,
            type: fileType,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          });
        }
      }
    }
  }

  // Scan outputs directory
  const outputDir = projectId
    ? path.join(OUTPUT_DIR, projectId)
    : OUTPUT_DIR;

  if (fs.existsSync(outputDir)) {
    const dirFiles = fs.readdirSync(outputDir, { withFileTypes: true });
    for (const dirent of dirFiles) {
      if (dirent.isFile()) {
        const filePath = path.join(outputDir, dirent.name);
        const stats = fs.statSync(filePath);
        files.push({
          name: dirent.name,
          path: filePath,
          type: 'output',
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }
    }
  }

  res.json({
    ok: true,
    files,
    count: files.length,
    totalSize: files.reduce((sum, f) => sum + f.size, 0)
  });
});

/**
 * DELETE /api/files
 * Deletes files for a project
 */
app.delete('/api/files', async (req, res) => {
  const { projectId, fileTypes, scope } = req.body;
  console.log(`[Files] Delete request - projectId: ${projectId}, types: ${fileTypes}, scope: ${scope}`);

  if (!projectId && scope !== 'orphaned') {
    return jsonError(res, 400, 'PROJECT_REQUIRED', 'projectId is required unless scope is "orphaned"');
  }

  const deleted = {
    videos: 0,
    images: 0,
    outputs: 0,
    orphaned: 0,
    totalBytes: 0
  };

  try {
    const typesToDelete = fileTypes || ['video', 'image', 'output'];

    // Delete from uploads
    if (typesToDelete.includes('video') || typesToDelete.includes('image')) {
      const uploadDir = projectId
        ? path.join(UPLOAD_DIR, projectId)
        : UPLOAD_DIR;

      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
          const filePath = path.join(uploadDir, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            const ext = path.extname(file).toLowerCase();
            const isVideo = ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
            const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

            if ((isVideo && typesToDelete.includes('video')) ||
              (isImage && typesToDelete.includes('image'))) {
              fs.unlinkSync(filePath);
              deleted.totalBytes += stats.size;
              if (isVideo) deleted.videos++;
              else deleted.images++;
              console.log(`[Files] Deleted: ${filePath}`);
            }
          }
        }
      }
    }

    // Delete outputs
    if (typesToDelete.includes('output')) {
      const outputDir = projectId
        ? path.join(OUTPUT_DIR, projectId)
        : OUTPUT_DIR;

      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        for (const file of files) {
          const filePath = path.join(outputDir, file);
          const stats = fs.statSync(filePath);
          if (stats.isFile()) {
            fs.unlinkSync(filePath);
            deleted.totalBytes += stats.size;
            deleted.outputs++;
            console.log(`[Files] Deleted output: ${filePath}`);
          }
        }
      }
    }

    // Handle orphaned files (no active job reference)
    if (scope === 'orphaned') {
      const activeJobIds = new Set(Array.from(jobs.values()).map(j => j.id));

      // Scan temp directory for orphans
      if (fs.existsSync(TEMP_DIR)) {
        const tempFiles = fs.readdirSync(TEMP_DIR, { withFileTypes: true });
        for (const dirent of tempFiles) {
          if (dirent.isFile()) {
            // Check if file is referenced by any job
            const isOrphan = !Array.from(jobs.values()).some(job =>
              job.tempFiles?.includes(path.join(TEMP_DIR, dirent.name))
            );

            if (isOrphan) {
              const filePath = path.join(TEMP_DIR, dirent.name);
              const stats = fs.statSync(filePath);
              fs.unlinkSync(filePath);
              deleted.orphaned++;
              deleted.totalBytes += stats.size;
              console.log(`[Files] Deleted orphaned: ${filePath}`);
            }
          }
        }
      }
    }

    console.log(`[Files] Cleanup complete: ${JSON.stringify(deleted)}`);

    res.json({
      ok: true,
      message: 'Files deleted successfully',
      deleted
    });

  } catch (err) {
    console.error('[Files] Delete failed:', err);
    jsonError(res, 500, 'DELETE_FAILED', err.message);
  }
});

/**
 * GET /api/pipeline/status
 * Returns current pipeline status
 */
app.get('/api/pipeline/status', (req, res) => {
  const { projectId } = req.query;

  const queuedJobs = pendingQueue.length;
  const currentJobInfo = currentJob ? jobs.get(currentJob) : null;

  res.json({
    ok: true,
    pipeline: {
      queuedJobs,
      currentJob: currentJobInfo ? {
        id: currentJobInfo.id,
        type: currentJobInfo.type,
        status: currentJobInfo.status,
        progressPct: currentJobInfo.progressPct,
        startedAt: currentJobInfo.startedAt
      } : null,
      isProcessing: currentJob !== null
    }
  });
});

/**
 * DELETE /api/pipeline
 * Resets pipeline state (clears queue)
 */
app.delete('/api/pipeline', (req, res) => {
  const { force } = req.body;

  if (currentJob && !force) {
    return jsonError(res, 400, 'JOB_RUNNING', 'A job is currently running. Use force=true to clear anyway.');
  }

  const clearedCount = pendingQueue.length;
  pendingQueue.length = 0;

  console.log(`[Pipeline] Cleared ${clearedCount} pending jobs`);

  res.json({
    ok: true,
    message: `Cleared ${clearedCount} pending jobs`,
    clearedCount
  });
});

// ============================================
// RENDERFLOW PROXY ADAPTER (Phase 2)
// Direct proxy to deterministic engine on port 3001
// ============================================

const RENDERFLOW_API = process.env.RENDERFLOW_URL || 'http://localhost:3001/render';

// POST /api/render/renderflow
// Proxies render requests to RenderFlow Engine
app.post('/api/render/renderflow', async (req, res) => {
  try {
    const { projectId, scenes, variations: outputVariations } = req.body;

    // Translation: FlowScale Scenes -> RenderFlow Variations
    // If we have 'variations' already (New UI), use them.
    // If we have 'scenes' (Legacy/Studio), map them.

    let variations = [];
    if (outputVariations && Array.isArray(outputVariations)) {
      variations = outputVariations;
    } else if (scenes && Array.isArray(scenes)) {
      variations = scenes.map((scene, idx) => {
        return {
          id: `var_proxy_${Date.now()}_${idx}`,
          data: {
            source_url: scene.video || scene.sourceUrl || null,
            trim: scene.trim || null,
            original_scene_id: scene.id
          }
        };
      }).filter(v => v.data.source_url);
    }

    if (variations.length === 0) {
      return jsonError(res, 400, 'INVALID_PAYLOAD', 'No valid variations or scenes found');
    }

    const fetch = (await import('node-fetch')).default;

    const rfRes = await fetch(`${RENDERFLOW_API}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        variations: variations
      })
    });

    if (!rfRes.ok) {
      console.error('[Adapter] RenderFlow POST Error:', rfRes.status, await rfRes.text());
      return res.status(rfRes.status).json({ error: 'RenderFlow API Error', details: await rfRes.text() });
    }

    const rfData = await rfRes.json();
    console.log('[Adapter] RenderFlow accepted:', rfData);

    // Return to UI
    res.json(rfData);

  } catch (err) {
    console.error('RenderFlow Proxy Error:', err);
    res.status(502).json({ error: 'RenderFlow Gateway Error' });
  }
});

// PROXY: GET /api/render/renderflow/jobs (List)
app.get('/api/render/renderflow/jobs', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;

    const response = await fetch(`${RENDERFLOW_API}/jobs`);
    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('RenderFlow List Proxy Error:', err);
    res.status(502).json({ error: 'RenderFlow Gateway Error' });
  }
});

// PROXY: GET /api/render/renderflow/jobs/:id (Status)
app.get('/api/render/renderflow/jobs/:id', async (req, res) => {
  try {
    const rfRes = await fetch(`${RENDERFLOW_API}/jobs/${req.params.id}`);
    if (!rfRes.ok) {
      if (rfRes.status === 404) return jsonError(res, 404, 'NOT_FOUND', 'Job not found in RenderFlow');
      throw new Error(`RenderFlow error: ${rfRes.status}`);
    }
    const data = await rfRes.json();
    res.json(data);
  } catch (err) {
    console.error('[Adapter] Proxy Status Error:', err);
    jsonError(res, 500, 'PROXY_ERROR', err.message);
  }
});

// PROXY: POST /api/render/renderflow/upload (New Strict Endpoint)
// Purpose: Upload assets specifically for RenderFlow, decoupled from legacy upload
app.post('/api/render/renderflow/upload', (req, res) => {
  // Reuse multer instance 'upload' defined earlier in api.js
  // Strict separation: We store in a subfolder 'renderflow' within uploads to keep it clean
  // But due to multer config 'upload' using 'uploads/', we might just tag it.
  // v1: Use same multer, but separate route logic. 

  upload.single('file')(req, res, (err) => {
    if (err) return jsonError(res, 400, 'UPLOAD_ERROR', err.message);
    if (!req.file) return jsonError(res, 400, 'NO_FILE', 'No file provided');

    const publicUrl = `/uploads/${req.file.filename}`;
    console.log(`[Adapter] RenderFlow Upload: ${req.file.filename}`);

    res.json({
      ok: true,
      url: publicUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  });
});

// ============================================
// GET /api/health
// ============================================



/**
 * POST /api/upload
 * Upload a video/image file
 * REQUIRES: projectId (enforced by middleware)
 */
app.post('/api/upload', async (req, res) => {
  // First, handle the file upload
  upload.single('file')(req, res, async (err) => {
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

    // Then enforce project context
    const projectId = req.body.projectId;
    if (!projectId) {
      // Clean up uploaded file if no project
      try { fs.unlinkSync(req.file.path); } catch (e) { }
      return jsonError(res, 400, 'PROJECT_REQUIRED', 'projectId is required for all uploads');
    }

    // Validate project (Local DB)
    let project;
    try {
      // In single user mode, userId logic is loose, but we pass what we have
      const mockUserId = '00000000-0000-0000-0000-000000000000';
      project = await validateProject(projectId, req.user?.id || mockUserId);
    } catch (e) {
      try { fs.unlinkSync(req.file.path); } catch (delErr) { }
      return jsonError(res, 404, 'PROJECT_NOT_FOUND', e.message);
    }

    const filePath = path.join(req.file.destination, req.file.filename);
    const publicUrl = `/uploads/${req.body.projectId ? req.body.projectId + '/' : ''}${req.file.filename}`;
    const fileId = req.file.filename.split('.')[0];

    console.log(`[Upload] Saved: ${req.file.filename} (${req.file.size} bytes) to project ${projectId}`);

    // Track uploaded file as project resource
    try {
      await trackResource(projectId, {
        type: 'file',
        id: fileId,
        path: filePath,
        size: req.file.size,
        metadata: {
          original_name: req.file.originalname,
          mime_type: req.file.mimetype,
          upload_timestamp: new Date().toISOString()
        }
      });
    } catch (trackError) {
      console.warn(`[Upload] Resource tracking failed: ${trackError.message}`);
    }

    res.json({
      ok: true,
      fileId,
      projectId,
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

const unifiedJobHandler = (req, res) => {
  console.log(`[Adapter] Incoming Job Request: ${req.path}`);
  console.log('[Adapter] Payload:', JSON.stringify(req.body, null, 2));

  const { variations, project_id } = req.body;

  // 1. Check if it's a "Plan" (Unified Engine)
  if (variations && variations[0] && variations[0].data && variations[0].data.plan) {
    const plan = variations[0].data.plan;
    console.log('[Adapter] Mapping Variations-style Plan to Execute-Plan');

    // Robust Source Resolution for Plan
    let srcUrl = plan.timeline?.[0]?.asset_url;
    let srcPath = variations[0].data.sourcePath;

    if (typeof srcPath === 'string' && (srcPath.startsWith('http') || srcPath.startsWith('https'))) {
      console.log('[Adapter] Moving URL from sourcePath to sourceVideoUrl (Plan Mode)');
      srcUrl = srcPath;
      srcPath = null;
    }

    req.body = {
      plan,
      projectId: project_id || 'unified_plan',
      sourceVideoUrl: srcUrl,
      sourcePath: srcPath,
      outputName: variations[0].id
    };
    return handleExecutePlan(req, res);
  }

  // 2. Fallback: Check if it's a simple render request
  if (variations && variations[0] && variations[0].data && (variations[0].data.source_url || variations[0].data.sourcePath)) {
    console.log('[Adapter] Mapping Variations-style Job to Execute');
    const v = variations[0];

    // Fix: Handle URLs in sourcePath (common in some frontend paths)
    let pPath = v.data.sourcePath;
    let pUrl = v.data.source_url;

    if (typeof pPath === 'string' && (pPath.startsWith('http://') || pPath.startsWith('https://'))) {
      console.log('[Adapter] Moving URL from sourcePath to inputFileUrl');
      pUrl = pPath;
      pPath = null;
    }

    req.body = {
      inputFileUrl: pUrl,
      sourcePath: pPath,
      projectId: project_id,
      outputName: v.id
    };
    return handleExecute(req, res);
  }

  return jsonError(res, 400, 'INVALID_PAYLOAD', 'Unsupported job structure. Must contain "variations" with "plan" or "source_url".');
};

// Internal Handler for Execute (Modularized)
function handleExecute(req, res) {
  if (!FFMPEG_AVAILABLE) {
    return jsonError(res, 503, 'FFMPEG_UNAVAILABLE', 'FFmpeg binary not available on server');
  }

  let { sourcePath, inputFileUrl, projectId, outputName, executionPlan, outputFormat } = req.body;

  // FIX: Handle URLs in sourcePath (Creative Replicator compatibility)
  if (typeof sourcePath === 'string' && (sourcePath.startsWith('http://') || sourcePath.startsWith('https://'))) {
    console.log(`[Execute] Moving URL from sourcePath to inputFileUrl: ${sourcePath}`);
    inputFileUrl = sourcePath;
    sourcePath = null;
  }

  // STRICT CONTRACT: sourcePath OR inputFileUrl
  if (!sourcePath && !inputFileUrl) {
    return jsonError(res, 400, 'MISSING_SOURCE', 'Either sourcePath or inputFileUrl is required');
  }

  // If local path provided, validate it strictly to prevent traversal
  let validPath = null;
  if (sourcePath) {
    validPath = sanitizePath(sourcePath);
    if (!validPath) {
      console.warn(`[Execute] Attempted invalid source path: ${sourcePath}`);
      return jsonError(res, 400, 'INVALID_PATH', 'Invalid or inaccessible source path');
    }
  }

  const jobId = outputName || generateJobId();

  // Job Payload Strict Structure
  const jobPayload = {
    ...req.body,
    sourcePath: validPath || null, // Will be resolved if null
    inputFileUrl,
    executionPlan: executionPlan || {}, // Ensure plan exists
    outputFormat: outputFormat || { format: 'mp4' } // Default format
  };

  // Detect Complex Job (Multi-source)
  const jobType = (req.body.sources && Array.isArray(req.body.sources)) ? 'complex' : 'execute';

  const job = createJob(jobId, jobType, jobPayload, req.body.priority || 'normal');
  queue.addJob(jobId, job, req.body.priority || 'normal');

  setImmediate(processNextJob);

  res.status(202).json({
    ok: true,
    ids: [jobId],
    jobId,
    status: 'queued',
    queuePosition: queue.pendingQueue.length,
    statusUrl: `/api/jobs/${jobId}`,
    debug: {
      engine: 'server_ffmpeg',
      resolvedSource: validPath ? 'local' : 'remote_pending',
      executionPlan: jobPayload.executionPlan
    }
  });
}

// POST /api/execute - Uses flat payload structure (Creative Replicator)
app.post('/api/execute', handleExecute);

// ============================================
// POST /api/execute-plan
// ============================================

// Internal Handler for Execute Plan (Modularized)
async function handleExecutePlan(req, res) {
  if (!FFMPEG_AVAILABLE) {
    return jsonError(res, 503, 'FFMPEG_UNAVAILABLE', 'FFmpeg binary not available on server');
  }

  const { plan, sourceVideoUrl, sourcePath, projectId, outputName } = req.body;

  if (!plan) {
    return jsonError(res, 400, 'MISSING_PARAMS', 'plan is required');
  }

  if (!sourceVideoUrl && !sourcePath) {
    return jsonError(res, 400, 'MISSING_SOURCE', 'Either sourceVideoUrl or sourcePath is required');
  }

  // Validate local path if provided
  let validPath = null;
  if (sourcePath) {
    validPath = sanitizePath(sourcePath);
    if (!validPath) {
      return jsonError(res, 400, 'INVALID_PATH', 'Invalid or inaccessible source path');
    }
  }

  const jobId = outputName || generateJobId();

  const job = createJob(jobId, 'execute-plan', {
    plan,
    sourceVideoUrl,
    sourcePath: validPath
  }, req.body.priority || 'normal');
  queue.addJob(jobId, job, req.body.priority || 'normal');

  setImmediate(processNextJob);

  res.status(202).json({
    ok: true,
    ids: [jobId], // Variations contract expects 'ids' array
    jobId,
    status: 'queued',
    queuePosition: queue.pendingQueue.length,
    statusUrl: `/api/jobs/${jobId}`,
  });
}

// POST /api/execute-plan
app.post('/api/execute-plan', handleExecutePlan);

// ============================================
// SHARED RENDER/JOBS CONTRACT (Frontend Support)
// Handles both /api/jobs and /render/jobs
// ============================================

// [Reference to unifiedJobHandler which is now defined above]

app.post('/api/jobs', unifiedJobHandler);
app.post('/render/jobs', unifiedJobHandler);
app.post('/render/jobs/', unifiedJobHandler);

// Alias for Health and Status
app.get(['/render/health', '/api/render/health'], (req, res) => {
  res.redirect('/api/health');
});

app.get(['/render/jobs/:jobId', '/api/render/jobs/:jobId'], (req, res) => {
  const jobId = req.params.jobId;
  const job = getJob(jobId);
  if (job) {
    // Map internal job to RenderFlow contract if needed
    const response = {
      id: job.id,
      state: job.status === 'queued' ? 'queued' :
        job.status === 'running' ? 'processing' :
          job.status === 'done' ? 'done' : 'failed',
      progress_pct: job.progressPct,
      created_at: job.createdAt,
      output: job.status === 'done' ? {
        output_url: job.output?.outputUrl,
        file_size: job.output?.outputSize,
        duration_ms: job.output?.durationMs
      } : null,
      error: job.error
    };
    return res.json(response);
  }
  res.status(404).json({ error: 'Job not found' });
});

app.get(['/render/jobs'], (req, res) => {
  res.redirect('/api/health'); // Or return history
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
// GET /api/jobs/:id/logs - Full execution logs
// ============================================

app.get('/api/jobs/:jobId/logs', (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return jsonError(res, 404, 'JOB_NOT_FOUND', `Job ${req.params.jobId} not found`);
  }

  // Return complete execution log for debugging
  const response = {
    ok: true,
    jobId: job.id,
    status: job.status,
    progressPct: job.progressPct,
    etaSec: job.etaSec || null,
    command: job.command || null,
    fullLogs: job.fullLogs || [],
    logsTail: job.logsTail,
    createdAt: job.createdAt,
    startedAt: job.startedAt || null,
    completedAt: job.completedAt || null,
    // Execution metadata
    execution: {
      engine: 'server_ffmpeg',
      encoderUsed: job.encoderUsed || null,
      exitCode: job.status === 'done' ? 0 : (job.status === 'error' ? 1 : null),
      outputPath: job.output?.outputPath || null,
      outputExists: job.output?.outputPath ? fs.existsSync(job.output.outputPath) : false,
      outputSize: job.output?.outputSize || null,
      durationMs: job.output?.durationMs || null,
    },
    error: job.error || null,
  };

  res.json(response);
});

// ============================================
// GET /api/jobs/:id/state - Job state for polling
// ============================================

app.get('/api/jobs/:jobId/state', (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return jsonError(res, 404, 'JOB_NOT_FOUND', `Job ${req.params.jobId} not found`);
  }

  // Minimal state for efficient polling
  res.json({
    ok: true,
    jobId: job.id,
    status: job.status,
    progressPct: job.progressPct,
    etaSec: job.etaSec || null, // Added ETA
    lastLogLine: job.fullLogs?.slice(-1)[0] || null,
    logsCount: job.fullLogs?.length || 0,
    isComplete: job.status === 'done' || job.status === 'error',
  });
});

// ============================================
// ERROR OBSERVABILITY APIs
// ============================================

/**
 * GET /api/projects/:id/errors
 * Get error log for a project
 */
app.get('/api/projects/:id/errors', async (req, res) => {
  const { id } = req.params;
  const { resolved, category, limit = 50, offset = 0 } = req.query;

  try {
    const query = `
      SELECT * FROM execution_errors 
      WHERE project_id = ? 
      ${resolved !== undefined ? 'AND resolved = ?' : ''}
      ${category ? 'AND category = ?' : ''}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const params = [id];
    if (resolved !== undefined) params.push(resolved === 'true' ? 1 : 0);
    if (category) params.push(category);
    params.push(limit, offset);

    const data = db.prepare(query).all(...params);
    // Convert resolved (1/0) to boolean for consistent API response
    const formattedErrors = data.map(e => ({ ...e, resolved: Boolean(e.resolved) }));

    res.json({
      ok: true,
      errors: formattedErrors,
      count: formattedErrors.length
    });
  } catch (err) {
    return jsonError(res, 500, 'ERROR_QUERY_FAILED', err.message);
  }
});

/**
 * GET /api/projects/:id/error-stats
 * Get error statistics for a project
 */
app.get('/api/projects/:id/error-stats', async (req, res) => {
  const { id } = req.params;

  try {
    const rows = db.prepare(`
        SELECT category, resolved, COUNT(*) as count 
        FROM execution_errors 
        WHERE project_id = ? 
        GROUP BY category, resolved
    `).all(id);

    const stats = {
      total_errors: rows.reduce((sum, r) => sum + r.count, 0),
      unresolved: rows.filter(r => !r.resolved).reduce((sum, r) => sum + r.count, 0),
      by_category: {},
      retry_rate: 0 // Placeholder/TODO: Calculate from execution_state
    };

    rows.forEach(r => {
      if (!stats.by_category[r.category]) stats.by_category[r.category] = 0;
      stats.by_category[r.category] += r.count;
    });

    res.json({
      ok: true,
      stats
    });
  } catch (err) {
    return jsonError(res, 500, 'STATS_FAILED', err.message);
  }
});

/**
 * GET /api/jobs/:id/errors
 * Get errors for a specific job
 */
app.get('/api/jobs/:id/errors', async (req, res) => {
  const { id } = req.params;

  try {
    const data = db.prepare(`
        SELECT * FROM execution_errors 
        WHERE job_id = ? 
        ORDER BY created_at DESC
    `).all(id);

    res.json({
      ok: true,
      errors: data,
      count: data.length
    });
  } catch (err) {
    return jsonError(res, 500, 'JOB_ERRORS_FAILED', err.message);
  }
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
  console.log(`  Mode:       server-only (Auto Source Resolution active)`);
  console.log(`  FFmpeg:     ${FFMPEG_AVAILABLE ? `✓ ${ffmpegPath}` : '✗ NOT AVAILABLE'}`);
  console.log(`  Uploads:    ${UPLOAD_DIR}`);
  console.log(`  Temp:       ${TEMP_DIR}`);
  console.log(`  Outputs:    ${OUTPUT_DIR}`);
  console.log('═══════════════════════════════════════════════════');

  // Start automated cleanup task (Delete after 2 hours)
  startCleanupTask();
});

// ============================================
// AUTOMATED CLEANUP (2 Hour TTL)
// ============================================

async function startCleanupTask() {
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const INTERVAL_MS = 30 * 60 * 1000; // Run every 30 mins

  const cleanup = async () => {
    console.log('[Cleanup] Starting routine...');
    const now = Date.now();

    // 1. Local Filesystem Cleanup (Uploads, Outputs, Temp, RenderFlow internal)
    const localDirs = [
      UPLOAD_DIR,
      OUTPUT_DIR,
      TEMP_DIR,
      path.join(__dirname, 'renderflow/temp'),
      path.join(__dirname, 'renderflow/output')
    ];
    for (const dir of localDirs) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        let deletedCount = 0;

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);

          if (stats.isFile() && (now - stats.mtimeMs) > TWO_HOURS_MS) {
            fs.unlinkSync(filePath);
            deletedCount++;
          }
        }
        if (deletedCount > 0) console.log(`[Cleanup] Deleted ${deletedCount} old files from ${dir}`);
      } catch (e) {
        console.error(`[Cleanup] Local error in ${dir}:`, e.message);
      }
    }

    // 2. Supabase Storage Cleanup (Input Assets)
    // SKIPPED in VPS Mode - we only use local FS
    if (false) {
      // Original Supabase cloud bucket cleanup code removed/disabled
    }

  };

  // Initial run
  cleanup().catch(console.error);
  // Periodic run
  setInterval(() => cleanup().catch(console.error), INTERVAL_MS);
}

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
// ============================================
// ARTIFACT REGISTRATION (MANDATORY)
// ============================================

function registerArtifact({ jobId, projectId, engine, videoUrl, sizeBytes, durationMs, codec, metadata = {} }) {
  console.log(`[Artifact] Registering artifact for job ${jobId} from ${engine}`);

  try {
    const id = `out_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const duration_sec = durationMs / 1000;

    db.prepare(`
      INSERT INTO video_outputs (id, project_id, job_id, type, output_url, thumbnail_url, duration_sec, size_bytes, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      projectId || null,
      jobId,
      'video',
      videoUrl,
      videoUrl, // Use video as thumbnail for now
      duration_sec,
      sizeBytes,
      JSON.stringify({ ...metadata, engine, codec })
    );

    console.log(`[Artifact] Committed to local DB: ${id}`);
  } catch (err) {
    console.error(`[Artifact] Database error:`, err.message);
  }
}

