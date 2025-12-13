/**
 * Creative Scale - Phase A Hook
 * AI Marketing Analysis Layer
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  VideoAnalysis, 
  CreativeBlueprint, 
  PhaseAOutput,
  MarketingFramework 
} from '@/lib/creative-scale/types';

interface UseCreativeScaleReturn {
  // State
  isAnalyzing: boolean;
  isGeneratingBlueprint: boolean;
  error: string | null;
  
  // Results
  currentAnalysis: VideoAnalysis | null;
  currentBlueprint: CreativeBlueprint | null;
  
  // Actions
  analyzeVideo: (videoUrl: string, videoId: string, options?: {
    language?: string;
    market?: string;
  }) => Promise<VideoAnalysis | null>;
  
  generateBlueprint: (analysis: VideoAnalysis, options?: {
    targetFramework?: MarketingFramework;
    variationCount?: number;
  }) => Promise<CreativeBlueprint | null>;
  
  runFullPhaseA: (videoUrl: string, videoId: string, options?: {
    language?: string;
    market?: string;
    targetFramework?: MarketingFramework;
    variationCount?: number;
  }) => Promise<PhaseAOutput | null>;
  
  reset: () => void;
}

export function useCreativeScale(): UseCreativeScaleReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<VideoAnalysis | null>(null);
  const [currentBlueprint, setCurrentBlueprint] = useState<CreativeBlueprint | null>(null);

  const analyzeVideo = useCallback(async (
    videoUrl: string, 
    videoId: string,
    options?: { language?: string; market?: string }
  ): Promise<VideoAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('creative-scale-analyze', {
        body: {
          video_url: videoUrl,
          video_id: videoId,
          language: options?.language,
          market: options?.market
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.analysis) throw new Error('No analysis returned');

      const analysis = data.analysis as VideoAnalysis;
      setCurrentAnalysis(analysis);
      return analysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const generateBlueprint = useCallback(async (
    analysis: VideoAnalysis,
    options?: { targetFramework?: MarketingFramework; variationCount?: number }
  ): Promise<CreativeBlueprint | null> => {
    setIsGeneratingBlueprint(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('creative-scale-strategize', {
        body: {
          analysis,
          target_framework: options?.targetFramework,
          variation_count: options?.variationCount || 3
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.blueprint) throw new Error('No blueprint returned');

      const blueprint = data.blueprint as CreativeBlueprint;
      setCurrentBlueprint(blueprint);
      return blueprint;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Blueprint generation failed';
      setError(message);
      return null;
    } finally {
      setIsGeneratingBlueprint(false);
    }
  }, []);

  const runFullPhaseA = useCallback(async (
    videoUrl: string,
    videoId: string,
    options?: {
      language?: string;
      market?: string;
      targetFramework?: MarketingFramework;
      variationCount?: number;
    }
  ): Promise<PhaseAOutput | null> => {
    const startTime = Date.now();

    // Step 2: Analyze
    const analysis = await analyzeVideo(videoUrl, videoId, {
      language: options?.language,
      market: options?.market
    });

    if (!analysis) return null;

    // Step 3: Strategize
    const blueprint = await generateBlueprint(analysis, {
      targetFramework: options?.targetFramework,
      variationCount: options?.variationCount
    });

    if (!blueprint) return null;

    return {
      analysis,
      blueprint,
      processing_time_ms: Date.now() - startTime
    };
  }, [analyzeVideo, generateBlueprint]);

  const reset = useCallback(() => {
    setCurrentAnalysis(null);
    setCurrentBlueprint(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    isGeneratingBlueprint,
    error,
    currentAnalysis,
    currentBlueprint,
    analyzeVideo,
    generateBlueprint,
    runFullPhaseA,
    reset
  };
}
