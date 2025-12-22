/**
 * Global AI Brain
 * 
 * Unified entry point for the centralized AI decision-making system.
 * Combines cost optimization and decision scoring into a single interface
 * that can be used by all tools across the platform.
 */

import {
  GlobalBrainState,
  BrainRequest,
  BrainResponse,
  DecisionContext,
  FullDecision,
  ScoringWeights,
  CostOptimizationConfig,
  APIProvider,
} from './types';
import { GlobalCostOptimizer, getGlobalCostOptimizer, DEFAULT_COST_CONFIG } from './cost-optimizer';
import { GlobalDecisionScorer, getGlobalDecisionScorer, DEFAULT_WEIGHTS } from './decision-scorer';
import { getAvailableProviders, PROVIDER_REGISTRY } from './provider-registry';

// ============= GLOBAL AI BRAIN CLASS =============

export class GlobalAIBrain {
  private costOptimizer: GlobalCostOptimizer;
  private decisionScorer: GlobalDecisionScorer;
  private state: GlobalBrainState;

  constructor(
    configuredAPIKeys: string[] = [],
    costConfig?: Partial<CostOptimizationConfig>,
    scoringWeights?: Partial<ScoringWeights>
  ) {
    this.costOptimizer = getGlobalCostOptimizer(configuredAPIKeys, costConfig);
    this.decisionScorer = getGlobalDecisionScorer(configuredAPIKeys, scoringWeights);
    
    const availableProviders = getAvailableProviders(configuredAPIKeys);
    
    this.state = {
      isInitialized: true,
      availableProviders,
      activeProviders: availableProviders.filter(p => p.isAvailable).map(p => p.id),
      defaultWeights: { ...DEFAULT_WEIGHTS, ...scoringWeights },
      costConfig: { ...DEFAULT_COST_CONFIG, ...costConfig },
      lastDecisions: new Map(),
      totalSavings: 0,
      decisionsCount: 0,
    };
  }

  /**
   * Update available providers when API keys change
   */
  updateProviders(configuredAPIKeys: string[]): void {
    const availableProviders = getAvailableProviders(configuredAPIKeys);
    this.state.availableProviders = availableProviders;
    this.state.activeProviders = availableProviders.filter(p => p.isAvailable).map(p => p.id);
    this.costOptimizer.updateAvailableProviders(configuredAPIKeys);
  }

  /**
   * Process a brain request and generate decisions
   */
  process(request: BrainRequest): BrainResponse {
    const { taskId, context, options } = request;
    
    // Apply weight overrides if provided
    const weights = options?.overrideWeights
      ? { ...this.state.defaultWeights, ...options.overrideWeights }
      : this.state.defaultWeights;
    
    // Generate decisions for all outputs
    const decisions = this.decisionScorer.generateBatchDecisions(context);
    
    // Calculate totals
    const totalEstimatedCost = decisions.reduce(
      (sum, d) => sum + d.technical.estimatedCost, 
      0
    );
    
    // Get optimization summary
    const summary = this.decisionScorer.getBatchSummary(decisions);
    
    // Build execution plan
    const steps = this.buildExecutionPlan(decisions);
    const estimatedTime = this.estimateExecutionTime(decisions);
    
    // Update state
    this.state.decisionsCount += decisions.length;
    this.state.totalSavings += summary.savingsVsPremium;
    
    // Cache decisions
    for (const decision of decisions) {
      this.state.lastDecisions.set(
        `${taskId}-${decision.creative.framework}`,
        decision
      );
    }
    
    // Build tier counts
    const freeCount = summary.tierDistribution['free'] || 0;
    const paidCount = context.outputCount - freeCount;
    
    return {
      taskId,
      decisions,
      totalEstimatedCost,
      optimizationSummary: {
        strategy: this.buildStrategyString(summary),
        freeCount,
        paidCount,
        totalSavings: summary.savingsVsPremium,
      },
      executionPlan: {
        steps,
        estimatedTime,
      },
    };
  }

  /**
   * Build execution plan steps
   */
  private buildExecutionPlan(decisions: FullDecision[]): string[] {
    const steps: string[] = [];
    
    // Group by tier for efficient execution
    const tierGroups = new Map<string, FullDecision[]>();
    for (const decision of decisions) {
      const tier = decision.technical.tier;
      if (!tierGroups.has(tier)) {
        tierGroups.set(tier, []);
      }
      tierGroups.get(tier)!.push(decision);
    }
    
    steps.push(`Analyze ${decisions.length} variations`);
    
    for (const [tier, tierDecisions] of tierGroups) {
      if (tier === 'free') {
        steps.push(`Execute ${tierDecisions.length} FFMPEG transforms (free)`);
      } else {
        steps.push(`Generate ${tierDecisions.length} AI variations (${tier} tier)`);
      }
    }
    
    steps.push('Compile and export final videos');
    
    return steps;
  }

  /**
   * Estimate execution time in seconds
   */
  private estimateExecutionTime(decisions: FullDecision[]): number {
    let totalSeconds = 0;
    
    for (const decision of decisions) {
      const provider = PROVIDER_REGISTRY[decision.technical.provider];
      if (decision.technical.useFFMPEG) {
        // FFMPEG is fast - ~5 seconds per video
        totalSeconds += 5;
      } else if (provider) {
        // AI generation based on speed score
        const baseTime = 30; // 30 seconds base
        const speedFactor = (100 - provider.speedScore) / 100;
        totalSeconds += baseTime * (1 + speedFactor);
      } else {
        totalSeconds += 20; // Default estimate
      }
    }
    
    return Math.round(totalSeconds);
  }

  /**
   * Build human-readable strategy string
   */
  private buildStrategyString(summary: ReturnType<GlobalDecisionScorer['getBatchSummary']>): string {
    const parts: string[] = [];
    
    if (summary.tierDistribution['free']) {
      parts.push(`${summary.tierDistribution['free']} free`);
    }
    if (summary.tierDistribution['low']) {
      parts.push(`${summary.tierDistribution['low']} low-cost`);
    }
    if (summary.tierDistribution['medium']) {
      parts.push(`${summary.tierDistribution['medium']} medium`);
    }
    if (summary.tierDistribution['premium']) {
      parts.push(`${summary.tierDistribution['premium']} premium`);
    }
    
    if (parts.length === 0) {
      return 'Optimized execution';
    }
    
    return `Cost-optimized: ${parts.join(' + ')}`;
  }

  /**
   * Get cost estimate for a task
   */
  estimateCost(
    taskType: 'video' | 'image' | 'text' | 'audio',
    count: number,
    duration: number = 27
  ): {
    minimum: number;
    maximum: number;
    optimized: number;
    strategy: string;
  } {
    const breakdown = this.costOptimizer.calculateCostBreakdown(taskType, count, duration);
    const summary = this.costOptimizer.getOptimizationSummary(taskType, count, duration);
    
    return {
      minimum: breakdown.minimum,
      maximum: breakdown.maximum,
      optimized: breakdown.estimated,
      strategy: summary.strategy,
    };
  }

  /**
   * Get current state
   */
  getState(): GlobalBrainState {
    return { ...this.state };
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): APIProvider[] {
    return this.state.availableProviders;
  }

  /**
   * Get active provider IDs
   */
  getActiveProviderIds(): string[] {
    return this.state.activeProviders;
  }

  /**
   * Get stats
   */
  getStats(): {
    decisionsCount: number;
    totalSavings: number;
    availableProviderCount: number;
  } {
    return {
      decisionsCount: this.state.decisionsCount,
      totalSavings: this.state.totalSavings,
      availableProviderCount: this.state.availableProviders.length,
    };
  }

  /**
   * Quick decision for a single item
   */
  quickDecision(context: DecisionContext): FullDecision {
    return this.decisionScorer.makeFullDecision(context, 0);
  }
}

// ============= SINGLETON INSTANCE =============

let globalBrainInstance: GlobalAIBrain | null = null;

export function getGlobalAIBrain(
  configuredAPIKeys: string[] = [],
  costConfig?: Partial<CostOptimizationConfig>,
  scoringWeights?: Partial<ScoringWeights>
): GlobalAIBrain {
  if (!globalBrainInstance) {
    globalBrainInstance = new GlobalAIBrain(configuredAPIKeys, costConfig, scoringWeights);
  } else if (configuredAPIKeys.length > 0) {
    globalBrainInstance.updateProviders(configuredAPIKeys);
  }
  return globalBrainInstance;
}

export function resetGlobalAIBrain(): void {
  globalBrainInstance = null;
}

// ============= EXPORTS =============

export * from './types';
export * from './provider-registry';
export * from './cost-optimizer';
export * from './decision-scorer';
