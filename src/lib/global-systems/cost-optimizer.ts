/**
 * GLOBAL AI COST OPTIMIZER ALGORITHM
 * 
 * Single source of truth for cost optimization across all FlowScale tools.
 * Used by: Creative Replicator, Scene Builder, AI Tools, Studio
 * 
 * ARCHITECTURAL CONTRACTS:
 * 1. FFmpeg operations are always $0 when VPS is available
 * 2. AI engines are only used when FFmpeg cannot handle the operation
 * 3. Cost estimation must be accurate and transparent
 */

export interface CostBreakdown {
  engineId: string;
  engineName: string;
  operationType: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
  isAI: boolean;
}

export interface CostEstimate {
  /** Lowest possible cost (all FFmpeg) */
  min: number;
  /** Highest possible cost (all paid AI) */
  max: number;
  /** Optimized cost (smart routing) */
  optimized: number;
  /** Cost breakdown by engine */
  breakdown: CostBreakdown[];
  /** Strategy description */
  strategy: string;
  /** Number of free operations */
  freeCount: number;
  /** Number of paid operations */
  paidCount: number;
}

export interface CostOptimizerInput {
  operationCount: number;
  operationType: 'video_render' | 'video_transform' | 'image_gen' | 'audio_gen' | 'text_gen';
  vpsAvailable: boolean;
  availableApiKeys: string[];
  targetQuality: 'low' | 'medium' | 'high' | 'premium';
  targetDurationSec?: number;
}

// Cost per operation by engine
const ENGINE_COSTS: Record<string, number> = {
  'ffmpeg-native': 0,
  'ffmpeg-gpu': 0,
  'edge-ffmpeg': 0.01,
  'wan-video': 0.05,
  'kling-video': 0.07,
  'runway-video': 0.10,
  'heygen-avatar': 0.50,
  'elevenlabs-tts': 0.001,
  'gemini-text': 0,
  'openai-text': 0.002,
};

/**
 * Global Cost Optimizer
 * Implements the master cost optimization algorithm
 */
export class GlobalCostOptimizer {
  /**
   * Calculate cost estimate for an operation set
   */
  estimate(input: CostOptimizerInput): CostEstimate {
    const breakdown: CostBreakdown[] = [];
    let freeCount = 0;
    let paidCount = 0;

    // Determine which engines can be used
    const canUseFFmpeg = input.vpsAvailable || input.operationType === 'video_transform';
    const canUseAI = this.hasAIEngineAvailable(input.availableApiKeys, input.operationType);

    // Calculate min cost (all FFmpeg if available)
    const minCost = canUseFFmpeg ? 0 : this.getLowestAICost(input);

    // Calculate max cost (all paid AI)
    const maxCost = canUseAI ? this.getHighestAICost(input) : minCost;

    // Calculate optimized cost (smart routing)
    let optimizedCost = 0;
    let strategy = '';

    if (canUseFFmpeg) {
      // VPS-First: All operations go through FFmpeg
      optimizedCost = 0;
      freeCount = input.operationCount;
      strategy = 'VPS-First: All operations via FFmpeg (FREE)';
      
      breakdown.push({
        engineId: 'ffmpeg-native',
        engineName: 'FFmpeg (VPS)',
        operationType: input.operationType,
        unitCost: 0,
        quantity: input.operationCount,
        totalCost: 0,
        isAI: false,
      });
    } else if (canUseAI) {
      // No VPS: Use cheapest AI engine
      const cheapestEngine = this.getCheapestAIEngine(input.availableApiKeys, input.operationType);
      const costPerOp = ENGINE_COSTS[cheapestEngine] || 0.05;
      optimizedCost = costPerOp * input.operationCount;
      paidCount = input.operationCount;
      strategy = `Cloud Fallback: Using ${cheapestEngine} ($${costPerOp.toFixed(3)}/op)`;
      
      breakdown.push({
        engineId: cheapestEngine,
        engineName: this.getEngineName(cheapestEngine),
        operationType: input.operationType,
        unitCost: costPerOp,
        quantity: input.operationCount,
        totalCost: optimizedCost,
        isAI: true,
      });
    } else {
      // No engines available - use edge fallback
      const fallbackCost = 0.01 * input.operationCount;
      optimizedCost = fallbackCost;
      paidCount = input.operationCount;
      strategy = 'Edge Fallback: Limited FFmpeg via Edge Functions';
      
      breakdown.push({
        engineId: 'edge-ffmpeg',
        engineName: 'Edge FFmpeg',
        operationType: input.operationType,
        unitCost: 0.01,
        quantity: input.operationCount,
        totalCost: fallbackCost,
        isAI: false,
      });
    }

    return {
      min: minCost,
      max: maxCost,
      optimized: optimizedCost,
      breakdown,
      strategy,
      freeCount,
      paidCount,
    };
  }

  /**
   * Get lowest AI cost for operation
   */
  private getLowestAICost(input: CostOptimizerInput): number {
    const cheapestEngine = this.getCheapestAIEngine(input.availableApiKeys, input.operationType);
    return (ENGINE_COSTS[cheapestEngine] || 0.05) * input.operationCount;
  }

  /**
   * Get highest AI cost for operation
   */
  private getHighestAICost(input: CostOptimizerInput): number {
    let maxCost = 0;
    for (const key of input.availableApiKeys) {
      const engine = this.keyToEngine(key);
      if (engine && ENGINE_COSTS[engine] > maxCost) {
        maxCost = ENGINE_COSTS[engine];
      }
    }
    return maxCost * input.operationCount;
  }

  /**
   * Check if any AI engine is available
   */
  private hasAIEngineAvailable(apiKeys: string[], operationType: string): boolean {
    const videoKeys = ['FAL_API_KEY', 'RUNWAY_API_KEY', 'KLING_ACCESS_KEY', 'APIFRAME_API_KEY'];
    const imageKeys = ['FAL_API_KEY', 'LEONARDO_API_KEY', 'OPENAI_API_KEY'];
    const audioKeys = ['ELEVENLABS_API_KEY'];
    const textKeys = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY'];

    const requiredKeys = {
      'video_render': videoKeys,
      'video_transform': [],
      'image_gen': imageKeys,
      'audio_gen': audioKeys,
      'text_gen': textKeys,
    }[operationType] || [];

    return requiredKeys.some(k => apiKeys.includes(k));
  }

  /**
   * Get cheapest AI engine for operation
   */
  private getCheapestAIEngine(apiKeys: string[], operationType: string): string {
    const enginePriority = [
      { key: 'FAL_API_KEY', engine: 'wan-video', cost: 0.05 },
      { key: 'KLING_ACCESS_KEY', engine: 'kling-video', cost: 0.07 },
      { key: 'RUNWAY_API_KEY', engine: 'runway-video', cost: 0.10 },
    ];

    for (const { key, engine } of enginePriority) {
      if (apiKeys.includes(key)) {
        return engine;
      }
    }

    return 'edge-ffmpeg';
  }

  /**
   * Map API key to engine ID
   */
  private keyToEngine(key: string): string | null {
    const map: Record<string, string> = {
      'FAL_API_KEY': 'wan-video',
      'KLING_ACCESS_KEY': 'kling-video',
      'RUNWAY_API_KEY': 'runway-video',
      'ELEVENLABS_API_KEY': 'elevenlabs-tts',
      'OPENAI_API_KEY': 'openai-text',
    };
    return map[key] || null;
  }

  /**
   * Get human-readable engine name
   */
  private getEngineName(engineId: string): string {
    const names: Record<string, string> = {
      'ffmpeg-native': 'FFmpeg (CPU)',
      'ffmpeg-gpu': 'FFmpeg (GPU)',
      'edge-ffmpeg': 'Edge FFmpeg',
      'wan-video': 'Wan 2.5 (Fal)',
      'kling-video': 'Kling 2.5 Pro',
      'runway-video': 'Runway Gen-3',
      'elevenlabs-tts': 'ElevenLabs TTS',
      'openai-text': 'OpenAI GPT',
    };
    return names[engineId] || engineId;
  }
}

// Singleton instance
let _globalOptimizer: GlobalCostOptimizer | null = null;

export function getGlobalCostOptimizer(): GlobalCostOptimizer {
  if (!_globalOptimizer) {
    _globalOptimizer = new GlobalCostOptimizer();
  }
  return _globalOptimizer;
}

/**
 * Quick cost estimation (convenience function)
 */
export function estimateOperationCost(
  operationCount: number,
  operationType: CostOptimizerInput['operationType'],
  vpsAvailable: boolean,
  availableApiKeys: string[] = []
): CostEstimate {
  return getGlobalCostOptimizer().estimate({
    operationCount,
    operationType,
    vpsAvailable,
    availableApiKeys,
    targetQuality: 'medium',
  });
}
