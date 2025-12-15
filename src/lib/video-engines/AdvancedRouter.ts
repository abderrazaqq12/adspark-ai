/**
 * Advanced Engine Router - Server-only rendering (with Cloudinary Planning)
 * All video processing routed to VPS server
 */

import { ENGINE_REGISTRY, EngineSpecs, ScenePlan } from "./registry-types";
import { IVideoEngine, EngineTask, EngineResult } from "./types";

export type RenderingMode = 'auto' | 'server_only' | 'cloudinary_only';

export interface RoutingRequest {
  plan: ScenePlan;
  userTier: "free" | "low" | "medium" | "premium";
  preferLocal?: boolean;
  renderingMode?: RenderingMode; // New override
}

/**
 * Cloudinary Planner & Validator
 * - Checks if the plan is "simple" enough for basic cloud transcoding
 * - Identifies "uncompilable" complex edits that require FFmpeg
 */
class CloudinaryPlanner {
  static validatePlan(plan: ScenePlan): { feasible: boolean; reason?: string } {
    // 1. Check for complex audio ops (not supported by basic Cloudinary URL gen)
    const hasAudioMix = plan.requiredCapabilities?.includes('audio_mix');
    if (hasAudioMix) return { feasible: false, reason: "Complex audio mixing requires FFmpeg" };

    // 2. Check for precise trimming (often frame-inaccurate on Cloudinary free tier)
    // For now, we allow it, but flag it if needed.

    // 3. Check for external assets that might be private/local
    // Cloudinary needs public URLs. If source is local, must use Server.
    // We assume plan.scenes checks are done elsewhere, but here we enforce policy.

    return { feasible: true, reason: "Plan is compatible with Cloudinary transformations" };
  }
}

/**
 * Cloudinary Engine (Planner/Optimizer)
 * - Returns a Plan if complex
 * - Returns a Video URL if simple
 * - Falls back to Server FFmpeg if configured
 */
class CloudinaryEngine implements IVideoEngine {
  name = "Cloudinary (Gen-AI)";
  tier = "free" as const;

  async initialize(): Promise<void> { console.log("Cloudinary Engine Ready"); }

  async process(task: EngineTask): Promise<EngineResult> {
    console.log(`[Cloudinary] Analzying plan...`);

    // 1. Check Feasibility
    const feasibility = CloudinaryPlanner.validatePlan({
      scenes: task.config.scenes as any,
      requiredCapabilities: ['trim'],
      totalDuration: 0, // Placeholder
      resolution: '1080p'
    });

    // 2. If Not Feasible -> Fallback to Server (Handover)
    if (!feasibility.feasible) {
      console.warn(`[Cloudinary] Cannot render final output: ${feasibility.reason}. Handoff to Server FFmpeg...`);

      // AUTOMATIC HANDOFF
      return AdvancedEngineRouter.getEngineInstance('server-ffmpeg').process({
        ...task,
        config: {
          ...task.config,
          // strategies: "cloudinary_failed_fallback"
        }
      });
    }

    // 3. If Feasible -> Return Compilation Plan (Not final video)
    // The user requirement says: "Cloudinary must be treated as Plan compiler... NOT a final renderer unless explicitly configured"
    // But if we are in "Cloudinary Only" mode, we might try.
    // For "Auto" mode, if we selected Cloudinary, we likely want a fast preview or Plan.

    return {
      success: true,
      status: 'success',
      outputType: 'plan', // Important: It's a PLAN, not a VIDEO
      videoUrl: "", // No video yet
      executionPlan: {
        provider: "cloudinary",
        transformations: ["c_fill", "w_1080", "h_1920"],
        segments: task.config.scenes.length
      },
      logs: ["Cloudinary compilation successful", "Ready for final execution"]
    };
  }
}

/**
 * Server-Only FFmpegEngine
 * All processing happens on VPS
 */
class ServerFFmpegEngine implements IVideoEngine {
  name = "Server FFmpeg (VPS)";
  tier = "server" as const;

  async initialize(): Promise<void> {
    console.log('[ServerFFmpeg] Ready - all processing on VPS');
  }

  async process(task: EngineTask): Promise<EngineResult> {
    console.log('[ServerFFmpeg] Processing via VPS API...');
    let currentJobId: string | null = null;

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePath: task.videoUrl, // Can be local path or remote URL
          inputFileUrl: task.videoUrl.startsWith('http') ? task.videoUrl : undefined,
          outputName: task.id,
          config: task.config,
          scenes: task.config?.scenes || [],
          // Pass the execution plan for server-side logging/debugging
          executionPlan: {
            engine: "server_ffmpeg",
            routedBy: "AdvancedEngineRouter",
            timestamp: new Date().toISOString()
          },
          outputFormat: {
            width: task.outputRatio === '9:16' ? 1080 : 1920,
            height: task.outputRatio === '9:16' ? 1920 : 1080,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // 1. Check for Immediate Success (Sync)
      if ((data.header?.ok || data.ok) && (data.outputUrl || data.outputPath)) {
        return {
          success: true,
          status: 'success',
          outputType: 'video',
          videoUrl: data.outputUrl || data.outputPath,
          logs: data.logs || ['Server FFmpeg processing complete (Sync)']
        };
      }

      // 2. Handle Async Job (202 Accepted)
      if (response.status === 202 && data.jobId) {
        currentJobId = data.jobId;
        console.log(`[ServerFFmpeg] Job Queued: ${currentJobId}. Starting Poll Loop...`);

        // POLL LOOP
        const maxAttempts = 120; // 4 minutes (2s interval)
        let attempts = 0;

        while (attempts < maxAttempts) {
          attempts++;
          await new Promise(r => setTimeout(r, 2000)); // Wait 2s

          try {
            const pollRes = await fetch(`/api/jobs/${currentJobId}`);
            if (!pollRes.ok) continue;

            const jobData = await pollRes.json();
            console.log(`[ServerFFmpeg] Poll ${currentJobId}: ${jobData.status}`);

            if (jobData.status === 'done' && jobData.output) {
              return {
                success: true,
                status: 'success',
                outputType: 'video',
                videoUrl: jobData.output.outputUrl || jobData.output.outputPath,
                jobId: currentJobId,
                logs: ['Job completed successfully', ...(jobData.logs || [])]
              };
            }

            if (jobData.status === 'error') {
              throw new Error(jobData.error?.message || 'Job failed on server');
            }
          } catch (pollErr) {
            console.warn(`[ServerFFmpeg] Poll error:`, pollErr);
            // Don't throw immediately, allow retries for network glitches
          }
        }

        throw new Error('Server rendering timed out (polling limit reached)');
      }

      throw new Error('Server returned unexpected response type');

    } catch (err: any) {
      console.error('[ServerFFmpeg] Error:', err);
      return {
        success: false,
        status: 'failed',
        outputType: 'job', // Failed job
        error: err.message || 'Server connection failed',
        jobId: currentJobId || undefined,
        logs: [`Error: ${err.message}`]
      };
    }
  }

  isReady(): boolean {
    return true;
  }
}

export class AdvancedEngineRouter {
  private static serverEngine: IVideoEngine | null = null;

  /**
   * Selects the engine based on Capability, Tier, and Mode overrides.
   */
  static selectEngine(req: RoutingRequest): EngineSpecs {
    const mode = req.renderingMode || 'auto';
    const plan = req.plan;

    console.log(`[Router] Mode: ${mode}, Tier: ${req.userTier}, Capabilities: ${plan.requiredCapabilities}`);

    // FORCE MODES
    if (mode === 'server_only') {
      return this.getServerSpec("Forced by User Mode");
    }

    // NOTE: In this architecture, we treat Cloudinary as a PLANNER.
    // Even if 'cloudinary_only' is selected, we might just be explicitly avoiding the VPS for *rendering*,
    // but the task requirements say Cloudinary shouldn't be the final renderer for advanced stuff.
    // For now, if "Cloudinary Only" is requested, we stick to it (legacy behavior), 
    // unless it's impossible, then we might fail or warn.
    // However, the Task Description says "Cloudinary MUST NOT be treated as a final renderer for advanced operations".

    // AUTO MODE LOGIC
    if (mode === 'auto') {
      const planningResult = CloudinaryPlanner.validatePlan(plan);

      if (!planningResult.feasible) {
        console.log(`[Router] Cloudinary skipped: ${planningResult.reason}. Routing to Server.`);
        return this.getServerSpec(`Cloudinary Incompatible: ${planningResult.reason}`);
      }

      // If Cloudinary IS feasible, we check preferences.
      // Generally we prefer Server for quality, but we can return Cloudinary if the user wanted a "Light" render
      // For now, based on "Server is Final Authority", we still default to Server.
      return this.getServerSpec("Auto-Default to Server Authority");
    }

    if (mode === 'cloudinary_only') {
      return {
        id: 'cloudinary', // Matches getEngineInstance check
        name: 'Cloudinary (Plan/Preview)',
        tier: 'free',
        location: 'cloud',
        maxResolution: '1080p',
        maxDurationSec: 60,
        costPerMinute: 0,
        capabilities: ['trim', 'resize']
      };
    }

    return this.getServerSpec("Default Fallback");
  }

  static getServerSpec(reason: string): EngineSpecs {
    return {
      id: "server-ffmpeg",
      name: `Server FFmpeg (${reason})`,
      tier: "free",
      location: "server",
      maxResolution: "4k",
      maxDurationSec: 600, // 10 mins
      costPerMinute: 0,
      capabilities: ["trim", "merge", "text_overlay", "transitions", "audio_mix", "resize", "speed_change"],
    };
  }

  /**
   * Always returns server engine instance
   */
  static getEngineInstance(specId: string): IVideoEngine {
    if (specId === 'cloudinary') {
      return new CloudinaryEngine();
    }
    // Default to Server
    if (!this.serverEngine) {
      this.serverEngine = new ServerFFmpegEngine();
    }
    return this.serverEngine;
  }

  // Tier levels (for compatibility)
  private static tierLevels = { free: 0, low: 1, medium: 2, premium: 3 };
}
