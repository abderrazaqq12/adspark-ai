// Free-Tier Creative Engine Hook
// Orchestrates all free creative capabilities for the Creative Replicator

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIAgent } from './useAIAgent';
import {
  FFMPEG_TRANSFORMATIONS,
  SYNTHETIC_MOTION_EFFECTS,
  SCENE_RECOMPOSITION_OPTIONS,
  HOOK_REPLACEMENT_STYLES,
  FREE_CREATIVE_PIPELINES,
  calculateFreeVariations,
  type FFmpegTransformation,
  type SyntheticMotionEffect,
  type CreativePipeline,
} from '@/lib/freeTierCreativeEngine';

export interface FreeTierGenerationConfig {
  sourceVideos: string[];
  variationCount: number;
  enabledTransformations: string[];
  enabledMotionEffects: string[];
  enabledPipelines: string[];
  hookReplacements: string[];
  sceneRecomposition: string[];
  colorGrades: string[];
  pacingStyles: string[];
  outputRatios: string[];
  targetPlatform: string;
  language: string;
  market: string;
}

export interface FreeTierResult {
  id: string;
  sourceVideoId: string;
  transformationsApplied: string[];
  outputUrl?: string;
  thumbnailUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedCost: number;
  pipeline: string;
}

export interface AIMarketingAnalysis {
  hookStrength: number;
  emotionalTriggers: string[];
  problemClarity: number;
  demoPower: number;
  socialProofElements: string[];
  offerClarity: number;
  ctaEffectiveness: number;
  editingPacing: string;
  messagingTone: string;
  improvements: AIImprovementRecommendation[];
}

export interface AIImprovementRecommendation {
  area: string;
  currentScore: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  canImplementFree: boolean;
  implementation: string;
}

export interface SceneAnalysis {
  sceneId: string;
  startTime: number;
  endTime: number;
  type: string;
  quality: number;
  replacement?: {
    strategy: string;
    source: 'motion-image' | 'extracted-zoom' | 'broll' | 'overlay';
  };
}

export interface AIOperatorFreeTierRecommendation {
  useFreeTier: boolean;
  reason: string;
  suggestedPipeline: CreativePipeline | null;
  estimatedQuality: number; // 0-100
  estimatedSavings: number; // USD saved vs premium
}

export const useFreeTierCreativeEngine = () => {
  const { aiAgent } = useAIAgent();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FreeTierResult[]>([]);
  const [marketingAnalysis, setMarketingAnalysis] = useState<AIMarketingAnalysis | null>(null);
  const [sceneAnalysis, setSceneAnalysis] = useState<SceneAnalysis[]>([]);
  const [aiOperatorRecommendation, setAiOperatorRecommendation] = useState<AIOperatorFreeTierRecommendation | null>(null);

  // Get all available free transformations
  const getAvailableTransformations = useCallback(() => FFMPEG_TRANSFORMATIONS, []);
  const getAvailableMotionEffects = useCallback(() => SYNTHETIC_MOTION_EFFECTS, []);
  const getAvailablePipelines = useCallback(() => FREE_CREATIVE_PIPELINES, []);
  const getHookReplacementStyles = useCallback(() => HOOK_REPLACEMENT_STYLES, []);
  const getSceneRecompositionOptions = useCallback(() => SCENE_RECOMPOSITION_OPTIONS, []);

  // Calculate how many variations can be generated for free
  const calculateFreeCapacity = useCallback((sourceCount: number, requestedCount: number) => {
    return calculateFreeVariations(sourceCount, requestedCount);
  }, []);

  // AI Operator: Get free-tier optimization recommendation
  const getAIOperatorRecommendation = useCallback(async (
    requirements: {
      videoType: string;
      targetQuality: 'standard' | 'high' | 'premium';
      hasExistingFootage: boolean;
      hasProductImages: boolean;
      needsNewFootage: boolean;
      targetMarket: string;
      language: string;
    }
  ): Promise<AIOperatorFreeTierRecommendation> => {
    const canUseFreeTier = !requirements.needsNewFootage || requirements.hasExistingFootage || requirements.hasProductImages;
    
    // Estimate quality based on available assets
    let estimatedQuality = 70;
    if (requirements.hasExistingFootage) estimatedQuality += 15;
    if (requirements.hasProductImages) estimatedQuality += 10;
    if (requirements.targetQuality === 'standard') estimatedQuality += 5;

    const suggestedPipeline = canUseFreeTier 
      ? FREE_CREATIVE_PIPELINES.find(p => p.id === 'full-remix') || null
      : null;

    const estimatedSavings = canUseFreeTier ? 1.25 : 0;

    const recommendation: AIOperatorFreeTierRecommendation = {
      useFreeTier: canUseFreeTier && requirements.targetQuality !== 'premium',
      reason: canUseFreeTier 
        ? `Free-tier can achieve ${Math.min(estimatedQuality, 95)}% quality using FFMPEG + synthetic motion. Saves ~$${estimatedSavings.toFixed(2)} per video.`
        : 'Premium engine recommended for new footage generation.',
      suggestedPipeline,
      estimatedQuality: Math.min(estimatedQuality, 95),
      estimatedSavings
    };

    setAiOperatorRecommendation(recommendation);
    return recommendation;
  }, []);

  // AI Operator: Auto-optimize pipeline for free-tier
  const autoOptimizeForFreeTier = useCallback(async (
    sourceAds: string[],
    targetCount: number,
    productContext: {
      name: string;
      description: string;
      targetMarket: string;
      language: string;
    }
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('free-tier-creative-engine', {
        body: {
          action: 'analyze_for_optimization',
          sourceAds,
          productContext
        }
      });

      if (error) throw error;

      toast.success(`AI Operator optimized ${targetCount} variations for free-tier processing`);

      return {
        analysis: data,
        pipelines: FREE_CREATIVE_PIPELINES.slice(0, Math.min(targetCount, FREE_CREATIVE_PIPELINES.length)),
        estimatedSavings: targetCount * 1.25
      };
    } catch (err: any) {
      console.error('AI Operator optimization error:', err);
      toast.error('Optimization failed: ' + err.message);
      throw err;
    }
  }, []);

  // Check if request can be fulfilled with free-tier
  const canUseFreeTier = useCallback((requirements: {
    needsNewFootage: boolean;
    needsTalkingActor: boolean;
    needsComplexVFX: boolean;
  }): boolean => {
    return !requirements.needsNewFootage && !requirements.needsTalkingActor && !requirements.needsComplexVFX;
  }, []);

  // AI Marketing Intelligence Analysis (FREE - uses LLM only)
  const analyzeAdMarketing = useCallback(async (
    adAnalysis: any,
    productContext?: any,
    market?: string
  ): Promise<AIMarketingAnalysis | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('free-tier-creative-engine', {
        body: {
          action: 'analyze_marketing',
          adAnalysis,
          productContext,
          market: market || 'global'
        }
      });

      if (error) throw error;
      
      if (data?.analysis) {
        setMarketingAnalysis(data.analysis);
        return data.analysis;
      }
      return null;
    } catch (err) {
      console.error('Marketing analysis error:', err);
      toast.error('Failed to analyze ad marketing');
      return null;
    }
  }, []);

  // Generate AI-powered improvement recommendations (FREE)
  const generateImprovements = useCallback(async (
    analysis: AIMarketingAnalysis,
    productContext?: any,
    targetMarket?: string
  ): Promise<AIImprovementRecommendation[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('free-tier-creative-engine', {
        body: {
          action: 'generate_improvements',
          analysis,
          productContext,
          market: targetMarket || 'global'
        }
      });

      if (error) throw error;
      return data?.improvements || [];
    } catch (err) {
      console.error('Improvement generation error:', err);
      return [];
    }
  }, []);

  // Analyze scenes for recomposition (FREE)
  const analyzeScenes = useCallback(async (
    videoUrl: string,
    scenes: any[]
  ): Promise<SceneAnalysis[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('free-tier-creative-engine', {
        body: {
          action: 'analyze_scenes',
          videoUrl,
          scenes
        }
      });

      if (error) throw error;
      
      if (data?.sceneAnalysis) {
        setSceneAnalysis(data.sceneAnalysis);
        return data.sceneAnalysis;
      }
      return [];
    } catch (err) {
      console.error('Scene analysis error:', err);
      return [];
    }
  }, []);

  // Generate rewritten hooks (FREE - AI text only)
  const generateHookVariations = useCallback(async (
    originalHook: string,
    productContext: any,
    market: string,
    count: number = 10
  ): Promise<string[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('free-tier-creative-engine', {
        body: {
          action: 'generate_hooks',
          originalHook,
          productContext,
          market,
          count
        }
      });

      if (error) throw error;
      return data?.hooks || [];
    } catch (err) {
      console.error('Hook generation error:', err);
      return [];
    }
  }, []);

  // Generate CTA variations (FREE - AI text only)
  const generateCTAVariations = useCallback(async (
    productContext: any,
    market: string,
    conversionGoal: string,
    count: number = 10
  ): Promise<string[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('free-tier-creative-engine', {
        body: {
          action: 'generate_ctas',
          productContext,
          market,
          conversionGoal,
          count
        }
      });

      if (error) throw error;
      return data?.ctas || [];
    } catch (err) {
      console.error('CTA generation error:', err);
      return [];
    }
  }, []);

  // Generate free-tier video variations
  const generateFreeVariations = useCallback(async (
    config: FreeTierGenerationConfig,
    onProgress?: (progress: number) => void
  ): Promise<FreeTierResult[]> => {
    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    const allResults: FreeTierResult[] = [];

    try {
      // Calculate free capacity
      const { freeCount, explanation } = calculateFreeCapacity(
        config.sourceVideos.length,
        config.variationCount
      );

      toast.info(explanation);

      // Build variation matrix
      const variationConfigs = buildVariationMatrix(config, freeCount);

      // Process each variation
      for (let i = 0; i < variationConfigs.length; i++) {
        const varConfig = variationConfigs[i];
        
        const result: FreeTierResult = {
          id: `free-${Date.now()}-${i}`,
          sourceVideoId: varConfig.sourceVideo,
          transformationsApplied: varConfig.transformations,
          status: 'processing',
          estimatedCost: 0,
          pipeline: varConfig.pipeline
        };

        allResults.push(result);

        // Call FFMPEG creative engine
        const { data, error } = await supabase.functions.invoke('ffmpeg-creative-engine', {
          body: {
            task: {
              taskType: 'full-assembly',
              inputVideos: [varConfig.sourceVideo],
              outputRatio: varConfig.ratio,
              transitions: varConfig.transitions,
              pacing: varConfig.pacing,
              maxDuration: 30,
              removesSilence: true,
              colorGrade: varConfig.colorGrade,
              hookReplacement: varConfig.hookReplacement,
              syntheticMotion: varConfig.syntheticMotion,
            },
            config: {
              sourceVideos: [varConfig.sourceVideo],
              variations: 1,
              hookStyles: [varConfig.hookStyle],
              pacing: varConfig.pacing,
              transitions: varConfig.transitions,
              ratios: [varConfig.ratio],
              voiceSettings: { language: config.language, tone: 'energetic' },
              useN8nWebhook: false,
            }
          }
        });

        if (error) {
          result.status = 'failed';
        } else if (data?.success) {
          result.status = 'completed';
          result.outputUrl = data.result?.videos?.[0]?.outputPath;
          result.thumbnailUrl = data.result?.videos?.[0]?.thumbnailPath;
        }

        const currentProgress = Math.round(((i + 1) / variationConfigs.length) * 100);
        setProgress(currentProgress);
        onProgress?.(currentProgress);
      }

      setResults(allResults);
      toast.success(`Generated ${allResults.filter(r => r.status === 'completed').length} FREE variations!`);
      return allResults;

    } catch (err) {
      console.error('Free variation generation error:', err);
      toast.error('Failed to generate free variations');
      return allResults;
    } finally {
      setIsProcessing(false);
    }
  }, [calculateFreeCapacity]);

  // Build the variation matrix combining all free options
  const buildVariationMatrix = (config: FreeTierGenerationConfig, maxCount: number) => {
    const variations: any[] = [];
    
    // Available options
    const colorGrades = config.colorGrades.length > 0 ? config.colorGrades : ['warm-grade', 'cool-grade', 'high-contrast'];
    const pacingStyles = config.pacingStyles.length > 0 ? config.pacingStyles : ['fast', 'medium', 'dynamic'];
    const hookStyles = config.hookReplacements.length > 0 ? config.hookReplacements : ['zoom-pop', 'flash-intro', 'benefit-flash'];
    const transitions = config.enabledTransformations.filter(t => FFMPEG_TRANSFORMATIONS.find(f => f.id === t && f.category === 'transition'));
    const motionEffects = config.enabledMotionEffects.length > 0 ? config.enabledMotionEffects : ['parallax-layers', 'slow-push'];
    const ratios = config.outputRatios.length > 0 ? config.outputRatios : ['9:16'];

    let count = 0;

    // Generate combinations
    for (const sourceVideo of config.sourceVideos) {
      for (const colorGrade of colorGrades) {
        for (const pacing of pacingStyles) {
          for (const hookStyle of hookStyles) {
            for (const ratio of ratios) {
              if (count >= maxCount) break;

              variations.push({
                sourceVideo,
                colorGrade,
                pacing,
                hookStyle,
                hookReplacement: hookStyle,
                ratio,
                transitions: transitions.length > 0 ? transitions : ['hard-cut', 'zoom-transition'],
                syntheticMotion: motionEffects[count % motionEffects.length],
                transformations: [colorGrade, pacing, hookStyle],
                pipeline: config.enabledPipelines[count % config.enabledPipelines.length] || 'full-remix'
              });
              count++;
            }
            if (count >= maxCount) break;
          }
          if (count >= maxCount) break;
        }
        if (count >= maxCount) break;
      }
      if (count >= maxCount) break;
    }

    return variations;
  };

  // Recommend the best free pipeline based on ad analysis
  const recommendFreePipeline = useCallback((
    adAnalysis: any,
    market: string,
    platform: string
  ): CreativePipeline => {
    // Use AI logic to determine best pipeline
    const platformPacing = {
      'tiktok': 'fast',
      'instagram-reels': 'medium',
      'youtube-shorts': 'medium',
      'snapchat': 'fast',
      'meta-ads': 'varied'
    };

    const needsColorGrade = adAnalysis?.style !== 'cinematic';
    const needsPacing = platformPacing[platform as keyof typeof platformPacing] !== adAnalysis?.pacing;
    const weakHook = adAnalysis?.hook === 'none' || !adAnalysis?.hook;

    if (weakHook) {
      return FREE_CREATIVE_PIPELINES.find(p => p.id === 'hook-variations')!;
    } else if (needsPacing) {
      return FREE_CREATIVE_PIPELINES.find(p => p.id === 'pacing-variations')!;
    } else if (needsColorGrade) {
      return FREE_CREATIVE_PIPELINES.find(p => p.id === 'color-variations')!;
    }

    return FREE_CREATIVE_PIPELINES.find(p => p.id === 'full-remix')!;
  }, []);

  return {
    // State
    isProcessing,
    progress,
    results,
    marketingAnalysis,
    sceneAnalysis,
    aiOperatorRecommendation,

    // AI Operator Integration
    getAIOperatorRecommendation,
    autoOptimizeForFreeTier,
    canUseFreeTier,

    // Capabilities
    getAvailableTransformations,
    getAvailableMotionEffects,
    getAvailablePipelines,
    getHookReplacementStyles,
    getSceneRecompositionOptions,
    calculateFreeCapacity,

    // AI Intelligence (FREE)
    analyzeAdMarketing,
    generateImprovements,
    analyzeScenes,
    generateHookVariations,
    generateCTAVariations,

    // Generation
    generateFreeVariations,
    recommendFreePipeline,
  };
};

export default useFreeTierCreativeEngine;
