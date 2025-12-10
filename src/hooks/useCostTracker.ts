import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ContentType = 'text' | 'audio' | 'image' | 'video';
export type PipelineStage = 
  | 'product_content' 
  | 'script_generation' 
  | 'landing_page' 
  | 'marketing_content'
  | 'voiceover' 
  | 'audio_generation'
  | 'image_generation' 
  | 'thumbnail'
  | 'video_generation' 
  | 'scene_generation' 
  | 'assembly' 
  | 'export';

// Cost estimates per operation (in USD)
const COST_ESTIMATES: Record<string, number> = {
  // Text generation
  'gemini-2.5-flash': 0.001,
  'gemini-2.5-pro': 0.005,
  'gpt-5-mini': 0.002,
  'gpt-5': 0.01,
  'lovable-ai': 0.001,
  
  // Audio generation
  'elevenlabs': 0.05,
  'openai-tts': 0.03,
  'playht': 0.02,
  
  // Image generation
  'nano-banana': 0.02,
  'flux': 0.05,
  'leonardo': 0.04,
  'dall-e': 0.04,
  'gemini-image': 0.02,
  
  // Video generation
  'runway': 0.50,
  'sora': 0.75,
  'veo': 0.40,
  'pika': 0.25,
  'heygen': 0.60,
  'hailuo': 0.15,
  'luma': 0.30,
  'kling': 0.35,
  
  // Default fallback
  'default': 0.01,
};

interface CostEntry {
  pipeline_stage: PipelineStage;
  engine_name: string;
  operation_type: string;
  cost_usd?: number;
  tokens_used?: number;
  duration_sec?: number;
  project_id?: string;
  metadata?: Record<string, any>;
}

interface UseCostTrackerReturn {
  trackCost: (entry: CostEntry) => Promise<void>;
  estimateCost: (engine: string, count?: number) => number;
  trackAIOperation: (params: {
    stage: PipelineStage;
    engine: string;
    operation: string;
    projectId?: string;
    tokensUsed?: number;
    durationSec?: number;
    metadata?: Record<string, any>;
  }) => Promise<void>;
}

export function useCostTracker(): UseCostTrackerReturn {
  const { user } = useAuth();

  const estimateCost = useCallback((engine: string, count: number = 1): number => {
    const normalizedEngine = engine.toLowerCase().replace(/[\s_-]+/g, '-');
    
    // Find matching cost
    for (const [key, cost] of Object.entries(COST_ESTIMATES)) {
      if (normalizedEngine.includes(key) || key.includes(normalizedEngine)) {
        return cost * count;
      }
    }
    
    return COST_ESTIMATES.default * count;
  }, []);

  const trackCost = useCallback(async (entry: CostEntry) => {
    if (!user?.id) {
      console.warn('Cannot track cost: user not authenticated');
      return;
    }

    try {
      const cost = entry.cost_usd ?? estimateCost(entry.engine_name);
      
      const { error } = await supabase
        .from('cost_transactions')
        .insert({
          user_id: user.id,
          project_id: entry.project_id,
          pipeline_stage: entry.pipeline_stage,
          engine_name: entry.engine_name,
          operation_type: entry.operation_type,
          cost_usd: cost,
          tokens_used: entry.tokens_used,
          duration_sec: entry.duration_sec,
          metadata: entry.metadata || {},
        });

      if (error) {
        console.error('Failed to track cost:', error);
      } else {
        console.log(`Cost tracked: $${cost.toFixed(4)} for ${entry.operation_type} via ${entry.engine_name}`);
      }
    } catch (err) {
      console.error('Error tracking cost:', err);
    }
  }, [user?.id, estimateCost]);

  const trackAIOperation = useCallback(async (params: {
    stage: PipelineStage;
    engine: string;
    operation: string;
    projectId?: string;
    tokensUsed?: number;
    durationSec?: number;
    metadata?: Record<string, any>;
  }) => {
    await trackCost({
      pipeline_stage: params.stage,
      engine_name: params.engine,
      operation_type: params.operation,
      project_id: params.projectId,
      tokens_used: params.tokensUsed,
      duration_sec: params.durationSec,
      metadata: params.metadata,
    });
  }, [trackCost]);

  return {
    trackCost,
    estimateCost,
    trackAIOperation,
  };
}

// Standalone function for use in edge functions (without React hooks)
export async function logCostTransaction(
  supabaseClient: any,
  userId: string,
  entry: {
    pipeline_stage: string;
    engine_name: string;
    operation_type: string;
    cost_usd: number;
    project_id?: string;
    tokens_used?: number;
    duration_sec?: number;
    metadata?: Record<string, any>;
  }
) {
  const { error } = await supabaseClient
    .from('cost_transactions')
    .insert({
      user_id: userId,
      project_id: entry.project_id,
      pipeline_stage: entry.pipeline_stage,
      engine_name: entry.engine_name,
      operation_type: entry.operation_type,
      cost_usd: entry.cost_usd,
      tokens_used: entry.tokens_used,
      duration_sec: entry.duration_sec,
      metadata: entry.metadata || {},
    });

  if (error) {
    console.error('Failed to log cost transaction:', error);
  }
  
  return { error };
}

// Cost estimation utility for edge functions
export function getEstimatedCost(engine: string, operationType?: string): number {
  const normalizedEngine = engine.toLowerCase().replace(/[\s_-]+/g, '-');
  
  for (const [key, cost] of Object.entries(COST_ESTIMATES)) {
    if (normalizedEngine.includes(key) || key.includes(normalizedEngine)) {
      return cost;
    }
  }
  
  // Fallback based on operation type
  if (operationType) {
    const opLower = operationType.toLowerCase();
    if (opLower.includes('video')) return 0.30;
    if (opLower.includes('image')) return 0.03;
    if (opLower.includes('audio') || opLower.includes('voice')) return 0.04;
    if (opLower.includes('text') || opLower.includes('script')) return 0.002;
  }
  
  return COST_ESTIMATES.default;
}
