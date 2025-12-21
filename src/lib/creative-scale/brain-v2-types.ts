/**
 * AI Brain v2 - Type Definitions
 * Multi-layer decision engine for Creative Scale
 * 
 * RULES (NON-NEGOTIABLE):
 * - Never default to AIDA
 * - Never choose more than ONE primary framework
 * - Hormozi Value Equation is an EVALUATOR, NOT a framework
 * - Every decision must be explainable
 * - Output MUST be structured JSON
 */

// ============================================
// INPUT CONTRACT (Strict)
// ============================================

export type OptimizationGoal = 'retention' | 'ctr' | 'conversions';
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

export interface AudienceContext {
  market: 'GCC' | 'Europe' | 'LATAM' | 'USA' | 'APAC';
  language: string;
  age_range?: string;
  gender?: 'male' | 'female' | 'all';
  awareness_level?: 'unaware' | 'problem_aware' | 'solution_aware' | 'product_aware' | 'most_aware';
}

export interface BrainInput {
  video_analysis: VideoAnalysisSignals;
  optimization_goal: OptimizationGoal;
  audience_context?: AudienceContext;
  user_constraints?: UserConstraints;
  historical_context?: HistoricalContext;
}

// ============================================
// SIGNAL TYPES (What Brain Extracts)
// ============================================

export type SignalType = 'hook' | 'proof' | 'pacing' | 'objections' | 'cta' | 'benefit' | 'problem';

export interface ExtractedSignals {
  hook_strength: number; // 0-1
  proof_quality: number; // 0-1
  pacing_score: number; // 0-1
  objection_handling: number; // 0-1
  cta_clarity: number; // 0-1
  benefit_communication: number; // 0-1
  problem_agitation: number; // 0-1
}

// ============================================
// FRAMEWORK TYPES (PRIMARY - ONLY ONE ALLOWED)
// ============================================

export type FrameworkType = 
  | 'AIDA'           // Attention-Interest-Desire-Action
  | 'PAS'            // Problem-Agitate-Solution
  | 'BAB'            // Before-After-Bridge
  | '4Ps'            // Promise-Picture-Proof-Push
  | 'HOOK_BENEFIT_CTA'; // Hook → Benefit → CTA (simple/direct)

// ============================================
// STYLE OVERLAYS (OPTIONAL - MAX ONE)
// ============================================

export type StyleOverlay = 
  | 'UGC'  // User Generated Content style (authentic, casual, relatable)
  | 'ACC'  // Authority/Credibility/Charisma (polished, expert, persuasive)
  | null;  // No overlay - framework only

// ============================================
// HORMOZI VALUE EQUATION (EVALUATOR ONLY)
// ============================================

export interface HormoziValueScore {
  dream_outcome: number;      // 0-1: How clearly is the ideal result communicated?
  perceived_likelihood: number; // 0-1: How achievable does it seem?
  time_delay: number;         // 0-1: How quickly will results come? (inverse)
  effort_sacrifice: number;   // 0-1: How easy does it appear? (inverse)
  total_value_score: number;  // Calculated: (DO × PL) / (TD × ES)
}

// ============================================
// FRAMEWORK DECISION OUTPUT (STRICT FORMAT)
// ============================================

export interface FrameworkDecision {
  primary_framework: FrameworkType;
  style_overlay: StyleOverlay;
  confidence: number; // 0-1
}

export interface DecisionExplanation {
  why_chosen: string[];
  why_others_rejected: Array<{
    framework: FrameworkType;
    reason: string;
  }>;
}

export type OptimizationFocus = 'hook' | 'proof' | 'pacing' | 'objection' | 'cta';

export interface OptimizationPlan {
  focus: OptimizationFocus[];
  expected_lift: 'low' | 'medium' | 'high';
  specific_changes: string[];
}

// ============================================
// BRAIN V2 OUTPUT (MANDATORY FORMAT)
// ============================================

export interface BrainV2Decision {
  framework_decision: FrameworkDecision;
  explanation: DecisionExplanation;
  optimization_plan: OptimizationPlan;
  hormozi_evaluation: HormoziValueScore;
  // Metadata
  input_signals: ExtractedSignals;
  decision_timestamp: string;
}

// ============================================
// PROBLEM DETECTION
// ============================================

export type ProblemType = 
  | 'HOOK_WEAK'
  | 'MID_PACING_DROP'
  | 'CTA_WEAK'
  | 'PROOF_MISSING'
  | 'CLARITY_LOW'
  | 'PACING_INCONSISTENT'
  | 'BENEFIT_UNCLEAR'
  | 'OBJECTION_UNHANDLED'
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
// ACTION TYPES
// ============================================

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
  factor?: number;
  intent: string;
}

// ============================================
// LEGACY TYPES (for backward compatibility)
// ============================================

export interface StrategyCandidate {
  strategy_id: string;
  framework: FrameworkType;
  solves: ProblemType[];
  cost: number;
  risk: number;
  actions: StrategyAction[];
}

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

export interface SelectionResult {
  selected_strategy: StrategyCandidate;
  selection_reason: string;
  rejected_strategies: Array<{
    strategy_id: string;
    framework: FrameworkType;
    rejection_reason: string;
  }>;
}

export interface ExplanationBlock {
  why_this_strategy: string;
  why_not_others: string[];
  expected_outcome: string;
  confidence_level: 'low' | 'medium' | 'high';
}

export interface CreativeBlueprintV2 {
  variation_id: string;
  framework: FrameworkType;
  style_overlay?: StyleOverlay;
  intent: string;
  expected_lift_pct: number;
  risk: RiskTolerance;
  actions: StrategyAction[];
  explanation: ExplanationBlock;
  decision: BrainV2Decision;
  learning_hooks: {
    framework_used: FrameworkType;
    problems_solved: ProblemType[];
    confidence: number;
  };
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
  | 'REQUEST_MORE_DATA' // Input confidence too low
  | 'RETRY_LATER'; // Transient error, can retry

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
    attention_curve: number[];
    // New signals for better routing
    objection_handling?: number; // 0-1
    benefit_clarity?: number; // 0-1
    problem_agitation?: number; // 0-1
    authenticity_score?: number; // 0-1 for UGC detection
    authority_score?: number; // 0-1 for ACC detection
  };
  segments: Array<{
    id: string;
    type: 'hook' | 'body' | 'cta' | 'problem' | 'solution' | 'benefit' | 'proof' | 'filler' | 'objection' | 'promise' | 'picture';
    start_ms: number;
    end_ms: number;
    attention_score?: number;
    pacing_score?: number;
  }>;
}
