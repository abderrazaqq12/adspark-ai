/**
 * Hook for streaming strategy generation with SSE progress updates
 * 
 * ARCHITECTURAL CONTRACT:
 * - NEVER returns failure state to UI
 * - If SSE fails, uses deterministic fallback
 * - User is NEVER blocked from proceeding
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VideoAnalysis, CreativeBlueprint } from '@/lib/creative-scale/types';
import { 
  makeBrainV2DeterministicDecision, 
  generateBrainV2Variations,
  type BrainV2StrategyObject,
  type PlatformType
} from '@/lib/creative-scale/brain-v2-deterministic';

export interface StrategyProgress {
  step: number;
  totalSteps: number;
  message: string;
  percentage: number;
  variationCount?: number;
  generating?: boolean;
}

export interface VariationProgress {
  current: number;
  total: number;
  message: string;
  percentage: number;
}

export interface StreamingStrategyResult {
  success: true; // ALWAYS true - we never fail
  blueprint: CreativeBlueprint;
  strategies?: BrainV2StrategyObject[]; // Deterministic strategies
  meta?: {
    source_analysis_id: string;
    framework: string;
    variations_count: number;
    provider: string;
    optimization_goal: string;
    risk_tolerance: string;
    platform: string;
    funnel_stage: string;
    processed_at: string;
    is_fallback?: boolean; // True if deterministic fallback was used
  };
}

interface UseStreamingStrategyReturn {
  isStreaming: boolean;
  progress: StrategyProgress | null;
  variationProgress: VariationProgress | null;
  error: null; // NEVER has error - always null
  result: StreamingStrategyResult | null;
  streamStrategy: (
    analysis: VideoAnalysis,
    options: {
      variationCount: number;
      optimizationGoal: string;
      riskTolerance: string;
      platform: string;
      funnelStage: string;
    }
  ) => Promise<StreamingStrategyResult>;
  cancel: () => void;
}

// Generate fallback blueprint from deterministic strategies
function createFallbackBlueprint(
  analysisId: string,
  strategies: BrainV2StrategyObject[],
  options: { optimizationGoal: string; platform: string }
): CreativeBlueprint {
  const primaryStrategy = strategies[0];
  
  return {
    id: `blueprint_fallback_${Date.now()}`,
    source_analysis_id: analysisId,
    created_at: new Date().toISOString(),
    framework: primaryStrategy.framework as any,
    framework_rationale: primaryStrategy.decision_reason,
    objective: {
      primary_goal: options.optimizationGoal,
      target_emotion: 'engagement',
      key_message: `Optimized for ${options.platform}`
    },
    strategic_insights: [
      `Framework: ${primaryStrategy.framework}`,
      `Hook type: ${primaryStrategy.hook_type}`,
      `Pacing: ${primaryStrategy.pacing}`,
      primaryStrategy.confidence_level === 'fallback' 
        ? 'Fallback strategy applied for reliability'
        : `High confidence analytical decision`
    ],
    variation_ideas: strategies.map((s, idx) => ({
      id: `var_${idx}`,
      action: 'emphasize_segment' as const,
      target_segment_type: 'hook',
      intent: `Apply ${s.framework} framework with ${s.hook_type} hook`,
      priority: idx === 0 ? 'high' : 'medium' as 'high' | 'medium' | 'low',
      reasoning: s.decision_reason
    })),
    recommended_duration_range: { min_ms: 20000, max_ms: 35000 },
    target_formats: ['9:16']
  };
}

export function useStreamingStrategy(): UseStreamingStrategyReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<StrategyProgress | null>(null);
  const [variationProgress, setVariationProgress] = useState<VariationProgress | null>(null);
  const [result, setResult] = useState<StreamingStrategyResult | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const streamStrategy = useCallback(async (
    analysis: VideoAnalysis,
    options: {
      variationCount: number;
      optimizationGoal: string;
      riskTolerance: string;
      platform: string;
      funnelStage: string;
    }
  ): Promise<StreamingStrategyResult> => {
    setIsStreaming(true);
    setProgress(null);
    setVariationProgress(null);
    setResult(null);

    abortControllerRef.current = new AbortController();

    // Helper to create deterministic fallback result
    const createFallbackResult = (): StreamingStrategyResult => {
      console.log('[Brain V2] Using deterministic fallback strategy');
      
      const strategies = generateBrainV2Variations({
        platform: options.platform as PlatformType,
        funnel_stage: options.funnelStage as 'cold' | 'warm' | 'retargeting',
        variation_count: options.variationCount
      });
      
      const blueprint = createFallbackBlueprint(
        analysis.id,
        strategies,
        { optimizationGoal: options.optimizationGoal, platform: options.platform }
      );
      
      return {
        success: true,
        blueprint,
        strategies,
        meta: {
          source_analysis_id: analysis.id,
          framework: strategies[0].framework,
          variations_count: strategies.length,
          provider: 'brain_v2_deterministic',
          optimization_goal: options.optimizationGoal,
          risk_tolerance: options.riskTolerance,
          platform: options.platform,
          funnel_stage: options.funnelStage,
          processed_at: new Date().toISOString(),
          is_fallback: true
        }
      };
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/functions/v1/creative-scale-strategize-stream`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          analysis,
          variation_count: options.variationCount,
          optimization_goal: options.optimizationGoal,
          risk_tolerance: options.riskTolerance,
          platform: options.platform,
          funnel_stage: options.funnelStage,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // SSE failed - use deterministic fallback (NO ERROR TO USER)
        console.warn(`[SSE] HTTP ${response.status} - falling back to deterministic engine`);
        const fallbackResult = createFallbackResult();
        setResult(fallbackResult);
        setIsStreaming(false);
        return fallbackResult;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        // No response body - use deterministic fallback
        console.warn('[SSE] No response body - falling back to deterministic engine');
        const fallbackResult = createFallbackResult();
        setResult(fallbackResult);
        setIsStreaming(false);
        return fallbackResult;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: StreamingStrategyResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              
              switch (currentEvent) {
                case 'progress':
                  setProgress(parsed);
                  console.log('[SSE] Progress:', parsed);
                  break;
                case 'variation_progress':
                  setVariationProgress(parsed);
                  console.log('[SSE] Variation:', parsed);
                  break;
                case 'complete':
                  // Ensure success is always true
                  finalResult = { ...parsed, success: true };
                  setResult(finalResult);
                  console.log('[SSE] Complete:', parsed);
                  break;
                case 'error':
                  // SSE error event - use deterministic fallback (NO ERROR TO USER)
                  console.warn('[SSE] Error event received - falling back to deterministic engine:', parsed);
                  const fallbackOnError = createFallbackResult();
                  setResult(fallbackOnError);
                  setIsStreaming(false);
                  return fallbackOnError;
              }
            } catch (e) {
              console.warn('[SSE] Parse error:', e, data);
            }
          }
        }
      }

      setIsStreaming(false);
      
      // If no result from SSE, use deterministic fallback
      if (!finalResult || !finalResult.blueprint) {
        console.warn('[SSE] No complete event received - falling back to deterministic engine');
        const fallbackResult = createFallbackResult();
        setResult(fallbackResult);
        return fallbackResult;
      }
      
      return finalResult;

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[SSE] Request cancelled - using deterministic fallback');
        const fallbackResult = createFallbackResult();
        setResult(fallbackResult);
        setIsStreaming(false);
        return fallbackResult;
      }
      
      // ANY error - use deterministic fallback (NEVER FAIL)
      console.warn('[SSE] Stream error - falling back to deterministic engine:', err);
      const fallbackResult = createFallbackResult();
      setResult(fallbackResult);
      setIsStreaming(false);
      return fallbackResult;
    }
  }, []);

  return {
    isStreaming,
    progress,
    variationProgress,
    error: null, // ALWAYS null - we never fail
    result,
    streamStrategy,
    cancel,
  };
}
