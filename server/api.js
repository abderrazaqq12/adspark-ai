/**
 * FlowScale Server API - FFmpeg Rendering Backend
 * VPS Production Server - Node.js + Native FFmpeg
 * 
 * Usage:
 *   pm2 start server/api.js --name flowscale-api
 *   pm2 save
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1'; // Only listen locally (Nginx proxies)
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/var/www/flowscale/outputs';
const MAX_DURATION = 600; // 10 minutes max per job

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse JSON body from request
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Send JSON response
 */
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Execute FFmpeg command with timeout
 */
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
        // Verify output exists
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

/**
 * Build FFmpeg arguments from execution plan
 */
function buildFFmpegArgs(plan) {
  const args = ['-y']; // Overwrite output

  // Input file
  args.push('-i', plan.sourcePath);

  // Trim
  if (plan.trim) {
    if (plan.trim.start > 0) {
      args.push('-ss', String(plan.trim.start));
    }
    if (plan.trim.end) {
      args.push('-t', String(plan.trim.end - (plan.trim.start || 0)));
    }
  }

  // Speed change
  if (plan.speed && plan.speed !== 1.0) {
    const videoFilter = `setpts=${1/plan.speed}*PTS`;
    const audioFilter = `atempo=${plan.speed}`;
    args.push('-filter_complex', `[0:v]${videoFilter}[v];[0:a]${audioFilter}[a]`);
    args.push('-map', '[v]', '-map', '[a]');
  }

  // Resize
  if (plan.resize) {
    args.push('-vf', `scale=${plan.resize.width}:${plan.resize.height}`);
  }

  // Output format
  args.push('-c:v', 'libx264');
  args.push('-c:a', 'aac');
  args.push('-preset', 'fast');
  args.push('-crf', '23');
  args.push('-movflags', '+faststart');

  return args;
}

/**
 * Handle POST /api/execute
 */
async function handleExecute(req, res) {
  try {
    const body = await parseBody(req);

    // Validate required fields
    if (!body.sourcePath) {
      return sendJSON(res, 400, { error: 'sourcePath is required' });
    }

    // Verify source file exists
    if (!fs.existsSync(body.sourcePath)) {
      return sendJSON(res, 400, { error: `Source file not found: ${body.sourcePath}` });
    }

    // Generate output filename
    const jobId = body.outputName || `job-${Date.now()}`;
    const outputFilename = `${jobId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    // Build FFmpeg command
    const args = buildFFmpegArgs(body);
    args.push(outputPath);

    // Execute FFmpeg
    const startTime = Date.now();
    const result = await executeFFmpeg(args, outputPath);
    const processingTime = Date.now() - startTime;

    console.log(`[FFmpeg] Complete: ${outputFilename} (${result.size} bytes, ${processingTime}ms)`);

    sendJSON(res, 200, {
      success: true,
      jobId,
      outputPath: `/outputs/${outputFilename}`,
      outputUrl: `/outputs/${outputFilename}`,
      size: result.size,
      processingTimeMs: processingTime,
    });

  } catch (error) {
    console.error('[FFmpeg] Error:', error.message);
    sendJSON(res, 500, {
      success: false,
      error: error.message,
    });
  }
}

/**
 * Handle POST /api/execute-plan (Full ExecutionPlan support)
 */
async function handleExecutePlan(req, res) {
  try {
    const body = await parseBody(req);
    const { plan, sourceVideoUrl, outputName } = body;

    if (!plan || !sourceVideoUrl) {
      return sendJSON(res, 400, { error: 'plan and sourceVideoUrl are required' });
    }

    // Download source video if URL
    let sourcePath = sourceVideoUrl;
    if (sourceVideoUrl.startsWith('http')) {
      // For URLs, we'd need to download first
      // For now, expect local paths
      return sendJSON(res, 400, { error: 'Remote URLs not yet supported. Use local paths.' });
    }

    const jobId = outputName || `plan-${Date.now()}`;
    const outputFilename = `${jobId}.mp4`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    // Build complex FFmpeg filter from ExecutionPlan
    const args = ['-y', '-i', sourcePath];

    // Build filter complex from timeline
    const filters = [];
    if (plan.timeline && plan.timeline.length > 0) {
      const segment = plan.timeline[0];
      
      // Trim
      if (segment.trim_start_ms > 0 || segment.trim_end_ms < segment.source_duration_ms) {
        const startSec = segment.trim_start_ms / 1000;
        const endSec = segment.trim_end_ms / 1000;
        args.splice(1, 0, '-ss', String(startSec), '-t', String(endSec - startSec));
      }

      // Speed
      if (segment.speed_multiplier !== 1.0) {
        filters.push(`setpts=${1/segment.speed_multiplier}*PTS`);
      }
    }

    // Resize if needed
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

    sendJSON(res, 200, {
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
    sendJSON(res, 500, {
      success: false,
      status: 'failed',
      error: error.message,
    });
  }
}

/**
 * Health check
 */
function handleHealth(req, res) {
  // Check FFmpeg availability
  const ffprobe = spawn('ffmpeg', ['-version']);
  ffprobe.on('close', (code) => {
    if (code === 0) {
      sendJSON(res, 200, { 
        status: 'healthy', 
        ffmpeg: 'available',
        outputDir: OUTPUT_DIR,
        timestamp: new Date().toISOString(),
      });
    } else {
      sendJSON(res, 500, { 
        status: 'unhealthy', 
        ffmpeg: 'not available',
      });
    }
  });
  ffprobe.on('error', () => {
    sendJSON(res, 500, { 
      status: 'unhealthy', 
      ffmpeg: 'not installed',
    });
  });
}

/**
 * Request router
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers (not needed behind Nginx, but safe)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  try {
    if (pathname === '/api/execute' && req.method === 'POST') {
      await handleExecute(req, res);
    } else if (pathname === '/api/execute-plan' && req.method === 'POST') {
      await handleExecutePlan(req, res);
    } else if (pathname === '/api/health' && req.method === 'GET') {
      handleHealth(req, res);
    } else {
      sendJSON(res, 404, { error: 'Not found' });
    }
  } catch (error) {
    console.error('[Server] Unhandled error:', error);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[FlowScale API] Server running at http://${HOST}:${PORT}`);
  console.log(`[FlowScale API] Output directory: ${OUTPUT_DIR}`);
  console.log(`[FlowScale API] Max duration: ${MAX_DURATION}s`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[FlowScale API] Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
