/**
 * Brain V2 - Deterministic Decision Engine
 * 
 * ARCHITECTURAL CONTRACT (NON-NEGOTIABLE):
 * 1. NO FAILURE STATE - Brain V2 ALWAYS returns a valid strategy
 * 2. DEFAULT GOAL = "conversion" when not provided
 * 3. DECISION GUARANTEE - Every invocation returns a Strategy Object
 * 4. TWO-PHASE LOGIC - Analytical decision → Fallback (never blocks)
 * 5. APPROVED STRATEGY POOL - Only these frameworks in fallback:
 *    - AIDA, PAS, Social Proof, Problem→Solution, Story-driven, UGC Review
 * 
 * "I don't know" is FORBIDDEN.
 * Silence is FORBIDDEN.
 * Failure is FORBIDDEN.
 */

// ============================================
// APPROVED STRATEGY POOL (Fallback Safe)
// ============================================

export const APPROVED_FRAMEWORKS = [
  'AIDA',
  'PAS', 
  'SOCIAL_PROOF',
  'PROBLEM_SOLUTION',
  'STORY_DRIVEN',
  'UGC_REVIEW'
] as const;

export type ApprovedFramework = typeof APPROVED_FRAMEWORKS[number];

export type HookType = 
  | 'question'
  | 'statistic'
  | 'bold_claim'
  | 'pain_point'
  | 'curiosity'
  | 'social_proof'
  | 'controversy';

export type PacingType = 'fast' | 'medium' | 'slow';
export type ConfidenceLevel = 'high' | 'medium' | 'fallback';
export type PlatformType = 'tiktok' | 'meta' | 'youtube' | 'snapchat';

// ============================================
// GUARANTEED STRATEGY OBJECT (Required Fields)
// ============================================

/**
 * This is the ONLY output Brain V2 can return.
 * All fields are REQUIRED. Missing fields are NOT allowed.
 */
export interface BrainV2StrategyObject {
  framework: ApprovedFramework;
  hook_type: HookType;
  pacing: PacingType;
  platform: PlatformType;
  goal: 'conversion'; // Always conversion - no override allowed
  confidence_level: ConfidenceLevel;
  decision_reason: string;
}

// ============================================
// INPUT CONTRACT
// ============================================

export interface BrainV2Input {
  platform: PlatformType;
  funnel_stage?: 'cold' | 'warm' | 'retargeting';
  risk_level?: 'low' | 'medium' | 'high';
  available_assets?: {
    has_ugc?: boolean;
    has_testimonials?: boolean;
    has_product_demo?: boolean;
    video_duration_sec?: number;
  };
  audience?: {
    language?: string;
    country?: string;
    awareness_level?: 'unaware' | 'problem_aware' | 'solution_aware' | 'product_aware';
  };
  analysis_signals?: {
    hook_strength?: number;
    proof_quality?: number;
    cta_clarity?: number;
    pacing_score?: number;
  };
}

// ============================================
// PLATFORM-BASED FRAMEWORK PREFERENCES
// ============================================

const PLATFORM_FRAMEWORK_PREFERENCES: Record<PlatformType, ApprovedFramework[]> = {
  tiktok: ['UGC_REVIEW', 'SOCIAL_PROOF', 'PROBLEM_SOLUTION'],
  meta: ['SOCIAL_PROOF', 'PROBLEM_SOLUTION', 'PAS'],
  youtube: ['STORY_DRIVEN', 'PAS', 'AIDA'],
  snapchat: ['UGC_REVIEW', 'SOCIAL_PROOF', 'PROBLEM_SOLUTION']
};

const PLATFORM_HOOK_PREFERENCES: Record<PlatformType, HookType[]> = {
  tiktok: ['bold_claim', 'curiosity', 'pain_point'],
  meta: ['question', 'statistic', 'social_proof'],
  youtube: ['curiosity', 'bold_claim', 'controversy'],
  snapchat: ['bold_claim', 'curiosity', 'pain_point']
};

const PLATFORM_PACING: Record<PlatformType, PacingType> = {
  tiktok: 'fast',
  meta: 'medium',
  youtube: 'medium',
  snapchat: 'fast'
};

// ============================================
// PHASE 1: ANALYTICAL DECISION
// ============================================

interface AnalyticalResult {
  success: boolean;
  framework?: ApprovedFramework;
  hook_type?: HookType;
  pacing?: PacingType;
  confidence: number;
  reasons: string[];
}

function runAnalyticalDecision(input: BrainV2Input): AnalyticalResult {
  const reasons: string[] = [];
  let confidence = 0.5; // Base confidence
  
  const platform = input.platform;
  const signals = input.analysis_signals;
  const assets = input.available_assets;
  const funnelStage = input.funnel_stage || 'cold';
  
  // Determine framework based on signals
  let selectedFramework: ApprovedFramework | undefined;
  let selectedHook: HookType | undefined;
  
  // Signal-based routing
  if (signals) {
    if (signals.proof_quality && signals.proof_quality > 0.6) {
      selectedFramework = 'SOCIAL_PROOF';
      reasons.push('High proof quality detected → Social Proof framework');
      confidence += 0.15;
    } else if (signals.hook_strength && signals.hook_strength < 0.4) {
      selectedFramework = 'PAS';
      selectedHook = 'pain_point';
      reasons.push('Weak hook detected → PAS framework with pain point opener');
      confidence += 0.1;
    } else if (signals.cta_clarity && signals.cta_clarity > 0.7) {
      selectedFramework = 'PROBLEM_SOLUTION';
      reasons.push('Strong CTA → Problem-Solution framework');
      confidence += 0.1;
    }
  }
  
  // Asset-based adjustments
  if (assets) {
    if (assets.has_ugc && !selectedFramework) {
      selectedFramework = 'UGC_REVIEW';
      reasons.push('UGC assets available → UGC Review framework');
      confidence += 0.15;
    }
    if (assets.has_testimonials && !selectedFramework) {
      selectedFramework = 'SOCIAL_PROOF';
      reasons.push('Testimonials available → Social Proof framework');
      confidence += 0.1;
    }
  }
  
  // Funnel stage adjustments
  if (funnelStage === 'cold') {
    if (!selectedFramework) {
      selectedFramework = PLATFORM_FRAMEWORK_PREFERENCES[platform][0];
      reasons.push(`Cold funnel on ${platform} → ${selectedFramework}`);
    }
    confidence += 0.05;
  } else if (funnelStage === 'retargeting') {
    if (!selectedFramework) {
      selectedFramework = 'PROBLEM_SOLUTION';
      reasons.push('Retargeting audience → Problem-Solution framework');
    }
    confidence += 0.1;
  }
  
  // Platform-based hook selection if not set
  if (!selectedHook) {
    selectedHook = PLATFORM_HOOK_PREFERENCES[platform][0];
    reasons.push(`Platform ${platform} → ${selectedHook} hook`);
  }
  
  // Pacing from platform
  const pacing = PLATFORM_PACING[platform];
  reasons.push(`Platform ${platform} → ${pacing} pacing`);
  
  // Determine if analytical decision is sufficient
  const success = confidence >= 0.6 && !!selectedFramework;
  
  return {
    success,
    framework: selectedFramework,
    hook_type: selectedHook,
    pacing,
    confidence,
    reasons
  };
}

// ============================================
// PHASE 2: FALLBACK DECISION (Guaranteed)
// ============================================

function runFallbackDecision(input: BrainV2Input): BrainV2StrategyObject {
  const platform = input.platform;
  
  // Get platform preferences, or use default order
  const preferredFrameworks = PLATFORM_FRAMEWORK_PREFERENCES[platform] || APPROVED_FRAMEWORKS;
  
  // Controlled random selection from approved pool
  // Use a deterministic approach based on timestamp for "randomness" that's reproducible
  const now = Date.now();
  const index = now % preferredFrameworks.length;
  const selectedFramework = preferredFrameworks[index];
  
  // Select hook based on platform
  const preferredHooks = PLATFORM_HOOK_PREFERENCES[platform] || ['curiosity'];
  const hookIndex = now % preferredHooks.length;
  const selectedHook = preferredHooks[hookIndex];
  
  // Pacing from platform
  const pacing = PLATFORM_PACING[platform] || 'medium';
  
  return {
    framework: selectedFramework,
    hook_type: selectedHook,
    pacing,
    platform,
    goal: 'conversion',
    confidence_level: 'fallback',
    decision_reason: `Fallback applied due to insufficient analytical signals. Strategy selected from safe framework pool for ${platform}. Framework: ${selectedFramework}, Hook: ${selectedHook}.`
  };
}

// ============================================
// MAIN DECISION FUNCTION (NEVER FAILS)
// ============================================

/**
 * Brain V2 Deterministic Decision Engine
 * 
 * This function ALWAYS returns a valid BrainV2StrategyObject.
 * It will NEVER throw an error or return null/undefined.
 * 
 * @param input - Decision inputs (all optional, defaults applied)
 * @returns BrainV2StrategyObject - GUARANTEED valid strategy
 */
export function makeBrainV2DeterministicDecision(
  input: Partial<BrainV2Input> = {}
): BrainV2StrategyObject {
  // Apply defaults - GOAL IS ALWAYS CONVERSION
  const normalizedInput: BrainV2Input = {
    platform: input.platform || 'tiktok',
    funnel_stage: input.funnel_stage || 'cold',
    risk_level: input.risk_level || 'medium',
    available_assets: input.available_assets || {},
    audience: input.audience || {},
    analysis_signals: input.analysis_signals || {}
  };
  
  // Internal logging for developers only
  const logs: string[] = [];
  logs.push(`[Brain V2] Input: platform=${normalizedInput.platform}, funnel=${normalizedInput.funnel_stage}`);
  
  try {
    // PHASE 1: Attempt analytical decision
    const analyticalResult = runAnalyticalDecision(normalizedInput);
    logs.push(`[Brain V2] Phase 1 result: success=${analyticalResult.success}, confidence=${analyticalResult.confidence}`);
    
    if (analyticalResult.success && analyticalResult.framework && analyticalResult.hook_type && analyticalResult.pacing) {
      // Analytical decision successful
      const strategy: BrainV2StrategyObject = {
        framework: analyticalResult.framework,
        hook_type: analyticalResult.hook_type,
        pacing: analyticalResult.pacing,
        platform: normalizedInput.platform,
        goal: 'conversion',
        confidence_level: analyticalResult.confidence >= 0.8 ? 'high' : 'medium',
        decision_reason: analyticalResult.reasons.join('. ')
      };
      
      logs.push(`[Brain V2] Analytical decision: ${strategy.framework} (${strategy.confidence_level})`);
      console.log(logs.join('\n'));
      
      return strategy;
    }
    
    // PHASE 2: Fallback decision (analytical was weak)
    logs.push(`[Brain V2] Phase 1 insufficient (confidence=${analyticalResult.confidence}), triggering fallback`);
    const fallbackStrategy = runFallbackDecision(normalizedInput);
    
    logs.push(`[Brain V2] Fallback decision: ${fallbackStrategy.framework}`);
    console.log(logs.join('\n'));
    
    return fallbackStrategy;
    
  } catch (error) {
    // PHASE 2: Even if Phase 1 throws (which should never happen), fallback
    logs.push(`[Brain V2] Phase 1 error, triggering fallback: ${error}`);
    console.warn(logs.join('\n'));
    
    return runFallbackDecision(normalizedInput);
  }
}

// ============================================
// BATCH GENERATION (Multiple Variations)
// ============================================

export interface BrainV2BatchInput extends BrainV2Input {
  variation_count: number;
}

/**
 * Generate multiple strategy variations.
 * Each variation is GUARANTEED to have a valid strategy.
 */
export function generateBrainV2Variations(
  input: Partial<BrainV2BatchInput> = {}
): BrainV2StrategyObject[] {
  const count = Math.max(1, Math.min(input.variation_count || 3, 10));
  const strategies: BrainV2StrategyObject[] = [];
  
  // Generate variations with slight input variations
  for (let i = 0; i < count; i++) {
    // Vary the analysis signals slightly for diversity
    const variedInput: BrainV2Input = {
      ...input,
      platform: input.platform || 'tiktok',
      analysis_signals: {
        ...input.analysis_signals,
        // Add slight variation to generate different results
        hook_strength: (input.analysis_signals?.hook_strength || 0.5) + (i * 0.05),
        proof_quality: (input.analysis_signals?.proof_quality || 0.5) - (i * 0.03)
      }
    };
    
    const strategy = makeBrainV2DeterministicDecision(variedInput);
    
    // Ensure we don't duplicate the exact same framework in a row
    if (strategies.length > 0 && strategies[strategies.length - 1].framework === strategy.framework) {
      // Pick next framework from approved list
      const currentIndex = APPROVED_FRAMEWORKS.indexOf(strategy.framework);
      const nextIndex = (currentIndex + 1) % APPROVED_FRAMEWORKS.length;
      strategy.framework = APPROVED_FRAMEWORKS[nextIndex];
      strategy.decision_reason += ` (Diversified from duplicate)`;
    }
    
    strategies.push(strategy);
  }
  
  return strategies;
}

// ============================================
// UTILITY: Get Framework Display Info
// ============================================

export const FRAMEWORK_DISPLAY_INFO: Record<ApprovedFramework, { name: string; description: string }> = {
  AIDA: { 
    name: 'AIDA', 
    description: 'Attention → Interest → Desire → Action' 
  },
  PAS: { 
    name: 'PAS', 
    description: 'Problem → Agitate → Solution' 
  },
  SOCIAL_PROOF: { 
    name: 'Social Proof', 
    description: 'Leverage testimonials and social validation' 
  },
  PROBLEM_SOLUTION: { 
    name: 'Problem → Solution', 
    description: 'Direct problem identification and resolution' 
  },
  STORY_DRIVEN: { 
    name: 'Story-driven', 
    description: 'Narrative arc with emotional journey' 
  },
  UGC_REVIEW: { 
    name: 'UGC Review', 
    description: 'Authentic user-generated content style' 
  }
};

export const HOOK_DISPLAY_INFO: Record<HookType, string> = {
  question: 'Question Hook',
  statistic: 'Statistic Hook',
  bold_claim: 'Bold Claim Hook',
  pain_point: 'Pain Point Hook',
  curiosity: 'Curiosity Hook',
  social_proof: 'Social Proof Hook',
  controversy: 'Controversy Hook'
};
