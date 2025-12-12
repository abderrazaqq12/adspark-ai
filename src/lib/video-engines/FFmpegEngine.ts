
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { IVideoEngine, EngineTask, EngineResult } from './types';

export class FFmpegEngine implements IVideoEngine {
    name = "FFmpeg.wasm (Browser)";
    tier = "free" as const;
    private ffmpeg: FFmpeg | null = null;
    private loadState: "idle" | "loading" | "ready" | "failed" = "idle";

    async initialize(): Promise<void> {
        // 1. Browser Capability Check (Pre-flight)
        if (typeof window === 'undefined') {
            throw new Error("FFmpeg.wasm can ONLY run in a browser environment. Server-side execution is blocked.");
        }

        // Check for necessary APIs
        if (!window.SharedArrayBuffer) {
            throw new Error("SharedArrayBuffer is not available. Ensure COOP/COEP headers are set.");
        }

        // 2. Readiness Guard
        if (this.loadState === "ready") return;
        if (this.loadState === "loading") {
            // Wait for existing load to finish (simple polling for this demo)
            let attempts = 0;
            while ((this.loadState as string) === "loading" && attempts < 20) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
            if ((this.loadState as string) === "ready") return;
            if ((this.loadState as string) === "failed") throw new Error("Previous FFmpeg load failed");
        }

        this.loadState = "loading";
        console.log('[FFmpegEngine] State: loading');

        try {
            this.ffmpeg = new FFmpeg();

            // 3. Explicit WASM Loading & Network Validation
            const coreVersion = '0.12.6';
            const baseURL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${coreVersion}/dist/umd`;

            // Validate availability first (Head request)
            const coreUrl = `${baseURL}/ffmpeg-core.js`;
            const wasmUrl = `${baseURL}/ffmpeg-core.wasm`;

            const [coreCheck, wasmCheck] = await Promise.all([
                fetch(coreUrl, { method: 'HEAD' }),
                fetch(wasmUrl, { method: 'HEAD' })
            ]);

            if (!coreCheck.ok || !wasmCheck.ok) {
                throw new Error(`FFmpeg CDN Unreachable: JS=${coreCheck.status}, WASM=${wasmCheck.status}`);
            }

            // 4. Cache Safety (Cache busting if needed, or rely on browser cache but validated)
            // We use standard toBlobURL as requested
            console.log('[FFmpegEngine] Fetching blobs...');

            const loadPromise = this.ffmpeg.load({
                coreURL: await toBlobURL(coreUrl, 'text/javascript'),
                wasmURL: await toBlobURL(wasmUrl, 'application/wasm'),
            });

            // 5. Timeout Enforcement
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("FFmpeg loading timed out after 15s")), 15000)
            );

            await Promise.race([loadPromise, timeoutPromise]);

            this.loadState = "ready";
            console.log('[FFmpegEngine] State: ready (WASM compiled)');

        } catch (err: any) {
            this.loadState = "failed";
            console.error('[FFmpegEngine] Init failed:', err);
            // reset ffmpeg instance
            this.ffmpeg = null;
            throw new Error(`FFmpeg Initialization Failed: ${err.message}`);
        }
    }

    async process(task: EngineTask): Promise<EngineResult> {
        if (!this.ffmpeg || this.loadState !== 'ready') {
            await this.initialize();
        }

        const ffmpeg = this.ffmpeg!;
        const startTime = Date.now();
        const logs: string[] = [];

        ffmpeg.on('log', ({ message }) => {
            logs.push(message);
            console.log('[FFmpeg]', message);
        });

        try {
            // 1. Write Input File
            const inputFileName = 'input.mp4';
            await ffmpeg.writeFile(inputFileName, await fetchFile(task.videoUrl));

            const { scenes } = task.config;
            const segmentFiles: string[] = [];

            // 2. Process Scenes (Trim)
            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i];
                const segmentName = `segment_${i}.mp4`;

                // Trim command
                // -ss start -t duration
                const duration = scene.end - scene.start;
                if (duration <= 0) continue;

                // Uses fast re-encode to ensure compatible concatenation
                await ffmpeg.exec([
                    '-i', inputFileName,
                    '-ss', scene.start.toString(),
                    '-t', duration.toString(),
                    '-c:v', 'libx264',
                    '-preset', 'ultrafast', // Speed over compression for browser
                    '-c:a', 'aac',
                    segmentName
                ]);

                segmentFiles.push(segmentName);
            }

            // 3. Concatenate Scenes
            // Create concat list file
            const concatListName = 'concat_list.txt';
            const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n');
            await ffmpeg.writeFile(concatListName, concatContent);

            const outputFileName = 'output.mp4';
            await ffmpeg.exec([
                '-f', 'concat',
                '-safe', '0',
                '-i', concatListName,
                '-c', 'copy', // Stream copy for speed since we re-encoded segments
                outputFileName
            ]);

            // 4. Read Output
            const data = await ffmpeg.readFile(outputFileName);
            const blob = new Blob([data as any], { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(blob);

            // Cleanup
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(concatListName);
            await ffmpeg.deleteFile(outputFileName);
            for (const f of segmentFiles) await ffmpeg.deleteFile(f);

            return {
                success: true,
                videoUrl,
                processingTimeMs: Date.now() - startTime,
                logs
            };

        } catch (error: any) {
            console.error('[FFmpegEngine] Error:', error);
            return {
                success: false,
                error: error.message || 'Unknown FFmpeg error',
                logs
            };
        }
    }
}
