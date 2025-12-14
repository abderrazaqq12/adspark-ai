/**
 * Creative Scale - PRD Aligned Types
 * Signal-based analysis, explainable variations
 */

// ============================================
// SIGNALS (Analyzer Output)
// ============================================

export interface TechnicalInfo {
  duration_ms: number;
  ratio: '9:16' | '1:1' | '16:9' | '4:5';
  fps: number;
}

export interface Signals {
  attention_score: number;      // 0-100
  pacing_curve: number[];       // Array of 0-1 values
  cta_strength: number;         // 0-1
  talking_head: boolean;
  product_demo: boolean;
}

export interface Segment {
  id: string;
  type: 'hook' | 'problem' | 'solution' | 'demo' | 'benefit' | 'cta' | 'filler';
  start: number;  // ms
  end: number;    // ms
}

export interface SignalBasedAnalysis {
  source_id: string;
  technical: TechnicalInfo;
  signals: Signals;
  segments: Segment[];
}

// ============================================
// VARIATION (Strategist Output)
// ============================================

export type RiskLevel = 'low' | 'medium' | 'high';

export interface VariationCard {
  variation_id: string;
  framework: string;           // AIDA, PAS, FAB, etc.
  intent: string;             // Plain English
  expected_lift_pct: number;  // e.g. 18
  risk: RiskLevel;
  actions: VariationAction[];
  ai_reasoning: string;       // Mandatory explanation
}

export interface VariationAction {
  type: 'compress' | 'emphasize' | 'remove' | 'reorder' | 'replace' | 'split' | 'merge';
  target: string;            // segment id or type
  factor?: number;           // e.g. 1.5 for compress
}

// ============================================
// JOB STATUS (Aligned with PRD)
// ============================================

export type JobStatus = 
  | 'READY_TO_ANALYZE'
  | 'ANALYZING'
  | 'STRATEGY_READY'
  | 'EXECUTING'
  | 'PARTIAL_SUCCESS'
  | 'DONE';

// ============================================
// EXECUTION RESULT (Strict Contract)
// ============================================

export type ExecutionStatus = 'success' | 'partial' | 'failed';
export type EngineUsed = 'server_ffmpeg' | 'cloud' | 'none';

export interface ExecutionResult {
  status: ExecutionStatus;
  output_video_url?: string;
  execution_plan_url: string;  // Always available
  engine_used: EngineUsed;
  error_code?: string;
  error_reason?: string;
}

// ============================================
// ENGINE MAPPING (Explainability)
// ============================================

export interface EngineOperationMapping {
  strategy_action: string;
  ffmpeg_operation: string;
}

export const OPERATION_MAPPINGS: EngineOperationMapping[] = [
  { strategy_action: 'Compress', ffmpeg_operation: 'setpts=0.66 (1.5x speed)' },
  { strategy_action: 'Emphasize', ffmpeg_operation: 'eq=brightness=0.1:saturation=1.2' },
  { strategy_action: 'Remove', ffmpeg_operation: 'trim (exclude segment)' },
  { strategy_action: 'Reorder', ffmpeg_operation: 'concat (rearrange segments)' },
  { strategy_action: 'Split', ffmpeg_operation: 'segment (divide at timestamp)' },
  { strategy_action: 'Merge', ffmpeg_operation: 'concat (join segments)' },
];

// ============================================
// V1 CONSTRAINTS (Server-Only)
// ============================================

export const V1_CONSTRAINTS = {
  SINGLE_SOURCE_MODE: true,
  SERVER_RENDERING: true,
  NO_PERSISTENT_MEMORY: true,
  MAX_DURATION_SEC: 60,
  MAX_VIDEOS: 20,
};

// ============================================
// TELEMETRY EVENTS
// ============================================

export type TelemetryEvent = 
  | 'ingest_started'
  | 'analysis_completed'
  | 'strategy_generated'
  | 'execution_completed'
  | 'download_clicked';

export interface TelemetryPayload {
  event: TelemetryEvent;
  timestamp: string;
  duration_ms?: number;
  variation_count?: number;
  engine_used?: EngineUsed;
  success?: boolean;
}
