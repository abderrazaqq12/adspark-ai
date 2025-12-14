/**
 * Creative Scale - Phase B Step 5: Engine Router Types
 * Capability-based routing with graceful degradation
 * NO hardcoded tier logic, NO engine assumptions
 */

import { VideoAnalysis, CreativeBlueprint } from './types';
import { ExecutionPlan } from './compiler-types';

// ============================================
// ENGINE REGISTRY TYPES
// ============================================

export type ProcessingLocation = 'server' | 'cloud';
export type CostProfile = 'free' | 'low' | 'medium' | 'high';
export type Resolution = '480p' | '720p' | '1080p' | '4k';

export interface EngineCapabilities {
  max_resolution: Resolution;
  max_duration_sec: number;
  supports_filters: boolean;
  supports_audio_tracks: boolean;
  supports_speed_change: boolean;
  supports_ai_generation: boolean;
  supports_overlays: boolean;
  supports_transitions: boolean;
}

export interface EngineEntry {
  engine_id: string;
  name: string;
  location: ProcessingLocation;
  capabilities: EngineCapabilities;
  cost_profile: CostProfile;
  reliability_score: number; // 0.0 - 1.0
  available: boolean;
  cold_start_ms: number;
}

// ============================================
// REQUIRED CAPABILITIES (Extracted from ExecutionPlan)
// ============================================

export interface RequiredCapabilities {
  resolution: Resolution;
  duration_sec: number;
  needs_filters: boolean;
  needs_audio_tracks: boolean;
  needs_speed_change: boolean;
  needs_ai_generation: boolean;
  needs_overlays: boolean;
  needs_transitions: boolean;
}

// ============================================
// ENGINE SCORING
// ============================================

export interface EngineScore {
  engine_id: string;
  total_score: number;
  capability_score: number;    // 0-100
  reliability_score: number;   // 0-100
  cost_score: number;          // 0-100 (higher = cheaper)
  compatible: boolean;
  disqualification_reason?: string;
}

// ============================================
// JOB STATE MACHINE
// ============================================

export type JobState = 
  | 'pending'
  | 'routing'
  | 'executing'
  | 'validating'
  | 'completed'
  | 'degraded'
  | 'partial_success';

export interface StateTransition {
  from: JobState;
  to: JobState;
  timestamp: string;
  engine_id?: string;
  error_code?: string;
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export interface JobStateContext {
  job_id: string;
  current_state: JobState;
  transitions: StateTransition[];
  attempt_count: number;
  max_attempts: number;
  degradation_level: DegradationLevel;
}

// ============================================
// FAILURE & DEGRADATION
// ============================================

export type DegradationLevel = 0 | 1 | 2 | 3 | 4;

export interface DegradationAction {
  level: DegradationLevel;
  name: string;
  description: string;
  preserves_video_output: boolean;
}

export const DEGRADATION_LADDER: DegradationAction[] = [
  {
    level: 0,
    name: 'normal',
    description: 'Execute plan as compiled',
    preserves_video_output: true,
  },
  {
    level: 1,
    name: 'retry_same',
    description: 'Retry with same engine for transient errors',
    preserves_video_output: true,
  },
  {
    level: 2,
    name: 'simplify_plan',
    description: 'Remove non-essential filters, reduce resolution',
    preserves_video_output: true,
  },
  {
    level: 3,
    name: 'switch_engine',
    description: 'Route to next compatible engine',
    preserves_video_output: true,
  },
  {
    level: 4,
    name: 'partial_success',
    description: 'Return artifacts without video render',
    preserves_video_output: false,
  },
];

export interface SimplifiedPlan {
  original_plan_id: string;
  simplified_plan: ExecutionPlan;
  removed_features: string[];
  resolution_downgrade?: Resolution;
}

// ============================================
// ROUTER OUTPUT CONTRACTS
// ============================================

export interface RouteSuccessResult {
  status: 'completed';
  job_id: string;
  engine_id: string;
  video_url: string;
  output_video_url?: string; // Alias for download
  processing_time_ms: number;
  degradation_level: DegradationLevel;
  warnings: string[];
}

export interface PartialSuccessResult {
  status: 'partial_success';
  job_id: string;
  reason: string;
  artifacts: {
    analysis: VideoAnalysis;
    blueprint: CreativeBlueprint;
    execution_plan: ExecutionPlan;
    ffmpeg_command?: string;
  };
  attempted_engines: string[];
  human_readable_message: string;
}

export type RouterResult = RouteSuccessResult | PartialSuccessResult;

// ============================================
// ROUTER INPUT
// ============================================

export interface RouteRequest {
  execution_plan: ExecutionPlan;
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint;
  preferred_engine_id?: string;
  max_cost_profile?: CostProfile;
  force_location?: ProcessingLocation;
  user_id?: string;
}

// ============================================
// OBSERVABILITY
// ============================================

export interface RouterEvent {
  event_id: string;
  job_id: string;
  timestamp: string;
  event_type: 'state_change' | 'engine_selected' | 'execution_start' | 
              'execution_complete' | 'execution_failed' | 'degradation_applied' |
              'retry_triggered' | 'partial_success' | 'ffmpeg_init' | 'progress' | 'log' | 'cloud_fallback';
  payload: Record<string, unknown>;
}

export type EventEmitter = (event: RouterEvent) => void;
