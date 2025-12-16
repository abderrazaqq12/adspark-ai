import { Router } from 'express';
import { JobManager } from './manager';
import { RenderFlowDB } from './db'; // Direct DB access if needed for list

const router = Router();

// POST /render/jobs
router.post('/jobs', (req, res) => {
    try {
        console.log('[RenderFlow API] POST /jobs payload:', JSON.stringify(req.body).slice(0, 200));

        const { project_id, variations } = req.body;

        if (!Array.isArray(variations) || variations.length === 0) {
            console.warn('[RenderFlow API] Missing variations');
            return res.status(400).json({ error: 'Invalid payload: variations[] required' });
        }

        const createdJobs = [];

        for (const variation of variations) {
            try {
                // Strict: One Job Per Variation
                const input = {
                    project_id: project_id || 'anonymous',
                    variation_id: variation.id,
                    ...variation.data
                };

                const job = JobManager.createJob(input);
                createdJobs.push(job.id); // Return just IDs as per agreement with UI Wizard?
                // Wait, UI Wizard expects { ids: [...] } or { jobs: [...] }?
                // Adapter (api.js) returns `rfData`.
                // UI Wizard (Step 363): const ids = res.ids || [];
            } catch (innerErr) {
                console.error('[RenderFlow API] Failed to create job for variation:', variation.id, innerErr);
                // Continue best effort?
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
router.get('/jobs/:id', (req, res) => {
    try {
        const status = JobManager.getJobStatus(req.params.id);
        if (!status) return res.status(404).json({ error: 'Job not found' });
        res.json(status);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /render/jobs (List)
router.get('/jobs', (req, res) => {
    try {
        // Direct DB Query for List
        const db = require('better-sqlite3')(require('path').join(__dirname, 'data/renderflow.db'));
        const rows = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT 50').all();

        const jobs = rows.map((row: any) => ({
            id: row.id,
            state: row.state,
            progress_pct: row.progress_pct, // Ensure snake_case matching UI
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
router.get('/health', async (req, res) => {
    res.json({ status: 'ok', worker: 'active' });
});

export const apiRouter = router;
