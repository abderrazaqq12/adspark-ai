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

        const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`; // We will mount this

        res.json({
            url: fileUrl,
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

// GET /render/jobs/:id
router.get('/jobs/:id', (req: Request, res: Response) => {
    try {
        const status = JobManager.getJobStatus(req.params.id);
        if (!status) return res.status(404).json({ error: 'Job not found' });
        res.json(status);
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
            state: row.state,
            progress_pct: row.progress_pct,
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

export const apiRouter = router;
