/**
 * Creative Scale - Capability-Based Execution Engine
 * SERVER-ONLY RENDERING - No browser FFmpeg
 * WITH DEEP EXECUTION DEBUGGING
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
  ENGINE_CAPABILITIES,
} from './capability-router';
import {
  executionDebugLogger,
  EngineEvaluation
} from './execution-debug';

// ============================================
// EXECUTION RESULT CONTRACT
// ============================================

export type ExecutionStatus = 'success' | 'partial' | 'plan_only' | 'failed';

export interface ExecutionResult {
  status: ExecutionStatus;
  engine_used: EngineId;
  output_type?: 'video' | 'plan';
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

import { RenderingMode } from './capability-router';

export interface ExecutionContext {
  plan: ExecutionPlan;
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint;
  userId?: string;
  variationIndex?: number;
  renderingMode?: RenderingMode; // Support overrides
  onProgress?: (engine: EngineId, progress: number, message: string) => void;
  onEngineSwitch?: (from: EngineId | null, to: EngineId, reason: string) => void;
}

// ============================================
// ENGINE EVALUATION FOR DEBUG
// ============================================

function evaluateEngines(
  requiredCapabilities: Set<Capability>,
  selectedEngineId: EngineId
): EngineEvaluation[] {
  return ENGINE_CAPABILITIES.map(engine => {
    const unsatisfied: Capability[] = [];
    for (const cap of requiredCapabilities) {
      if (!engine.capabilities.has(cap)) {
        unsatisfied.push(cap);
      }
    }

    const canHandle = unsatisfied.length === 0 && engine.id !== 'plan_export';

    let rejectionReason: string | undefined;
    if (!canHandle && engine.id !== 'plan_export') {
      if (unsatisfied.length > 0) {
        rejectionReason = `Missing capabilities: ${unsatisfied.join(', ')}`;
      }
    }

    return {
      engineId: engine.id,
      engineName: engine.name,
      evaluated: true,
      canHandle,
      rejectionReason,
      priority: engine.priority,
    };
  });
}

// ============================================
// ENGINE 1: CLOUDINARY
// ============================================

async function executeCloudinary(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number }> {
  const start = Date.now();
  const requestSentAt = new Date().toISOString();

  ctx.onProgress?.('cloudinary', 0, 'Sending to Cloudinary...');

  // Log dispatch
  executionDebugLogger.logEngineDispatch(
    ctx.variationIndex ?? 0,
    'cloudinary',
    'supabase.functions.invoke(cloudinary-video-render)',
    'POST',
    {
      hasExecutionPlan: !!ctx.plan,
      inputFileUrl: ctx.plan.timeline[0]?.asset_url || 'N/A',
      timelineSegments: ctx.plan.timeline.length,
      audioTracks: ctx.plan.audio_tracks.length,
      outputFormat: ctx.plan.output_format.container,
    }
  );

  try {
    const { data, error } = await supabase.functions.invoke('cloudinary-video-render', {
      body: {
        execution_plan: ctx.plan,
        user_id: ctx.userId,
        variation_index: ctx.variationIndex,
      },
    });

    const durationMs = Date.now() - start;

    // Log network response
    executionDebugLogger.logNetworkResponse(
      ctx.variationIndex ?? 0,
      'cloudinary',
      {
        endpoint: 'cloudinary-video-render',
        method: 'POST',
        requestSentAt,
        httpStatus: error ? 500 : 200,
        contentType: 'application/json',
        rawResponseBody: JSON.stringify(data || error),
        durationMs,
        connectionError: error?.message,
      }
    );

    if (error) {
      return {
        success: false,
        error: `Cloudinary error: ${error.message}`,
        duration_ms: durationMs,
      };
    }

    if (data?.success && data?.video_url) {
      ctx.onProgress?.('cloudinary', 100, 'Cloudinary transformation ready');
      return {
        success: true,
        video_url: data.video_url,
        duration_ms: durationMs,
      };
    }

    return {
      success: false,
      error: data?.error || 'Cloudinary returned no video',
      duration_ms: durationMs,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : 'Cloudinary request failed';

    executionDebugLogger.logNetworkResponse(
      ctx.variationIndex ?? 0,
      'cloudinary',
      {
        endpoint: 'cloudinary-video-render',
        method: 'POST',
        requestSentAt,
        durationMs,
        connectionError: errorMessage,
      }
    );

    return {
      success: false,
      error: errorMessage,
      duration_ms: durationMs,
    };
  }
}

// ============================================
// ENGINE 2: SERVER FFMPEG (VPS)
// HARD REQUIREMENT: VPS API ONLY - NO FAL.AI, NO CLOUD FALLBACK
// ============================================

async function executeServerFFmpeg(
  ctx: ExecutionContext
): Promise<{ success: boolean; video_url?: string; error?: string; duration_ms: number; status?: string; outputType?: string }> {
  const start = Date.now();
  const requestSentAt = new Date().toISOString();
  const endpoint = '/api/execute-plan';

  ctx.onProgress?.('server_ffmpeg', 0, 'Sending to VPS server...');

  // Log dispatch with full details
  executionDebugLogger.logEngineDispatch(
    ctx.variationIndex ?? 0,
    'server_ffmpeg',
    endpoint,
    'POST',
    {
      hasExecutionPlan: !!ctx.plan,
      inputFileUrl: ctx.plan.timeline[0]?.asset_url || 'N/A',
      timelineSegments: ctx.plan.timeline.length,
      audioTracks: ctx.plan.audio_tracks.length,
      outputFormat: ctx.plan.output_format.container,
    },
    30000 // 30s timeout
  );

  // HARD ISOLATION CHECK
  console.log('[ServerFFmpeg] Executing with HARD ISOLATION. Target:', endpoint);

  try {
    // VPS API ONLY - No cloud fallback allowed
    const vpsResponse = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: ctx.plan,
        sourceVideoUrl: ctx.plan.timeline[0]?.asset_url,
        projectId: ctx.userId,
        variationIndex: ctx.variationIndex,
      }),
    });

    const durationMs = Date.now() - start;
    const contentType = vpsResponse.headers.get('content-type') || '';

    // Get raw response text for debugging
    let rawResponseBody = '';
    let parsedData: Record<string, unknown> | null = null;
    let jsonParseError: string | undefined;

    try {
      rawResponseBody = await vpsResponse.text();
      if (contentType.includes('application/json') && rawResponseBody) {
        parsedData = JSON.parse(rawResponseBody);
      }
    } catch (e) {
      jsonParseError = e instanceof Error ? e.message : 'Failed to parse response';
    }

    // Log detailed network response
    executionDebugLogger.logNetworkResponse(
      ctx.variationIndex ?? 0,
      'server_ffmpeg',
      {
        endpoint,
        method: 'POST',
        requestSentAt,
        httpStatus: vpsResponse.status,
        httpStatusText: vpsResponse.statusText,
        contentType,
        rawResponseBody,
        jsonParseError: !contentType.includes('application/json') ? 'Response is not JSON' : jsonParseError,
        durationMs,
      }
    );

    // Check for non-JSON response (Nginx misconfiguration)
    if (!contentType.includes('application/json')) {
      console.error('[ServerFFmpeg] Non-JSON response - check Nginx /api proxy');
      console.error('[ServerFFmpeg] Content-Type:', contentType);
      console.error('[ServerFFmpeg] Response preview:', rawResponseBody.substring(0, 200));

      return {
        success: false,
        error: `CRITICAL: Server returned ${contentType || 'text/html'} instead of JSON (HTTP ${vpsResponse.status}). Likely Nginx Proxy Error or Fal.ai misrouting. Raw: ${rawResponseBody.substring(0, 100)}`,
        duration_ms: durationMs,
      };
    }

    if (!vpsResponse.ok) {
      console.error('[ServerFFmpeg] VPS API error:', parsedData);
      const errorMsg = parsedData?.error as Record<string, string> | string | undefined;
      return {
        success: false,
        error: (typeof errorMsg === 'object' ? errorMsg?.message : errorMsg) || `VPS API returned HTTP ${vpsResponse.status}`,
        duration_ms: durationMs,
      };
    }

    if (vpsResponse.status === 202 && parsedData?.jobId) {
      const jobId = parsedData.jobId as string;
      ctx.onProgress?.('server_ffmpeg', 10, `Job queued: ${jobId}. Waiting for render...`);
      console.log(`[ServerFFmpeg] Job Queued: ${jobId}. Starting Poll Loop...`);

      // POLL LOOP
      const maxAttempts = 120; // 4 minutes
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));

        try {
          // Use window.location.origin if available, or relative path
          const pollRes = await fetch(`/api/jobs/${jobId}`);
          if (!pollRes.ok) continue;

          const jobData = await pollRes.json();
          const progress = 10 + Math.min(80, Math.floor((attempts / maxAttempts) * 80));
          ctx.onProgress?.('server_ffmpeg', progress, `Rendering... (${jobData.status})`);

          if (jobData.status === 'done') {
            const finalUrl = jobData.output?.outputUrl || jobData.output?.outputPath || jobData.outputUrl || jobData.outputPath || jobData.videoUrl;

            // Log the actual structure for debugging if URL is missing
            if (!finalUrl) {
              console.warn('[ServerFFmpeg] Job done but no URL found. Response:', JSON.stringify(jobData));
            }

            if (finalUrl) {
              ctx.onProgress?.('server_ffmpeg', 100, 'Rendering complete');

              // Log final network response for debug panel
              executionDebugLogger.logNetworkResponse(
                ctx.variationIndex ?? 0,
                'server_ffmpeg',
                {
                  endpoint: `/api/jobs/${jobId}`,
                  method: 'GET',
                  requestSentAt: new Date().toISOString(),
                  durationMs: Date.now() - start,
                  rawResponseBody: JSON.stringify(jobData),
                  httpStatus: 200
                }
              );

              return {
                success: true,
                status: 'success',
                outputType: 'video',
                video_url: finalUrl,
                duration_ms: Date.now() - start,
              };
            } else {
              // Throw explicit error with payload to debug
              throw new Error(`Job marked done but no output URL found. Data: ${JSON.stringify(jobData)}`);
            }
          }

          if (jobData.status === 'error') {
            throw new Error(jobData.error?.message || 'Job failed on server');
          }
        } catch (pollErr: any) {
          console.warn(`[ServerFFmpeg] Poll error:`, pollErr);
          if (attempts % 5 === 0) ctx.onProgress?.('server_ffmpeg', 10, 'Waiting for server...');
          // Continue polling...
        }
      }

      throw new Error(`Server rendering timed out (polling limit reached for ${jobId})`);
    }

    if (parsedData?.ok && (parsedData?.outputPath || parsedData?.outputUrl)) {
      ctx.onProgress?.('server_ffmpeg', 100, 'VPS rendering complete');
      return {
        success: true,
        status: 'success',
        outputType: 'video',
        video_url: (parsedData.outputUrl || parsedData.outputPath) as string,
        duration_ms: durationMs,
      };
    }

    // Check legacy response format
    if (parsedData?.success && parsedData?.outputPath) {
      ctx.onProgress?.('server_ffmpeg', 100, 'VPS rendering complete');
      return {
        success: true,
        video_url: parsedData.outputPath as string,
        duration_ms: durationMs,
      };
    }

    return {
      success: false,
      error: (parsedData?.error as string) || 'VPS FFmpeg returned no output',
      duration_ms: durationMs,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : 'VPS server request failed';

    console.error('[ServerFFmpeg] Exception:', err);

    executionDebugLogger.logNetworkResponse(
      ctx.variationIndex ?? 0,
      'server_ffmpeg',
      {
        endpoint,
        method: 'POST',
        requestSentAt,
        durationMs,
        connectionError: errorMessage,
      }
    );

    return {
      success: false,
      error: errorMessage,
      duration_ms: durationMs,
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

  // Build specific failure reason from fallback chain
  const lastAttempt = fallbackChain[fallbackChain.length - 1];
  let specificReason = `Requires advanced rendering (${capabilityList}). Exported as plan.`;

  if (lastAttempt?.error) {
    specificReason = lastAttempt.error;
  }

  return {
    status: 'plan_only',
    engine_used: 'plan_export',
    execution_plan_json: JSON.stringify(ctx.plan, null, 2),
    ffmpeg_command: ffmpegCommand,
    reason: specificReason,
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
  const variationIndex = ctx.variationIndex ?? 0;
  const mode = ctx.renderingMode || 'auto';

  if (!ctx.plan || ctx.plan.status !== 'compilable') {
    const routingDecision = routePlan(ctx.plan, mode);
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

  const routingDecision = routePlan(ctx.plan, mode);
  const { selection, executionPath, requiredCapabilities } = routingDecision;

  // Evaluate all engines for debug info
  const engineEvaluations = evaluateEngines(requiredCapabilities.capabilities, selection.selectedEngineId);

  // Log routing decision
  executionDebugLogger.logRouting(
    variationIndex,
    ctx.plan.plan_id,
    routingDecision,
    engineEvaluations
  );

  console.log('[CapabilityRouter] Required capabilities:', [...requiredCapabilities.capabilities]);
  console.log('[CapabilityRouter] Selected engine:', selection.selectedEngineId);
  console.log('[CapabilityRouter] Execution path:', executionPath);

  if (!selection.canExecute) {
    ctx.onEngineSwitch?.(null, 'plan_export', selection.reason);
    ctx.onProgress?.('plan_export', 100, 'Generating downloadable execution plan...');

    const result = executePlanExport(ctx, fallbackChain, routingDecision);

    executionDebugLogger.logVariationComplete(variationIndex, {
      status: 'plan_only',
      engineUsed: 'plan_export',
      errorReason: selection.reason,
    });

    return result;
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
      executionDebugLogger.logVariationComplete(variationIndex, {
        status: 'success',
        engineUsed: engineId,
        videoUrl: result.video_url,
      });

      return {
        status: 'success',
        engine_used: engineId,
        output_type: (result as any).outputType || 'video',
        output_video_url: result.video_url,
        execution_plan_json: JSON.stringify(ctx.plan, null, 2),
        processing_time_ms: Date.now() - totalStart,
        fallbackChain,
        routingDecision,
      };
    }

    console.log(`[ExecutionEngine] ${engineId} failed:`, result.error);
  }

  // Build specific failure reason
  const lastError = fallbackChain[fallbackChain.length - 1]?.error || 'All engines failed';

  ctx.onEngineSwitch?.(
    fallbackChain[fallbackChain.length - 1]?.engine || null,
    'plan_export',
    lastError
  );
  ctx.onProgress?.('plan_export', 100, 'Generating downloadable execution plan...');

  executionDebugLogger.logVariationComplete(variationIndex, {
    status: 'failed',
    engineUsed: 'plan_export',
    errorReason: lastError,
  });

  return executePlanExport(ctx, fallbackChain, routingDecision);
}

// ============================================
// BATCH EXECUTION WITH DEBUG SESSION
// ============================================

export async function executeBatch(
  contexts: ExecutionContext[],
  onVariationComplete?: (index: number, result: ExecutionResult) => void
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  // Start debug session
  executionDebugLogger.startSession(contexts.length);

  for (let i = 0; i < contexts.length; i++) {
    const ctx = contexts[i];
    ctx.variationIndex = i;

    const result = await executeWithFallback(ctx);
    results.push(result);

    onVariationComplete?.(i, result);
  }

  // Complete debug session
  executionDebugLogger.completeSession();

  return results;
}

export type { EngineId, Capability, CapabilityRouterResult };
export { extractRequiredCapabilities, routePlan } from './capability-router';
export { executionDebugLogger } from './execution-debug';
