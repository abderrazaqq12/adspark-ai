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

// Mount API
app.use('/render', apiRouter);

// Serve Outputs
app.use('/outputs', express.static(PATHS.OUTPUT));

// Start Worker
const engine = new RenderEngine();
engine.start();

app.listen(PORT, () => {
    console.log(`[RenderFlow] Server running on http://localhost:${PORT}`);
    console.log(`[RenderFlow] Persistence: ${path.join(PATHS.DATA, 'renderflow.db')}`);
});
