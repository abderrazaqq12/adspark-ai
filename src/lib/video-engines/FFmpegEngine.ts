
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { IVideoEngine, EngineTask, EngineResult } from './types';

// FFmpeg core version - pinned for stability
const FFMPEG_CORE_VERSION = '0.12.6';
// jsDelivr provides CORS headers required for cross-origin isolated environments
const FFMPEG_CDN_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

type LoadState = "idle" | "loading" | "ready" | "failed";

/**
 * Comprehensive environment check - MUST pass before any FFmpeg operation
 */
export async function checkFfmpegEnvironment(): Promise<{
    ready: boolean;
    diagnostics: Record<string, { pass: boolean; message: string }>;
}> {
    const diagnostics: Record<string, { pass: boolean; message: string }> = {};

    // 1. Cross-Origin Isolation
    diagnostics.crossOriginIsolated = {
        pass: !!window.crossOriginIsolated,
        message: window.crossOriginIsolated 
            ? 'COOP/COEP headers active' 
            : 'Missing COOP/COEP headers - SharedArrayBuffer blocked'
    };

    // 2. SharedArrayBuffer
    diagnostics.sharedArrayBuffer = {
        pass: typeof SharedArrayBuffer !== 'undefined',
        message: typeof SharedArrayBuffer !== 'undefined'
            ? 'SharedArrayBuffer available'
            : 'SharedArrayBuffer unavailable'
    };

    // 3. WebAssembly support
    diagnostics.webAssembly = {
        pass: typeof WebAssembly !== 'undefined',
        message: typeof WebAssembly !== 'undefined'
            ? 'WebAssembly supported'
            : 'WebAssembly not supported'
    };

    // 4. Fetch ffmpeg-core.js from CDN
    try {
        const coreRes = await fetch(`${FFMPEG_CDN_BASE}/ffmpeg-core.js`, { method: 'HEAD' });
        const corsHeader = coreRes.headers.get('access-control-allow-origin');
        diagnostics.coreJsFile = {
            pass: coreRes.ok && corsHeader === '*',
            message: coreRes.ok 
                ? `ffmpeg-core.js accessible (CORS: ${corsHeader || 'none'})`
                : `ffmpeg-core.js failed: ${coreRes.status}`
        };
    } catch (e) {
        diagnostics.coreJsFile = {
            pass: false,
            message: `ffmpeg-core.js fetch error: ${e}`
        };
    }

    // 5. Fetch ffmpeg-core.wasm from CDN
    try {
        const wasmRes = await fetch(`${FFMPEG_CDN_BASE}/ffmpeg-core.wasm`, { method: 'HEAD' });
        const corsHeader = wasmRes.headers.get('access-control-allow-origin');
        diagnostics.wasmFile = {
            pass: wasmRes.ok && corsHeader === '*',
            message: wasmRes.ok 
                ? `ffmpeg-core.wasm accessible (CORS: ${corsHeader || 'none'})`
                : `ffmpeg-core.wasm failed: ${wasmRes.status}`
        };
    } catch (e) {
        diagnostics.wasmFile = {
            pass: false,
            message: `ffmpeg-core.wasm fetch error: ${e}`
        };
    }

    const allPass = Object.values(diagnostics).every(d => d.pass);
    
    console.log('[FFmpeg Environment Check]', allPass ? '✓ All checks passed' : '✗ Some checks failed');
    Object.entries(diagnostics).forEach(([key, val]) => {
        console.log(`  ${val.pass ? '✓' : '✗'} ${key}: ${val.message}`);
    });

    return { ready: allPass, diagnostics };
}

/**
 * Preflight check - throws if not ready
 */
export async function assertFFmpegReady(): Promise<boolean> {
    const { ready, diagnostics } = await checkFfmpegEnvironment();
    
    if (!ready) {
        const failures = Object.entries(diagnostics)
            .filter(([_, d]) => !d.pass)
            .map(([k, d]) => `${k}: ${d.message}`)
            .join('; ');
        throw new Error(`FFmpeg environment check failed: ${failures}`);
    }
    
    return true;
}

/**
 * Check environment support for FFmpeg.wasm
 */
export function checkFFmpegSupport(): { supported: boolean; reason?: string } {
    if (typeof window === 'undefined') {
        return { supported: false, reason: 'Server-side environment not supported' };
    }
    
    if (!window.crossOriginIsolated) {
        return { supported: false, reason: 'Cross-Origin Isolation required (COOP/COEP headers)' };
    }
    
    if (typeof SharedArrayBuffer === 'undefined') {
        return { supported: false, reason: 'SharedArrayBuffer not available' };
    }
    
    return { supported: true };
}

export class FFmpegEngine implements IVideoEngine {
    name = "FFmpeg.wasm (Browser)";
    tier = "free" as const;
    private ffmpeg: FFmpeg | null = null;
    private loadState: LoadState = "idle";
    private loadError: string | null = null;

    /**
     * Static support check
     */
    static checkSupport(): { supported: boolean; reason?: string } {
        return checkFFmpegSupport();
    }

    async initialize(): Promise<void> {
        // 1. Run preflight checks
        await assertFFmpegReady();

        // 2. Check if already ready
        if (this.loadState === "ready" && this.ffmpeg) {
            console.log('[FFmpegEngine] Already initialized');
            return;
        }

        // 3. Wait if currently loading
        if (this.loadState === "loading") {
            console.log('[FFmpegEngine] Already loading, waiting...');
            let attempts = 0;
            while (this.loadState as LoadState === "loading" && attempts < 30) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
            if ((this.loadState as LoadState) === "ready") return;
            if ((this.loadState as LoadState) === "failed") {
                throw new Error(`FFmpeg load failed: ${this.loadError}`);
            }
        }

        this.loadState = "loading";
        this.loadError = null;
        console.log('[FFmpegEngine] Initializing FFmpeg.wasm...');

        try {
            this.ffmpeg = new FFmpeg();

            // Set up logging
            this.ffmpeg.on('log', ({ message }) => {
                console.log('[FFmpeg Log]', message);
            });

            this.ffmpeg.on('progress', ({ progress, time }) => {
                console.log('[FFmpeg Progress]', Math.round(progress * 100) + '%', 'time:', time);
            });

            // Load FFmpeg core from jsDelivr CDN (has proper CORS headers)
            // Using toBlobURL to convert CDN files to blob URLs
            console.log('[FFmpegEngine] Loading FFmpeg core v' + FFMPEG_CORE_VERSION + '...');
            console.log('[FFmpegEngine] CDN:', FFMPEG_CDN_BASE);

            // toBlobURL fetches and converts to blob URL, working around CORS
            const coreURL = await toBlobURL(
                `${FFMPEG_CDN_BASE}/ffmpeg-core.js`,
                'text/javascript'
            );
            console.log('[FFmpegEngine] ✓ Core JS loaded');

            const wasmURL = await toBlobURL(
                `${FFMPEG_CDN_BASE}/ffmpeg-core.wasm`,
                'application/wasm'
            );
            console.log('[FFmpegEngine] ✓ WASM loaded (~32MB)');

            // @ffmpeg/core@0.12.6 is single-threaded - NO workerURL needed
            console.log('[FFmpegEngine] Calling ffmpeg.load()...');
            
            const loadPromise = this.ffmpeg.load({
                coreURL,
                wasmURL,
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("FFmpeg load timeout (90s)")), 90000)
            );

            await Promise.race([loadPromise, timeoutPromise]);

            this.loadState = "ready";
            console.log('[FFmpegEngine] ✓ FFmpeg initialized successfully!');

        } catch (err: unknown) {
            this.loadState = "failed";
            const errorMessage = err instanceof Error ? err.message : String(err);
            this.loadError = errorMessage;
            this.ffmpeg = null;
            
            console.error('[FFmpegEngine] ✗ Initialization failed:', errorMessage);
            throw new Error(`FFmpeg Initialization Failed: ${errorMessage}`);
        }
    }

    async process(task: EngineTask): Promise<EngineResult> {
        // Ensure initialized
        if (!this.ffmpeg || this.loadState !== 'ready') {
            await this.initialize();
        }

        const ffmpeg = this.ffmpeg!;
        const startTime = Date.now();
        const logs: string[] = [];

        // Capture logs for this operation
        const logHandler = ({ message }: { message: string }) => {
            logs.push(message);
        };
        ffmpeg.on('log', logHandler);

        try {
            console.log('[FFmpegEngine] Processing task:', task.config);

            // 1. Write Input File
            const inputFileName = 'input.mp4';
            console.log('[FFmpegEngine] Fetching input video...');
            const inputData = await fetchFile(task.videoUrl);
            await ffmpeg.writeFile(inputFileName, inputData);
            console.log('[FFmpegEngine] Input video loaded');

            const { scenes } = task.config;
            const segmentFiles: string[] = [];

            // 2. Process Scenes (Trim)
            for (let i = 0; i < scenes.length; i++) {
                const scene = scenes[i];
                const segmentName = `segment_${i}.mp4`;
                const duration = scene.end - scene.start;
                
                if (duration <= 0) {
                    console.log(`[FFmpegEngine] Skipping scene ${i} (invalid duration)`);
                    continue;
                }

                console.log(`[FFmpegEngine] Trimming scene ${i}: ${scene.start}s to ${scene.end}s`);
                
                await ffmpeg.exec([
                    '-i', inputFileName,
                    '-ss', scene.start.toString(),
                    '-t', duration.toString(),
                    '-c:v', 'libx264',
                    '-preset', 'ultrafast',
                    '-c:a', 'aac',
                    '-y',
                    segmentName
                ]);

                segmentFiles.push(segmentName);
            }

            if (segmentFiles.length === 0) {
                throw new Error('No valid segments to process');
            }

            // 3. Concatenate Scenes
            console.log('[FFmpegEngine] Concatenating', segmentFiles.length, 'segments');
            const concatListName = 'concat_list.txt';
            const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n');
            await ffmpeg.writeFile(concatListName, concatContent);

            const outputFileName = 'output.mp4';
            await ffmpeg.exec([
                '-f', 'concat',
                '-safe', '0',
                '-i', concatListName,
                '-c', 'copy',
                '-y',
                outputFileName
            ]);

            // 4. Read Output
            console.log('[FFmpegEngine] Reading output file...');
            const data = await ffmpeg.readFile(outputFileName);
            // Handle FileData type - can be Uint8Array or string
            let blobData: BlobPart;
            if (typeof data === 'string') {
                blobData = new TextEncoder().encode(data);
            } else {
                // Copy to regular ArrayBuffer to avoid SharedArrayBuffer issues
                blobData = new Uint8Array(data).slice();
            }
            const blob = new Blob([blobData], { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(blob);

            // 5. Cleanup
            console.log('[FFmpegEngine] Cleaning up temp files...');
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(concatListName);
            await ffmpeg.deleteFile(outputFileName);
            for (const f of segmentFiles) {
                await ffmpeg.deleteFile(f);
            }

            const processingTimeMs = Date.now() - startTime;
            console.log(`[FFmpegEngine] ✓ Processing complete in ${processingTimeMs}ms`);

            return {
                success: true,
                videoUrl,
                processingTimeMs,
                logs
            };

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('[FFmpegEngine] Processing error:', errorMessage);
            
            return {
                success: false,
                error: errorMessage,
                logs
            };
        }
    }

    /**
     * Check if engine is ready for processing
     */
    isReady(): boolean {
        return this.loadState === "ready" && this.ffmpeg !== null;
    }

    /**
     * Get current state
     */
    getState(): { state: string; error?: string } {
        return {
            state: this.loadState,
            error: this.loadError || undefined
        };
    }

    /**
     * Reset the engine (for retry scenarios)
     */
    reset(): void {
        this.ffmpeg = null;
        this.loadState = "idle";
        this.loadError = null;
        console.log('[FFmpegEngine] Reset');
    }
}
