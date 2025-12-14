/**
 * Advanced Engine Router - Server-only rendering
 * All video processing routed to VPS server
 */

import { ENGINE_REGISTRY, EngineSpecs, ScenePlan } from "./registry-types";
import { IVideoEngine, EngineTask, EngineResult } from "./types";

export interface RoutingRequest {
  plan: ScenePlan;
  userTier: "free" | "low" | "medium" | "premium";
  preferLocal?: boolean;
}

/**
 * Server-Only FFmpeg Engine
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
          sourcePath: task.videoUrl,
          outputName: task.id,
          config: task.config,
          scenes: task.config?.scenes || []
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.outputPath) {
        return {
          success: true,
          videoUrl: data.outputPath,
          logs: data.logs || ['Server FFmpeg processing complete']
        };
      }

      return {
        success: false,
        error: data.error || 'Server processing failed',
        logs: data.logs || []
      };
    } catch (err: any) {
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
   * Always selects server engine - browser engines removed
   */
  static selectEngine(_req: RoutingRequest): EngineSpecs {
    // Return server FFmpeg spec
    return {
      id: "server-ffmpeg",
      name: "Server FFmpeg (VPS)",
      tier: "free",
      location: "server",
      maxResolution: "4k",
      maxDurationSec: 600,
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
  
  private static isTierSufficient(userTier: string, engineTier: string): boolean {
    return this.tierLevels[userTier as keyof typeof this.tierLevels] >= 
           this.tierLevels[engineTier as keyof typeof this.tierLevels];
  }

  private static resLevels = { "720p": 0, "1080p": 1, "4k": 2 };
  
  private static compareResolution(a: string, b: string): number {
    const la = this.resLevels[a as keyof typeof this.resLevels] || 0;
    const lb = this.resLevels[b as keyof typeof this.resLevels] || 0;
    return la - lb;
  }
}
