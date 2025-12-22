/**
 * DECISION SCORING SYSTEM
 * 
 * ARCHITECTURAL LAW: FFmpeg-First
 * If FFmpeg can do it, FFmpeg MUST do it.
 * Paid AI engines ONLY when technically required.
 * 
 * This scorer is GLOBAL and applies to ALL tools:
 * - Creative Replicator
 * - Scene Builder
 * - AI Tools
 * - Image/Video Generation
 */

import type { DecisionFactors, EngineDecision, VPSCapabilities } from './contracts';

// Operations that FFmpeg handles natively (NO paid API needed)
const FFMPEG_NATIVE_OPS = new Set([
  'trim',
  'concat',
  'merge',
  'overlay',
  'text_overlay',
  'watermark',
  'resize',
  'scale',
  'crop',
  'speed',
  'speed_change',
  'audio_normalize',
  'audio_mix',
  'audio_fade',
  'filter_complex',
  'transitions',
  'zoom_pan',
  'ken_burns',
  'parallax',
  'color_correction',
  'subtitle_burn',
  'format_convert',
]);

// Operations that REQUIRE AI (FFmpeg cannot do these)
const AI_REQUIRED_OPS = new Set([
  'ai_generation',
  'ai_upscale',
  'ai_inpaint',
  'ai_talking_head',
  'ai_voice_clone',
  'ai_style_transfer',
  'ai_object_removal',
  'ai_background_replace',
]);

export class DecisionScorer {
  private vpsCapabilities: VPSCapabilities | null = null;

  constructor(vpsCapabilities?: VPSCapabilities) {
    this.vpsCapabilities = vpsCapabilities || null;
  }

  /**
   * Update VPS capabilities (called on app boot)
   */
  setCapabilities(capabilities: VPSCapabilities): void {
    this.vpsCapabilities = capabilities;
  }

  /**
   * Check if operation can be done with FFmpeg
   */
  canFFmpegHandle(operation: string): boolean {
    return FFMPEG_NATIVE_OPS.has(operation.toLowerCase().replace(/[-\s]/g, '_'));
  }

  /**
   * Check if operation requires AI
   */
  requiresAI(operation: string): boolean {
    return AI_REQUIRED_OPS.has(operation.toLowerCase().replace(/[-\s]/g, '_'));
  }

  /**
   * Score and select best engine for operations
   */
  scoreOperations(
    operations: string[],
    factors: Partial<DecisionFactors> = {}
  ): EngineDecision {
    const hasGPU = this.vpsCapabilities?.hardware.nvencAvailable || 
                   this.vpsCapabilities?.hardware.vaapiAvailable || 
                   false;

    // Check if any operation requires AI
    const aiRequired = operations.some(op => this.requiresAI(op));
    
    // Check if all operations can be done by FFmpeg
    const allFFmpegCapable = operations.every(op => this.canFFmpegHandle(op));

    // FFMPEG-FIRST LAW: If FFmpeg can do it, FFmpeg does it
    if (allFFmpegCapable && !aiRequired) {
      return this.selectFFmpegEngine(hasGPU, factors);
    }

    // Mixed operations: FFmpeg for what it can, AI only for what it must
    if (aiRequired) {
      return {
        engineId: 'cloud-fallback',
        score: 50,
        reason: `AI required for: ${operations.filter(op => this.requiresAI(op)).join(', ')}`,
        estimatedCost: this.estimateAICost(operations),
        estimatedLatencyMs: 30000, // AI operations are slow
      };
    }

    // Default: FFmpeg native
    return this.selectFFmpegEngine(hasGPU, factors);
  }

  /**
   * Select best FFmpeg engine variant
   */
  private selectFFmpegEngine(
    hasGPU: boolean,
    factors: Partial<DecisionFactors>
  ): EngineDecision {
    // GPU-accelerated FFmpeg
    if (hasGPU && this.vpsCapabilities?.hardware.nvencAvailable) {
      return {
        engineId: 'ffmpeg-gpu',
        score: 95,
        reason: 'NVENC GPU acceleration available',
        estimatedCost: 0,
        estimatedLatencyMs: this.estimateLatency('gpu'),
      };
    }

    if (hasGPU && this.vpsCapabilities?.hardware.vaapiAvailable) {
      return {
        engineId: 'ffmpeg-gpu',
        score: 90,
        reason: 'VAAPI GPU acceleration available',
        estimatedCost: 0,
        estimatedLatencyMs: this.estimateLatency('gpu'),
      };
    }

    // CPU-only FFmpeg
    return {
      engineId: 'ffmpeg-native',
      score: 85,
      reason: 'Native FFmpeg (CPU)',
      estimatedCost: 0,
      estimatedLatencyMs: this.estimateLatency('cpu'),
    };
  }

  /**
   * Estimate processing latency
   */
  private estimateLatency(type: 'gpu' | 'cpu'): number {
    const queueLength = this.vpsCapabilities?.queue.length || 0;
    const baseLatency = type === 'gpu' ? 2000 : 5000;
    return baseLatency + (queueLength * 3000);
  }

  /**
   * Estimate AI operation cost
   */
  private estimateAICost(operations: string[]): number {
    const aiOps = operations.filter(op => this.requiresAI(op));
    // Rough cost estimation per AI operation
    return aiOps.length * 0.05; // $0.05 per AI operation average
  }

  /**
   * Get FFmpeg-capable operations from a list
   */
  getFFmpegOperations(operations: string[]): string[] {
    return operations.filter(op => this.canFFmpegHandle(op));
  }

  /**
   * Get AI-required operations from a list
   */
  getAIOperations(operations: string[]): string[] {
    return operations.filter(op => this.requiresAI(op));
  }
}

// Singleton instance for global use
let scorerInstance: DecisionScorer | null = null;

export function getDecisionScorer(): DecisionScorer {
  if (!scorerInstance) {
    scorerInstance = new DecisionScorer();
  }
  return scorerInstance;
}

export function initDecisionScorer(capabilities: VPSCapabilities): DecisionScorer {
  const scorer = getDecisionScorer();
  scorer.setCapabilities(capabilities);
  return scorer;
}
