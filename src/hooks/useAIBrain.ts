import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAIAgent } from './useAIAgent';

interface BrainContext {
  project_id?: string;
  stage?: string;
  scene_type?: string;
  language?: string;
  market?: string;
  audience?: string;
  budget_tier?: string;
  product_type?: string;
}

interface EngineScore {
  engine_name: string;
  score: number;
  reasons: string[];
  estimated_cost: number;
  estimated_quality: number;
}

interface EngineSelection {
  engine: string;
  alternatives: EngineScore[];
  reasoning: string;
}

interface PromptOptimization {
  optimized_prompt: string;
  improvements: string[];
}

interface QualityPrediction {
  predicted_score: number;
  confidence: number;
  suggestions: string[];
}

interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
  action: string;
  [key: string]: any;
}

export function useAIBrain() {
  const { aiAgent } = useAIAgent();
  
  const callBrain = useCallback(async (
    action: string,
    context: BrainContext,
    input?: any
  ): Promise<any> => {
    try {
      const response = await supabase.functions.invoke('ai-brain', {
        body: { action, context, input, preferredAgent: aiAgent },
      });

      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.error('AI Brain error:', error);
      throw error;
    }
  }, [aiAgent]);

  const selectEngine = useCallback(async (
    context: BrainContext,
    options?: { duration_sec?: number; complexity?: string }
  ): Promise<EngineSelection> => {
    const result = await callBrain('select_engine', context, options);
    return {
      engine: result.engine,
      alternatives: result.alternatives || [],
      reasoning: result.reasoning || '',
    };
  }, [callBrain]);

  const optimizePrompt = useCallback(async (
    context: BrainContext,
    prompt: string,
    type: string
  ): Promise<PromptOptimization> => {
    const result = await callBrain('optimize_prompt', context, { prompt, type });
    return {
      optimized_prompt: result.optimized_prompt,
      improvements: result.improvements || [],
    };
  }, [callBrain]);

  const predictQuality = useCallback(async (
    context: BrainContext,
    engine: string,
    prompt: string,
    sceneType: string
  ): Promise<QualityPrediction> => {
    const result = await callBrain('predict_quality', context, { engine, prompt, scene_type: sceneType });
    return {
      predicted_score: result.predicted_score,
      confidence: result.confidence,
      suggestions: result.suggestions || [],
    };
  }, [callBrain]);

  const recordLearning = useCallback(async (
    context: BrainContext,
    type: string,
    insight: any,
    confidence?: number
  ): Promise<boolean> => {
    const result = await callBrain('learn', context, { type, insight, confidence });
    return result.recorded;
  }, [callBrain]);

  const getRecommendations = useCallback(async (
    context: BrainContext
  ): Promise<Recommendation[]> => {
    const result = await callBrain('get_recommendations', context);
    return result.recommendations || [];
  }, [callBrain]);

  return {
    selectEngine,
    optimizePrompt,
    predictQuality,
    recordLearning,
    getRecommendations,
  };
}
