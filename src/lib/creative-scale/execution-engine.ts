/**
 * Creative Scale - Deterministic Execution Engine
 * 4-Engine Fallback Ladder for Fault-Tolerant Video Rendering
 * 
 * Engine 1: Browser FFmpeg (WASM)
 * Engine 2: Cloud FFmpeg (fal.ai)
 * Engine 3: Cloudinary Video API
 * Engine 4: No-Render Safe Fallback
 */

import { ExecutionPlan } from './compiler-types';
import { VideoAnalysis, CreativeBlueprint } from './types';
import { checkFFmpegEnvironment, getFFmpegAdapter } from './ffmpeg-adapter';
import { supabase } from '@/integrations/supabase/client';

// ============================================
// EXECUTION RESULT CONTRACT
// ============================================

export type EngineType = 'ffmpeg-browser' | 'ffmpeg-cloud' | 'cloudinary' | 'no-render';

export interface ExecutionResult {
  status: 'success' | 'partial_success' | 'failed';
  engine_used: EngineType;
  output_video_url?: string;
  execution_plan_json: string;
  ffmpeg_command?: string;
  error_code?: string;
  error_message?: string;
  processing_time_ms: number;
  fallbackChain: EngineAttempt[];
}

export interface EngineAttempt {
  engine: EngineType;
  attempted_at: string;
  success: boolean;
  error?: string;
  duration_ms: number;
}

export interface ExecutionContext {
  plan: ExecutionPlan;
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint;
  userId?: string;
  variationIndex?: number;
  onProgress?: (engine: EngineType, progress: number, message: string) => void;
  onEngineSwitch?: (from: EngineType | null, to: EngineType, reason: string) => void;
}

// ============================================
// ENGINE 1: BROWSER FFMPEG (WASM)
// ============================================

async function executeBrowserFFmpeg(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number }> {
  const start = Date.now();
  
  ctx.onProgress?.('ffmpeg-browser', 0, 'Checking browser FFmpeg environment...');
  
  // Check environment
  const envCheck = checkFFmpegEnvironment();
  if (!envCheck.ready) {
    return {
      success: false,
      error: `Browser FFmpeg unavailable: ${envCheck.reason}`,
      duration_ms: Date.now() - start,
    };
  }

  ctx.onProgress?.('ffmpeg-browser', 10, 'Initializing FFmpeg WASM...');

  try {
    const adapter = getFFmpegAdapter();
    
    const result = await adapter.execute(ctx.plan, {
      onProgress: (progress) => {
        ctx.onProgress?.('ffmpeg-browser', 10 + progress * 0.8, `Rendering: ${Math.round(progress * 100)}%`);
      },
      onLog: (msg) => console.log('[Browser FFmpeg]', msg),
      timeoutMs: 120000, // 2 minute timeout
    });

    if (result.success && result.video_url && result.video_blob && result.video_blob.size > 1000) {
      ctx.onProgress?.('ffmpeg-browser', 100, 'Video rendered successfully');
      return {
        success: true,
        video_url: result.video_url,
        duration_ms: Date.now() - start,
      };
    }

    return {
      success: false,
      error: result.error || 'Output video invalid or too small',
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Browser FFmpeg crashed',
      duration_ms: Date.now() - start,
    };
  }
}

// ============================================
// ENGINE 2: CLOUD FFMPEG (fal.ai)
// ============================================

async function executeCloudFFmpeg(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number }> {
  const start = Date.now();
  
  ctx.onProgress?.('ffmpeg-cloud', 0, 'Sending to cloud FFmpeg (fal.ai)...');

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
        error: `Cloud FFmpeg error: ${error.message}`,
        duration_ms: Date.now() - start,
      };
    }

    if (data?.success && data?.video_url) {
      ctx.onProgress?.('ffmpeg-cloud', 100, 'Cloud rendering complete');
      return {
        success: true,
        video_url: data.video_url,
        duration_ms: Date.now() - start,
      };
    }

    return {
      success: false,
      error: data?.error || 'Cloud FFmpeg returned no video',
      duration_ms: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Cloud FFmpeg request failed',
      duration_ms: Date.now() - start,
    };
  }
}

// ============================================
// ENGINE 3: CLOUDINARY VIDEO API
// ============================================

async function executeCloudinaryVideo(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number }> {
  const start = Date.now();
  
  ctx.onProgress?.('cloudinary', 0, 'Using Cloudinary video transformation...');

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
// ENGINE 4: NO-RENDER SAFE FALLBACK
// ============================================

function executeNoRenderFallback(
  ctx: ExecutionContext,
  fallbackChain: EngineAttempt[]
): ExecutionResult {
  // Generate FFmpeg command for manual execution
  const mainSegments = ctx.plan.timeline.filter(s => s.track === 'video' || (s.track as string) === 'main');
  const sourceUrl = mainSegments[0]?.asset_url || 'INPUT_VIDEO_URL';
  const speed = mainSegments[0]?.speed_multiplier || 1.0;
  const { width, height } = ctx.plan.output_format;
  const duration = Math.min(ctx.plan.validation.total_duration_ms / 1000, 60);

  const ffmpegCommand = `ffmpeg -y -i "${sourceUrl}" -vf "setpts=PTS/${speed},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" -t ${duration} -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p output.mp4`;

  return {
    status: 'partial_success',
    engine_used: 'no-render',
    execution_plan_json: JSON.stringify(ctx.plan, null, 2),
    ffmpeg_command: ffmpegCommand,
    error_code: 'ALL_ENGINES_FAILED',
    error_message: 'All video rendering engines failed. Download the execution plan and FFmpeg command to render locally.',
    processing_time_ms: fallbackChain.reduce((sum, a) => sum + a.duration_ms, 0),
    fallbackChain: fallbackChain,
  };
}

// ============================================
// MAIN EXECUTION LADDER
// ============================================

export async function executeWithFallback(ctx: ExecutionContext): Promise<ExecutionResult> {
  const fallbackChain: EngineAttempt[] = [];
  const totalStart = Date.now();

  // Validate plan
  if (!ctx.plan || ctx.plan.status !== 'compilable') {
    return {
      status: 'failed',
      engine_used: 'no-render',
      execution_plan_json: JSON.stringify(ctx.plan, null, 2),
      error_code: 'INVALID_PLAN',
      error_message: 'Execution plan is invalid or not compilable',
      processing_time_ms: 0,
      fallbackChain: [],
    };
  }

  // ==============================
  // ENGINE 1: Browser FFmpeg
  // ==============================
  ctx.onEngineSwitch?.(null, 'ffmpeg-browser', 'Starting with browser FFmpeg');
  
  const browserResult = await executeBrowserFFmpeg(ctx);
  fallbackChain.push({
    engine: 'ffmpeg-browser',
    attempted_at: new Date().toISOString(),
    success: browserResult.success,
    error: browserResult.error,
    duration_ms: browserResult.duration_ms,
  });

  if (browserResult.success && browserResult.video_url) {
    return {
      status: 'success',
      engine_used: 'ffmpeg-browser',
      output_video_url: browserResult.video_url,
      execution_plan_json: JSON.stringify(ctx.plan, null, 2),
      processing_time_ms: Date.now() - totalStart,
      fallbackChain,
    };
  }

  console.log('[ExecutionEngine] Browser FFmpeg failed:', browserResult.error);

  // ==============================
  // ENGINE 2: Cloud FFmpeg (fal.ai)
  // ==============================
  ctx.onEngineSwitch?.('ffmpeg-browser', 'ffmpeg-cloud', browserResult.error || 'Browser FFmpeg failed');
  
  const cloudResult = await executeCloudFFmpeg(ctx);
  fallbackChain.push({
    engine: 'ffmpeg-cloud',
    attempted_at: new Date().toISOString(),
    success: cloudResult.success,
    error: cloudResult.error,
    duration_ms: cloudResult.duration_ms,
  });

  if (cloudResult.success && cloudResult.video_url) {
    return {
      status: 'success',
      engine_used: 'ffmpeg-cloud',
      output_video_url: cloudResult.video_url,
      execution_plan_json: JSON.stringify(ctx.plan, null, 2),
      processing_time_ms: Date.now() - totalStart,
      fallbackChain,
    };
  }

  console.log('[ExecutionEngine] Cloud FFmpeg failed:', cloudResult.error);

  // ==============================
  // ENGINE 3: Cloudinary Video API
  // ==============================
  ctx.onEngineSwitch?.('ffmpeg-cloud', 'cloudinary', cloudResult.error || 'Cloud FFmpeg failed');
  
  const cloudinaryResult = await executeCloudinaryVideo(ctx);
  fallbackChain.push({
    engine: 'cloudinary',
    attempted_at: new Date().toISOString(),
    success: cloudinaryResult.success,
    error: cloudinaryResult.error,
    duration_ms: cloudinaryResult.duration_ms,
  });

  if (cloudinaryResult.success && cloudinaryResult.video_url) {
    return {
      status: 'success',
      engine_used: 'cloudinary',
      output_video_url: cloudinaryResult.video_url,
      execution_plan_json: JSON.stringify(ctx.plan, null, 2),
      processing_time_ms: Date.now() - totalStart,
      fallbackChain,
    };
  }

  console.log('[ExecutionEngine] Cloudinary failed:', cloudinaryResult.error);

  // ==============================
  // ENGINE 4: No-Render Safe Fallback
  // ==============================
  ctx.onEngineSwitch?.('cloudinary', 'no-render', cloudinaryResult.error || 'All engines exhausted');
  ctx.onProgress?.('no-render', 100, 'Generating downloadable execution plan...');

  return executeNoRenderFallback(ctx, fallbackChain);
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
