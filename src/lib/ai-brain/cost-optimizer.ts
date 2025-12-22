/**
 * Global AI Cost Optimizer
 * 
 * Centralized cost optimization engine that automatically minimizes costs
 * while maintaining quality across all tools and features.
 */

import {
  CostTier,
  CostBreakdown,
  OptimizationResult,
  CostOptimizationConfig,
  APIProvider,
  DecisionContext,
} from './types';
import {
  PROVIDER_REGISTRY,
  PROVIDER_TIERS,
  TIER_COST_RANGES,
  getProviderTier,
  getAvailableProviders,
  getCheapestProvider,
  getBestQualityProvider,
} from './provider-registry';

// ============= DEFAULT CONFIGURATION =============

export const DEFAULT_COST_CONFIG: CostOptimizationConfig = {
  preferFree: true,
  qualityThreshold: 60, // Minimum acceptable quality score
  allowDowngrade: true,
  allowUpgrade: true,
  upgradeConditions: {
    minQualityGap: 20, // Only upgrade if quality difference > 20
    maxCostIncrease: 0.50, // Max additional cost for upgrade
  },
};

// ============= COST OPTIMIZER CLASS =============

export class GlobalCostOptimizer {
  private config: CostOptimizationConfig;
  private availableProviders: APIProvider[];
  
  constructor(
    configuredAPIKeys: string[],
    config: Partial<CostOptimizationConfig> = {}
  ) {
    this.config = { ...DEFAULT_COST_CONFIG, ...config };
    this.availableProviders = getAvailableProviders(configuredAPIKeys);
  }

  /**
   * Update available providers when API keys change
   */
  updateAvailableProviders(configuredAPIKeys: string[]): void {
    this.availableProviders = getAvailableProviders(configuredAPIKeys);
  }

  /**
   * Calculate cost breakdown for a task
   */
  calculateCostBreakdown(
    taskType: 'video' | 'image' | 'text' | 'audio',
    count: number,
    durationPerUnit: number = 27 // Default 27s for videos
  ): CostBreakdown {
    const providers = this.availableProviders.filter(p => p.type === taskType);
    
    if (providers.length === 0) {
      return { perUnit: 0, perSecond: 0, estimated: 0, minimum: 0, maximum: 0 };
    }

    const costs = providers.map(p => {
      if (p.costPerSecond && (taskType === 'video' || taskType === 'audio')) {
        return p.costPerSecond * durationPerUnit;
      }
      return p.costPerUnit;
    });

    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    
    // Optimized cost uses distribution strategy
    const optimizedCost = this.calculateOptimizedCost(providers, count, durationPerUnit);

    return {
      perUnit: optimizedCost / count,
      perSecond: (optimizedCost / count) / durationPerUnit,
      estimated: optimizedCost,
      minimum: minCost * count,
      maximum: maxCost * count,
    };
  }

  /**
   * Calculate optimized cost using tier distribution
   */
  private calculateOptimizedCost(
    providers: APIProvider[],
    count: number,
    durationPerUnit: number
  ): number {
    // Distribution strategy:
    // - 40% free tier (if available)
    // - 40% low-cost tier
    // - 15% medium tier
    // - 5% premium tier (for hero content)
    
    const hasFree = providers.some(p => PROVIDER_TIERS.free.includes(p.id));
    const hasLow = providers.some(p => PROVIDER_TIERS.low.includes(p.id));
    const hasMedium = providers.some(p => PROVIDER_TIERS.medium.includes(p.id));
    
    let totalCost = 0;
    
    if (hasFree) {
      const freeCount = Math.floor(count * 0.4);
      totalCost += 0; // Free
      
      if (hasLow) {
        const lowCount = Math.floor(count * 0.4);
        const lowProvider = providers.find(p => PROVIDER_TIERS.low.includes(p.id));
        const lowCost = lowProvider?.costPerSecond 
          ? lowProvider.costPerSecond * durationPerUnit 
          : lowProvider?.costPerUnit || 0.05;
        totalCost += lowCount * lowCost;
        
        if (hasMedium) {
          const mediumCount = count - freeCount - lowCount;
          const mediumProvider = providers.find(p => PROVIDER_TIERS.medium.includes(p.id));
          const mediumCost = mediumProvider?.costPerSecond 
            ? mediumProvider.costPerSecond * durationPerUnit 
            : mediumProvider?.costPerUnit || 0.25;
          totalCost += mediumCount * mediumCost;
        } else {
          totalCost += (count - freeCount - lowCount) * lowCost;
        }
      } else {
        // All free
        totalCost = 0;
      }
    } else if (hasLow) {
      const lowProvider = providers.find(p => PROVIDER_TIERS.low.includes(p.id));
      const lowCost = lowProvider?.costPerSecond 
        ? lowProvider.costPerSecond * durationPerUnit 
        : lowProvider?.costPerUnit || 0.05;
      totalCost = count * lowCost;
    } else if (hasMedium) {
      const mediumProvider = providers.find(p => PROVIDER_TIERS.medium.includes(p.id));
      const mediumCost = mediumProvider?.costPerSecond 
        ? mediumProvider.costPerSecond * durationPerUnit 
        : mediumProvider?.costPerUnit || 0.25;
      totalCost = count * mediumCost;
    }
    
    return totalCost;
  }

  /**
   * Select optimal provider for a task
   */
  selectOptimalProvider(
    taskType: 'video' | 'image' | 'text' | 'audio',
    context: DecisionContext,
    variationIndex: number = 0
  ): OptimizationResult {
    const providers = this.availableProviders.filter(p => p.type === taskType);
    const availableIds = providers.map(p => p.id);
    
    // Determine tier based on position and cost optimization
    const position = context.outputCount > 0 
      ? variationIndex / context.outputCount 
      : 0;
    
    let selectedTier: CostTier = 'free';
    let reasoning = '';
    
    // Tier selection based on position and quality requirement
    if (this.config.preferFree && position < 0.4 && this.hasTierAvailable('free', providers)) {
      selectedTier = 'free';
      reasoning = 'Cost-optimized: Using free FFMPEG transforms for variety';
    } else if (position < 0.8 && this.hasTierAvailable('low', providers)) {
      selectedTier = 'low';
      reasoning = 'Balance: Using budget-friendly AI for good quality/cost ratio';
    } else if (context.qualityRequirement === 'premium' && this.hasTierAvailable('premium', providers)) {
      selectedTier = 'premium';
      reasoning = 'Premium quality requested: Using highest-tier provider';
    } else if (this.hasTierAvailable('medium', providers)) {
      selectedTier = 'medium';
      reasoning = 'Hero variation: Higher quality AI for standout content';
    } else if (this.hasTierAvailable('low', providers)) {
      selectedTier = 'low';
      reasoning = 'Using available low-cost provider';
    } else {
      selectedTier = 'free';
      reasoning = 'Fallback: No paid API keys configured, using free options';
    }
    
    // Get provider from selected tier
    const tierProviders = providers.filter(p => 
      PROVIDER_TIERS[selectedTier].includes(p.id)
    );
    
    const selectedProvider = tierProviders.length > 0
      ? tierProviders[variationIndex % tierProviders.length]
      : providers[0];
    
    // Calculate cost
    const estimatedCost = selectedProvider 
      ? this.calculateProviderCost(selectedProvider, context.targetDuration || 27)
      : 0;
    
    // Find premium alternative for savings calculation
    const premiumProvider = getBestQualityProvider(taskType, availableIds);
    const premiumCost = premiumProvider 
      ? this.calculateProviderCost(premiumProvider, context.targetDuration || 27)
      : estimatedCost;
    
    const savings = premiumCost - estimatedCost;
    
    // Build alternatives list
    const alternatives = providers
      .filter(p => p.id !== selectedProvider?.id)
      .slice(0, 3)
      .map(p => ({
        provider: p.id,
        cost: this.calculateProviderCost(p, context.targetDuration || 27),
        qualityDiff: p.qualityScore - (selectedProvider?.qualityScore || 0),
      }));
    
    return {
      selectedProvider: selectedProvider?.id || 'ffmpeg-local',
      selectedTier,
      estimatedCost,
      savings: Math.max(0, savings),
      reasoning,
      alternatives,
    };
  }

  /**
   * Check if tier has available providers
   */
  private hasTierAvailable(tier: CostTier, providers: APIProvider[]): boolean {
    return providers.some(p => PROVIDER_TIERS[tier].includes(p.id));
  }

  /**
   * Calculate cost for a specific provider
   */
  private calculateProviderCost(provider: APIProvider, duration: number): number {
    if (provider.costPerSecond) {
      return provider.costPerSecond * duration;
    }
    return provider.costPerUnit;
  }

  /**
   * Determine if FFmpeg can handle the task
   */
  canUseFFMPEG(taskCapabilities: string[]): boolean {
    const ffmpegCapabilities = [
      'trim', 'merge', 'resize', 'text_overlay', 'transitions',
      'pan-zoom', 'ken-burns', 'parallax', 'shake', 'zoom', 'speed'
    ];
    
    return taskCapabilities.every(cap => ffmpegCapabilities.includes(cap));
  }

  /**
   * Check if upgrade is justified
   */
  shouldUpgrade(
    currentProvider: APIProvider,
    betterProvider: APIProvider,
    context: DecisionContext
  ): boolean {
    if (!this.config.allowUpgrade) return false;
    
    const qualityGap = betterProvider.qualityScore - currentProvider.qualityScore;
    const costIncrease = betterProvider.costPerUnit - currentProvider.costPerUnit;
    
    // Check quality requirement
    if (context.qualityRequirement === 'premium' && qualityGap >= 10) {
      return true;
    }
    
    // Check if gap justifies cost
    return qualityGap >= this.config.upgradeConditions.minQualityGap &&
           costIncrease <= this.config.upgradeConditions.maxCostIncrease;
  }

  /**
   * Get optimization summary for a batch
   */
  getOptimizationSummary(
    taskType: 'video' | 'image' | 'text' | 'audio',
    count: number,
    duration: number = 27
  ): {
    strategy: string;
    freeCount: number;
    lowCount: number;
    mediumCount: number;
    premiumCount: number;
    totalCost: number;
    savings: number;
  } {
    const providers = this.availableProviders.filter(p => p.type === taskType);
    
    const hasFree = this.hasTierAvailable('free', providers);
    const hasLow = this.hasTierAvailable('low', providers);
    const hasMedium = this.hasTierAvailable('medium', providers);
    
    let freeCount = 0;
    let lowCount = 0;
    let mediumCount = 0;
    let premiumCount = 0;
    
    if (hasFree) {
      freeCount = Math.floor(count * 0.4);
      if (hasLow) {
        lowCount = Math.floor(count * 0.4);
        mediumCount = count - freeCount - lowCount;
      } else {
        freeCount = count;
      }
    } else if (hasLow) {
      lowCount = Math.floor(count * 0.8);
      mediumCount = count - lowCount;
    } else {
      mediumCount = count;
    }
    
    const costBreakdown = this.calculateCostBreakdown(taskType, count, duration);
    const savings = costBreakdown.maximum - costBreakdown.estimated;
    
    const strategy = freeCount > 0
      ? `Cost-optimized: ${freeCount} free + ${lowCount} low-cost + ${mediumCount} medium AI`
      : hasLow
        ? `Balanced: ${lowCount} low-cost + ${mediumCount} medium AI`
        : `Premium: All ${count} using best available`;
    
    return {
      strategy,
      freeCount,
      lowCount,
      mediumCount,
      premiumCount,
      totalCost: costBreakdown.estimated,
      savings: Math.max(0, savings),
    };
  }
}

// ============= SINGLETON INSTANCE =============

let globalOptimizerInstance: GlobalCostOptimizer | null = null;

export function getGlobalCostOptimizer(
  configuredAPIKeys: string[] = [],
  config?: Partial<CostOptimizationConfig>
): GlobalCostOptimizer {
  if (!globalOptimizerInstance) {
    globalOptimizerInstance = new GlobalCostOptimizer(configuredAPIKeys, config);
  } else if (configuredAPIKeys.length > 0) {
    globalOptimizerInstance.updateAvailableProviders(configuredAPIKeys);
  }
  return globalOptimizerInstance;
}

export function resetGlobalCostOptimizer(): void {
  globalOptimizerInstance = null;
}
