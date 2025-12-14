/**
 * FlowScale Server API - FFmpeg Rendering Backend
 * VPS Production Server - Node.js + Express + Native FFmpeg
 * 
 * Endpoints:
 *   POST /api/upload      - Upload video files
 *   POST /api/execute     - Execute FFmpeg on uploaded files
 *   POST /api/execute-plan - Execute full ExecutionPlan
 *   GET  /api/health      - Health check
 * 
 * Usage:
 *   npm install express multer uuid
 *   pm2 start server/api.js --name flowscale-api
 */

const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1'; // Only listen locally (Nginx proxies)
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/var/www/flowscale/outputs';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/var/www/flowscale/uploads';
const MAX_DURATION = 600; // 10 minutes max per job
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
];

// Ensure directories exist
[OUTPUT_DIR, UPLOAD_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================
// MULTER CONFIGURATION (Secure Upload)
// ============================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp + UUID
    const timestamp = Date.now();
    const uniqueId = uuidv4().split('-')[0];
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    // Sanitize: only allow alphanumeric, dash, underscore, dot
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '');
    const filename = `video_${timestamp}_${uniqueId}${safeExt}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`), false);
  }
  
  // Check for path traversal in filename
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(new Error('Invalid filename: path traversal detected'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only one file per request
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

// ============================================
// UPLOAD ENDPOINT
// ============================================

app.post('/api/upload', (req, res) => {
  upload.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          ok: false,
          error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          ok: false,
          error: 'Only one file per request allowed',
        });
      }
      return res.status(400).json({
        ok: false,
        error: err.message,
      });
    }
    
    if (err) {
      return res.status(400).json({
        ok: false,
        error: err.message,
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: 'No video file provided. Use field name "video"',
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
// FFMPEG EXECUTION
// ============================================

function executeFFmpeg(args, outputPath, timeoutSec = MAX_DURATION) {
  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg] Starting: ffmpeg ${args.join(' ')}`);
    
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stderr = '';
    let killed = false;

    const timeout = setTimeout(() => {
      killed = true;
      ffmpeg.kill('SIGKILL');
      reject(new Error(`FFmpeg timeout after ${timeoutSec}s`));
    }, timeoutSec * 1000);

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', (code) => {
      clearTimeout(timeout);
      
      if (killed) return;

      if (code === 0) {
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          resolve({
            success: true,
            outputPath,
            size: stats.size,
          });
        } else {
          reject(new Error('FFmpeg completed but output file not found'));
        }
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

function buildFFmpegArgs(plan) {
  const args = ['-y'];
  args.push('-i', plan.sourcePath);

  if (plan.trim) {
    if (plan.trim.start > 0) {
      args.push('-ss', String(plan.trim.start));
    }
    if (plan.trim.end) {
      args.push('-t', String(plan.trim.end - (plan.trim.start || 0)));
    }
  }

  if (plan.speed && plan.speed !== 1.0) {
    const videoFilter = `setpts=${1/plan.speed}*PTS`;
    const audioFilter = `atempo=${plan.speed}`;
    args.push('-filter_complex', `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`);
    args.push('-map', '[v]', '-map', '[a]');
  }

  if (plan.resize) {
    args.push('-vf', `scale=${plan.resize.width}:${plan.resize.height}`);
  }

  args.push('-c:v', 'libx264');
  args.push('-c:a', 'aac');
  args.push('-preset', 'fast');
  args.push('-crf', '23');
  args.push('-movflags', '+faststart');

  return args;
}

// ============================================
// EXECUTE ENDPOINT
// ============================================

app.post('/api/execute', async (req, res) => {
  try {
    const body = req.body;

    if (!body.sourcePath) {
      return res.status(400).json({ error: 'sourcePath is required' });
    }

    // Security: Validate path is within allowed directories
    const normalizedPath = path.normalize(body.sourcePath);
    if (!normalizedPath.startsWith(UPLOAD_DIR) && !normalizedPath.startsWith('/var/www/flowscale')) {
      return res.status(400).json({ error: 'Invalid source path' });
    }

    if (!fs.existsSync(body.sourcePath)) {
      return res.status(400).json({ error: `Source file not found: ${body.sourcePath}` });
    }

    const jobId = body.outputName || `job-${Date.now()}`;
    const outputFilename = `${jobId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    const args = buildFFmpegArgs(body);
    args.push(outputPath);

    const startTime = Date.now();
    const result = await executeFFmpeg(args, outputPath);
    const processingTime = Date.now() - startTime;

    console.log(`[FFmpeg] Complete: ${outputFilename} (${result.size} bytes, ${processingTime}ms)`);

    res.json({
      success: true,
      jobId,
      outputPath: `/outputs/${outputFilename}`,
      outputUrl: `/outputs/${outputFilename}`,
      size: result.size,
      processingTimeMs: processingTime,
    });

  } catch (error) {
    console.error('[FFmpeg] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// EXECUTE PLAN ENDPOINT (Full ExecutionPlan)
// ============================================

app.post('/api/execute-plan', async (req, res) => {
  try {
    const { plan, sourceVideoUrl, outputName } = req.body;

    if (!plan || !sourceVideoUrl) {
      return res.status(400).json({ error: 'plan and sourceVideoUrl are required' });
    }

    // Security: Validate path
    const normalizedPath = path.normalize(sourceVideoUrl);
    if (!normalizedPath.startsWith(UPLOAD_DIR) && !normalizedPath.startsWith('/var/www/flowscale')) {
      return res.status(400).json({ error: 'Invalid source path' });
    }

    if (!fs.existsSync(sourceVideoUrl)) {
      return res.status(400).json({ error: `Source file not found: ${sourceVideoUrl}` });
    }

    const jobId = outputName || `plan-${Date.now()}`;
    const outputFilename = `${jobId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    const args = ['-y', '-i', sourceVideoUrl];
    const filters = [];

    if (plan.timeline && plan.timeline.length > 0) {
      const segment = plan.timeline[0];
      
      if (segment.trim_start_ms > 0 || segment.trim_end_ms < segment.source_duration_ms) {
        const startSec = segment.trim_start_ms / 1000;
        const endSec = segment.trim_end_ms / 1000;
        args.splice(1, 0, '-ss', String(startSec), '-t', String(endSec - startSec));
      }

      if (segment.speed_multiplier !== 1.0) {
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

    const startTime = Date.now();
    const result = await executeFFmpeg(args, outputPath);
    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      status: 'success',
      engine_used: 'server_ffmpeg',
      jobId,
      output_video_url: `/outputs/${outputFilename}`,
      video_url: `/outputs/${outputFilename}`,
      size: result.size,
      processing_time_ms: processingTime,
    });

  } catch (error) {
    console.error('[ExecutePlan] Error:', error.message);
    res.status(500).json({
      success: false,
      status: 'failed',
      error: error.message,
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  const ffprobe = spawn('ffmpeg', ['-version']);
  
  ffprobe.on('close', (code) => {
    if (code === 0) {
      res.json({ 
        status: 'healthy', 
        ffmpeg: 'available',
        uploadDir: UPLOAD_DIR,
        outputDir: OUTPUT_DIR,
        maxFileSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({ 
        status: 'unhealthy', 
        ffmpeg: 'not available',
      });
    }
  });
  
  ffprobe.on('error', () => {
    res.status(500).json({ 
      status: 'unhealthy', 
      ffmpeg: 'not installed',
    });
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, HOST, () => {
  console.log(`[FlowScale API] Server running at http://${HOST}:${PORT}`);
  console.log(`[FlowScale API] Upload directory: ${UPLOAD_DIR}`);
  console.log(`[FlowScale API] Output directory: ${OUTPUT_DIR}`);
  console.log(`[FlowScale API] Max file size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[FlowScale API] Shutting down...');
  process.exit(0);
});
