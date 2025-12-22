/**
 * GLOBAL DECISION SCORING SYSTEM
 * 
 * Single source of truth for engine selection across all FlowScale tools.
 * Used by: Creative Replicator, Scene Builder, AI Tools, Image Generation, Video Generation
 * 
 * ARCHITECTURAL CONTRACTS:
 * 1. VPS-First: If VPS FFmpeg is healthy, ONLY FFmpeg engines are allowed
 * 2. Cost Optimization: Always prefer lowest-cost option that meets quality requirements
 * 3. Latency Aware: Consider queue depth and historical latency
 */

export interface EngineScoreFactors {
  cost: number;        // 0-100 (lower = cheaper, better)
  quality: number;     // 0-100 (higher = better)
  latency: number;     // 0-100 (lower = faster, better)
  availability: number; // 0-100 (higher = more available)
}

export interface ScoringWeights {
  cost: number;        // Default: 0.4
  quality: number;     // Default: 0.3
  latency: number;     // Default: 0.2
  availability: number; // Default: 0.1
}

export interface EngineDecisionResult {
  engineId: string;
  engineName: string;
  score: number;
  factors: EngineScoreFactors;
  reasoning: string;
  isVPS: boolean;
  estimatedCostUsd: number;
  estimatedLatencyMs: number;
}

export interface VPSStatus {
  available: boolean;
  ffmpegReady: boolean;
  queueDepth: number;
  latencyMs: number;
  cpuCores: number;
  ramMB: number;
  hasGPU: boolean;
}

export interface DecisionContext {
  vps: VPSStatus;
  operationType: 'video_render' | 'video_transform' | 'image_gen' | 'audio_gen' | 'text_gen';
  qualityRequirement: 'low' | 'medium' | 'high' | 'premium';
  userTier: 'free' | 'pro' | 'enterprise';
  availableApiKeys: string[];
  targetDuration?: number;
  platform?: string;
  market?: string;
}

// Default weights - cost-optimized by default
const DEFAULT_WEIGHTS: ScoringWeights = {
  cost: 0.4,
  quality: 0.3,
  latency: 0.2,
  availability: 0.1,
};

// Engine definitions
interface EngineDefinition {
  id: string;
  name: string;
  type: 'vps' | 'edge' | 'ai';
  baseCost: number;
  baseLatency: number;
  qualityScore: number;
  capabilities: string[];
}

const ENGINE_REGISTRY: Record<string, EngineDefinition> = {
  'ffmpeg-native': {
    id: 'ffmpeg-native',
    name: 'FFmpeg (CPU)',
    type: 'vps',
    baseCost: 0,
    baseLatency: 2000,
    qualityScore: 90,
    capabilities: ['trim', 'concat', 'overlay', 'resize', 'audio_mix', 'filter', 'subtitles'],
  },
  'ffmpeg-gpu': {
    id: 'ffmpeg-gpu',
    name: 'FFmpeg (GPU/NVENC)',
    type: 'vps',
    baseCost: 0,
    baseLatency: 800,
    qualityScore: 95,
    capabilities: ['trim', 'concat', 'overlay', 'resize', 'audio_mix', 'filter', 'subtitles', 'hardware_encode'],
  },
  'edge-ffmpeg': {
    id: 'edge-ffmpeg',
    name: 'Edge FFmpeg',
    type: 'edge',
    baseCost: 0.01,
    baseLatency: 3000,
    qualityScore: 85,
    capabilities: ['trim', 'concat', 'overlay', 'resize'],
  },
  'wan-video': {
    id: 'wan-video',
    name: 'Wan 2.5 (Fal)',
    type: 'ai',
    baseCost: 0.05,
    baseLatency: 15000,
    qualityScore: 80,
    capabilities: ['ai_video_gen'],
  },
  'kling-video': {
    id: 'kling-video',
    name: 'Kling 2.5 Pro',
    type: 'ai',
    baseCost: 0.07,
    baseLatency: 20000,
    qualityScore: 92,
    capabilities: ['ai_video_gen'],
  },
  'runway-video': {
    id: 'runway-video',
    name: 'Runway Gen-3',
    type: 'ai',
    baseCost: 0.10,
    baseLatency: 30000,
    qualityScore: 95,
    capabilities: ['ai_video_gen', 'premium_quality'],
  },
};

/**
 * Global Decision Scorer
 * Implements the master scoring algorithm used across all FlowScale tools
 */
export class GlobalDecisionScorer {
  private weights: ScoringWeights;
  private vpsStatus: VPSStatus | null = null;

  constructor(weights: Partial<ScoringWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Update VPS status (called by useRenderEnvironment)
   */
  setVPSStatus(status: VPSStatus): void {
    this.vpsStatus = status;
  }

  /**
   * Update scoring weights
   */
  setWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * VPS-FIRST DECISION LAW
   * If VPS is healthy and operation can be done with FFmpeg, ONLY FFmpeg is allowed
   */
  enforceVPSFirst(context: DecisionContext, operation: string): boolean {
    if (!context.vps.available || !context.vps.ffmpegReady) {
      return false;
    }

    // Check if operation can be handled by FFmpeg
    const ffmpegOps = [
      'trim', 'concat', 'overlay', 'resize', 'audio_mix', 
      'filter', 'subtitles', 'speed', 'fade', 'video_render', 'video_transform'
    ];

    return ffmpegOps.includes(operation);
  }

  /**
   * Score an engine based on context
   */
  scoreEngine(engineId: string, context: DecisionContext): EngineScoreFactors {
    const engine = ENGINE_REGISTRY[engineId as keyof typeof ENGINE_REGISTRY];
    if (!engine) {
      return { cost: 100, quality: 0, latency: 100, availability: 0 };
    }

    // Cost score (0-100, lower is better)
    const costScore = Math.min(100, engine.baseCost * 1000);

    // Quality score (0-100, higher is better)
    let qualityScore = engine.qualityScore;
    if (context.qualityRequirement === 'premium' && !engine.capabilities.includes('premium_quality' as any)) {
      qualityScore = Math.max(0, qualityScore - 20);
    }

    // Latency score (0-100, lower is better)
    const baseLatency = engine.baseLatency;
    const queuePenalty = context.vps.queueDepth * 500;
    const effectiveLatency = baseLatency + queuePenalty;
    const latencyScore = Math.min(100, effectiveLatency / 500);

    // Availability score (0-100, higher is better)
    let availabilityScore = 100;
    if (engine.type === 'vps' && !context.vps.available) {
      availabilityScore = 0;
    } else if (engine.type === 'ai') {
      // Check if required API key is available
      const requiredKey = this.getRequiredApiKey(engineId);
      if (requiredKey && !context.availableApiKeys.includes(requiredKey)) {
        availabilityScore = 0;
      }
    }

    return {
      cost: costScore,
      quality: qualityScore,
      latency: latencyScore,
      availability: availabilityScore,
    };
  }

  /**
   * Calculate weighted score
   */
  calculateScore(factors: EngineScoreFactors): number {
    // Normalize: cost and latency are "lower is better", so invert them
    const normalizedCost = 100 - factors.cost;
    const normalizedLatency = 100 - factors.latency;

    return (
      normalizedCost * this.weights.cost +
      factors.quality * this.weights.quality +
      normalizedLatency * this.weights.latency +
      factors.availability * this.weights.availability
    );
  }

  /**
   * Select best engine for operation
   */
  selectEngine(context: DecisionContext): EngineDecisionResult {
    // VPS-FIRST LAW: If VPS is healthy, only allow FFmpeg engines
    if (this.enforceVPSFirst(context, context.operationType)) {
      const gpuAvailable = context.vps.hasGPU;
      const engineId = gpuAvailable ? 'ffmpeg-gpu' : 'ffmpeg-native';
      const engine = ENGINE_REGISTRY[engineId];
      const factors = this.scoreEngine(engineId, context);

      return {
        engineId,
        engineName: engine.name,
        score: this.calculateScore(factors),
        factors,
        reasoning: `VPS-First Policy: ${engine.name} selected (VPS healthy, FFmpeg capable)`,
        isVPS: true,
        estimatedCostUsd: 0,
        estimatedLatencyMs: engine.baseLatency + (context.vps.queueDepth * 500),
      };
    }

    // Fallback: Score all available engines and pick best
    const candidates: EngineDecisionResult[] = [];

    for (const [engineId, engine] of Object.entries(ENGINE_REGISTRY)) {
      // Skip VPS engines if VPS is not available
      if (engine.type === 'vps' && !context.vps.available) continue;

      // Skip AI engines that require unavailable API keys
      const requiredKey = this.getRequiredApiKey(engineId);
      if (requiredKey && !context.availableApiKeys.includes(requiredKey)) continue;

      const factors = this.scoreEngine(engineId, context);
      const score = this.calculateScore(factors);

      // Skip if availability is 0
      if (factors.availability === 0) continue;

      candidates.push({
        engineId,
        engineName: engine.name,
        score,
        factors,
        reasoning: `Score: ${score.toFixed(1)} (cost: ${factors.cost}, quality: ${factors.quality})`,
        isVPS: engine.type === 'vps',
        estimatedCostUsd: engine.baseCost,
        estimatedLatencyMs: engine.baseLatency,
      });
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      // No engines available - return edge fallback
      return {
        engineId: 'edge-ffmpeg',
        engineName: 'Edge FFmpeg (Fallback)',
        score: 0,
        factors: { cost: 50, quality: 50, latency: 50, availability: 100 },
        reasoning: 'Fallback: No preferred engines available',
        isVPS: false,
        estimatedCostUsd: 0.01,
        estimatedLatencyMs: 3000,
      };
    }

    const best = candidates[0];
    return {
      ...best,
      reasoning: `Best match: ${best.engineName} (${best.reasoning})`,
    };
  }

  /**
   * Get required API key for an engine
   */
  private getRequiredApiKey(engineId: string): string | null {
    const keyMap: Record<string, string> = {
      'wan-video': 'FAL_API_KEY',
      'kling-video': 'KLING_ACCESS_KEY',
      'runway-video': 'RUNWAY_API_KEY',
    };
    return keyMap[engineId] || null;
  }
}

// Singleton instance
let _globalScorer: GlobalDecisionScorer | null = null;

export function getGlobalDecisionScorer(): GlobalDecisionScorer {
  if (!_globalScorer) {
    _globalScorer = new GlobalDecisionScorer();
  }
  return _globalScorer;
}

export function initGlobalDecisionScorer(vpsStatus: VPSStatus): GlobalDecisionScorer {
  const scorer = getGlobalDecisionScorer();
  scorer.setVPSStatus(vpsStatus);
  return scorer;
}
