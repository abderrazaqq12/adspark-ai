/**
 * Creative Scale - Unified Execution Engine
 * SINGLE SOURCE OF TRUTH (HOSTINGER VPS)
 * 
 * Replaces old capability router and multi-engine fallback logic.
 * All plans are sent to the Unified FFmpeg Engine on the VPS.
 */

import { ExecutionPlan } from './compiler-types';
import { VideoAnalysis, CreativeBlueprint } from './types';
import { RenderFlowApi } from '@/renderflow/api';
import { executionDebugLogger } from './execution-debug';

// ============================================
// EXECUTION RESULT CONTRACT
// ============================================

export type ExecutionStatus = 'success' | 'partial' | 'failed';
export type EngineId = 'unified_server';

export interface ExecutionResult {
  status: ExecutionStatus;
  engine_used: EngineId;
  output_type?: 'video';
  output_video_url?: string;
  execution_plan_json: string;
  processing_time_ms: number;
  // Legacy compatibility
  error?: string;
}

export interface ExecutionContext {
  plan: ExecutionPlan;
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint;
  sourceVideoUrl?: string; // Source video URL for rendering
  userId?: string;
  variationIndex?: number;
  onProgress?: (engine: EngineId, progress: number, message: string, metadata?: any) => void;
}

// ============================================
// UNIFIED EXECUTOR
// ============================================

export async function executeUnifiedStrategy(ctx: ExecutionContext): Promise<ExecutionResult> {
  const start = Date.now();
  const index = ctx.variationIndex || 0;

  console.log(`[UnifiedEngine] ========== EXECUTION START ==========`);
  console.log(`[UnifiedEngine] Variation Index: ${index}`);
  console.log(`[UnifiedEngine] Source Video URL: ${ctx.sourceVideoUrl || 'NOT PROVIDED'}`);
  console.log(`[UnifiedEngine] Plan ID: ${ctx.plan.plan_id}`);
  console.log(`[UnifiedEngine] Timeline Segments: ${ctx.plan.timeline?.length || 0}`);
  console.log(`[UnifiedEngine] Audio Tracks: ${ctx.plan.audio_tracks?.length || 0}`);
  console.log(`[UnifiedEngine] Full Plan:`, JSON.stringify(ctx.plan, null, 2));
  
  ctx.onProgress?.('unified_server', 0, 'Initializing Unified Engine...');

  executionDebugLogger.logEngineDispatch(
    index,
    'unified_server',
    'POST /render/submit',
    'POST',
    {
      planSegments: ctx.plan.timeline?.length || 0,
      audioTracks: ctx.plan.audio_tracks?.length || 0
    }
  );

  try {
    // 1. Submit Job
    console.log(`[UnifiedEngine] Submitting plan to VPS...`);
    ctx.onProgress?.('unified_server', 10, 'Submitting to VPS...');
    const submitResult = await RenderFlowApi.submitPlan(ctx.plan, ctx.sourceVideoUrl);
    console.log(`[UnifiedEngine] Submit Result:`, submitResult);

    // 2. Poll for Completion
    const result = await pollJobStatus(submitResult.ids[0], ctx);
    const duration = Date.now() - start;

    return {
      status: 'success',
      engine_used: 'unified_server',
      output_type: 'video',
      output_video_url: result.outputUrl,
      execution_plan_json: JSON.stringify(ctx.plan),
      processing_time_ms: duration
    };

  } catch (err: any) {
    const duration = Date.now() - start;
    console.error(`[UnifiedEngine] Error:`, err);
    ctx.onProgress?.('unified_server', 0, `Failed: ${err.message}`);

    executionDebugLogger.logEngineError(
      index,
      'unified_server',
      err.message,
      err.stack
    );

    return {
      status: 'failed',
      engine_used: 'unified_server',
      execution_plan_json: JSON.stringify(ctx.plan),
      processing_time_ms: duration,
      error: err.message
    };
  }
}

// ============================================
// POLLING HELPER
// ============================================

async function pollJobStatus(jobId: string, ctx: ExecutionContext): Promise<{ outputUrl: string }> {
  const POLLING_INTERVAL = 2000;
  const MAX_ATTEMPTS = 300; // 10 minutes
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    attempts++;

    try {
      const status = await RenderFlowApi.getJobStatus(jobId);

      // Update Progress
      ctx.onProgress?.('unified_server', Math.max(10, status.progress_pct || 0), `Processing... (${status.state})`, { jobId });

      if (status.state === 'done') {
        if (status.output?.output_url) {
          return { outputUrl: status.output.output_url };
        } else if ((status.output as any)?.output_path) {
          // Fallback if URL is missing for some reason
          return { outputUrl: (status.output as any).output_path };
        }

        const warning = 'Job marked done but no video artifact found.';
        console.warn(`[UnifiedEngine] ${warning}`, status);
        // Keep polling? No, done is done.
        throw new Error(warning);
      }

      if (status.state === 'failed') {
        throw new Error(status.error?.message || 'Job failed on server');
      }

    } catch (pollErr: any) {
      console.warn(`[UnifiedEngine] Poll error:`, pollErr);
      if (attempts % 5 === 0) ctx.onProgress?.('unified_server', 10, 'Waiting for server response...');
    }
  }

  throw new Error('Polling timed out. Server took too long.');
}

export { executionDebugLogger } from './execution-debug';
