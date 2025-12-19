/**
 * Creative Scale - Full Pipeline Hook with AI Brain v2
 * Phase A (Analysis + Brain v2) + Step 4 (Compiler) + Phase B (Router)
 * WITH: Timeouts, schema validation, error handling, explainability
 */

import { useState, useCallback, useEffect } from 'react';
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
  EngineEntry,
  CostProfile,
  ProcessingLocation,
  RouterEvent
} from '@/lib/creative-scale/router-types';
import type {
  BrainInput,
  BrainOutput,
  CreativeBlueprintV2,
  DetectedProblem,
  OptimizationGoal,
  RiskTolerance,
  VideoAnalysisSignals
} from '@/lib/creative-scale/brain-v2-types';
import {
  routeExecution,
  getCompatibleEngines,
  scoreEngines,
  extractRequiredCapabilities
} from '@/lib/creative-scale/router';
import {
  validateVideoAnalysis,
  validateCreativeBlueprint,
  clampVariationCount,
  LIMITS
} from '@/lib/creative-scale/validation';
import {
  runBrainV2,
  convertToSignals
} from '@/lib/creative-scale/brain-v2-engine';

// ============================================
// SESSION STORAGE PERSISTENCE
// ============================================

const STORAGE_KEY = 'creative_scale_state';

interface PersistedState {
  currentAnalysis: VideoAnalysis | null;
  currentBlueprint: CreativeBlueprint | null;
  currentPlans: ExecutionPlan[];
}

function saveToSession(state: PersistedState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[CreativeScale] Failed to save state:', e);
  }
}

function loadFromSession(): PersistedState | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[CreativeScale] Failed to load state:', e);
  }
  return null;
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // Ignore
  }
}

// ============================================
// FETCH WITH TIMEOUT
// ============================================

async function invokeWithTimeout<T>(
  functionName: string,
  body: Record<string, unknown>,
  timeoutMs: number = LIMITS.REQUEST_TIMEOUT_MS
): Promise<{ data: T | null; error: Error | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });

    clearTimeout(timeoutId);

    if (error) {
      // Handle specific error codes
      if (error.message?.includes('402') || error.message?.includes('payment')) {
        return { data: null, error: new Error('Payment required. Please add credits to continue.') };
      }
      if (error.message?.includes('429') || error.message?.includes('rate')) {
        return { data: null, error: new Error('Rate limit exceeded. Please wait a moment.') };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as T, error: null };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: new Error(`Request timed out after ${timeoutMs / 1000}s`) };
    }
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
}

interface FullPipelineOutput extends PhaseAOutput {
  plans: ExecutionPlan[];
}

// Brain V2 state
export type PlatformType = 'tiktok' | 'reels' | 'snapchat' | 'youtube' | 'facebook' | 'general';
export type FunnelStageType = 'cold' | 'warm' | 'retargeting';

interface BrainV2State {
  detectedProblems: DetectedProblem[];
  blueprintsV2: CreativeBlueprintV2[];
  brainOutput: BrainOutput | null;
  optimizationGoal: OptimizationGoal;
  riskTolerance: RiskTolerance;
  platform: PlatformType;
  funnelStage: FunnelStageType;
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

  // Brain V2 State
  brainV2State: BrainV2State;
  setBrainV2Options: (options: { goal?: OptimizationGoal; risk?: RiskTolerance; platform?: PlatformType; funnelStage?: FunnelStageType }) => void;

  // Phase A Actions
  analyzeVideo: (videoUrl: string, videoId: string, options?: {
    language?: string;
    market?: string;
  }) => Promise<VideoAnalysis | null>;

  generateBlueprint: (analysis: VideoAnalysis, options?: {
    targetFramework?: MarketingFramework;
    variationCount?: number;
  }) => Promise<CreativeBlueprint | null>;

  // Brain V2 Strategy Generation
  generateBrainV2Strategy: (analysis: VideoAnalysis, options?: {
    variationCount?: number;
  }) => Promise<BrainOutput>;

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
  getCompatibleEnginesForPlan: (plan: ExecutionPlan) => EngineEntry[];

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

  // Brain V2 State
  const [brainV2State, setBrainV2State] = useState<BrainV2State>({
    detectedProblems: [],
    blueprintsV2: [],
    brainOutput: null,
    optimizationGoal: 'retention',
    riskTolerance: 'medium',
    platform: 'general',
    funnelStage: 'cold'
  });

  // ============================================
  // BRAIN V2 OPTIONS
  // ============================================

  const setBrainV2Options = useCallback((options: { goal?: OptimizationGoal; risk?: RiskTolerance; platform?: PlatformType; funnelStage?: FunnelStageType }) => {
    setBrainV2State(prev => ({
      ...prev,
      optimizationGoal: options.goal ?? prev.optimizationGoal,
      riskTolerance: options.risk ?? prev.riskTolerance,
      platform: options.platform ?? prev.platform,
      funnelStage: options.funnelStage ?? prev.funnelStage
    }));
  }, []);

  // ============================================
  // RESTORE STATE ON MOUNT
  // ============================================

  useEffect(() => {
    const saved = loadFromSession();
    if (saved) {
      if (saved.currentAnalysis) setCurrentAnalysis(saved.currentAnalysis);
      if (saved.currentBlueprint) setCurrentBlueprint(saved.currentBlueprint);
      if (saved.currentPlans?.length) setCurrentPlans(saved.currentPlans);
    }
  }, []);

  // ============================================
  // PERSIST STATE ON CHANGE
  // ============================================

  useEffect(() => {
    if (currentAnalysis || currentBlueprint || currentPlans.length > 0) {
      saveToSession({ currentAnalysis, currentBlueprint, currentPlans });
    }
  }, [currentAnalysis, currentBlueprint, currentPlans]);

  // ============================================
  // PHASE A: ANALYZE (with timeout + validation)
  // ============================================

  const analyzeVideo = useCallback(async (
    videoUrl: string,
    videoId: string,
    options?: { language?: string; market?: string }
  ): Promise<VideoAnalysis | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: fnError } = await invokeWithTimeout<{ analysis: unknown }>(
        'creative-replicator-analyze',
        {
          video_url: videoUrl,
          video_id: videoId,
          language: options?.language,
          market: options?.market
        }
      );

      if (fnError) throw fnError;
      if (!data?.analysis) throw new Error('No analysis returned from AI');

      // Schema validation
      const validation = validateVideoAnalysis(data.analysis);
      if (!validation.success) {
        throw new Error(validation.error || 'Invalid analysis format');
      }

      // Cast to VideoAnalysis after validation (Zod makes all fields optional in inferred type)
      const analysis = validation.data as unknown as VideoAnalysis;
      setCurrentAnalysis(analysis);
      return analysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
      setIsAnalyzing(false); // Ensure state reset
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ============================================
  // PHASE A: STRATEGIZE (with timeout + validation)
  // ============================================

  const generateBlueprint = useCallback(async (
    analysis: VideoAnalysis,
    options?: { targetFramework?: MarketingFramework; variationCount?: number }
  ): Promise<CreativeBlueprint | null> => {
    setIsGeneratingBlueprint(true);
    setError(null);

    // Clamp variation count to safe limits
    const safeVariationCount = clampVariationCount(options?.variationCount || 3);

    try {
      const { data, error: fnError } = await invokeWithTimeout<{ blueprint: unknown }>(
        'creative-scale-strategize',
        {
          analysis,
          target_framework: options?.targetFramework,
          variation_count: safeVariationCount
        }
      );

      if (fnError) throw fnError;
      if (!data?.blueprint) throw new Error('No blueprint returned from AI');

      // Schema validation
      const validation = validateCreativeBlueprint(data.blueprint);
      if (!validation.success) {
        throw new Error(validation.error || 'Invalid blueprint format');
      }

      // Cast to CreativeBlueprint after validation (Zod makes all fields optional in inferred type)
      const blueprint = validation.data as unknown as CreativeBlueprint;
      setCurrentBlueprint(blueprint);
      return blueprint;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Blueprint generation failed';
      setError(message);
      setIsGeneratingBlueprint(false); // Ensure state reset
      return null;
    } finally {
      setIsGeneratingBlueprint(false);
    }
  }, []);

  // ============================================
  // BRAIN V2: STRATEGY GENERATION (Code-controlled)
  // ============================================

  const generateBrainV2Strategy = useCallback(async (
    analysis: VideoAnalysis,
    options?: { variationCount?: number }
  ): Promise<BrainOutput> => {
    setIsGeneratingBlueprint(true);
    setError(null);

    try {
      // Convert analysis to Brain V2 signal format
      const signals = convertToSignals(analysis);

      // Build Brain input
      const brainInput: BrainInput = {
        video_analysis: signals,
        optimization_goal: brainV2State.optimizationGoal,
        user_constraints: {
          risk_tolerance: brainV2State.riskTolerance
        }
      };

      // Run the 5-layer decision engine
      const result = runBrainV2(brainInput, options?.variationCount || 3);

      // Update Brain V2 state
      if (result.success) {
        setBrainV2State(prev => ({
          ...prev,
          brainOutput: result,
          blueprintsV2: result.blueprints,
          detectedProblems: result.blueprints[0]?.detected_problems || []
        }));
      } else {
        setBrainV2State(prev => ({
          ...prev,
          brainOutput: result,
          blueprintsV2: [],
          detectedProblems: []
        }));
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Brain V2 strategy generation failed';
      setError(message);

      const failureResult: BrainOutput = {
        success: false,
        failure: {
          mode: 'REQUEST_MORE_DATA',
          reason: message
        }
      };

      setBrainV2State(prev => ({
        ...prev,
        brainOutput: failureResult
      }));

      return failureResult;
    } finally {
      setIsGeneratingBlueprint(false);
    }
  }, [brainV2State.optimizationGoal, brainV2State.riskTolerance]);

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
    sourceVideoUrl?: string
  ): Promise<ExecutionPlan[]> => {
    setIsCompiling(true);
    setError(null);

    try {
      console.log('[useCreativeScale] Compiling with source video URL:', sourceVideoUrl ? 'provided' : 'missing');

      const { data, error: fnError } = await supabase.functions.invoke('creative-scale-compile', {
        body: {
          analysis,
          blueprint,
          compile_all: true,
          source_video_url: sourceVideoUrl
        }
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.plans) throw new Error('No execution plans returned');

      const plans = data.plans as ExecutionPlan[];

      // Log first plan's asset_url for debugging
      if (plans[0]?.timeline?.[0]) {
        console.log('[useCreativeScale] First plan asset_url:', plans[0].timeline[0].asset_url);
      }

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

  const getCompatibleEnginesForPlan = useCallback((plan: ExecutionPlan): EngineEntry[] => {
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
  // RESET (with session clear)
  // ============================================

  const reset = useCallback(() => {
    setCurrentAnalysis(null);
    setCurrentBlueprint(null);
    setCurrentPlans([]);
    setRouterResult(null);
    setRouterEvents([]);
    setError(null);
    setIsAnalyzing(false);
    setIsGeneratingBlueprint(false);
    setIsCompiling(false);
    setIsRouting(false);
    setBrainV2State({
      detectedProblems: [],
      blueprintsV2: [],
      brainOutput: null,
      optimizationGoal: 'retention',
      riskTolerance: 'medium',
      platform: 'general',
      funnelStage: 'cold'
    });
    clearSession();
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
    brainV2State,
    setBrainV2Options,
    analyzeVideo,
    generateBlueprint,
    generateBrainV2Strategy,
    runFullPhaseA,
    compileVariation,
    compileAllVariations,
    getCompatibleEnginesForPlan,
    routePlan,
    runFullPipeline,
    reset
  };
}
