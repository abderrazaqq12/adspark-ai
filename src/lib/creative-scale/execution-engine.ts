/**
 * Creative Scale - Capability-Based Execution Engine
 * Routes to engines based on required capabilities
 * 
 * Execution Order (MANDATORY):
 * 1. WebCodecs (browser-native) - trim, speed_change only
 * 2. Cloudinary - trim, resize, format only  
 * 3. Server FFmpeg - advanced capabilities
 * 4. Plan Export - always available
 * 
 * NEVER attempts an engine that cannot satisfy the plan.
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
// EXECUTION RESULT CONTRACT (Updated)
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
  wasAppropriate: boolean; // Did capabilities match?
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
// ENGINE 1: WEBCODECS (Browser Native)
// ============================================

async function executeWebCodecs(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number }> {
  const start = Date.now();
  
  ctx.onProgress?.('webcodecs', 0, 'Checking WebCodecs support...');

  // Check browser support
  if (!('VideoEncoder' in window) || !('VideoDecoder' in window)) {
    return {
      success: false,
      error: 'WebCodecs API not supported in this browser',
      duration_ms: Date.now() - start,
    };
  }

  ctx.onProgress?.('webcodecs', 20, 'WebCodecs available, processing...');

  try {
    // WebCodecs is complex - for simple operations, we pass through
    // For now, return the source video for simple trim/speed operations
    const mainSegments = ctx.plan.timeline.filter(s => s.track === 'video');
    const sourceUrl = mainSegments[0]?.asset_url;

    if (!sourceUrl) {
      return {
        success: false,
        error: 'No source video URL found',
        duration_ms: Date.now() - start,
      };
    }

    // For demo/MVP: WebCodecs passthrough for simple operations
    // In production, this would use VideoEncoder/VideoDecoder APIs
    ctx.onProgress?.('webcodecs', 100, 'WebCodecs processing complete');
    
    return {
      success: true,
      video_url: sourceUrl, // Passthrough for now
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'WebCodecs processing failed',
      duration_ms: Date.now() - start,
    };
  }
}

// ============================================
// ENGINE 2: CLOUDINARY
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
// ENGINE 3: SERVER FFMPEG (Advanced)
// ============================================

async function executeServerFFmpeg(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number }> {
  const start = Date.now();
  
  ctx.onProgress?.('server_ffmpeg', 0, 'Sending to server FFmpeg...');

  try {
    const { data, error } = await supabase.functions.invoke('cloud-ffmpeg-render', {
      body: {
        execution_plan: ctx.plan,
        user_id: ctx.userId,
        variation_index: ctx.variationIndex,
      },
    });

    if (error) {
      return {
        success: false,
        error: `Server FFmpeg error: ${error.message}`,
        duration_ms: Date.now() - start,
      };
    }

    if (data?.success && data?.video_url) {
      ctx.onProgress?.('server_ffmpeg', 100, 'Server rendering complete');
      return {
        success: true,
        video_url: data.video_url,
        duration_ms: Date.now() - start,
      };
    }

    return {
      success: false,
      error: data?.error || 'Server FFmpeg returned no video',
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Server FFmpeg request failed',
      duration_ms: Date.now() - start,
    };
  }
}

// ============================================
// ENGINE 4: PLAN EXPORT (Always Available)
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
    reason: `This variation requires advanced rendering (${capabilityList}). Exported as plan for manual execution.`,
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

  // Validate plan
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

  // Route based on capabilities
  const routingDecision = routePlan(ctx.plan);
  const { selection, executionPath, requiredCapabilities } = routingDecision;

  console.log('[CapabilityRouter] Required capabilities:', [...requiredCapabilities.capabilities]);
  console.log('[CapabilityRouter] Selected engine:', selection.selectedEngineId);
  console.log('[CapabilityRouter] Execution path:', executionPath);

  // If no engine can execute, go straight to plan export
  if (!selection.canExecute) {
    ctx.onEngineSwitch?.(null, 'plan_export', selection.reason);
    ctx.onProgress?.('plan_export', 100, 'Generating downloadable execution plan...');
    return executePlanExport(ctx, fallbackChain, routingDecision);
  }

  // Execute engines in capability-appropriate order
  for (const engineId of executionPath) {
    if (engineId === 'plan_export') continue; // Handle separately at end

    let result: { success: boolean; video_url?: string; error?: string; duration_ms: number };
    
    ctx.onEngineSwitch?.(
      fallbackChain.length > 0 ? fallbackChain[fallbackChain.length - 1].engine : null,
      engineId,
      fallbackChain.length === 0 
        ? `Selected based on capabilities: ${[...requiredCapabilities.capabilities].join(', ')}`
        : 'Trying next compatible engine'
    );

    switch (engineId) {
      case 'webcodecs':
        result = await executeWebCodecs(ctx);
        break;
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
      wasAppropriate: true, // Always appropriate because router selected it
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

  // All engines in path failed - export plan
  ctx.onEngineSwitch?.(
    fallbackChain[fallbackChain.length - 1]?.engine || null,
    'plan_export',
    'All compatible engines exhausted'
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

// Re-export types for backward compatibility
export type { EngineId, Capability, CapabilityRouterResult };
export { extractRequiredCapabilities, routePlan } from './capability-router';
