/**
 * Hook for streaming strategy generation with SSE progress updates
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { VideoAnalysis, CreativeBlueprint } from '@/lib/creative-scale/types';

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
  success: boolean;
  blueprint?: CreativeBlueprint;
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
  };
  error?: string;
}

interface UseStreamingStrategyReturn {
  isStreaming: boolean;
  progress: StrategyProgress | null;
  variationProgress: VariationProgress | null;
  error: string | null;
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
  ) => Promise<StreamingStrategyResult | null>;
  cancel: () => void;
}

export function useStreamingStrategy(): UseStreamingStrategyReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<StrategyProgress | null>(null);
  const [variationProgress, setVariationProgress] = useState<VariationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  ): Promise<StreamingStrategyResult | null> => {
    setIsStreaming(true);
    setProgress(null);
    setVariationProgress(null);
    setError(null);
    setResult(null);

    abortControllerRef.current = new AbortController();

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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
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
                  finalResult = parsed;
                  setResult(parsed);
                  console.log('[SSE] Complete:', parsed);
                  break;
                case 'error':
                  setError(parsed.message || 'Unknown error');
                  console.error('[SSE] Error:', parsed);
                  break;
              }
            } catch (e) {
              console.warn('[SSE] Parse error:', e, data);
            }
          }
        }
      }

      setIsStreaming(false);
      return finalResult;

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[SSE] Request cancelled');
        setIsStreaming(false);
        return null;
      }
      
      const message = err instanceof Error ? err.message : 'Streaming failed';
      setError(message);
      setIsStreaming(false);
      console.error('[SSE] Stream error:', err);
      return null;
    }
  }, []);

  return {
    isStreaming,
    progress,
    variationProgress,
    error,
    result,
    streamStrategy,
    cancel,
  };
}
