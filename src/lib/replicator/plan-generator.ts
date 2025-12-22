/**
 * Creative Plan Generator
 * 
 * Generates a validated CreativePlan based on:
 * - Audience context (from Settings)
 * - VPS availability
 * - Source video analysis
 * - User variation count preference
 */

import { 
  CreativePlan, 
  VariationPlan, 
  AudienceContract,
  PlanStatus,
  DURATION_MIN,
  DURATION_MAX,
  createAudienceContract,
  validateCreativePlan,
  PlanValidationResult
} from './creative-plan-types';
import { 
  AICreativeBrain, 
  BrainInput, 
  BrainOutput,
  ENGINE_TIERS 
} from './ai-creative-brain';

export interface PlanGeneratorInput {
  // Audience (from Settings)
  language: string;
  country: string;
  
  // Configuration
  variationCount: number;
  platform: string;
  aspectRatio: string;
  
  // Source video
  sourceVideoDuration: number;
  
  // Environment
  vpsAvailable: boolean;
  availableApiKeys: string[];
}

export interface PlanGeneratorOutput {
  plan: CreativePlan | null;
  validation: PlanValidationResult;
  brainOutput: BrainOutput | null;
}

/**
 * Generate a CreativePlan with full validation
 */
export function generateCreativePlan(input: PlanGeneratorInput): PlanGeneratorOutput {
  const planId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  
  // Step 1: Create audience contract
  const audience = createAudienceContract(input.language, input.country, 'settings');
  
  // Step 2: Run AI Brain
  const brainInput: BrainInput = {
    numberOfVideos: input.variationCount,
    language: input.language,
    market: audience.market,
    platform: input.platform,
    sourceVideoDuration: input.sourceVideoDuration,
    availableApiKeys: input.availableApiKeys,
  };
  
  const brain = new AICreativeBrain(brainInput);
  const brainOutput = brain.generateDecisions();
  
  // Step 3: Transform brain decisions to variation plans with VPS-first enforcement
  const variations: VariationPlan[] = brainOutput.decisions.map((decision, index) => {
    // VPS-First: If VPS available, force FFmpeg engines
    let engineId: VariationPlan['engineId'] = 'ai-fallback';
    let engineProvider = decision.selectedProvider;
    let useVPS = false;
    
    if (input.vpsAvailable) {
      // VPS available - use FFmpeg
      if (decision.useFFMPEGOnly || decision.engineTier === 'free') {
        engineId = 'ffmpeg-native';
        engineProvider = 'FFMPEG-Native';
        useVPS = true;
      } else {
        // Even for paid tiers, check if FFmpeg can handle it
        const ffmpegCapable = canFFmpegHandle(decision);
        if (ffmpegCapable) {
          engineId = 'ffmpeg-native';
          engineProvider = 'FFMPEG-Native';
          useVPS = true;
        } else {
          engineId = 'ai-fallback';
          useVPS = false;
        }
      }
    } else {
      // No VPS - can only use free tier with limited capability
      if (decision.engineTier === 'free') {
        engineId = 'ffmpeg-native';
        engineProvider = 'FFMPEG-Edge';
        useVPS = false;
      }
    }
    
    return {
      index,
      framework: decision.framework,
      videoType: decision.videoType,
      hookType: decision.hookType,
      pacing: decision.pacing,
      transitions: decision.transitions,
      engineId,
      engineProvider,
      useVPS,
      targetDuration: Math.max(DURATION_MIN, Math.min(DURATION_MAX, decision.targetDuration)),
      estimatedCost: useVPS && engineId !== 'ai-fallback' ? 0 : decision.estimatedCost,
      reasoning: {
        framework: decision.reasoning.frameworkReason,
        engine: useVPS 
          ? 'VPS-First: Using native FFmpeg for optimal performance' 
          : decision.reasoning.engineReason,
        duration: decision.reasoning.durationReason,
      },
    };
  });
  
  // Step 4: Calculate cost summary
  const freeCount = variations.filter(v => v.engineId !== 'ai-fallback').length;
  const paidCount = variations.length - freeCount;
  
  const costEstimate = {
    minimum: paidCount * ENGINE_TIERS[1].minCost,
    maximum: paidCount * ENGINE_TIERS[2].maxCost,
    optimized: variations.reduce((sum, v) => sum + v.estimatedCost, 0),
    freeCount,
    paidCount,
  };
  
  // Step 5: Build execution strategy
  const executionStrategy = {
    description: input.vpsAvailable 
      ? `VPS-First: ${freeCount}/${variations.length} using native FFmpeg`
      : `Cloud Mode: ${paidCount} AI-generated, ${freeCount} FFmpeg transforms`,
    vpsFirst: input.vpsAvailable,
    fallbackAllowed: !input.vpsAvailable,
    parallelJobs: input.vpsAvailable ? 2 : 1,
  };
  
  // Step 6: Create the plan
  const plan: CreativePlan = {
    id: planId,
    status: 'pending',
    createdAt,
    audience,
    globalSettings: {
      totalVariations: input.variationCount,
      durationMin: DURATION_MIN,
      durationMax: DURATION_MAX,
      platform: input.platform,
      aspectRatio: input.aspectRatio,
      vpsRequired: true,
      vpsAvailable: input.vpsAvailable,
    },
    variations,
    costEstimate,
    executionStrategy,
    validation: {
      isValid: false,
      errors: [],
      warnings: [],
    },
  };
  
  // Step 7: Validate
  const validation = validateCreativePlan(plan);
  plan.validation = {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
  };
  
  if (validation.isValid) {
    plan.status = 'validated';
    plan.validatedAt = new Date().toISOString();
  } else {
    plan.status = 'invalid';
  }
  
  return {
    plan: validation.isValid ? plan : null,
    validation,
    brainOutput,
  };
}

/**
 * Lock a validated plan for execution
 */
export function lockPlan(plan: CreativePlan): CreativePlan {
  if (plan.status !== 'validated') {
    throw new Error('Cannot lock plan that is not validated');
  }
  
  return {
    ...plan,
    status: 'locked',
    lockedAt: new Date().toISOString(),
  };
}

/**
 * Check if FFmpeg can handle the variation without AI
 */
function canFFmpegHandle(decision: { 
  framework: string; 
  videoType: string;
  hookType: string;
}): boolean {
  // FFmpeg can handle transformations on existing video
  // It cannot generate new content
  const ffmpegCapableTypes = ['ugc-review', 'testimonial', 'unboxing'];
  const ffmpegCapableHooks = ['question', 'problem-solution', 'story'];
  
  return (
    ffmpegCapableTypes.includes(decision.videoType) ||
    ffmpegCapableHooks.includes(decision.hookType)
  );
}
