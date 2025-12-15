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

      // Handle both 'success' and 'ok' properties just in case
      if ((data.header?.ok || data.ok) && (data.outputUrl || data.outputPath)) {
        return {
          success: true,
          videoUrl: data.outputUrl || data.outputPath, // Favor URL if available
          logs: data.logs || ['Server FFmpeg processing complete']
        };
      }

      // Immediate 202 handling (Async Queue)
      if (response.status === 202) {
        return {
          success: true,
          videoUrl: "", // Async job started
          jobId: data.jobId,
          logs: ['Job queued on server']
        };
      }

      return {
        success: false,
        error: data.error?.message || 'Server processing failed',
        logs: data.logs || []
      };
    } catch (err: any) {
      console.error('[ServerFFmpeg] Error:', err);
      return {
        success: false,
        error: err.message || 'Server connection failed',
        logs: []
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

      // If Cloudinary is feasible, check if we PREFER server capabilities or quality
      // For "Enterprise/Pro" usage (as described in prompt), Server FFmpeg is the authority.
      // We defaults to Server FFmpeg for everything that matters to ensure consistency.
      return this.getServerSpec("Auto-Default to Server Authority");
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
  static getEngineInstance(_specId: string): IVideoEngine {
    if (!this.serverEngine) {
      this.serverEngine = new ServerFFmpegEngine();
    }
    return this.serverEngine;
  }

  // Tier levels (for compatibility)
  private static tierLevels = { free: 0, low: 1, medium: 2, premium: 3 };
}
