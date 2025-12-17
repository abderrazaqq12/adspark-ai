const express = require('express');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const db = require('./db.cjs');
const { startWorker } = require('./worker.cjs');

// Configuration
const PORT = process.env.PORT || 3001;

// --- Strict Schema Definition (Matching job.schema.json) ---
// FAIL-FAST: No defaults allowed. All fields required.
const JobSchema = z.object({
    source_url: z.string().url({ message: "Invalid source_url" }),
    output_format: z.enum(['mp4', 'webm', 'gif'], {
        errorMap: () => ({ message: "Invalid or missing output_format. Must be 'mp4', 'webm', or 'gif'." })
    }),
    resolution: z.string().regex(/^\d+x\d+$/, { message: "Invalid resolution format. Expected WxH (e.g. 1920x1080)." }),
    webhook_url: z.string().url().optional(),
    metadata: z.record(z.any()).optional()
}).strict(); // Reject unknown keys

const app = express();

app.use(cors());
app.use(express.json());

// --- Routes ---

/**
 * POST /jobs
 * Submit a new render job.
 * Strict validation: 400 if invalid.
 */
app.post('/render/jobs', (req, res) => {
    try {
        // 1. Validate Payload
        const validatedData = JobSchema.parse(req.body);

        // 2. Generate ID
        const jobId = uuidv4();

        // 3. Persist to DB
        db.addJob(jobId, validatedData);

        // 4. Return Success
        res.status(200).json({
            id: jobId,
            status: 'pending',
            message: 'Job accepted'
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            // Return 400 Bad Request with Validation Details
            return res.status(400).json({
                error: 'Validation Error',
                details: err.errors.map(e => ({
                    field: e.path.join('.'),
                    message: e.message
                }))
            });
        }
        console.error("Internal Server Error:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

/**
 * GET /jobs/:id
 * Get job status and result.
 */
app.get('/render/jobs/:id', (req, res) => {
    const job = db.getJob(req.params.id);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    // Construct response
    const response = {
        id: job.id,
        status: job.status,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        output_path: job.output_path, // Filename or relative path
        error: job.error
    };

    res.json(response);
});

// Health Check
app.get('/health', (req, res) => {
    res.send('OK');
});

// --- Server Startup ---

const server = app.listen(PORT, () => {
    console.log(`RenderFlow v2 listening on port ${PORT}`);

    // Start the internal worker loop (Single Process Model)
    startWorker(2000);
});
