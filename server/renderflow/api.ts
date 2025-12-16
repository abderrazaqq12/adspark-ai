import { Router } from 'express';
import { JobManager } from './manager';

const router = Router();

// POST /render/jobs
router.post('/jobs', (req, res) => {
    try {
        const { project_id, variations } = req.body;

        if (!project_id || !Array.isArray(variations) || variations.length === 0) {
            return res.status(400).json({ error: 'Invalid payload: project_id and variations[] required' });
        }

        const createdJobs = [];

        for (const variation of variations) {
            // Strict: One Job Per Variation
            const input = {
                project_id,
                variation_id: variation.id,
                ...variation.data
            };

            const job = JobManager.createJob(input);
            createdJobs.push({
                id: job.id,
                variation_id: job.variation_id,
                status: job.state
            });
        }

        res.status(202).json({
            data: {
                jobs: createdJobs
            }
        });

    } catch (err: any) {
        console.error('API Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /render/jobs/:id
router.get('/jobs/:id', (req, res) => {
    const status = JobManager.getJobStatus(req.params.id);
    if (!status) return res.status(404).json({ error: 'Job not found' });
    res.json(status);
});

// GET /render/jobs/:id/logs
// v1: Simple logs not implemented in DB text column to avoid bloat, 
// using generic message for now or implement file reading if needed. 
// For strict "boringness", we stick to status. 
// If logs are critical requirement, we would read from a log file.
router.get('/jobs/:id/logs', (req, res) => {
    // Placeholder
    res.json({ logs: [] });
});

export const apiRouter = router;
