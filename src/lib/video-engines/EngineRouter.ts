/**
 * ENGINE ROUTER
 * 
 * DEPRECATED: Use AdvancedRouter instead.
 * This file maintained for backward compatibility only.
 * 
 * ARCHITECTURAL LAW: All rendering goes to VPS FFmpeg.
 */

import { IVideoEngine, EngineTask, EngineResult } from './types';

/**
 * VPS FFmpeg Engine - Single Implementation
 */
class VPSFFmpegEngine implements IVideoEngine {
  name = "VPS FFmpeg";
  tier = "server" as const;

  async initialize(): Promise<void> {
    console.log('[VPSFFmpeg] Ready');
  }

  async process(task: EngineTask): Promise<EngineResult> {
    console.log('[VPSFFmpeg] Processing via /render/jobs...');
    
    try {
      // Use SINGLE RENDER CONTRACT
      const response = await fetch('/render/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_url: task.videoUrl,
          output_format: 'mp4',
          resolution: task.outputRatio === '9:16' ? '1080x1920' : '1920x1080',
          metadata: { taskId: task.id },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      // Poll for completion
      const jobId = data.id;
      let attempts = 0;
      
      while (attempts < 120) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
        
        const pollRes = await fetch(`/render/jobs/${jobId}`);
        if (!pollRes.ok) continue;
        
        const jobData = await pollRes.json();
        
        if (jobData.status === 'completed') {
          return {
            success: true,
            status: 'success',
            outputType: 'video',
            videoUrl: jobData.output_url || jobData.output_path,
            logs: ['Render complete'],
          };
        }
        
        if (jobData.status === 'failed') {
          throw new Error(jobData.error || 'Job failed');
        }
      }
      
      throw new Error('Render timeout');

    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        outputType: 'video',
        error: err.message,
        logs: [],
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
   * Browser engines not available - VPS only
   */
  static getBrowserEngineStatus() {
    return {
      ffmpegAvailable: false,
      webCodecsAvailable: false,
      reason: 'All rendering happens on VPS',
    };
  }

  /**
   * Returns VPS engine
   */
  static getEngine(_tier?: string): IVideoEngine {
    if (!this.instance) {
      this.instance = new VPSFFmpegEngine();
    }
    return this.instance;
  }

  static clearCache(): void {
    this.instance = null;
  }
}
