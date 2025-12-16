import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { RenderFlowDB } from './db';
import { Job, ERROR_CODES } from './types';
import { PATHS, sleep } from './utils';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import crypto from 'crypto';
import { FFmpegBuilder } from './ffmpeg-builder';

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
        RenderFlowDB.recoverOrphanedJobs();
        this.pollLoop();
    }

    private async pollLoop() {
        while (this.isRunning) {
            try {
                if (!this.currentJob) {
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

        this.watchdogTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            if (elapsed > MAX_RUNTIME_MS) {
                console.error(`[RenderFlow] Job ${job.id} TIMED OUT`);
                if (ffmpegProcess) ffmpegProcess.kill('SIGKILL');

                RenderFlowDB.markFailed(job.id, {
                    code: ERROR_CODES.TIMEOUT,
                    message: `Job exceeded max runtime of ${MAX_RUNTIME_MS}ms`
                });
                this.resetInternalState();
            }
        }, 5000);

        try {
            // 1. DOWNLOADING
            RenderFlowDB.updateState(job.id, 'downloading');
            // Support both old sourceVideoUrl and new Plan-based assets
            const localPaths = await this.downloadAssets(job);

            // 2. BUILD PLAN
            const plan = job.data.plan;
            if (!plan) throw new Error('No execution plan found in job data');

            // Map remote URLs to local paths in a plan copy
            const localPlan = JSON.parse(JSON.stringify(plan));
            localPlan.timeline.forEach((seg: any) => {
                if (localPaths.has(seg.asset_url)) {
                    seg.asset_url = localPaths.get(seg.asset_url);
                }
            });
            if (localPlan.audio_tracks) {
                localPlan.audio_tracks.forEach((track: any) => {
                    if (localPaths.has(track.asset_url)) {
                        track.asset_url = localPaths.get(track.asset_url);
                    }
                });
            }

            // 3. ENCODING
            RenderFlowDB.updateState(job.id, 'encoding');

            const outputFilename = `${job.id}.mp4`;
            const outputPath = path.join(PATHS.OUTPUT, outputFilename);

            const builder = new FFmpegBuilder(localPlan);
            const { command, args } = builder.buildCommand(outputPath);

            console.log(`[RenderFlow] Executing: ${command} ${args.join(' ')}`);

            ffmpegProcess = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

            // PROGRESS PARSING
            let totalDurationMs = 0;
            // Attempt to parse duration from stderr init
            ffmpegProcess.stderr.on('data', (data: Buffer) => {
                const str = data.toString();
                const durMatch = str.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
                if (durMatch) {
                    const h = parseInt(durMatch[1]);
                    const m = parseInt(durMatch[2]);
                    const s = parseFloat(durMatch[3]);
                    totalDurationMs = ((h * 3600) + (m * 60) + s) * 1000;
                }
            });

            await new Promise<void>((resolve, reject) => {
                ffmpegProcess.on('close', (code: number) => {
                    if (code === 0) resolve();
                    else reject(new Error(`FFmpeg exited with code ${code}`));
                });
                ffmpegProcess.on('error', (err: any) => reject(err));
            });

            // 4. FINALIZING
            RenderFlowDB.updateState(job.id, 'finalizing');

            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                RenderFlowDB.markDone(job.id, {
                    output_path: outputPath,
                    output_url: `/outputs/${outputFilename}`,
                    file_size: stats.size,
                    duration_ms: totalDurationMs || (Date.now() - startTime)
                });
                console.log(`[RenderFlow] Job ${job.id} DONE`);
            } else {
                throw new Error('Output file missing after success exit code');
            }

        } catch (err: any) {
            console.error(`[RenderFlow] Job ${job.id} FAILED:`, err);
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
        if (this.currentJob) {
            // console.log(`[RenderFlow] Resetting state for job ${this.currentJob.id}`);
        }
        this.currentJob = null;
        if (this.watchdogTimer) {
            clearInterval(this.watchdogTimer);
            this.watchdogTimer = null;
        }
    }

    private async downloadAssets(job: Job): Promise<Map<string, string>> {
        const localPaths = new Map<string, string>();
        const plan = job.data.plan;

        const uniqueUrls = new Set<string>();

        // Support legacy single source
        if (job.data.sourceVideoUrl) uniqueUrls.add(job.data.sourceVideoUrl);

        // Support Plan assets
        if (plan && plan.timeline) {
            plan.timeline.forEach((seg: any) => uniqueUrls.add(seg.asset_url));
            if (plan.audio_tracks) {
                plan.audio_tracks.forEach((track: any) => uniqueUrls.add(track.asset_url));
            }
        }

        // Download loop
        for (const url of uniqueUrls) {
            if (!url) continue;
            // Simple hash for consistency
            const filename = crypto.createHash('md5').update(url).digest('hex') + path.extname(url).split('?')[0];
            const localPath = path.join(PATHS.TEMP, filename);

            if (!fs.existsSync(localPath)) {
                console.log(`[RenderFlow] Downloading asset: ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to download ${url}`);
                await pipeline(response.body as any, createWriteStream(localPath));
            }
            localPaths.set(url, localPath);
        }

        return localPaths;
    }
}
