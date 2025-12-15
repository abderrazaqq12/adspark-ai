/**
 * Engine Router - Server-only rendering
 * All video processing happens on the VPS server
 */

import { IVideoEngine, EngineTask, EngineResult } from './types';

/**
 * Server-Only FFmpeg Engine
 * Sends render requests to VPS API
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
      // Call the VPS API endpoint
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
          status: 'success' as const,
          outputType: 'video' as const,
          videoUrl: data.outputPath,
          logs: data.logs || ['Server FFmpeg processing complete']
        };
      }

      return {
        success: false,
        status: 'failed' as const,
        outputType: 'video' as const,
        error: data.error || 'Server processing failed',
        logs: data.logs || []
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'failed' as const,
        outputType: 'video' as const,
        error: err.message || 'Server connection failed',
        logs: []
      };
    }
  }

  isReady(): boolean {
    return true;
  }
}

export class EngineRouter {
  private static instance: IVideoEngine | null = null;

  /**
   * Get server status - browser engines no longer available
   */
  static getBrowserEngineStatus(): {
    ffmpegAvailable: boolean;
    webCodecsAvailable: boolean;
    reason: string;
  } {
    return {
      ffmpegAvailable: false,
      webCodecsAvailable: false,
      reason: 'Browser rendering disabled - using VPS server'
    };
  }

  /**
   * Always returns server engine
   */
  static getEngine(_tier?: "free" | "low" | "medium" | "premium"): IVideoEngine {
    if (!this.instance) {
      this.instance = new ServerFFmpegEngine();
    }
    return this.instance;
  }

  /**
   * Clear cached engine instance
   */
  static clearCache(): void {
    this.instance = null;
  }
}
