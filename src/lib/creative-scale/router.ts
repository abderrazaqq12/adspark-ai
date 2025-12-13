/**
 * Creative Scale - Phase B Step 5: Engine Router
 * Capability-based routing with graceful degradation
 * NEVER returns error - ALWAYS provides value
 * NOW WITH: Real FFmpeg WASM execution
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
import { getFFmpegAdapter, checkFFmpegEnvironment } from './ffmpeg-adapter';

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
    needs_filters: false, // Could be extended based on plan data
    needs_audio_tracks: hasAudioTracks,
    needs_speed_change: hasSpeedChange,
    needs_ai_generation: false, // ExecutionPlan is for post-processing
    needs_overlays: hasOverlays,
    needs_transitions: plan.timeline.length > 1,
  };
}

// ============================================
// ENGINE SCORING ALGORITHM
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
    // Apply hard constraints
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
    
    // Check capability match
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
    
    // Calculate scores (all 0-100)
    const capabilityScore = 100; // Meets all requirements
    const reliabilityScore = engine.reliability_score * 100;
    const costScore = (4 - COST_ORDER.indexOf(engine.cost_profile)) * 25; // free=100, high=25
    
    // Weighted total (reliability prioritized)
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
  
  // Sort by total score descending
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
// PLAN SIMPLIFICATION (Degradation Level 2)
// ============================================

export function simplifyPlan(plan: ExecutionPlan): SimplifiedPlan {
  const removedFeatures: string[] = [];
  const simplifiedPlan = JSON.parse(JSON.stringify(plan)) as ExecutionPlan;
  
  // Remove overlays
  const originalOverlays = simplifiedPlan.timeline.filter(s => s.track === 'overlay');
  if (originalOverlays.length > 0) {
    simplifiedPlan.timeline = simplifiedPlan.timeline.filter(s => s.track !== 'overlay');
    removedFeatures.push(`Removed ${originalOverlays.length} overlay(s)`);
  }
  
  // Reset speed multipliers to 1.0
  const speedChanges = simplifiedPlan.timeline.filter(s => s.speed_multiplier !== 1.0);
  if (speedChanges.length > 0) {
    simplifiedPlan.timeline.forEach(s => {
      if (s.speed_multiplier !== 1.0) {
        // Adjust timeline durations accordingly
        const originalDuration = s.output_duration_ms;
        s.speed_multiplier = 1.0;
        s.output_duration_ms = s.source_duration_ms;
        s.timeline_end_ms = s.timeline_start_ms + s.output_duration_ms;
      }
    });
    removedFeatures.push(`Reset ${speedChanges.length} speed change(s)`);
  }
  
  // Reduce resolution if 4k or 1080p
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
  
  // Remove audio fades
  simplifiedPlan.audio_tracks.forEach(a => {
    if (a.fade_in_ms > 0 || a.fade_out_ms > 0) {
      a.fade_in_ms = 0;
      a.fade_out_ms = 0;
    }
  });
  if (plan.audio_tracks.some(a => a.fade_in_ms > 0 || a.fade_out_ms > 0)) {
    removedFeatures.push('Removed audio fades');
  }
  
  // Recalculate validation
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
// MAIN ROUTER
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
  
  // Emit initial event
  emitEvent({
    event_id: `evt_${Date.now()}`,
    job_id: jobId,
    timestamp: new Date().toISOString(),
    event_type: 'state_change',
    payload: { from: 'none', to: 'pending' },
  });
  
  // Transition to routing
  context = transitionState(context, 'routing');
  emitEvent({
    event_id: `evt_${Date.now()}`,
    job_id: jobId,
    timestamp: new Date().toISOString(),
    event_type: 'state_change',
    payload: { from: 'pending', to: 'routing' },
  });
  
  // Extract required capabilities
  const required = extractRequiredCapabilities(request.execution_plan);
  
  // Current plan (may be simplified during degradation)
  let currentPlan = request.execution_plan;
  
  // Degradation loop
  while (context.degradation_level <= 4) {
    const degradation = DEGRADATION_LADDER[context.degradation_level];
    
    // Level 4: Partial Success (always succeeds)
    if (context.degradation_level === 4) {
      context = transitionState(context, 'partial_success');
      emitEvent({
        event_id: `evt_${Date.now()}`,
        job_id: jobId,
        timestamp: new Date().toISOString(),
        event_type: 'partial_success',
        payload: { 
          reason: 'All engines exhausted or unavailable',
          attempted_engines: attemptedEngines,
        },
      });
      
      return {
        status: 'partial_success',
        job_id: jobId,
        reason: 'Video rendering could not be completed with available resources',
        artifacts: {
          analysis: request.analysis,
          blueprint: request.blueprint,
          execution_plan: currentPlan,
        },
        attempted_engines: attemptedEngines,
        human_readable_message: 
          'Your device or available engines could not render the video, but here is ' +
          'your optimized creative plan ready for export or manual editing in professional software.',
      } satisfies PartialSuccessResult;
    }
    
    // Level 2: Simplify plan
    if (context.degradation_level === 2) {
      const simplified = simplifyPlan(currentPlan);
      currentPlan = simplified.simplified_plan;
      
      emitEvent({
        event_id: `evt_${Date.now()}`,
        job_id: jobId,
        timestamp: new Date().toISOString(),
        event_type: 'degradation_applied',
        payload: { 
          level: 2,
          removed_features: simplified.removed_features,
        },
      });
    }
    
    // Select engine (excluding already tried ones at level 3+)
    const constraints = {
      maxCostProfile: request.max_cost_profile,
      forceLocation: request.force_location,
      excludeEngines: context.degradation_level >= 3 ? attemptedEngines : undefined,
    };
    
    // Prefer user-specified engine if provided and not yet tried
    let selectedEngine: EngineEntry | null = null;
    if (request.preferred_engine_id && !attemptedEngines.includes(request.preferred_engine_id)) {
      const preferred = ENGINE_REGISTRY.find(e => e.engine_id === request.preferred_engine_id);
      if (preferred && preferred.available) {
        const capCheck = meetsCapabilityRequirements(preferred, extractRequiredCapabilities(currentPlan));
        if (capCheck.meets) {
          selectedEngine = preferred;
        }
      }
    }
    
    if (!selectedEngine) {
      selectedEngine = selectBestEngine(extractRequiredCapabilities(currentPlan), constraints);
    }
    
    if (!selectedEngine) {
      // No compatible engine found, escalate degradation
      context = {
        ...context,
        degradation_level: (context.degradation_level + 1) as DegradationLevel,
      };
      continue;
    }
    
    attemptedEngines.push(selectedEngine.engine_id);
    
    emitEvent({
      event_id: `evt_${Date.now()}`,
      job_id: jobId,
      timestamp: new Date().toISOString(),
      event_type: 'engine_selected',
      payload: { 
        engine_id: selectedEngine.engine_id,
        degradation_level: context.degradation_level,
      },
    });
    
    // Transition to executing
    context = transitionState(context, 'executing', { engine_id: selectedEngine.engine_id });
    emitEvent({
      event_id: `evt_${Date.now()}`,
      job_id: jobId,
      timestamp: new Date().toISOString(),
      event_type: 'execution_start',
      payload: { engine_id: selectedEngine.engine_id },
    });
    
    // Execute using FFmpeg adapter (real execution)
    try {
      // Check if FFmpeg is available for browser engines
      if (selectedEngine.location === 'browser') {
        const envCheck = checkFFmpegEnvironment();
        if (!envCheck.ready) {
          throw new Error(`FFmpeg unavailable: ${envCheck.reason}`);
        }

        const adapter = getFFmpegAdapter();
        
        emitEvent({
          event_id: `evt_${Date.now()}`,
          job_id: jobId,
          timestamp: new Date().toISOString(),
          event_type: 'ffmpeg_init',
          payload: { engine_id: selectedEngine.engine_id },
        });

        const result = await adapter.execute(currentPlan, {
          onProgress: (progress) => {
            emitEvent({
              event_id: `evt_${Date.now()}`,
              job_id: jobId,
              timestamp: new Date().toISOString(),
              event_type: 'progress',
              payload: { progress, engine_id: selectedEngine.engine_id },
            });
          },
          onLog: (message) => {
            emitEvent({
              event_id: `evt_${Date.now()}`,
              job_id: jobId,
              timestamp: new Date().toISOString(),
              event_type: 'log',
              payload: { message },
            });
          },
          timeoutMs: options.timeoutMs || 300000, // 5 min default
        });

        if (result.success && result.video_url) {
          context = transitionState(context, 'validating', { engine_id: selectedEngine.engine_id });
          
          // Validation: check blob exists
          if (!result.video_blob || result.video_blob.size < 1000) {
            throw new Error('Output video is too small or invalid');
          }

          context = transitionState(context, 'completed', { engine_id: selectedEngine.engine_id });
          
          emitEvent({
            event_id: `evt_${Date.now()}`,
            job_id: jobId,
            timestamp: new Date().toISOString(),
            event_type: 'execution_complete',
            payload: { 
              engine_id: selectedEngine.engine_id,
              processing_time_ms: result.processing_time_ms,
              video_size_bytes: result.video_blob.size,
            },
          });
          
          return {
            status: 'completed',
            job_id: jobId,
            engine_id: selectedEngine.engine_id,
            video_url: result.video_url,
            processing_time_ms: result.processing_time_ms,
            degradation_level: context.degradation_level,
            warnings: [...currentPlan.validation.warnings, ...result.logs.slice(-5)],
            output_video_url: result.video_url,
          } satisfies RouteSuccessResult;
        }
        
        // Execution failed
        throw new Error(result.error || 'FFmpeg execution failed');
      } else {
        // Cloud engines - not yet implemented
        throw new Error(`Cloud engine ${selectedEngine.engine_id} not implemented`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      context = transitionState(context, 'degraded', { 
        engine_id: selectedEngine.engine_id,
        error_code: 'EXECUTION_FAILED',
        error_message: errorMessage,
      });
      
      emitEvent({
        event_id: `evt_${Date.now()}`,
        job_id: jobId,
        timestamp: new Date().toISOString(),
        event_type: 'execution_failed',
        payload: { 
          engine_id: selectedEngine.engine_id,
          error: errorMessage,
          degradation_level: context.degradation_level,
        },
      });
      
      // Determine next degradation level
      if (context.attempt_count < context.max_attempts - 1 && context.degradation_level === 0) {
        // Level 1: Retry same engine
        context = {
          ...context,
          attempt_count: context.attempt_count + 1,
          degradation_level: 1,
        };
        attemptedEngines.pop(); // Allow retry with same engine
      } else if (context.degradation_level < 2) {
        // Level 2: Simplify plan
        context = { ...context, degradation_level: 2 };
      } else if (context.degradation_level < 3) {
        // Level 3: Switch engine
        context = { ...context, degradation_level: 3 };
      } else {
        // Level 4: Partial success (will exit loop)
        context = { ...context, degradation_level: 4 };
      }
    }
  }
  
  // Should never reach here due to Level 4 always returning
  return {
    status: 'partial_success',
    job_id: jobId,
    reason: 'Unexpected routing termination',
    artifacts: {
      analysis: request.analysis,
      blueprint: request.blueprint,
      execution_plan: currentPlan,
    },
    attempted_engines: attemptedEngines,
    human_readable_message: 'An unexpected error occurred. Your creative plan has been preserved.',
  };
}

// ============================================
// EXPORT ALL COMPATIBLE ENGINES FOR UI
// ============================================

export function getCompatibleEngines(plan: ExecutionPlan): EngineScore[] {
  const required = extractRequiredCapabilities(plan);
  return scoreEngines(required).filter(s => s.compatible);
}
