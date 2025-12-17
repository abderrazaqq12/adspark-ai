import { Router, Request, Response } from 'express';
import { JobManager } from './manager';
import { RenderFlowDB } from './db';
import { PATHS } from './utils';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const multer = require('multer');

const router = Router();


// Configure Multer for Strict Uploads
const storage = multer.diskStorage({
    destination: (req: any, file: any, cb: any) => {
        // Ensure directory exists? (It should, server starts with sync check)
        // Using PATHS.TEMP or dedicated Uploads?
        // Let's use PATHS.TEMP for raw uploads before processing
        cb(null, PATHS.TEMP);
    },
    filename: (req: any, file: any, cb: any) => {
        // Secure filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'rf_' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB Explicit Limit
});

// POST /render/upload (Strict Direct Endpoint)
router.post('/upload', upload.single('file'), (req: any, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`[RenderFlow API] Uploaded: ${req.file.filename} (${req.file.size} bytes)`);

        // Return URL accessible by Worker
        // In this architecture, Worker shares FS with API.
        // We return a "source_url" that the worker can understand.
        // If Worker is local, file path is best? 
        // Or a public URL if we serve it static?
        // server.ts mounts /outputs, but does it mount /temp?
        // We should PROBABLY move it to a clean "inputs" dir or just use full path.
        // For "Boring / Deterministic", full path or relative path is fine.
        // UI wizard expects a URL to show?
        // User Requirement: "Step 1: Source Video URL or Upload". "Option A: Source Video URL"
        // If we upload, we get a URL/Path.
        // Let's return the full path for now, or a served URL if we add static mount.
        // Let's add static mount for temp in server.ts if needed.

        // Return full path for internal use, and a web-friendly URL if possible.
        // For V1 independent, let's return a "file://" URI or just the filename to be resolved?
        // Engine expects `source_url`. Engine `download()` handles http/https/file?
        // Let's check Engine.

        const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
        const filePath = path.resolve(req.file.path);

        res.json({
            ok: true,
            url: fileUrl,
            filePath: filePath, // Frontend expects this
            filename: req.file.filename,
            size: req.file.size
        });

    } catch (err: any) {
        console.error('[RenderFlow API] Upload Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /render/jobs
router.post('/jobs', (req: Request, res: Response) => {
    try {
        console.log('[RenderFlow API] POST /jobs payload:', JSON.stringify(req.body).slice(0, 200));

        const { project_id, variations } = req.body;

        if (!Array.isArray(variations) || variations.length === 0) {
            console.warn('[RenderFlow API] Missing variations');
            return res.status(400).json({ error: 'Invalid payload: variations[] required' });
        }

        const createdJobs: string[] = [];

        for (const variation of variations) {
            try {
                // Strict: One Job Per Variation
                const input = {
                    project_id: project_id || 'anonymous',
                    variation_id: variation.id,
                    ...variation.data
                };

                const job = JobManager.createJob(input);
                createdJobs.push(job.id);
            } catch (innerErr) {
                console.error('[RenderFlow API] Failed to create job for variation:', variation.id, innerErr);
            }
        }

        console.log(`[RenderFlow API] Created ${createdJobs.length} jobs`);

        // Return IDs for Wizard
        res.status(202).json({
            ids: createdJobs
        });

    } catch (err: any) {
        console.error('[RenderFlow API] Global Error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// GET /render/jobs/:id/logs
router.get('/jobs/:id/logs', (req: Request, res: Response) => {
    try {
        const job = JobManager.getJob(req.params.id);
        if (!job) {
            return res.status(410).json({
                code: "JOB_EXPIRED_OR_INVALID",
                message: "Render job no longer exists"
            });
        }

        res.json({
            jobId: job.id,
            status: job.state,
            command: 'ffmpeg ...', // TODO: Capture command in DB too? Engine prints it but doesn't store in DB yet.
            fullLogs: job.full_logs || [],
            execution: {
                engine: 'unified_ffmpeg',
                encoderUsed: 'libx264', // Default
                exitCode: job.state === 'done' ? 0 : (job.state === 'failed' ? 1 : null),
                outputExists: !!job.output,
                outputSize: job.output?.file_size,
                durationMs: job.output?.duration_ms
            },
            error: job.error,
            createdAt: job.created_at,
            startedAt: job.started_at,
            completedAt: job.completed_at
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /render/jobs/:id
router.get('/jobs/:id', (req: Request, res: Response) => {
    try {
        const job = JobManager.getJob(req.params.id);
        if (!job) {
            return res.status(410).json({
                code: "JOB_EXPIRED_OR_INVALID",
                message: "Render job no longer exists"
            });
        }

        // Map to legacy frontend format
        res.json({
            ok: true,
            jobId: job.id,
            status: job.state, // state -> status
            progressPct: job.progress_pct, // progress_pct -> progressPct
            outputUrl: job.output?.output_url,
            outputSize: job.output?.file_size,
            error: job.error
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /render/jobs (List)
router.get('/jobs', (req: Request, res: Response) => {
    try {
        // Direct DB Query for List
        const dbPath = path.join(PATHS.DATA, 'renderflow.db');
        const db = new Database(dbPath);

        const rows = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50').all();

        const jobs = rows.map((row: any) => ({
            id: row.id,
            status: row.state,
            progressPct: row.progress_pct,
            created_at: row.created_at,
            error: row.error_json ? JSON.parse(row.error_json) : undefined,
            output: row.output_json ? JSON.parse(row.output_json) : undefined
        }));

        res.json({ jobs });
    } catch (e: any) {
        console.error('[RenderFlow API] List Error:', e);
        res.status(500).json({ error: 'Failed to list jobs' });
    }
});

// GET /health
router.get('/health', async (req: Request, res: Response) => {
    res.json({ status: 'ok', worker: 'active' });
});


// POST /render/execute (Legacy Adapter)
// Supports simple single-file render operations
router.post('/execute', (req: Request, res: Response) => {
    try {
        console.log('[RenderFlow API] POST /execute adapter');
        const { sourcePath, trim, resize, outputName } = req.body;

        if (!sourcePath) return res.status(400).json({ error: 'Missing sourcePath' });

        // Auto-Generate a simple Plan from legacy options
        const plan = {
            output_format: {
                width: resize?.width || 1080, // Default to 1080p vertical
                height: resize?.height || 1920,
                container: 'mp4'
            },
            timeline: [
                {
                    asset_url: sourcePath,
                    type: 'video',
                    timeline_start_ms: 0,
                    // Basic trim mapping
                    trim_start_ms: (trim?.start || 0) * 1000,
                    trim_end_ms: trim?.end ? trim.end * 1000 : undefined
                }
            ],
            audio_tracks: []
        };

        const job = JobManager.createJob({
            project_id: 'legacy_execute',
            variation_id: 'legacy_' + Date.now(),
            plan: plan,
            sourceVideoUrl: sourcePath, // Backup for downloader
            outputName: outputName
        });

        res.json({
            ok: true,
            jobId: job.id,
            status: 'queued',
            queuePosition: 1,
            statusUrl: `/api/jobs/${job.id}`
        });

    } catch (err: any) {
        console.error('[RenderFlow API] Execute Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /render/execute-plan (Legacy Adapter)
// Supports full ExecutionPlan
router.post('/execute-plan', (req: Request, res: Response) => {
    try {
        console.log('[RenderFlow API] POST /execute-plan adapter');
        const { plan, sourceVideoUrl, outputName } = req.body;

        if (!plan) {
            return res.status(400).json({ error: 'Missing plan' });
        }

        // Map ExecutionPlan to Job
        // engine.ts expects job.input.plan
        const job = JobManager.createJob({
            project_id: 'legacy_plan',
            variation_id: 'plan_' + Date.now(),
            source_url: sourceVideoUrl,
            plan: plan,
            outputName: outputName
        });

        res.json({
            ok: true,
            jobId: job.id,
            status: 'queued',
            queuePosition: 1,
            statusUrl: `/api/jobs/${job.id}`
        });

    } catch (err: any) {
        console.error('[RenderFlow API] ExecutePlan Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /debug/create-job (Manual Lifecycle Test)
router.post('/debug/create-job', (req: Request, res: Response) => {
    try {
        console.log('[RenderFlow API] POST /debug/create-job');
        const job = JobManager.createJob({
            project_id: 'debug_' + Date.now(),
            variation_id: 'debug_var',
            plan: {
                output_format: { container: 'mp4', width: 640, height: 360 },
                timeline: []
            }
        });

        // Immediately append a test log to verify persistence
        RenderFlowDB.appendLogs(job.id, 'Debug job created. Lifecycle check: PASS.');

        res.json({
            ok: true,
            jobId: job.id,
            status: 'queued',
            checkLogsUrl: `/api/jobs/${job.id}/logs`
        });
    } catch (err: any) {
        console.error('[RenderFlow API] Debug Job Failed:', err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

export const apiRouter = router;
