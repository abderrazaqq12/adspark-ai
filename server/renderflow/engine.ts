import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { RenderFlowDB } from './db';
import { Job, ERROR_CODES } from './types';
import { PATHS, sleep } from './utils';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const WORKER_PID = process.pid;
const POLL_INTERVAL_MS = 1000;
const MAX_RUNTIME_MS = 30 * 60 * 1000; // 30 Minutes Hard Cap
const STALL_THRESHOLD_MS = 30 * 1000; // 30s Stall

export class RenderEngine {
    private isRunning = false;
    private currentJob: Job | null = null;
    private watchdogTimer: NodeJS.Timeout | null = null;

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[RenderFlow] Worker ${WORKER_PID} started.`);

        // Initial recovery check
        RenderFlowDB.recoverOrphanedJobs();

        this.pollLoop();
    }

    private async pollLoop() {
        while (this.isRunning) {
            try {
                if (!this.currentJob) {
                    // ATOMIC CLAIM: Single DB call, no Select-then-Update in TS
                    const job = RenderFlowDB.claimNextJob(WORKER_PID);
                    if (job) {
                        console.log(`[RenderFlow] Claimed Job ${job.id}`);
                        this.currentJob = job;
                        await this.processJob(job);
                        this.currentJob = null;
                    }
                }
            } catch (err) {
                console.error('[RenderFlow] Poll Error:', err);
            }
            await sleep(POLL_INTERVAL_MS);
        }
    }

    private async processJob(job: Job) {
        // START WATCHDOG
        const startTime = Date.now();
        let ffmpegProcess: any = null;
        let isStalled = false;

        this.watchdogTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed > MAX_RUNTIME_MS) {
                console.error(`[RenderFlow] Job ${job.id} TIMED OUT`);
                if (ffmpegProcess) ffmpegProcess.kill('SIGKILL');

                RenderFlowDB.markFailed(job.id, {
                    code: ERROR_CODES.TIMEOUT,
                    message: `Job exceeded max runtime of ${MAX_RUNTIME_MS}ms`
                });
                this.resetInternalState(); // Force break via state reset
            }
        }, 5000);

        try {
            // 1. DOWNLOADING
            RenderFlowDB.updateState(job.id, 'downloading');
            const localInputParams = await this.downloadAssets(job);

            // 2. PROCESSING
            RenderFlowDB.updateState(job.id, 'processing');
            // (Any pre-calc logic here - v1 is simple pass-through)

            // 3. ENCODING
            RenderFlowDB.updateState(job.id, 'encoding');

            const outputFilename = `${job.id}.mp4`;
            const outputPath = path.join(PATHS.OUTPUT, outputFilename);

            // Build Command
            // Strict CPU: libx264
            const args = [
                '-y',
                '-progress', 'pipe:1',
                '-hide_banner',
                '-nostats',
                '-i', localInputParams.sourcePath,
                '-c:v', 'libx264',
                '-preset', 'medium', // Deterministic balance
                '-c:a', 'aac',
                outputPath
            ];

            // Filters
            if (localInputParams.trim) {
                // Note: Input seeking is faster but requires separate duration calc logic
                // For v1 safety, we put trim args BEFORE input if possible or rely on filters
                // To stay "boring", let's standard filter trim if needed, 
                // but -ss before -i is better for strict Seeking.
                // Simplicity: Apply -ss/t if present
                if (localInputParams.trim.start) args.unshift('-ss', String(localInputParams.trim.start));
                if (localInputParams.trim.end) args.unshift('-t', String(localInputParams.trim.end - localInputParams.trim.start));
            }

            console.log(`[RenderFlow] Spawning FFmpeg: ffmpeg ${args.join(' ')}`);

            ffmpegProcess = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

            // PROGRESS PARSING
            let totalDurationMs = 0;
            // Heuristic: Probe duration first? Or assume metadata in stdout?
            // FFmpeg pipe:1 often doesn't give total duration easily in simple mode.
            // We will perform a quick probe or rely on existing knowledge. 
            // For v1 strictness: Let's assume input has duration.
            // We can use a separate probe, OR parse 'Duration: ...' from stderr startup.

            // Parsing State
            let lastProgressUpdate = Date.now();

            const stdoutStream = ffmpegProcess.stdout;
            const stderrStream = ffmpegProcess.stderr;

            // Parse Stderr for Duration (Startup) and Errors
            stderrStream.on('data', (data: Buffer) => {
                const str = data.toString();
                // Duration: 00:00:10.50,
                const durMatch = str.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (durMatch) {
                    const h = parseInt(durMatch[1]);
                    const m = parseInt(durMatch[2]);
                    const s = parseFloat(durMatch[3]);
                    totalDurationMs = ((h * 3600) + (m * 60) + s) * 1000;
                }
            });

            // Parse Stdout for Progress (pipe:1 key=value)
            stdoutStream.on('data', (data: Buffer) => {
                const lines = data.toString().split('\n');
                let outTimeMs = 0;

                for (const line of lines) {
                    const [key, val] = line.trim().split('=');
                    if (key === 'out_time_ms') {
                        outTimeMs = parseInt(val);
                    } else if (key === 'progress' && val === 'end') {
                        // End
                    }
                }

                if (outTimeMs > 0 && totalDurationMs > 0) {
                    const pct = Math.min(99, Math.floor((outTimeMs / totalDurationMs) * 100)); // Clamp 99
                    // Throttled Update
                    if (Date.now() - lastProgressUpdate > 1000) {
                        try {
                            RenderFlowDB.updateProgress(job.id, pct);
                        } catch (e) {
                            // Best-effort: ignore DB write failures during rendering to avoid killing the job
                            console.warn(`[RenderFlow] Failed to persist progress for ${job.id} (non-fatal):`, e);
                        }
                        lastProgressUpdate = Date.now();
                    }
                }
            });

            // Stall Detection?
            // Requires checking if 'out_time_ms' changes. Kept simple for now:
            // If process doesn't exit, Watchdog kills it. 
            // Strict stall detection would entail checking `lastProgressUpdate` vs threshold.

            await new Promise<void>((resolve, reject) => {
                ffmpegProcess.on('close', (code: number) => {
                    if (code === 0) resolve();
                    else reject(new Error(`FFmpeg exited with code ${code}`));
                });

                ffmpegProcess.on('error', (err: any) => reject(err));
            });

            // 4. FINALIZING
            RenderFlowDB.updateState(job.id, 'finalizing');

            // Check Output
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                RenderFlowDB.markDone(job.id, {
                    output_path: outputPath,
                    output_url: `/outputs/${outputFilename}`, // Relative mapping
                    file_size: stats.size,
                    duration_ms: totalDurationMs
                });
                console.log(`[RenderFlow] Job ${job.id} DONE`);
            } else {
                throw new Error('Output file missing after success exit code');
            }

        } catch (err: any) {
            console.error(`[RenderFlow] Job ${job.id} FAILED:`, err);
            // If not already failed by watchdog
            const current = RenderFlowDB.getJob(job.id);
            if (current?.state !== 'failed') {
                RenderFlowDB.markFailed(job.id, {
                    code: ERROR_CODES.FFMPEG_EXEC,
                    message: err.message
                });
            }
        } finally {
            this.resetInternalState();
        }
    }

    private resetInternalState() {
        if (this.watchdogTimer) {
            clearInterval(this.watchdogTimer);
            this.watchdogTimer = null;
        }
    }

    private async downloadAssets(job: Job): Promise<{ sourcePath: string, trim?: any }> {
        // Check if source is URL or local
        const { source_url, trim } = job.input;

        if (!source_url) throw new Error('Missing source_url');

        // Local File Check
        if (fs.existsSync(source_url)) {
            return { sourcePath: source_url, trim };
        }

        // Remote Download
        const ext = path.extname(source_url) || '.mp4';
        const filename = `${job.id}_src${ext}`;
        const dest = path.join(PATHS.TEMP, filename);

        console.log(`[RenderFlow] Downloading ${source_url} to ${dest}`);

        const res = await fetch(source_url);
        if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
        if (!res.body) throw new Error('No body');

        const fileStream = createWriteStream(dest);
        // @ts-ignore
        await pipeline(res.body, fileStream);

        return { sourcePath: dest, trim };
    }
}
