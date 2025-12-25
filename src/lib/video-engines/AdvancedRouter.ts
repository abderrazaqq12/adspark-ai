/**
 * ADVANCED ENGINE ROUTER
 * 
 * ARCHITECTURAL LAW: VPS-First, FFmpeg-First
 * 
 * 1. VPS is the ONLY execution environment for rendering
 * 2. FFmpeg handles ALL operations it's capable of
 * 3. Paid AI ONLY when FFmpeg is technically incapable
 * 4. Cloudinary is a PLANNER only, NOT a renderer
 */

import { ENGINE_REGISTRY, EngineSpecs, ScenePlan } from "./registry-types";
import { IVideoEngine, EngineTask, EngineResult } from "./types";
import { getDecisionScorer } from "@/lib/render";

export type RenderingMode = 'server_only' | 'auto';

export interface RoutingRequest {
  plan: ScenePlan;
  userTier: "free" | "low" | "medium" | "premium";
  preferLocal?: boolean;
  renderingMode?: RenderingMode;
}

/**
 * VPS FFmpeg Engine - THE Primary Renderer
 * All video processing happens here.
 */
class VPSFFmpegEngine implements IVideoEngine {
  name = "VPS FFmpeg (Native)";
  tier = "server" as const;

  async initialize(): Promise<void> {
    console.log('[VPSFFmpeg] Ready - all processing on VPS');
  }

  async process(task: EngineTask): Promise<EngineResult> {
    console.log('[VPSFFmpeg] Processing via VPS /render/jobs...');
    let currentJobId: string | null = null;

    try {
      // Use the SINGLE RENDER CONTRACT
      const response = await fetch('/render/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: task.videoUrl,
          output_format: 'mp4',
          resolution: task.outputRatio === '9:16' ? '1080x1920' : '1920x1080',
          projectId: task.projectId,
          tool: task.tool,
          metadata: {
            taskId: task.id,
            engine: 'vps-ffmpeg',
            scenes: task.config?.scenes?.length || 0,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      currentJobId = data.id;

      console.log(`[VPSFFmpeg] Job submitted: ${currentJobId}`);

      // Poll for completion using SINGLE CONTRACT
      const maxAttempts = 180; // 6 minutes (2s interval)
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));

        try {
          const pollRes = await fetch(`/render/jobs/${currentJobId}`);
          if (!pollRes.ok) continue;

          const jobData = await pollRes.json();
          console.log(`[VPSFFmpeg] Poll ${currentJobId}: ${jobData.status}`);

          if (jobData.status === 'completed' && (jobData.output_url || jobData.output_path)) {
            return {
              success: true,
              status: 'success',
              outputType: 'video',
              videoUrl: jobData.output_url || jobData.output_path,
              jobId: currentJobId,
              logs: ['VPS FFmpeg render complete'],
            };
          }

          if (jobData.status === 'failed') {
            // Handle error object or string
            const errorMsg = typeof jobData.error === 'object' && jobData.error !== null
              ? (jobData.error.message || JSON.stringify(jobData.error))
              : (jobData.error || 'Job failed on VPS');
            throw new Error(errorMsg);
          }
        } catch (pollErr) {
          console.warn(`[VPSFFmpeg] Poll error:`, pollErr);
        }
      }

      throw new Error('VPS rendering timed out');

    } catch (err: any) {
      console.error('[VPSFFmpeg] Error:', err);
      return {
        success: false,
        status: 'failed',
        outputType: 'job',
        error: err.message || 'VPS connection failed',
        jobId: currentJobId || undefined,
        logs: [`Error: ${err.message}`],
      };
    }
  }

  isReady(): boolean {
    return true;
  }
}

/**
 * ADVANCED ENGINE ROUTER
 * 
 * Routes ALL rendering to VPS FFmpeg.
 * Uses Decision Scorer for operation analysis.
 */
export class AdvancedEngineRouter {
  private static vpsEngine: IVideoEngine | null = null;

  /**
   * Select engine - ALWAYS returns VPS FFmpeg
   * The Decision Scorer validates if FFmpeg can handle it.
   */
  static selectEngine(req: RoutingRequest): EngineSpecs {
    const scorer = getDecisionScorer();
    const capabilities = req.plan.requiredCapabilities || [];

    // Log routing decision
    console.log(`[Router] Analyzing capabilities: ${capabilities.join(', ')}`);

    // Check FFmpeg capability using decision scorer
    const ffmpegOps = scorer.getFFmpegOperations(capabilities);
    const aiOps = scorer.getAIOperations(capabilities);

    if (aiOps.length > 0) {
      console.warn(`[Router] AI required for: ${aiOps.join(', ')} - these will be handled separately`);
    }

    // ALWAYS route to VPS FFmpeg for video rendering
    return this.getVPSSpec(`FFmpeg handles: ${ffmpegOps.join(', ') || 'all operations'}`);
  }

  private static getVPSSpec(reason: string): EngineSpecs {
    return {
      id: "vps-ffmpeg",
      name: `VPS FFmpeg (${reason})`,
      tier: "free",
      location: "server",
      maxResolution: "4k",
      maxDurationSec: 600,
      costPerMinute: 0,
      capabilities: [
        "trim", "merge", "concat", "text_overlay",
        "transitions", "audio_mix", "resize", "speed_change",
        "zoom_pan", "subtitle_burn", "transcode"
      ],
    };
  }

  /**
   * Get VPS engine instance
   */
  static getEngineInstance(_specId?: string): IVideoEngine {
    // ALWAYS return VPS engine - no alternatives
    if (!this.vpsEngine) {
      this.vpsEngine = new VPSFFmpegEngine();
    }
    return this.vpsEngine;
  }

  /**
   * Check if VPS is available
   */
  static async checkVPSHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.ok === true;
    } catch {
      return false;
    }
  }
}

// Legacy export for backward compatibility
export { AdvancedEngineRouter as EngineRouterV2 };
