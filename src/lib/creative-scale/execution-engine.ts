/**
 * Creative Scale - Capability-Based Execution Engine
 * SERVER-ONLY RENDERING - No browser FFmpeg
 * 
 * Execution Order:
 * 1. Cloudinary - basic transformations
 * 2. Server FFmpeg (VPS) - advanced capabilities
 * 3. Plan Export - always available
 */

import { ExecutionPlan } from './compiler-types';
import { VideoAnalysis, CreativeBlueprint } from './types';
import { supabase } from '@/integrations/supabase/client';
import {
  EngineId,
  routePlan,
  extractRequiredCapabilities,
  CapabilityRouterResult,
  Capability,
} from './capability-router';

// ============================================
// EXECUTION RESULT CONTRACT
// ============================================

export type ExecutionStatus = 'success' | 'partial' | 'plan_only' | 'failed';

export interface ExecutionResult {
  status: ExecutionStatus;
  engine_used: EngineId;
  output_video_url?: string;
  plan_url?: string;
  execution_plan_json: string;
  ffmpeg_command?: string;
  reason?: string;
  processing_time_ms: number;
  fallbackChain: EngineAttempt[];
  routingDecision: CapabilityRouterResult;
}

export interface EngineAttempt {
  engine: EngineId;
  attempted_at: string;
  success: boolean;
  error?: string;
  duration_ms: number;
  wasAppropriate: boolean;
}

export interface ExecutionContext {
  plan: ExecutionPlan;
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint;
  userId?: string;
  variationIndex?: number;
  onProgress?: (engine: EngineId, progress: number, message: string) => void;
  onEngineSwitch?: (from: EngineId | null, to: EngineId, reason: string) => void;
}

// ============================================
// ENGINE 1: CLOUDINARY
// ============================================

async function executeCloudinary(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number }> {
  const start = Date.now();
  
  ctx.onProgress?.('cloudinary', 0, 'Sending to Cloudinary...');

  try {
    const { data, error } = await supabase.functions.invoke('cloudinary-video-render', {
      body: {
        execution_plan: ctx.plan,
        user_id: ctx.userId,
        variation_index: ctx.variationIndex,
      },
    });

    if (error) {
      return {
        success: false,
        error: `Cloudinary error: ${error.message}`,
        duration_ms: Date.now() - start,
      };
    }

    if (data?.success && data?.video_url) {
      ctx.onProgress?.('cloudinary', 100, 'Cloudinary transformation ready');
      return {
        success: true,
        video_url: data.video_url,
        duration_ms: Date.now() - start,
      };
    }

    return {
      success: false,
      error: data?.error || 'Cloudinary returned no video',
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Cloudinary request failed',
      duration_ms: Date.now() - start,
    };
  }
}

// ============================================
// ENGINE 2: SERVER FFMPEG (VPS)
// HARD REQUIREMENT: VPS API ONLY - NO FAL.AI, NO CLOUD FALLBACK
// ============================================

async function executeServerFFmpeg(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number }> {
  const start = Date.now();
  
  ctx.onProgress?.('server_ffmpeg', 0, 'Sending to VPS server...');

  try {
    // VPS API ONLY - No cloud fallback allowed
    const vpsResponse = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        execution_plan: ctx.plan,
        user_id: ctx.userId,
        variation_index: ctx.variationIndex,
      }),
    });

    // Check for non-JSON response (Nginx misconfiguration)
    const contentType = vpsResponse.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.error('[ServerFFmpeg] Non-JSON response - check Nginx /api proxy');
      return {
        success: false,
        error: 'API routing misconfigured. Check Nginx /api proxy.',
        duration_ms: Date.now() - start,
      };
    }

    const data = await vpsResponse.json();

    if (!vpsResponse.ok) {
      console.error('[ServerFFmpeg] VPS API error:', data);
      return {
        success: false,
        error: data?.error?.message || data?.error || `VPS API returned ${vpsResponse.status}`,
        duration_ms: Date.now() - start,
      };
    }

    if (data.ok && (data.jobId || data.outputPath || data.outputUrl)) {
      ctx.onProgress?.('server_ffmpeg', 100, 'VPS rendering complete');
      return {
        success: true,
        video_url: data.outputUrl || data.outputPath || `/outputs/${data.jobId}`,
        duration_ms: Date.now() - start,
      };
    }

    // Check legacy response format
    if (data.success && data.outputPath) {
      ctx.onProgress?.('server_ffmpeg', 100, 'VPS rendering complete');
      return {
        success: true,
        video_url: data.outputPath,
        duration_ms: Date.now() - start,
      };
    }

    return {
      success: false,
      error: data?.error || 'VPS FFmpeg returned no output',
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    console.error('[ServerFFmpeg] Exception:', err);
    return {
      success: false,
      error: err.message || 'VPS server request failed',
      duration_ms: Date.now() - start,
    };
  }
}

// ============================================
// ENGINE 3: PLAN EXPORT (Always Available)
// ============================================

function executePlanExport(
  ctx: ExecutionContext,
  fallbackChain: EngineAttempt[],
  routingDecision: CapabilityRouterResult
): ExecutionResult {
  const mainSegments = ctx.plan.timeline.filter(s => s.track === 'video');
  const sourceUrl = mainSegments[0]?.asset_url || 'INPUT_VIDEO_URL';
  const speed = mainSegments[0]?.speed_multiplier || 1.0;
  const { width, height } = ctx.plan.output_format;
  const duration = Math.min(ctx.plan.validation.total_duration_ms / 1000, 60);

  const ffmpegCommand = `ffmpeg -y -i "${sourceUrl}" -vf "setpts=PTS/${speed},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" -t ${duration} -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p output.mp4`;

  const requiredCaps = [...routingDecision.requiredCapabilities.capabilities];
  const capabilityList = requiredCaps.length > 0 ? requiredCaps.join(', ') : 'standard';

  return {
    status: 'plan_only',
    engine_used: 'plan_export',
    execution_plan_json: JSON.stringify(ctx.plan, null, 2),
    ffmpeg_command: ffmpegCommand,
    reason: `This variation requires advanced rendering (${capabilityList}). Exported as plan for server execution.`,
    processing_time_ms: fallbackChain.reduce((sum, a) => sum + a.duration_ms, 0),
    fallbackChain,
    routingDecision,
  };
}

// ============================================
// MAIN CAPABILITY-BASED EXECUTION
// ============================================

export async function executeWithFallback(ctx: ExecutionContext): Promise<ExecutionResult> {
  const fallbackChain: EngineAttempt[] = [];
  const totalStart = Date.now();

  if (!ctx.plan || ctx.plan.status !== 'compilable') {
    const routingDecision = routePlan(ctx.plan);
    return {
      status: 'failed',
      engine_used: 'plan_export',
      execution_plan_json: JSON.stringify(ctx.plan, null, 2),
      reason: 'Execution plan is invalid or not compilable',
      processing_time_ms: 0,
      fallbackChain: [],
      routingDecision,
    };
  }

  const routingDecision = routePlan(ctx.plan);
  const { selection, executionPath, requiredCapabilities } = routingDecision;

  console.log('[CapabilityRouter] Required capabilities:', [...requiredCapabilities.capabilities]);
  console.log('[CapabilityRouter] Selected engine:', selection.selectedEngineId);
  console.log('[CapabilityRouter] Execution path:', executionPath);

  if (!selection.canExecute) {
    ctx.onEngineSwitch?.(null, 'plan_export', selection.reason);
    ctx.onProgress?.('plan_export', 100, 'Generating downloadable execution plan...');
    return executePlanExport(ctx, fallbackChain, routingDecision);
  }

  for (const engineId of executionPath) {
    if (engineId === 'plan_export') continue;

    let result: { success: boolean; video_url?: string; error?: string; duration_ms: number };
    
    ctx.onEngineSwitch?.(
      fallbackChain.length > 0 ? fallbackChain[fallbackChain.length - 1].engine : null,
      engineId,
      fallbackChain.length === 0 
        ? `Selected based on capabilities: ${[...requiredCapabilities.capabilities].join(', ')}`
        : 'Trying next compatible engine'
    );

    switch (engineId) {
      case 'cloudinary':
        result = await executeCloudinary(ctx);
        break;
      case 'server_ffmpeg':
        result = await executeServerFFmpeg(ctx);
        break;
      default:
        continue;
    }

    fallbackChain.push({
      engine: engineId,
      attempted_at: new Date().toISOString(),
      success: result.success,
      error: result.error,
      duration_ms: result.duration_ms,
      wasAppropriate: true,
    });

    if (result.success && result.video_url) {
      return {
        status: 'success',
        engine_used: engineId,
        output_video_url: result.video_url,
        execution_plan_json: JSON.stringify(ctx.plan, null, 2),
        processing_time_ms: Date.now() - totalStart,
        fallbackChain,
        routingDecision,
      };
    }

    console.log(`[ExecutionEngine] ${engineId} failed:`, result.error);
  }

  ctx.onEngineSwitch?.(
    fallbackChain[fallbackChain.length - 1]?.engine || null,
    'plan_export',
    'All server engines exhausted'
  );
  ctx.onProgress?.('plan_export', 100, 'Generating downloadable execution plan...');

  return executePlanExport(ctx, fallbackChain, routingDecision);
}

// ============================================
// BATCH EXECUTION
// ============================================

export async function executeBatch(
  contexts: ExecutionContext[],
  onVariationComplete?: (index: number, result: ExecutionResult) => void
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (let i = 0; i < contexts.length; i++) {
    const ctx = contexts[i];
    ctx.variationIndex = i;
    
    const result = await executeWithFallback(ctx);
    results.push(result);
    
    onVariationComplete?.(i, result);
  }

  return results;
}

export type { EngineId, Capability, CapabilityRouterResult };
export { extractRequiredCapabilities, routePlan } from './capability-router';
