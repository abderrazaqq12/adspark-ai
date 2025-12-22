/**
 * AI Creative Brain - Decision Engine for AI Creative Replicator
 * 
 * Handles all creative + technical decisions automatically:
 * - Video type / marketing framework selection
 * - Engine tier selection based on cost optimization
 * - Hook generation strategies
 * - Pacing and transitions
 * - Duration enforcement (20-35 seconds)
 */

// Marketing frameworks the AI can choose from
export type MarketingFramework = 
  | 'PAS'           // Problem-Agitate-Solution
  | 'AIDA'          // Attention-Interest-Desire-Action
  | 'social-proof'  // Testimonials & reviews
  | 'before-after'  // Transformation showcase
  | 'curiosity'     // Hook with mystery
  | 'offer-driven'  // Direct offer focus
  | 'story-driven'  // Narrative arc
  | 'ugc-style';    // User-generated content feel

// Video types the AI can choose
export type VideoType = 
  | 'ugc-review'
  | 'testimonial'
  | 'before-after'
  | 'unboxing'
  | 'problem-solution'
  | 'lifestyle'
  | 'educational'
  | 'day-in-life';

// Engine tiers with their capabilities
export interface EngineTier {
  id: 'free' | 'low' | 'medium' | 'premium';
  costPerSecond: number;
  minCost: number;
  maxCost: number;
  capabilities: string[];
  providers: string[];
}

export const ENGINE_TIERS: EngineTier[] = [
  {
    id: 'free',
    costPerSecond: 0,
    minCost: 0,
    maxCost: 0,
    capabilities: ['ffmpeg-transform', 'pan-zoom', 'ken-burns', 'parallax', 'shake'],
    providers: ['FFMPEG-Local', 'FFMPEG-Edge'],
  },
  {
    id: 'low',
    costPerSecond: 0.004,
    minCost: 0.05,
    maxCost: 0.15,
    capabilities: ['image-to-video', 'basic-generation', 'motion-consistency'],
    providers: ['Kling-2.5', 'MiniMax', 'Wan-2.5', 'Kie-Luma'],
  },
  {
    id: 'medium',
    costPerSecond: 0.015,
    minCost: 0.25,
    maxCost: 0.50,
    capabilities: ['full-generation', 'text-rendering', 'character-consistency'],
    providers: ['Runway-Gen3', 'Veo-3.1', 'Luma-Dream', 'Kie-Runway'],
  },
  {
    id: 'premium',
    costPerSecond: 0.08,
    minCost: 1.00,
    maxCost: 2.50,
    capabilities: ['cinematic', 'photorealistic', 'complex-camera', 'physics-simulation'],
    providers: ['Sora-2', 'Sora-2-Pro', 'Kie-Veo-3.1'],
  },
];

// Hook types the AI can generate
export type HookType = 
  | 'question'
  | 'shock'
  | 'emotional'
  | 'story'
  | 'problem-solution'
  | 'statistic'
  | 'humor'
  | 'curiosity';

// Pacing styles
export type PacingStyle = 'fast' | 'medium' | 'slow' | 'dynamic';

// AI Decision for a single variation
export interface AIVariationDecision {
  variationIndex: number;
  // Creative decisions
  framework: MarketingFramework;
  videoType: VideoType;
  hookType: HookType;
  pacing: PacingStyle;
  transitions: string[];
  // Technical decisions
  engineTier: EngineTier['id'];
  selectedProvider: string;
  useFFMPEGOnly: boolean;
  // Duration (enforced 20-35s)
  targetDuration: number;
  // Cost
  estimatedCost: number;
  // Reasoning (for debug panel)
  reasoning: {
    frameworkReason: string;
    engineReason: string;
    durationReason: string;
  };
}

// Market-specific preferences
const MARKET_PREFERENCES: Record<string, {
  preferredFrameworks: MarketingFramework[];
  preferredHooks: HookType[];
  preferredPacing: PacingStyle;
  preferredVideoTypes: VideoType[];
}> = {
  saudi: {
    preferredFrameworks: ['social-proof', 'story-driven', 'PAS'],
    preferredHooks: ['emotional', 'story', 'problem-solution'],
    preferredPacing: 'medium',
    preferredVideoTypes: ['ugc-review', 'testimonial', 'before-after'],
  },
  uae: {
    preferredFrameworks: ['AIDA', 'offer-driven', 'social-proof'],
    preferredHooks: ['emotional', 'story', 'shock'],
    preferredPacing: 'medium',
    preferredVideoTypes: ['lifestyle', 'testimonial', 'unboxing'],
  },
  usa: {
    preferredFrameworks: ['AIDA', 'curiosity', 'PAS'],
    preferredHooks: ['question', 'shock', 'humor'],
    preferredPacing: 'fast',
    preferredVideoTypes: ['ugc-review', 'problem-solution', 'lifestyle'],
  },
  europe: {
    preferredFrameworks: ['AIDA', 'social-proof', 'story-driven'],
    preferredHooks: ['statistic', 'question', 'story'],
    preferredPacing: 'medium',
    preferredVideoTypes: ['educational', 'testimonial', 'lifestyle'],
  },
  latam: {
    preferredFrameworks: ['PAS', 'social-proof', 'offer-driven'],
    preferredHooks: ['shock', 'emotional', 'humor'],
    preferredPacing: 'fast',
    preferredVideoTypes: ['ugc-review', 'unboxing', 'day-in-life'],
  },
  gcc: {
    preferredFrameworks: ['social-proof', 'story-driven', 'AIDA'],
    preferredHooks: ['emotional', 'story', 'problem-solution'],
    preferredPacing: 'medium',
    preferredVideoTypes: ['testimonial', 'ugc-review', 'before-after'],
  },
};

// Platform-specific adjustments
const PLATFORM_ADJUSTMENTS: Record<string, {
  maxDuration: number;
  preferredPacing: PacingStyle;
  aspectRatio: string;
}> = {
  'tiktok': { maxDuration: 35, preferredPacing: 'fast', aspectRatio: '9:16' },
  'instagram-reels': { maxDuration: 35, preferredPacing: 'fast', aspectRatio: '9:16' },
  'youtube-shorts': { maxDuration: 35, preferredPacing: 'medium', aspectRatio: '9:16' },
  'facebook': { maxDuration: 35, preferredPacing: 'medium', aspectRatio: '4:5' },
  'instagram-feed': { maxDuration: 35, preferredPacing: 'medium', aspectRatio: '1:1' },
};

export interface BrainInput {
  numberOfVideos: number;
  language: string;
  market: string;
  platform: string;
  sourceVideoDuration: number;
  availableApiKeys: string[]; // List of configured API providers
}

export interface BrainOutput {
  decisions: AIVariationDecision[];
  costEstimate: {
    minimum: number;
    maximum: number;
    optimized: number;
  };
  optimizationStrategy: string;
  globalSettings: {
    enforedMinDuration: number;
    enforcedMaxDuration: number;
    primaryFramework: MarketingFramework;
    primaryHook: HookType;
  };
}

/**
 * AI Creative Brain - Main decision engine
 */
export class AICreativeBrain {
  private input: BrainInput;
  private marketPrefs: typeof MARKET_PREFERENCES[string];
  private platformPrefs: typeof PLATFORM_ADJUSTMENTS[string];

  constructor(input: BrainInput) {
    this.input = input;
    this.marketPrefs = MARKET_PREFERENCES[input.market] || MARKET_PREFERENCES['usa'];
    this.platformPrefs = PLATFORM_ADJUSTMENTS[input.platform] || PLATFORM_ADJUSTMENTS['tiktok'];
  }

  /**
   * Generate all decisions for the requested variations
   */
  generateDecisions(): BrainOutput {
    const decisions: AIVariationDecision[] = [];
    let totalMinCost = 0;
    let totalMaxCost = 0;
    let totalOptimizedCost = 0;

    for (let i = 0; i < this.input.numberOfVideos; i++) {
      const decision = this.decideForVariation(i);
      decisions.push(decision);
      
      // Accumulate costs
      const tier = ENGINE_TIERS.find(t => t.id === decision.engineTier)!;
      totalMinCost += tier.minCost;
      totalMaxCost += tier.maxCost;
      totalOptimizedCost += decision.estimatedCost;
    }

    // Determine optimization strategy
    const freeCount = decisions.filter(d => d.engineTier === 'free').length;
    const paidCount = decisions.length - freeCount;
    const strategy = freeCount > paidCount 
      ? `Cost-optimized: ${freeCount}/${decisions.length} videos use free FFMPEG transforms`
      : `Quality-balanced: Mix of ${freeCount} free + ${paidCount} AI-generated videos`;

    return {
      decisions,
      costEstimate: {
        minimum: totalMinCost,
        maximum: totalMaxCost,
        optimized: totalOptimizedCost,
      },
      optimizationStrategy: strategy,
      globalSettings: {
        enforedMinDuration: 20,
        enforcedMaxDuration: 35,
        primaryFramework: this.marketPrefs.preferredFrameworks[0],
        primaryHook: this.marketPrefs.preferredHooks[0],
      },
    };
  }

  /**
   * Make decisions for a single variation
   */
  private decideForVariation(index: number): AIVariationDecision {
    // Distribute frameworks and hooks across variations for variety
    const framework = this.selectFramework(index);
    const videoType = this.selectVideoType(index);
    const hookType = this.selectHook(index);
    const pacing = this.selectPacing(index);
    const transitions = this.selectTransitions(index);
    
    // Engine selection based on cost optimization
    const { tier, provider, useFFMPEG, reason: engineReason } = this.selectEngine(index);
    
    // Duration within 20-35s range
    const { duration, reason: durationReason } = this.selectDuration(index, pacing);
    
    // Calculate cost
    const tierData = ENGINE_TIERS.find(t => t.id === tier)!;
    const estimatedCost = tier === 'free' ? 0 : tierData.costPerSecond * duration;

    return {
      variationIndex: index,
      framework,
      videoType,
      hookType,
      pacing,
      transitions,
      engineTier: tier,
      selectedProvider: provider,
      useFFMPEGOnly: useFFMPEG,
      targetDuration: duration,
      estimatedCost,
      reasoning: {
        frameworkReason: `${framework} works best for ${this.input.market} market with ${videoType} content`,
        engineReason,
        durationReason,
      },
    };
  }

  private selectFramework(index: number): MarketingFramework {
    const frameworks = this.marketPrefs.preferredFrameworks;
    return frameworks[index % frameworks.length];
  }

  private selectVideoType(index: number): VideoType {
    const types = this.marketPrefs.preferredVideoTypes;
    return types[index % types.length];
  }

  private selectHook(index: number): HookType {
    const hooks = this.marketPrefs.preferredHooks;
    return hooks[index % hooks.length];
  }

  private selectPacing(index: number): PacingStyle {
    // Mix of market and platform preferences
    if (index % 3 === 0) return this.platformPrefs.preferredPacing;
    if (index % 3 === 1) return this.marketPrefs.preferredPacing;
    return 'dynamic';
  }

  private selectTransitions(index: number): string[] {
    const transitionSets = [
      ['hard-cut', 'zoom'],
      ['slide', 'whip-pan'],
      ['glitch', 'hard-cut'],
      ['zoom', 'slide'],
    ];
    return transitionSets[index % transitionSets.length];
  }

  private selectEngine(index: number): {
    tier: EngineTier['id'];
    provider: string;
    useFFMPEG: boolean;
    reason: string;
  } {
    // Cost optimization strategy:
    // - First 40% of videos: Try free tier (FFMPEG transforms)
    // - Next 40%: Use low-cost AI
    // - Last 20%: Use medium/premium for hero variations
    
    const position = index / this.input.numberOfVideos;
    
    // Check which providers are available
    const hasLowCost = this.input.availableApiKeys.some(k => 
      ['kling', 'minimax', 'wan', 'fal'].some(p => k.toLowerCase().includes(p))
    );
    const hasMedium = this.input.availableApiKeys.some(k =>
      ['runway', 'veo', 'luma'].some(p => k.toLowerCase().includes(p))
    );
    const hasPremium = this.input.availableApiKeys.some(k =>
      ['sora', 'openai'].some(p => k.toLowerCase().includes(p))
    );

    if (position < 0.4) {
      // Free tier - FFMPEG only
      const providers = ENGINE_TIERS[0].providers;
      return {
        tier: 'free',
        provider: providers[index % providers.length],
        useFFMPEG: true,
        reason: 'Cost-optimized: Using free FFMPEG transforms for variety',
      };
    } else if (position < 0.8 && hasLowCost) {
      // Low cost tier
      const providers = ENGINE_TIERS[1].providers;
      return {
        tier: 'low',
        provider: providers[index % providers.length],
        useFFMPEG: false,
        reason: 'Balance: Using budget-friendly AI for good quality/cost ratio',
      };
    } else if (hasMedium) {
      // Medium tier for hero content
      const providers = ENGINE_TIERS[2].providers;
      return {
        tier: 'medium',
        provider: providers[index % providers.length],
        useFFMPEG: false,
        reason: 'Hero variation: Higher quality AI for standout content',
      };
    } else if (hasPremium) {
      // Premium if available
      const providers = ENGINE_TIERS[3].providers;
      return {
        tier: 'premium',
        provider: providers[index % providers.length],
        useFFMPEG: false,
        reason: 'Premium: Cinematic quality for maximum impact',
      };
    } else {
      // Fallback to free
      const providers = ENGINE_TIERS[0].providers;
      return {
        tier: 'free',
        provider: providers[index % providers.length],
        useFFMPEG: true,
        reason: 'Fallback: No paid API keys configured, using free FFMPEG',
      };
    }
  }

  private selectDuration(index: number, pacing: PacingStyle): {
    duration: number;
    reason: string;
  } {
    // ENFORCED: 20-35 seconds
    const MIN_DURATION = 20;
    const MAX_DURATION = 35;
    
    let baseDuration: number;
    let reason: string;

    switch (pacing) {
      case 'fast':
        baseDuration = 22; // Shorter for fast pacing
        reason = 'Fast pacing: Shorter duration for high energy';
        break;
      case 'slow':
        baseDuration = 32; // Longer for slow/cinematic
        reason = 'Slow pacing: Longer duration for story development';
        break;
      case 'dynamic':
        // Vary between min and max
        baseDuration = MIN_DURATION + (index % 4) * 4;
        reason = 'Dynamic: Varied duration for A/B testing';
        break;
      default:
        baseDuration = 27; // Medium
        reason = 'Medium pacing: Balanced duration';
    }

    // Ensure within bounds
    const duration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, baseDuration));
    
    return { duration, reason };
  }
}

/**
 * Quick cost estimation without full brain analysis
 */
export function estimateCostRange(
  numberOfVideos: number,
  availableApiKeys: string[]
): { min: number; max: number; optimized: number; strategy: string } {
  // Estimate distribution
  const freeRatio = availableApiKeys.length === 0 ? 1 : 0.4;
  const paidRatio = 1 - freeRatio;
  
  const freeCount = Math.floor(numberOfVideos * freeRatio);
  const paidCount = numberOfVideos - freeCount;
  
  // Assume average 27s duration
  const avgDuration = 27;
  
  // Calculate costs
  const minCost = paidCount * ENGINE_TIERS[1].minCost;
  const maxCost = paidCount * ENGINE_TIERS[2].maxCost;
  const optimized = paidCount * ENGINE_TIERS[1].costPerSecond * avgDuration;

  const strategy = freeCount > 0 
    ? `~${freeCount} free FFMPEG + ~${paidCount} AI-generated`
    : `All ${numberOfVideos} AI-generated`;

  return { min: minCost, max: maxCost, optimized, strategy };
}
