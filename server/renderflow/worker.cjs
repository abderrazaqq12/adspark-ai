const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const db = require('./db.cjs');

const TEMP_DIR = path.join(__dirname, 'temp');
const OUTPUT_DIR = path.join(__dirname, 'output');

// Ensure directories exist
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function processJob(job) {
    const logFile = path.join(TEMP_DIR, `${job.id}_ffmpeg.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    logStream.write(`[${new Date().toISOString()}] Job ${job.id} started.\n`);
    logStream.write(`Source: ${job.data.source_url}\n`);
    logStream.write(`Target: ${job.data.output_format} (${job.data.resolution})\n`);

    try {
        // 1. Determine Output Path
        // Assuming output format is strict (mp4, webm, gif)
        const outputFilename = `${job.id}.${job.data.output_format}`;
        const outputPath = path.join(OUTPUT_DIR, outputFilename);

        // 2. Build FFmpeg Arguments
        const [width, height] = job.data.resolution.split('x');
        if (!width || !height) throw new Error(`Invalid resolution format: ${job.data.resolution}`);

        const args = [
            '-y', // Overwrite output
            '-i', job.data.source_url, // Input
            '-vf', `scale=${width}:${height}`, // Scale filter
            '-c:a', 'copy', // Copy audio if possible
            outputPath
        ];

        logStream.write(`Executing: ffmpeg ${args.join(' ')}\n`);

        // 3. Spawn FFmpeg
        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', args);

            ffmpeg.stdout.on('data', (data) => {
                logStream.write(data);
            });

            ffmpeg.stderr.on('data', (data) => {
                logStream.write(data);
            });

            ffmpeg.on('close', (code) => {
                logStream.write(`[${new Date().toISOString()}] FFmpeg exited with code ${code}\n`);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            ffmpeg.on('error', (err) => {
                logStream.write(`[${new Date().toISOString()}] Spawn error: ${err.message}\n`);
                reject(err);
            });
        });

        // 4. Success- Mark as done
        db.completeJob(job.id, outputFilename);

        logStream.write(`[${new Date().toISOString()}] Job completed successfully.\n`);

    } catch (err) {
        console.error(`Job ${job.id} failed:`, err);
        logStream.write(`[${new Date().toISOString()}] Job Failed: ${err.message}\n`);
        logStream.write(`Stack: ${err.stack}\n`);

        db.failJob(job.id, err.message);
    } finally {
        logStream.end();
    }
}

/**
 * Single iteration of the worker loop.
 */
async function workerTick() {
    try {
        const job = db.claimJob();
        if (job) {
            console.log(`Worker: Claimed job ${job.id}`);
            await processJob(job);
        }
    } catch (err) {
        // CRITICAL: Worker loop must never crash
        console.error('Worker Loop Error:', err);
    }
}

let intervalId = null;

function startWorker(intervalMs = 2000) {
    if (intervalId) return;
    console.log(`Starting RenderFlow Worker (poll interval: ${intervalMs}ms)`);

    // Initial tick
    workerTick();

    intervalId = setInterval(workerTick, intervalMs);
}

module.exports = { startWorker };
