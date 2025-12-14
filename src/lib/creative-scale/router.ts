/**
 * Creative Scale - Phase B Step 5: Engine Router
 * SERVER-ONLY RENDERING - No browser FFmpeg
 */

import { ExecutionPlan, OutputFormat } from './compiler-types';
import { VideoAnalysis, CreativeBlueprint } from './types';
import {
  EngineEntry,
  RequiredCapabilities,
  EngineScore,
  JobState,
  JobStateContext,
  StateTransition,
  DegradationLevel,
  DEGRADATION_LADDER,
  SimplifiedPlan,
  RouteSuccessResult,
  PartialSuccessResult,
  RouterResult,
  RouteRequest,
  RouterEvent,
  EventEmitter,
  Resolution,
  CostProfile,
} from './router-types';
import { ENGINE_REGISTRY, getAvailableEngines } from './engine-registry';
import { supabase } from '@/integrations/supabase/client';

// Cloud fallback execution response type
interface CloudFallbackResponse {
  success: boolean;
  video_url?: string;
  error?: string;
  partial_success?: boolean;
  reason?: string;
  execution_plan?: ExecutionPlan;
  ffmpeg_command?: string;
  download_available?: boolean;
}

// Cloud fallback execution - calls VPS server
async function executeCloudFallback(
  plan: ExecutionPlan,
  userId?: string,
  variationIndex?: number
): Promise<CloudFallbackResponse> {
  console.log('[Router] Sending to VPS server for rendering...');
  
  try {
    // First try VPS API directly
    const vpsResponse = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        execution_plan: plan,
        user_id: userId,
        variation_index: variationIndex,
      }),
    });

    if (vpsResponse.ok) {
      const data = await vpsResponse.json();
      if (data.success && data.outputPath) {
        return { success: true, video_url: data.outputPath };
      }
    }

    // Fallback to Supabase edge function
    const { data, error } = await supabase.functions.invoke('creative-scale-render', {
      body: {
        execution_plan: plan,
        user_id: userId,
        variation_index: variationIndex,
      },
    });

    if (error) {
      console.error('[Router] Edge function error:', error);
      return { success: false, error: error.message };
    }

    if (data?.success && data?.video_url) {
      return { success: true, video_url: data.video_url };
    }

    if (data?.partial_success && data?.download_available) {
      return {
        success: false,
        partial_success: true,
        reason: data.reason,
        execution_plan: data.execution_plan,
        ffmpeg_command: data.ffmpeg_command,
        download_available: true,
        error: data.message,
      };
    }

    return { success: false, error: data?.error || 'Server rendering failed' };
  } catch (err: any) {
    console.error('[Router] Exception:', err);
    return { success: false, error: err.message };
  }
}

// ============================================
// CAPABILITY EXTRACTION
// ============================================

const RESOLUTION_ORDER: Resolution[] = ['480p', '720p', '1080p', '4k'];
const COST_ORDER: CostProfile[] = ['free', 'low', 'medium', 'high'];

function getResolutionFromDimensions(width: number, height: number): Resolution {
  const maxDim = Math.max(width, height);
  if (maxDim <= 640) return '480p';
  if (maxDim <= 1280) return '720p';
  if (maxDim <= 1920) return '1080p';
  return '4k';
}

export function extractRequiredCapabilities(plan: ExecutionPlan): RequiredCapabilities {
  const resolution = getResolutionFromDimensions(
    plan.output_format.width,
    plan.output_format.height
  );
  
  const durationSec = Math.ceil(plan.validation.total_duration_ms / 1000);
  
  const hasSpeedChange = plan.timeline.some(s => s.speed_multiplier !== 1.0);
  const hasAudioTracks = plan.audio_tracks.length > 0;
  const hasOverlays = plan.timeline.some(s => s.track === 'overlay');
  
  return {
    resolution,
    duration_sec: durationSec,
    needs_filters: false,
    needs_audio_tracks: hasAudioTracks,
    needs_speed_change: hasSpeedChange,
    needs_ai_generation: false,
    needs_overlays: hasOverlays,
    needs_transitions: plan.timeline.length > 1,
  };
}

// ============================================
// ENGINE SCORING (Server-only)
// ============================================

function canHandleResolution(engine: EngineEntry, required: Resolution): boolean {
  const engineIndex = RESOLUTION_ORDER.indexOf(engine.capabilities.max_resolution);
  const requiredIndex = RESOLUTION_ORDER.indexOf(required);
  return engineIndex >= requiredIndex;
}

function canHandleDuration(engine: EngineEntry, durationSec: number): boolean {
  return engine.capabilities.max_duration_sec >= durationSec;
}

function meetsCapabilityRequirements(
  engine: EngineEntry,
  required: RequiredCapabilities
): { meets: boolean; reason?: string } {
  if (!canHandleResolution(engine, required.resolution)) {
    return { meets: false, reason: `Max resolution ${engine.capabilities.max_resolution} < required ${required.resolution}` };
  }
  
  if (!canHandleDuration(engine, required.duration_sec)) {
    return { meets: false, reason: `Max duration ${engine.capabilities.max_duration_sec}s < required ${required.duration_sec}s` };
  }
  
  if (required.needs_audio_tracks && !engine.capabilities.supports_audio_tracks) {
    return { meets: false, reason: 'Audio tracks not supported' };
  }
  
  if (required.needs_speed_change && !engine.capabilities.supports_speed_change) {
    return { meets: false, reason: 'Speed change not supported' };
  }
  
  if (required.needs_overlays && !engine.capabilities.supports_overlays) {
    return { meets: false, reason: 'Overlays not supported' };
  }
  
  if (required.needs_transitions && !engine.capabilities.supports_transitions) {
    return { meets: false, reason: 'Transitions not supported' };
  }
  
  if (required.needs_filters && !engine.capabilities.supports_filters) {
    return { meets: false, reason: 'Filters not supported' };
  }
  
  return { meets: true };
}

export function scoreEngines(
  required: RequiredCapabilities,
  constraints?: {
    maxCostProfile?: CostProfile;
    forceLocation?: EngineEntry['location'];
    excludeEngines?: string[];
  }
): EngineScore[] {
  const engines = getAvailableEngines();
  const scores: EngineScore[] = [];
  
  for (const engine of engines) {
    if (constraints?.excludeEngines?.includes(engine.engine_id)) {
      continue;
    }
    
    if (constraints?.forceLocation && engine.location !== constraints.forceLocation) {
      continue;
    }
    
    if (constraints?.maxCostProfile) {
      const maxCostIndex = COST_ORDER.indexOf(constraints.maxCostProfile);
      const engineCostIndex = COST_ORDER.indexOf(engine.cost_profile);
      if (engineCostIndex > maxCostIndex) {
        continue;
      }
    }
    
    const capabilityCheck = meetsCapabilityRequirements(engine, required);
    
    if (!capabilityCheck.meets) {
      scores.push({
        engine_id: engine.engine_id,
        total_score: 0,
        capability_score: 0,
        reliability_score: engine.reliability_score * 100,
        cost_score: (4 - COST_ORDER.indexOf(engine.cost_profile)) * 25,
        compatible: false,
        disqualification_reason: capabilityCheck.reason,
      });
      continue;
    }
    
    const capabilityScore = 100;
    const reliabilityScore = engine.reliability_score * 100;
    const costScore = (4 - COST_ORDER.indexOf(engine.cost_profile)) * 25;
    
    const totalScore = 
      capabilityScore * 0.4 +
      reliabilityScore * 0.4 +
      costScore * 0.2;
    
    scores.push({
      engine_id: engine.engine_id,
      total_score: totalScore,
      capability_score: capabilityScore,
      reliability_score: reliabilityScore,
      cost_score: costScore,
      compatible: true,
    });
  }
  
  return scores.sort((a, b) => b.total_score - a.total_score);
}

export function selectBestEngine(
  required: RequiredCapabilities,
  constraints?: {
    maxCostProfile?: CostProfile;
    forceLocation?: EngineEntry['location'];
    excludeEngines?: string[];
  }
): EngineEntry | null {
  const scores = scoreEngines(required, constraints);
  const bestScore = scores.find(s => s.compatible);
  
  if (!bestScore) return null;
  
  return ENGINE_REGISTRY.find(e => e.engine_id === bestScore.engine_id) || null;
}

// ============================================
// PLAN SIMPLIFICATION
// ============================================

export function simplifyPlan(plan: ExecutionPlan): SimplifiedPlan {
  const removedFeatures: string[] = [];
  const simplifiedPlan = JSON.parse(JSON.stringify(plan)) as ExecutionPlan;
  
  const originalOverlays = simplifiedPlan.timeline.filter(s => s.track === 'overlay');
  if (originalOverlays.length > 0) {
    simplifiedPlan.timeline = simplifiedPlan.timeline.filter(s => s.track !== 'overlay');
    removedFeatures.push(`Removed ${originalOverlays.length} overlay(s)`);
  }
  
  const speedChanges = simplifiedPlan.timeline.filter(s => s.speed_multiplier !== 1.0);
  if (speedChanges.length > 0) {
    simplifiedPlan.timeline.forEach(s => {
      if (s.speed_multiplier !== 1.0) {
        s.speed_multiplier = 1.0;
        s.output_duration_ms = s.source_duration_ms;
        s.timeline_end_ms = s.timeline_start_ms + s.output_duration_ms;
      }
    });
    removedFeatures.push(`Reset ${speedChanges.length} speed change(s)`);
  }
  
  let resolutionDowngrade: Resolution | undefined;
  if (simplifiedPlan.output_format.width > 1280 || simplifiedPlan.output_format.height > 1280) {
    const aspectRatio = simplifiedPlan.output_format.width / simplifiedPlan.output_format.height;
    if (aspectRatio > 1) {
      simplifiedPlan.output_format.width = 1280;
      simplifiedPlan.output_format.height = Math.round(1280 / aspectRatio);
    } else {
      simplifiedPlan.output_format.height = 1280;
      simplifiedPlan.output_format.width = Math.round(1280 * aspectRatio);
    }
    resolutionDowngrade = '720p';
    removedFeatures.push('Reduced resolution to 720p');
  }
  
  simplifiedPlan.audio_tracks.forEach(a => {
    if (a.fade_in_ms > 0 || a.fade_out_ms > 0) {
      a.fade_in_ms = 0;
      a.fade_out_ms = 0;
    }
  });
  if (plan.audio_tracks.some(a => a.fade_in_ms > 0 || a.fade_out_ms > 0)) {
    removedFeatures.push('Removed audio fades');
  }
  
  const totalDuration = simplifiedPlan.timeline.reduce(
    (max, s) => Math.max(max, s.timeline_end_ms),
    0
  );
  simplifiedPlan.validation.total_duration_ms = totalDuration;
  simplifiedPlan.validation.segment_count = simplifiedPlan.timeline.length;
  simplifiedPlan.validation.warnings.push('Plan simplified for compatibility');
  
  return {
    original_plan_id: plan.plan_id,
    simplified_plan: simplifiedPlan,
    removed_features: removedFeatures,
    resolution_downgrade: resolutionDowngrade,
  };
}

// ============================================
// JOB STATE MANAGEMENT
// ============================================

export function createJobContext(jobId: string): JobStateContext {
  return {
    job_id: jobId,
    current_state: 'pending',
    transitions: [],
    attempt_count: 0,
    max_attempts: 3,
    degradation_level: 0,
  };
}

export function transitionState(
  context: JobStateContext,
  newState: JobState,
  metadata?: Partial<StateTransition>
): JobStateContext {
  const transition: StateTransition = {
    from: context.current_state,
    to: newState,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  
  return {
    ...context,
    current_state: newState,
    transitions: [...context.transitions, transition],
  };
}

// ============================================
// MAIN ROUTER (Server-Only)
// ============================================

export interface RouterOptions {
  emitEvent?: EventEmitter;
  maxRetries?: number;
  timeoutMs?: number;
}

export async function routeExecution(
  request: RouteRequest,
  options: RouterOptions = {}
): Promise<RouterResult> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  let context = createJobContext(jobId);
  const attemptedEngines: string[] = [];
  const emitEvent = options.emitEvent || (() => {});
  
  emitEvent({
    event_id: `evt_${Date.now()}`,
    job_id: jobId,
    timestamp: new Date().toISOString(),
    event_type: 'state_change',
    payload: { from: 'none', to: 'pending' },
  });
  
  context = transitionState(context, 'routing');
  emitEvent({
    event_id: `evt_${Date.now()}`,
    job_id: jobId,
    timestamp: new Date().toISOString(),
    event_type: 'state_change',
    payload: { from: 'pending', to: 'routing' },
  });
  
  const required = extractRequiredCapabilities(request.execution_plan);
  let currentPlan = request.execution_plan;
  
  // Try server execution
  context = transitionState(context, 'executing');
  emitEvent({
    event_id: `evt_${Date.now()}`,
    job_id: jobId,
    timestamp: new Date().toISOString(),
    event_type: 'state_change',
    payload: { from: 'routing', to: 'executing', engine: 'server_ffmpeg' },
  });
  
  attemptedEngines.push('server_ffmpeg');
  
  const result = await executeCloudFallback(
    currentPlan,
    request.user_id,
    0
  );
  
  if (result.success && result.video_url) {
    context = transitionState(context, 'completed');
    
    emitEvent({
      event_id: `evt_${Date.now()}`,
      job_id: jobId,
      timestamp: new Date().toISOString(),
      event_type: 'execution_complete',
      payload: { video_url: result.video_url },
    });
    
    return {
      status: 'success',
      job_id: jobId,
      engine_used: 'server_ffmpeg',
      video_url: result.video_url,
      processing_time_ms: Date.now() - startTime,
    } satisfies RouteSuccessResult;
  }
  
  // Partial success - return plan for manual execution
  context = transitionState(context, 'partial_success');
  
  emitEvent({
    event_id: `evt_${Date.now()}`,
    job_id: jobId,
    timestamp: new Date().toISOString(),
    event_type: 'partial_success',
    payload: { 
      reason: result.error || 'Server rendering unavailable',
      attempted_engines: attemptedEngines,
    },
  });
  
  return {
    status: 'partial_success',
    job_id: jobId,
    reason: result.error || 'Video rendering requires server configuration',
    artifacts: {
      analysis: request.analysis,
      blueprint: request.blueprint,
      execution_plan: currentPlan,
    },
    attempted_engines: attemptedEngines,
    human_readable_message: 
      'Server rendering is not available. Your execution plan has been exported for manual processing.',
  } satisfies PartialSuccessResult;
}

export function getCompatibleEngines(plan: ExecutionPlan): EngineEntry[] {
  const required = extractRequiredCapabilities(plan);
  const scores = scoreEngines(required);
  return scores
    .filter(s => s.compatible)
    .map(s => ENGINE_REGISTRY.find(e => e.engine_id === s.engine_id)!)
    .filter(Boolean);
}
