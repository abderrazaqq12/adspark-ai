/**
 * Creative Scale - FFmpeg Engine Adapter
 * Executes ExecutionPlan using FFmpeg WASM in browser
 * Graceful degradation if FFmpeg unavailable
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ExecutionPlan, TimelineSegment, AudioSegment } from './compiler-types';

// ============================================
// CONSTANTS
// ============================================

const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_LOCAL_BASE = '/ffmpeg';
const FFMPEG_CDN_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

// ============================================
// TYPES
// ============================================

export interface FFmpegAdapterResult {
  success: boolean;
  video_url?: string;
  video_blob?: Blob;
  processing_time_ms: number;
  logs: string[];
  error?: string;
  ffmpeg_commands?: string[];
}

export interface FFmpegAdapterOptions {
  onProgress?: (progress: number) => void;
  onLog?: (message: string) => void;
  timeoutMs?: number;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'failed';

// ============================================
// ENVIRONMENT CHECK
// ============================================

export interface EnvironmentCheck {
  ready: boolean;
  diagnostics: {
    crossOriginIsolated: boolean;
    sharedArrayBuffer: boolean;
    webAssembly: boolean;
  };
  reason?: string;
}

export function checkFFmpegEnvironment(): EnvironmentCheck {
  const diagnostics = {
    crossOriginIsolated: !!window.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    webAssembly: typeof WebAssembly !== 'undefined',
  };

  const ready = diagnostics.crossOriginIsolated && 
                diagnostics.sharedArrayBuffer && 
                diagnostics.webAssembly;

  let reason: string | undefined;
  if (!diagnostics.crossOriginIsolated) {
    reason = 'Cross-Origin Isolation required (COOP/COEP headers missing)';
  } else if (!diagnostics.sharedArrayBuffer) {
    reason = 'SharedArrayBuffer not available';
  } else if (!diagnostics.webAssembly) {
    reason = 'WebAssembly not supported';
  }

  return { ready, diagnostics, reason };
}

// ============================================
// FFMPEG ADAPTER CLASS
// ============================================

export class FFmpegAdapter {
  private ffmpeg: FFmpeg | null = null;
  private loadState: LoadState = 'idle';
  private loadError: string | null = null;
  private logs: string[] = [];

  /**
   * Check if FFmpeg can run in this environment
   */
  static checkEnvironment(): EnvironmentCheck {
    return checkFFmpegEnvironment();
  }

  /**
   * Initialize FFmpeg (lazy load on first use)
   */
  async initialize(onProgress?: (msg: string) => void): Promise<void> {
    // Check environment first
    const env = checkFFmpegEnvironment();
    if (!env.ready) {
      this.loadState = 'failed';
      this.loadError = env.reason || 'Environment not supported';
      throw new Error(this.loadError);
    }

    if (this.loadState === 'ready') return;
    if (this.loadState === 'loading') {
      // Wait for ongoing load
      let attempts = 0;
      while ((this.loadState as LoadState) === 'loading' && attempts < 60) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
      }
      if ((this.loadState as LoadState) === 'ready') return;
      throw new Error(this.loadError || 'Load timeout');
    }

    this.loadState = 'loading';
    onProgress?.('Initializing FFmpeg WASM (~30MB)...');

    try {
      this.ffmpeg = new FFmpeg();

      this.ffmpeg.on('log', ({ message }) => {
        this.logs.push(message);
      });

      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress?.(`Processing: ${Math.round(progress * 100)}%`);
      });

      // Load from local + CDN
      const coreURL = `${window.location.origin}${FFMPEG_LOCAL_BASE}/ffmpeg-core.js`;
      onProgress?.('Loading FFmpeg core...');
      
      const wasmURL = await toBlobURL(
        `${FFMPEG_CDN_BASE}/ffmpeg-core.wasm`,
        'application/wasm'
      );
      onProgress?.('FFmpeg WASM loaded, initializing...');

      await Promise.race([
        this.ffmpeg.load({ coreURL, wasmURL }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('FFmpeg load timeout (90s)')), 90000)
        )
      ]);

      this.loadState = 'ready';
      onProgress?.('FFmpeg ready');
      console.log('[FFmpegAdapter] Initialized successfully');

    } catch (err) {
      this.loadState = 'failed';
      this.loadError = err instanceof Error ? err.message : String(err);
      this.ffmpeg = null;
      throw new Error(`FFmpeg initialization failed: ${this.loadError}`);
    }
  }

  /**
   * Check if ready for execution
   */
  isReady(): boolean {
    return this.loadState === 'ready' && this.ffmpeg !== null;
  }

  /**
   * Get current state
   */
  getState(): { state: LoadState; error?: string } {
    return { state: this.loadState, error: this.loadError || undefined };
  }

  /**
   * Execute an ExecutionPlan and generate video
   */
  async execute(
    plan: ExecutionPlan,
    options: FFmpegAdapterOptions = {}
  ): Promise<FFmpegAdapterResult> {
    const startTime = Date.now();
    this.logs = [];
    const commands: string[] = [];

    // Initialize if needed
    if (!this.isReady()) {
      try {
        await this.initialize(options.onLog);
      } catch (err) {
        return {
          success: false,
          processing_time_ms: Date.now() - startTime,
          logs: this.logs,
          error: err instanceof Error ? err.message : 'Initialization failed',
          ffmpeg_commands: [],
        };
      }
    }

    const ffmpeg = this.ffmpeg!;

    try {
      options.onLog?.('Processing execution plan...');

      // 1. Fetch source video(s) - collect all unique asset_urls from timeline
      const assetUrls = plan.timeline.map(s => s.asset_url).filter(Boolean) as string[];
      const sourceVideos = new Set(assetUrls);
      
      console.log('[FFmpegAdapter] Timeline segments:', plan.timeline.length);
      console.log('[FFmpegAdapter] Asset URLs found:', assetUrls.length);
      console.log('[FFmpegAdapter] Unique sources:', sourceVideos.size);
      if (assetUrls[0]) {
        console.log('[FFmpegAdapter] First asset URL prefix:', assetUrls[0].substring(0, 50));
      }
      
      const sourceMap = new Map<string, string>();
      let inputIndex = 0;

      for (const sourceUrl of sourceVideos) {
        if (!sourceUrl) continue;
        const inputName = `input_${inputIndex}.mp4`;
        options.onLog?.(`Loading source video ${inputIndex + 1}...`);
        console.log('[FFmpegAdapter] Fetching video from:', sourceUrl.substring(0, 80));
        
        try {
          const data = await fetchFile(sourceUrl);
          console.log('[FFmpegAdapter] Fetched bytes:', data.byteLength);
          await ffmpeg.writeFile(inputName, data);
          sourceMap.set(sourceUrl, inputName);
          inputIndex++;
        } catch (fetchErr) {
          console.error('[FFmpegAdapter] Failed to fetch video:', fetchErr);
          throw new Error(`Failed to fetch source video: ${fetchErr instanceof Error ? fetchErr.message : 'Unknown error'}`);
        }
      }

      if (sourceMap.size === 0) {
        // Log more details about the plan for debugging
        console.error('[FFmpegAdapter] Plan timeline:', JSON.stringify(plan.timeline.slice(0, 2), null, 2));
        throw new Error(`No source videos found. Timeline has ${plan.timeline.length} segments but no valid asset_url values.`);
      }

      // 2. Process timeline segments
      const segmentFiles: string[] = [];
      
      for (let i = 0; i < plan.timeline.length; i++) {
        const segment = plan.timeline[i];
        if (segment.track !== 'video') continue; // Skip overlays for now

        const inputFile = sourceMap.get(segment.asset_url || '') || 'input_0.mp4';
        const outputFile = `segment_${i}.mp4`;

        // Build FFmpeg command for this segment
        const trimStart = segment.trim_start_ms / 1000;
        const duration = (segment.trim_end_ms - segment.trim_start_ms) / 1000;
        const speed = segment.speed_multiplier;

        const args: string[] = [
          '-i', inputFile,
          '-ss', trimStart.toFixed(3),
          '-t', duration.toFixed(3),
        ];

        // Apply speed change if needed
        if (speed !== 1.0) {
          const setpts = `setpts=${(1 / speed).toFixed(3)}*PTS`;
          const atempo = speed > 2 ? 'atempo=2.0,atempo=' + (speed / 2).toFixed(3) : 
                         speed < 0.5 ? 'atempo=0.5,atempo=' + (speed * 2).toFixed(3) :
                         `atempo=${speed.toFixed(3)}`;
          args.push('-vf', setpts, '-af', atempo);
        }

        args.push(
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-c:a', 'aac',
          '-y',
          outputFile
        );

        commands.push(`ffmpeg ${args.join(' ')}`);
        options.onLog?.(`Processing segment ${i + 1}/${plan.timeline.length}...`);
        options.onProgress?.((i + 1) / (plan.timeline.length + 2));

        await ffmpeg.exec(args);
        segmentFiles.push(outputFile);
      }

      if (segmentFiles.length === 0) {
        throw new Error('No segments processed');
      }

      // 3. Concatenate segments
      options.onLog?.('Concatenating segments...');
      const concatList = 'concat.txt';
      const concatContent = segmentFiles.map(f => `file '${f}'`).join('\n');
      await ffmpeg.writeFile(concatList, concatContent);

      // Output settings from plan
      const { width, height, fps, bitrate_kbps } = plan.output_format;
      const outputFile = 'output.mp4';

      const concatArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatList,
        '-vf', `scale=${width}:${height}`,
        '-r', fps.toString(),
        '-b:v', `${bitrate_kbps}k`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        '-y',
        outputFile
      ];

      commands.push(`ffmpeg ${concatArgs.join(' ')}`);
      await ffmpeg.exec(concatArgs);

      // 4. Read output
      options.onLog?.('Reading output...');
      options.onProgress?.(0.95);

      const outputData = await ffmpeg.readFile(outputFile);
      let blobData: BlobPart;
      if (typeof outputData === 'string') {
        blobData = new TextEncoder().encode(outputData);
      } else {
        blobData = new Uint8Array(outputData).slice();
      }

      const blob = new Blob([blobData], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(blob);

      // 5. Cleanup
      options.onLog?.('Cleaning up...');
      for (const [, inputFile] of sourceMap) {
        await ffmpeg.deleteFile(inputFile).catch(() => {});
      }
      for (const segFile of segmentFiles) {
        await ffmpeg.deleteFile(segFile).catch(() => {});
      }
      await ffmpeg.deleteFile(concatList).catch(() => {});
      await ffmpeg.deleteFile(outputFile).catch(() => {});

      options.onProgress?.(1.0);
      options.onLog?.('Complete!');

      return {
        success: true,
        video_url: videoUrl,
        video_blob: blob,
        processing_time_ms: Date.now() - startTime,
        logs: [...this.logs],
        ffmpeg_commands: commands,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[FFmpegAdapter] Execution error:', errorMessage);

      return {
        success: false,
        processing_time_ms: Date.now() - startTime,
        logs: [...this.logs],
        error: errorMessage,
        ffmpeg_commands: commands,
      };
    }
  }

  /**
   * Reset the adapter
   */
  reset(): void {
    this.ffmpeg = null;
    this.loadState = 'idle';
    this.loadError = null;
    this.logs = [];
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let adapterInstance: FFmpegAdapter | null = null;

export function getFFmpegAdapter(): FFmpegAdapter {
  if (!adapterInstance) {
    adapterInstance = new FFmpegAdapter();
  }
  return adapterInstance;
}

export function resetFFmpegAdapter(): void {
  if (adapterInstance) {
    adapterInstance.reset();
    adapterInstance = null;
  }
}
