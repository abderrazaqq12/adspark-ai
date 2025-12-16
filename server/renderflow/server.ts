import express from 'express';
import cors from 'cors';
import { RenderEngine } from './engine';
import { apiRouter } from './api';
import path from 'path';
import { PATHS } from './utils';

const PORT = 3001;
const app = express();

app.use(cors());
app.use(express.json());

import fs from 'fs';

// Ensure Directories Exist
[PATHS.DATA, PATHS.OUTPUT, PATHS.TEMP].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[RenderFlow] Created directory: ${dir}`);
    }
});

// Mount API (Support both Nginx proxy /api and internal /render)
app.use('/api', apiRouter);
app.use('/render', apiRouter);

// Serve Outputs
app.use('/outputs', express.static(PATHS.OUTPUT));
// Serve Uploads (Temp) for local worker access via URL simulation or UI preview
app.use('/uploads', express.static(PATHS.TEMP));

// Start Worker
const engine = new RenderEngine();
engine.start();

app.listen(PORT, () => {
    console.log(`[RenderFlow] Server running on http://localhost:${PORT}`);
    console.log(`[RenderFlow] Persistence: ${path.join(PATHS.DATA, 'renderflow.db')}`);
});
