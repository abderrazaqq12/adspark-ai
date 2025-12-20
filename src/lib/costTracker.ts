/**
 * Cost Tracker Utility
 * 
 * Provides cost tracking utilities that can be used both in React components
 * and in edge functions. Use this module to automatically log costs for AI operations.
 */

// Cost estimates per operation (in USD)
export const COST_ESTIMATES: Record<string, number> = {
  // Text generation (LLMs)
  'google/gemini-2.5-flash': 0.001,
  'google/gemini-2.5-flash-lite': 0.0005,
  'google/gemini-2.5-pro': 0.005,
  'google/gemini-3-pro-preview': 0.006,
  'openai/gpt-5': 0.01,
  'openai/gpt-5-mini': 0.002,
  'openai/gpt-5-nano': 0.0008,
  'gemini': 0.001,
  'chatgpt': 0.002,
  
  // Audio/Voice generation
  'elevenlabs': 0.05,
  'openai-tts': 0.03,
  'playht': 0.02,
  'deepgram': 0.01,
  
  // Image generation
  'nano-banana': 0.02,
  'google/gemini-2.5-flash-image': 0.02,
  'google/gemini-3-pro-image-preview': 0.03,
  'flux': 0.05,
  'leonardo': 0.04,
  'dall-e': 0.04,
  'seedream': 0.03,
  
  // Video generation
  'runway': 0.50,
  'runway-gen-3': 0.50,
  'sora': 0.75,
  'sora-2': 0.80,
  'sora-2-pro': 1.00,
  'veo': 0.40,
  'veo-3': 0.45,
  'pika': 0.25,
  'heygen': 0.60,
  'hailuo': 0.15,
  'luma': 0.30,
  'kling': 0.35,
  'kling-2.6': 0.40,
  'minimax': 0.20,
  'wan': 0.18,
  'ovi': 0.15,
  
  // Talking actors
  'arcads': 0.45,
  'omnihuman': 0.55,
  'd-id': 0.45,
  'synthesia': 0.70,
  
  // Tools
  'video-upscale': 0.10,
  'image-upscale': 0.02,
  'video-captions': 0.05,
  'skin-enhancer': 0.03,
  
  // Default fallback
  'default': 0.01,
};

export type ContentCategory = 'text' | 'audio' | 'image' | 'video' | 'tool';

// Map pipeline stages to content categories
export const STAGE_TO_CATEGORY: Record<string, ContentCategory> = {
  'product_content': 'text',
  'script_generation': 'text',
  'landing_page': 'text',
  'marketing_content': 'text',
  'voiceover': 'audio',
  'audio_generation': 'audio',
  'voice_synthesis': 'audio',
  'image_generation': 'image',
  'thumbnail': 'image',
  'product_image': 'image',
  'video_generation': 'video',
  'scene_generation': 'video',
  'assembly': 'video',
  'export': 'video',
  'upscale': 'tool',
  'enhance': 'tool',
};

/**
 * Get estimated cost for an engine/operation
 */
export function getEstimatedCost(engine: string, operationType?: string): number {
  const normalizedEngine = engine.toLowerCase().replace(/[\s_]+/g, '-');
  
  // Direct match
  if (COST_ESTIMATES[normalizedEngine]) {
    return COST_ESTIMATES[normalizedEngine];
  }
  
  // Partial match
  for (const [key, cost] of Object.entries(COST_ESTIMATES)) {
    if (normalizedEngine.includes(key.replace(/\//g, '-')) || 
        key.includes(normalizedEngine) ||
        normalizedEngine.includes(key.split('/').pop() || '')) {
      return cost;
    }
  }
  
  // Fallback based on operation type
  if (operationType) {
    const opLower = operationType.toLowerCase();
    if (opLower.includes('video') || opLower.includes('scene')) return 0.30;
    if (opLower.includes('image') || opLower.includes('thumbnail')) return 0.03;
    if (opLower.includes('audio') || opLower.includes('voice')) return 0.04;
    if (opLower.includes('text') || opLower.includes('script') || opLower.includes('content')) return 0.002;
  }
  
  return COST_ESTIMATES.default;
}

/**
 * Get content category from pipeline stage
 */
export function getContentCategory(stage: string): ContentCategory {
  const normalizedStage = stage.toLowerCase().replace(/[\s-]+/g, '_');
  return STAGE_TO_CATEGORY[normalizedStage] || 'text';
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  } else if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Calculate total cost from multiple operations
 */
export function calculateTotalCost(operations: { engine: string; count?: number }[]): number {
  return operations.reduce((total, op) => {
    return total + getEstimatedCost(op.engine) * (op.count || 1);
  }, 0);
}

/**
 * Create a cost transaction payload for insertion
 */
export function createCostPayload(params: {
  userId: string;
  pipelineStage: string;
  engineName: string;
  operationType: string;
  projectId?: string;
  tokensUsed?: number;
  durationSec?: number;
  customCost?: number;
  metadata?: Record<string, any>;
}) {
  const cost = params.customCost ?? getEstimatedCost(params.engineName, params.operationType);
  
  return {
    user_id: params.userId,
    project_id: params.projectId || null,
    pipeline_stage: params.pipelineStage,
    engine_name: params.engineName,
    operation_type: params.operationType,
    cost_usd: cost,
    tokens_used: params.tokensUsed || null,
    duration_sec: params.durationSec || null,
    metadata: params.metadata || {},
  };
}
