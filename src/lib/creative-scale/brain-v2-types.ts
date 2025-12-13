/**
 * AI Brain v2 - Type Definitions
 * Multi-layer decision engine for Creative Scale
 * NO raw video, NO transcripts, NO marketing copy
 */

// ============================================
// INPUT CONTRACT (Strict)
// ============================================

export type OptimizationGoal = 'retention' | 'ctr' | 'cpa';
export type RiskTolerance = 'low' | 'medium' | 'high';

export interface UserConstraints {
  risk_tolerance: RiskTolerance;
  locked_segments?: string[]; // Segment IDs that cannot be modified
  forbidden_actions?: ActionType[];
}

export interface StrategyOutcome {
  strategy_id: string;
  framework: FrameworkType;
  was_downloaded: boolean;
  was_regenerated: boolean;
}

export interface HistoricalContext {
  past_strategies: StrategyOutcome[];
}

export interface BrainInput {
  video_analysis: VideoAnalysisSignals;
  optimization_goal: OptimizationGoal;
  user_constraints?: UserConstraints;
  historical_context?: HistoricalContext;
}

// ============================================
// LAYER 1: PROBLEM DETECTION
// ============================================

export type ProblemType = 
  | 'HOOK_WEAK'
  | 'MID_PACING_DROP'
  | 'CTA_WEAK'
  | 'PROOF_MISSING'
  | 'CLARITY_LOW'
  | 'PACING_INCONSISTENT'
  | 'BENEFIT_UNCLEAR'
  | 'ATTENTION_DROP_EARLY'
  | 'ATTENTION_DROP_LATE'
  | 'DURATION_TOO_LONG'
  | 'DURATION_TOO_SHORT';

export interface DetectedProblem {
  type: ProblemType;
  severity: number; // 0-1: how bad is it
  segment_id?: string; // Which segment has the issue
  details: string;
}

export interface ProblemDetectionOutput {
  problems: DetectedProblem[];
  no_action_recommended: boolean;
  reason?: string;
}

// ============================================
// LAYER 2: STRATEGY CANDIDATES
// ============================================

export type FrameworkType = 
  | 'AIDA'
  | 'PAS'
  | 'HOOK_DEMO_CTA'
  | 'PATTERN_INTERRUPT'
  | 'PROOF_FIRST'
  | 'SPEED_ONLY'
  | 'FAB'
  | 'BAB';

export type ActionType = 
  | 'compress_segment'
  | 'remove_segment'
  | 'reorder_segments'
  | 'emphasize_segment'
  | 'split_segment'
  | 'merge_segments';

export interface StrategyAction {
  action: ActionType;
  target_segment_id: string;
  target_segment_type: string;
  factor?: number; // For compress: speed multiplier
  intent: string;
}

export interface StrategyCandidate {
  strategy_id: string;
  framework: FrameworkType;
  solves: ProblemType[];
  cost: number; // 0-1: execution complexity
  risk: number; // 0-1: chance of harming performance
  actions: StrategyAction[];
}

// ============================================
// LAYER 3: SCORING ENGINE
// ============================================

export interface ScoringWeights {
  impact_weight: number;
  risk_penalty: number;
  cost_penalty: number;
  trust_bonus: number;
}

export interface ScoredStrategy {
  strategy_id: string;
  framework: FrameworkType;
  final_score: number;
  impact_score: number;
  risk_score: number;
  cost_score: number;
  confidence_score: number;
  breakdown: {
    impact_contribution: number;
    risk_penalty: number;
    cost_penalty: number;
    trust_bonus: number;
  };
}

// ============================================
// LAYER 4: SELECTION & DIVERSIFICATION
// ============================================

export interface SelectionResult {
  selected_strategy: StrategyCandidate;
  selection_reason: string;
  rejected_strategies: Array<{
    strategy_id: string;
    framework: FrameworkType;
    rejection_reason: string;
  }>;
}

// ============================================
// LAYER 5: EXPLAINABILITY
// ============================================

export interface ExplanationBlock {
  why_this_strategy: string;
  why_not_others: string[];
  expected_outcome: string;
  confidence_level: 'low' | 'medium' | 'high';
}

// ============================================
// BRAIN OUTPUT (Final Contract)
// ============================================

export interface CreativeBlueprintV2 {
  variation_id: string;
  framework: FrameworkType;
  intent: string;
  expected_lift_pct: number;
  risk: RiskTolerance;
  actions: StrategyAction[];
  explanation: ExplanationBlock;
  learning_hooks: {
    framework_used: FrameworkType;
    problems_solved: ProblemType[];
    confidence: number;
  };
  // Metadata
  detected_problems: DetectedProblem[];
  all_candidates: StrategyCandidate[];
  scoring_details: ScoredStrategy[];
}

// ============================================
// FAILURE MODES (Valid Outputs)
// ============================================

export type BrainFailureMode = 
  | 'NO_ACTION' // No strong problem detected
  | 'SAFE_OPTIMIZATION_ONLY' // All strategies too risky
  | 'REQUEST_MORE_DATA'; // Input confidence too low

export interface BrainFailureOutput {
  mode: BrainFailureMode;
  reason: string;
  fallback_suggestion?: string;
}

export type BrainOutput = 
  | { success: true; blueprints: CreativeBlueprintV2[] }
  | { success: false; failure: BrainFailureOutput };

// ============================================
// VIDEO ANALYSIS SIGNALS (Input)
// ============================================

export interface VideoAnalysisSignals {
  source_id: string;
  technical: {
    duration_ms: number;
    fps: number;
    ratio: string;
  };
  signals: {
    hook_score: number; // 0-100
    pacing_drop_mid: boolean;
    cta_strength: number; // 0-1
    talking_head: boolean;
    product_demo: boolean;
    proof_present: boolean;
    clarity_score: number; // 0-100
    attention_curve: number[]; // Attention over time
  };
  segments: Array<{
    id: string;
    type: 'hook' | 'body' | 'cta' | 'problem' | 'solution' | 'benefit' | 'proof' | 'filler';
    start_ms: number;
    end_ms: number;
    attention_score?: number;
    pacing_score?: number;
  }>;
}
