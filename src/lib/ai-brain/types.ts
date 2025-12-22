/**
 * Global AI Brain Types
 * 
 * Core type definitions for the centralized AI decision-making system
 */

// ============= PROVIDER & API KEY TYPES =============

export interface APIProvider {
  id: string;
  name: string;
  type: 'video' | 'image' | 'text' | 'audio' | 'multi';
  costPerUnit: number; // Base cost per operation
  costPerSecond?: number; // For video/audio
  qualityScore: number; // 0-100
  speedScore: number; // 0-100 (higher = faster)
  isAvailable: boolean;
  capabilities: string[];
  supportedMarkets?: string[];
  supportedPlatforms?: string[];
}

export interface GlobalAPIKeys {
  providers: string[]; // List of configured provider names
  primaryProvider?: string;
  fallbackOrder: string[];
}

// ============= COST OPTIMIZATION TYPES =============

export type CostTier = 'free' | 'low' | 'medium' | 'premium';

export interface CostBreakdown {
  perUnit: number;
  perSecond: number;
  estimated: number;
  minimum: number;
  maximum: number;
}

export interface OptimizationResult {
  selectedProvider: string;
  selectedTier: CostTier;
  estimatedCost: number;
  savings: number; // vs premium option
  reasoning: string;
  alternatives: {
    provider: string;
    cost: number;
    qualityDiff: number;
  }[];
}

export interface CostOptimizationConfig {
  maxBudget?: number;
  preferFree: boolean;
  qualityThreshold: number; // 0-100 minimum quality acceptable
  allowDowngrade: boolean;
  allowUpgrade: boolean;
  upgradeConditions: {
    minQualityGap: number;
    maxCostIncrease: number;
  };
}

// ============= DECISION SCORING TYPES =============

export interface ScoringWeights {
  cost: number;           // Weight for cost optimization (0-1)
  quality: number;        // Weight for quality (0-1)
  marketRelevance: number; // Weight for market fit (0-1)
  platformFit: number;    // Weight for platform optimization (0-1)
  speed: number;          // Weight for execution speed (0-1)
  availability: number;   // Weight for API availability (0-1)
}

export interface DecisionScore {
  option: string;
  totalScore: number;
  breakdown: {
    costScore: number;
    qualityScore: number;
    marketScore: number;
    platformScore: number;
    speedScore: number;
    availabilityScore: number;
  };
  normalized: number; // 0-100
}

export interface DecisionContext {
  // User preferences
  language: string;
  market: string;
  platform: string;
  
  // Task context
  taskType: 'video' | 'image' | 'text' | 'audio' | 'scene' | 'replication';
  outputCount: number;
  targetDuration?: number; // For video
  
  // Constraints
  maxBudget?: number;
  qualityRequirement: 'low' | 'medium' | 'high' | 'premium';
  
  // Available resources
  availableProviders: string[];
}

// ============= TASK DECISION TYPES =============

export type MarketingFramework = 
  | 'PAS' | 'AIDA' | 'social-proof' | 'before-after' 
  | 'curiosity' | 'offer-driven' | 'story-driven' | 'ugc-style';

export type VideoType = 
  | 'ugc-review' | 'testimonial' | 'before-after' | 'unboxing'
  | 'problem-solution' | 'lifestyle' | 'educational' | 'day-in-life';

export type HookType = 
  | 'question' | 'shock' | 'emotional' | 'story' 
  | 'problem-solution' | 'statistic' | 'humor' | 'curiosity';

export type PacingStyle = 'fast' | 'medium' | 'slow' | 'dynamic';

export type TransitionStyle = 
  | 'hard-cut' | 'zoom' | 'slide' | 'whip-pan' 
  | 'glitch' | 'fade' | 'dissolve';

export interface CreativeDecision {
  framework: MarketingFramework;
  videoType: VideoType;
  hookType: HookType;
  pacing: PacingStyle;
  transitions: TransitionStyle[];
  duration: number;
  motionIntensity: 'low' | 'medium' | 'high';
  ctaPlacement: 'start' | 'middle' | 'end' | 'multiple';
}

export interface TechnicalDecision {
  provider: string;
  tier: CostTier;
  useFFMPEG: boolean;
  useAI: boolean;
  estimatedCost: number;
  executionPath: string;
}

export interface FullDecision {
  creative: CreativeDecision;
  technical: TechnicalDecision;
  score: DecisionScore;
  reasoning: {
    creative: string;
    technical: string;
    optimization: string;
  };
}

// ============= GLOBAL BRAIN STATE =============

export interface GlobalBrainState {
  isInitialized: boolean;
  availableProviders: APIProvider[];
  activeProviders: string[];
  defaultWeights: ScoringWeights;
  costConfig: CostOptimizationConfig;
  
  // Cached decisions
  lastDecisions: Map<string, FullDecision>;
  
  // Stats
  totalSavings: number;
  decisionsCount: number;
}

// ============= BRAIN REQUEST/RESPONSE =============

export interface BrainRequest {
  taskId: string;
  context: DecisionContext;
  options?: {
    forceProvider?: string;
    overrideWeights?: Partial<ScoringWeights>;
    skipOptimization?: boolean;
  };
}

export interface BrainResponse {
  taskId: string;
  decisions: FullDecision[];
  totalEstimatedCost: number;
  optimizationSummary: {
    strategy: string;
    freeCount: number;
    paidCount: number;
    totalSavings: number;
  };
  executionPlan: {
    steps: string[];
    estimatedTime: number;
  };
}
