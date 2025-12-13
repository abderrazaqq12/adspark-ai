/**
 * Creative Scale - Full Pipeline Hook
 * Phase A (Analysis) + Step 4 (Compiler) + Phase B (Router)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  VideoAnalysis, 
  CreativeBlueprint, 
  PhaseAOutput,
  MarketingFramework 
} from '@/lib/creative-scale/types';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { 
  RouterResult, 
  EngineScore, 
  CostProfile, 
  ProcessingLocation,
  RouterEvent 
} from '@/lib/creative-scale/router-types';
import { 
  routeExecution, 
  getCompatibleEngines, 
  scoreEngines, 
  extractRequiredCapabilities 
} from '@/lib/creative-scale/router';

interface FullPipelineOutput extends PhaseAOutput {
  plans: ExecutionPlan[];
}

interface UseCreativeScaleReturn {
  // State
  isAnalyzing: boolean;
  isGeneratingBlueprint: boolean;
  isCompiling: boolean;
  isRouting: boolean;
  error: string | null;
  
  // Results
  currentAnalysis: VideoAnalysis | null;
  currentBlueprint: CreativeBlueprint | null;
  currentPlans: ExecutionPlan[];
  routerResult: RouterResult | null;
  routerEvents: RouterEvent[];
  
  // Phase A Actions
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
  
  // Step 4: Compiler Actions
  compileVariation: (
    analysis: VideoAnalysis,
    blueprint: CreativeBlueprint,
    variationIndex: number,
    assetBaseUrl?: string
  ) => Promise<ExecutionPlan | null>;
  
  compileAllVariations: (
    analysis: VideoAnalysis,
    blueprint: CreativeBlueprint,
    assetBaseUrl?: string
  ) => Promise<ExecutionPlan[]>;
  
  // Phase B: Router Actions
  getCompatibleEnginesForPlan: (plan: ExecutionPlan) => EngineScore[];
  
  routePlan: (
    plan: ExecutionPlan,
    analysis: VideoAnalysis,
    blueprint: CreativeBlueprint,
    options?: {
      preferredEngineId?: string;
      maxCostProfile?: CostProfile;
      forceLocation?: ProcessingLocation;
    }
  ) => Promise<RouterResult>;
  
  // Full Pipeline
  runFullPipeline: (videoUrl: string, videoId: string, options?: {
    language?: string;
    market?: string;
    targetFramework?: MarketingFramework;
    variationCount?: number;
    assetBaseUrl?: string;
  }) => Promise<FullPipelineOutput | null>;
  
  reset: () => void;
}

export function useCreativeScale(): UseCreativeScaleReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<VideoAnalysis | null>(null);
  const [currentBlueprint, setCurrentBlueprint] = useState<CreativeBlueprint | null>(null);
  const [currentPlans, setCurrentPlans] = useState<ExecutionPlan[]>([]);
  const [routerResult, setRouterResult] = useState<RouterResult | null>(null);
  const [routerEvents, setRouterEvents] = useState<RouterEvent[]>([]);

  // ============================================
  // PHASE A: ANALYZE
  // ============================================

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

  // ============================================
  // PHASE A: STRATEGIZE
  // ============================================

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

  // ============================================
  // PHASE A: FULL RUN
  // ============================================

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

    const analysis = await analyzeVideo(videoUrl, videoId, {
      language: options?.language,
      market: options?.market
    });

    if (!analysis) return null;

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

  // ============================================
  // STEP 4: COMPILE SINGLE VARIATION
  // ============================================

  const compileVariation = useCallback(async (
    analysis: VideoAnalysis,
    blueprint: CreativeBlueprint,
    variationIndex: number,
    assetBaseUrl?: string
  ): Promise<ExecutionPlan | null> => {
    setIsCompiling(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('creative-scale-compile', {
        body: {
          analysis,
          blueprint,
          variation_index: variationIndex,
          compile_all: false,
          asset_base_url: assetBaseUrl
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.plans || data.plans.length === 0) throw new Error('No execution plan returned');

      const plan = data.plans[0] as ExecutionPlan;
      setCurrentPlans(prev => [...prev, plan]);
      return plan;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      setError(message);
      return null;
    } finally {
      setIsCompiling(false);
    }
  }, []);

  // ============================================
  // STEP 4: COMPILE ALL VARIATIONS
  // ============================================

  const compileAllVariations = useCallback(async (
    analysis: VideoAnalysis,
    blueprint: CreativeBlueprint,
    assetBaseUrl?: string
  ): Promise<ExecutionPlan[]> => {
    setIsCompiling(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('creative-scale-compile', {
        body: {
          analysis,
          blueprint,
          compile_all: true,
          asset_base_url: assetBaseUrl
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.plans) throw new Error('No execution plans returned');

      const plans = data.plans as ExecutionPlan[];
      setCurrentPlans(plans);
      return plans;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      setError(message);
      return [];
    } finally {
      setIsCompiling(false);
    }
  }, []);

  // ============================================
  // FULL PIPELINE: PHASE A + COMPILER
  // ============================================

  const runFullPipeline = useCallback(async (
    videoUrl: string,
    videoId: string,
    options?: {
      language?: string;
      market?: string;
      targetFramework?: MarketingFramework;
      variationCount?: number;
      assetBaseUrl?: string;
    }
  ): Promise<FullPipelineOutput | null> => {
    const startTime = Date.now();

    // Phase A
    const phaseAResult = await runFullPhaseA(videoUrl, videoId, {
      language: options?.language,
      market: options?.market,
      targetFramework: options?.targetFramework,
      variationCount: options?.variationCount
    });

    if (!phaseAResult) return null;

    // Step 4: Compile
    const plans = await compileAllVariations(
      phaseAResult.analysis,
      phaseAResult.blueprint,
      options?.assetBaseUrl
    );

    return {
      ...phaseAResult,
      plans,
      processing_time_ms: Date.now() - startTime
    };
  }, [runFullPhaseA, compileAllVariations]);

  // ============================================
  // PHASE B: ROUTER
  // ============================================

  const getCompatibleEnginesForPlan = useCallback((plan: ExecutionPlan): EngineScore[] => {
    return getCompatibleEngines(plan);
  }, []);

  const routePlan = useCallback(async (
    plan: ExecutionPlan,
    analysis: VideoAnalysis,
    blueprint: CreativeBlueprint,
    options?: {
      preferredEngineId?: string;
      maxCostProfile?: CostProfile;
      forceLocation?: ProcessingLocation;
    }
  ): Promise<RouterResult> => {
    setIsRouting(true);
    setError(null);
    setRouterEvents([]);

    const eventEmitter = (event: RouterEvent) => {
      setRouterEvents(prev => [...prev, event]);
    };

    try {
      const result = await routeExecution(
        {
          execution_plan: plan,
          analysis,
          blueprint,
          preferred_engine_id: options?.preferredEngineId,
          max_cost_profile: options?.maxCostProfile,
          force_location: options?.forceLocation,
        },
        { emitEvent: eventEmitter }
      );

      setRouterResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Routing failed';
      setError(message);
      
      // Even on error, return partial success (router never fails user)
      const partialResult: RouterResult = {
        status: 'partial_success',
        job_id: `job_${Date.now()}`,
        reason: message,
        artifacts: {
          analysis,
          blueprint,
          execution_plan: plan,
        },
        attempted_engines: [],
        human_readable_message: 'An error occurred during routing. Your creative plan has been preserved.',
      };
      
      setRouterResult(partialResult);
      return partialResult;
    } finally {
      setIsRouting(false);
    }
  }, []);

  // ============================================
  // RESET
  // ============================================

  const reset = useCallback(() => {
    setCurrentAnalysis(null);
    setCurrentBlueprint(null);
    setCurrentPlans([]);
    setRouterResult(null);
    setRouterEvents([]);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    isGeneratingBlueprint,
    isCompiling,
    isRouting,
    error,
    currentAnalysis,
    currentBlueprint,
    currentPlans,
    routerResult,
    routerEvents,
    analyzeVideo,
    generateBlueprint,
    runFullPhaseA,
    compileVariation,
    compileAllVariations,
    getCompatibleEnginesForPlan,
    routePlan,
    runFullPipeline,
    reset
  };
}
