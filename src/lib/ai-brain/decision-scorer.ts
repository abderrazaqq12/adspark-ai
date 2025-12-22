/**
 * Global Decision Scoring System
 * 
 * Centralized scoring engine that evaluates options based on multiple factors
 * (cost, quality, market relevance, platform fit, speed, availability) and
 * makes optimal decisions for all tools automatically.
 */

import {
  ScoringWeights,
  DecisionScore,
  DecisionContext,
  MarketingFramework,
  VideoType,
  HookType,
  PacingStyle,
  TransitionStyle,
  CreativeDecision,
  TechnicalDecision,
  FullDecision,
  CostTier,
} from './types';
import { PROVIDER_REGISTRY, getProviderTier, PROVIDER_TIERS } from './provider-registry';
import { GlobalCostOptimizer, getGlobalCostOptimizer } from './cost-optimizer';

// ============= DEFAULT SCORING WEIGHTS =============

export const DEFAULT_WEIGHTS: ScoringWeights = {
  cost: 0.30,          // 30% weight on cost
  quality: 0.25,       // 25% weight on quality
  marketRelevance: 0.15, // 15% weight on market fit
  platformFit: 0.15,   // 15% weight on platform
  speed: 0.10,         // 10% weight on speed
  availability: 0.05,  // 5% weight on availability
};

// ============= MARKET PREFERENCES =============

export const MARKET_PREFERENCES: Record<string, {
  frameworks: MarketingFramework[];
  hooks: HookType[];
  pacing: PacingStyle;
  videoTypes: VideoType[];
  preferredProviders: string[];
}> = {
  saudi: {
    frameworks: ['social-proof', 'story-driven', 'PAS'],
    hooks: ['emotional', 'story', 'problem-solution'],
    pacing: 'medium',
    videoTypes: ['ugc-review', 'testimonial', 'before-after'],
    preferredProviders: ['elevenlabs', 'runway', 'gemini-flash'],
  },
  uae: {
    frameworks: ['AIDA', 'offer-driven', 'social-proof'],
    hooks: ['emotional', 'story', 'shock'],
    pacing: 'medium',
    videoTypes: ['lifestyle', 'testimonial', 'unboxing'],
    preferredProviders: ['elevenlabs', 'luma', 'gemini-pro'],
  },
  usa: {
    frameworks: ['AIDA', 'curiosity', 'PAS'],
    hooks: ['question', 'shock', 'humor'],
    pacing: 'fast',
    videoTypes: ['ugc-review', 'problem-solution', 'lifestyle'],
    preferredProviders: ['gpt-5', 'sora', 'elevenlabs'],
  },
  europe: {
    frameworks: ['AIDA', 'social-proof', 'story-driven'],
    hooks: ['statistic', 'question', 'story'],
    pacing: 'medium',
    videoTypes: ['educational', 'testimonial', 'lifestyle'],
    preferredProviders: ['gemini-pro', 'runway', 'elevenlabs'],
  },
  latam: {
    frameworks: ['PAS', 'social-proof', 'offer-driven'],
    hooks: ['shock', 'emotional', 'humor'],
    pacing: 'fast',
    videoTypes: ['ugc-review', 'unboxing', 'day-in-life'],
    preferredProviders: ['gemini-flash', 'kling', 'openai-tts'],
  },
  gcc: {
    frameworks: ['social-proof', 'story-driven', 'AIDA'],
    hooks: ['emotional', 'story', 'problem-solution'],
    pacing: 'medium',
    videoTypes: ['testimonial', 'ugc-review', 'before-after'],
    preferredProviders: ['elevenlabs', 'runway', 'gemini-flash'],
  },
};

// ============= PLATFORM PREFERENCES =============

export const PLATFORM_PREFERENCES: Record<string, {
  maxDuration: number;
  optimalDuration: { min: number; max: number };
  pacing: PacingStyle;
  aspectRatio: string;
  hookImportance: number; // 0-1
  ctaStyle: string;
}> = {
  'tiktok': {
    maxDuration: 60,
    optimalDuration: { min: 20, max: 35 },
    pacing: 'fast',
    aspectRatio: '9:16',
    hookImportance: 0.95,
    ctaStyle: 'swipe-up',
  },
  'instagram-reels': {
    maxDuration: 90,
    optimalDuration: { min: 20, max: 35 },
    pacing: 'fast',
    aspectRatio: '9:16',
    hookImportance: 0.90,
    ctaStyle: 'link-in-bio',
  },
  'youtube-shorts': {
    maxDuration: 60,
    optimalDuration: { min: 25, max: 45 },
    pacing: 'medium',
    aspectRatio: '9:16',
    hookImportance: 0.85,
    ctaStyle: 'subscribe',
  },
  'facebook': {
    maxDuration: 120,
    optimalDuration: { min: 30, max: 60 },
    pacing: 'medium',
    aspectRatio: '4:5',
    hookImportance: 0.80,
    ctaStyle: 'shop-now',
  },
  'instagram-feed': {
    maxDuration: 60,
    optimalDuration: { min: 20, max: 30 },
    pacing: 'medium',
    aspectRatio: '1:1',
    hookImportance: 0.85,
    ctaStyle: 'link-in-bio',
  },
};

// ============= DECISION SCORER CLASS =============

export class GlobalDecisionScorer {
  private weights: ScoringWeights;
  private costOptimizer: GlobalCostOptimizer;

  constructor(
    configuredAPIKeys: string[],
    weights: Partial<ScoringWeights> = {}
  ) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.costOptimizer = getGlobalCostOptimizer(configuredAPIKeys);
  }

  /**
   * Score a single option
   */
  scoreOption(
    optionId: string,
    context: DecisionContext,
    optionData: {
      cost: number;
      quality: number;
      speed: number;
      isAvailable: boolean;
      marketFit?: number;
      platformFit?: number;
    }
  ): DecisionScore {
    // Normalize scores to 0-100
    const maxCost = 2.0; // Max expected cost
    const costScore = Math.max(0, 100 - (optionData.cost / maxCost) * 100);
    const qualityScore = optionData.quality;
    const speedScore = optionData.speed;
    const availabilityScore = optionData.isAvailable ? 100 : 0;
    
    // Calculate market relevance
    const marketPrefs = MARKET_PREFERENCES[context.market] || MARKET_PREFERENCES['usa'];
    const marketScore = optionData.marketFit ?? 
      (marketPrefs.preferredProviders.includes(optionId) ? 90 : 60);
    
    // Calculate platform fit
    const platformPrefs = PLATFORM_PREFERENCES[context.platform] || PLATFORM_PREFERENCES['tiktok'];
    const platformScore = optionData.platformFit ?? 70;
    
    // Calculate weighted total
    const totalScore = 
      this.weights.cost * costScore +
      this.weights.quality * qualityScore +
      this.weights.marketRelevance * marketScore +
      this.weights.platformFit * platformScore +
      this.weights.speed * speedScore +
      this.weights.availability * availabilityScore;
    
    return {
      option: optionId,
      totalScore,
      breakdown: {
        costScore,
        qualityScore,
        marketScore,
        platformScore,
        speedScore,
        availabilityScore,
      },
      normalized: Math.round(totalScore),
    };
  }

  /**
   * Select best marketing framework for context
   */
  selectFramework(context: DecisionContext, variationIndex: number): MarketingFramework {
    const marketPrefs = MARKET_PREFERENCES[context.market] || MARKET_PREFERENCES['usa'];
    const frameworks = marketPrefs.frameworks;
    return frameworks[variationIndex % frameworks.length];
  }

  /**
   * Select best video type for context
   */
  selectVideoType(context: DecisionContext, variationIndex: number): VideoType {
    const marketPrefs = MARKET_PREFERENCES[context.market] || MARKET_PREFERENCES['usa'];
    const types = marketPrefs.videoTypes;
    return types[variationIndex % types.length];
  }

  /**
   * Select best hook type for context
   */
  selectHook(context: DecisionContext, variationIndex: number): HookType {
    const marketPrefs = MARKET_PREFERENCES[context.market] || MARKET_PREFERENCES['usa'];
    const hooks = marketPrefs.hooks;
    return hooks[variationIndex % hooks.length];
  }

  /**
   * Select pacing style
   */
  selectPacing(context: DecisionContext, variationIndex: number): PacingStyle {
    const marketPrefs = MARKET_PREFERENCES[context.market] || MARKET_PREFERENCES['usa'];
    const platformPrefs = PLATFORM_PREFERENCES[context.platform] || PLATFORM_PREFERENCES['tiktok'];
    
    // Vary pacing for A/B testing
    if (variationIndex % 3 === 0) return platformPrefs.pacing;
    if (variationIndex % 3 === 1) return marketPrefs.pacing;
    return 'dynamic';
  }

  /**
   * Select transitions
   */
  selectTransitions(variationIndex: number): TransitionStyle[] {
    const transitionSets: TransitionStyle[][] = [
      ['hard-cut', 'zoom'],
      ['slide', 'whip-pan'],
      ['glitch', 'hard-cut'],
      ['zoom', 'slide'],
      ['fade', 'dissolve'],
    ];
    return transitionSets[variationIndex % transitionSets.length];
  }

  /**
   * Select optimal duration (enforced 20-35s)
   */
  selectDuration(context: DecisionContext, pacing: PacingStyle, variationIndex: number): number {
    const MIN_DURATION = 20;
    const MAX_DURATION = 35;
    
    const platformPrefs = PLATFORM_PREFERENCES[context.platform] || PLATFORM_PREFERENCES['tiktok'];
    
    let baseDuration: number;
    
    switch (pacing) {
      case 'fast':
        baseDuration = 22;
        break;
      case 'slow':
        baseDuration = 32;
        break;
      case 'dynamic':
        baseDuration = MIN_DURATION + (variationIndex % 4) * 4;
        break;
      default:
        baseDuration = 27;
    }
    
    // Clamp to platform optimal range
    const platformMin = Math.max(MIN_DURATION, platformPrefs.optimalDuration.min);
    const platformMax = Math.min(MAX_DURATION, platformPrefs.optimalDuration.max);
    
    return Math.max(platformMin, Math.min(platformMax, baseDuration));
  }

  /**
   * Make complete creative decision
   */
  makeCreativeDecision(
    context: DecisionContext,
    variationIndex: number
  ): CreativeDecision {
    const framework = this.selectFramework(context, variationIndex);
    const videoType = this.selectVideoType(context, variationIndex);
    const hookType = this.selectHook(context, variationIndex);
    const pacing = this.selectPacing(context, variationIndex);
    const transitions = this.selectTransitions(variationIndex);
    const duration = this.selectDuration(context, pacing, variationIndex);
    
    // Determine motion intensity based on pacing
    const motionIntensity = pacing === 'fast' ? 'high' : pacing === 'slow' ? 'low' : 'medium';
    
    // CTA placement based on duration and framework
    const ctaPlacement = framework === 'AIDA' || framework === 'PAS' 
      ? 'end' 
      : duration > 30 ? 'multiple' : 'end';
    
    return {
      framework,
      videoType,
      hookType,
      pacing,
      transitions,
      duration,
      motionIntensity,
      ctaPlacement,
    };
  }

  /**
   * Make complete technical decision
   */
  makeTechnicalDecision(
    context: DecisionContext,
    variationIndex: number
  ): TechnicalDecision {
    const optimization = this.costOptimizer.selectOptimalProvider(
      context.taskType as any,
      context,
      variationIndex
    );
    
    const useFFMPEG = optimization.selectedTier === 'free' || 
      PROVIDER_TIERS.free.includes(optimization.selectedProvider);
    
    return {
      provider: optimization.selectedProvider,
      tier: optimization.selectedTier,
      useFFMPEG,
      useAI: !useFFMPEG,
      estimatedCost: optimization.estimatedCost,
      executionPath: `AIBrain -> ${optimization.selectedTier} -> ${optimization.selectedProvider}`,
    };
  }

  /**
   * Make full decision for a variation
   */
  makeFullDecision(
    context: DecisionContext,
    variationIndex: number
  ): FullDecision {
    const creative = this.makeCreativeDecision(context, variationIndex);
    const technical = this.makeTechnicalDecision(context, variationIndex);
    
    // Score this decision
    const provider = PROVIDER_REGISTRY[technical.provider];
    const score = this.scoreOption(technical.provider, context, {
      cost: technical.estimatedCost,
      quality: provider?.qualityScore || 70,
      speed: provider?.speedScore || 70,
      isAvailable: true,
    });
    
    return {
      creative,
      technical,
      score,
      reasoning: {
        creative: `${creative.framework} framework with ${creative.hookType} hook for ${context.market} market, optimized for ${context.platform}`,
        technical: `Using ${technical.provider} (${technical.tier} tier) - ${technical.useFFMPEG ? 'FFMPEG-based' : 'AI-generated'}`,
        optimization: `Cost: $${technical.estimatedCost.toFixed(3)} | Quality: ${provider?.qualityScore || 70}/100 | Speed: ${provider?.speedScore || 70}/100`,
      },
    };
  }

  /**
   * Generate all decisions for a batch
   */
  generateBatchDecisions(context: DecisionContext): FullDecision[] {
    const decisions: FullDecision[] = [];
    
    for (let i = 0; i < context.outputCount; i++) {
      decisions.push(this.makeFullDecision(context, i));
    }
    
    return decisions;
  }

  /**
   * Get batch summary
   */
  getBatchSummary(decisions: FullDecision[]): {
    totalCost: number;
    avgQuality: number;
    frameworkDistribution: Record<string, number>;
    tierDistribution: Record<string, number>;
    savingsVsPremium: number;
  } {
    const totalCost = decisions.reduce((sum, d) => sum + d.technical.estimatedCost, 0);
    const avgQuality = decisions.reduce((sum, d) => sum + d.score.breakdown.qualityScore, 0) / decisions.length;
    
    const frameworkDistribution: Record<string, number> = {};
    const tierDistribution: Record<string, number> = {};
    
    for (const decision of decisions) {
      frameworkDistribution[decision.creative.framework] = 
        (frameworkDistribution[decision.creative.framework] || 0) + 1;
      tierDistribution[decision.technical.tier] = 
        (tierDistribution[decision.technical.tier] || 0) + 1;
    }
    
    // Calculate savings vs all-premium
    const premiumCostPerVideo = 0.50; // Assume medium-tier as "premium" baseline
    const savingsVsPremium = (premiumCostPerVideo * decisions.length) - totalCost;
    
    return {
      totalCost,
      avgQuality,
      frameworkDistribution,
      tierDistribution,
      savingsVsPremium: Math.max(0, savingsVsPremium),
    };
  }
}

// ============= SINGLETON INSTANCE =============

let globalScorerInstance: GlobalDecisionScorer | null = null;

export function getGlobalDecisionScorer(
  configuredAPIKeys: string[] = [],
  weights?: Partial<ScoringWeights>
): GlobalDecisionScorer {
  if (!globalScorerInstance) {
    globalScorerInstance = new GlobalDecisionScorer(configuredAPIKeys, weights);
  }
  return globalScorerInstance;
}

export function resetGlobalDecisionScorer(): void {
  globalScorerInstance = null;
}
