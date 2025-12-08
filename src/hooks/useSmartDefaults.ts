import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAIBrain } from './useAIBrain';

interface SmartDefaults {
  preferredEngine: string | null;
  preferredVoice: string | null;
  preferredPacing: string;
  preferredHookStyle: string;
  preferredTransitions: string[];
  preferredLanguage: string;
  preferredMarket: string;
  autoOptimizeCost: boolean;
  averageSceneDuration: number;
  variationsPerProject: number;
}

interface UseSmartDefaultsReturn {
  defaults: SmartDefaults;
  isLoading: boolean;
  applyDefaults: () => void;
  recordChoice: (type: string, choice: any) => Promise<void>;
  getDefaultForContext: (context: string) => any;
  suggestEngine: (sceneType: string) => Promise<string>;
}

const INITIAL_DEFAULTS: SmartDefaults = {
  preferredEngine: null,
  preferredVoice: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  preferredPacing: 'medium',
  preferredHookStyle: 'question',
  preferredTransitions: ['cut', 'fade'],
  preferredLanguage: 'en',
  preferredMarket: 'us',
  autoOptimizeCost: true,
  averageSceneDuration: 5,
  variationsPerProject: 10,
};

export function useSmartDefaults(projectId?: string): UseSmartDefaultsReturn {
  const [defaults, setDefaults] = useState<SmartDefaults>(INITIAL_DEFAULTS);
  const [isLoading, setIsLoading] = useState(true);
  const { recordLearning, selectEngine } = useAIBrain();

  const loadDefaults = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Load user settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('default_language, default_voice, pricing_tier, preferences')
        .eq('user_id', session.user.id)
        .single();

      // Load learnings
      const { data: learnings } = await supabase
        .from('ai_learnings')
        .select('*')
        .eq('user_id', session.user.id)
        .order('confidence_score', { ascending: false })
        .limit(20);

      // Build defaults from learnings and settings
      const newDefaults = { ...INITIAL_DEFAULTS };

      if (settings) {
        newDefaults.preferredLanguage = settings.default_language || 'en';
        newDefaults.preferredVoice = settings.default_voice || 'EXAVITQu4vr4xnSDxMaL';
        
        const prefs = settings.preferences as Record<string, any> | null;
        if (prefs) {
          newDefaults.preferredMarket = prefs.default_market || 'us';
          newDefaults.autoOptimizeCost = prefs.optimize_cost !== false;
          newDefaults.variationsPerProject = prefs.default_variations || 10;
        }
      }

      // Apply learnings
      for (const learning of learnings || []) {
        const insight = learning.insight as Record<string, any> | null;
        if (!insight) continue;
        
        switch (learning.learning_type) {
          case 'engine_preference':
            if (learning.confidence_score > 0.6) {
              newDefaults.preferredEngine = insight.preferred_engine || null;
            }
            break;
          case 'pacing_preference':
            if (learning.confidence_score > 0.5) {
              newDefaults.preferredPacing = insight.pacing || 'medium';
            }
            break;
          case 'hook_preference':
            if (learning.confidence_score > 0.5) {
              newDefaults.preferredHookStyle = insight.hook_style || 'question';
            }
            break;
          case 'duration_preference':
            if (learning.confidence_score > 0.5) {
              newDefaults.averageSceneDuration = insight.duration || 5;
            }
            break;
        }
      }

      setDefaults(newDefaults);
    } catch (error) {
      console.error('Error loading smart defaults:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  const applyDefaults = useCallback(() => {
    // This would apply defaults to the current project form
    // Implementation depends on the context where it's called
  }, [defaults]);

  const recordChoice = useCallback(async (type: string, choice: any) => {
    try {
      await recordLearning(
        { project_id: projectId },
        type,
        choice,
        0.6
      );

      // Update local defaults immediately for responsiveness
      switch (type) {
        case 'engine_preference':
          setDefaults(prev => ({ ...prev, preferredEngine: choice.preferred_engine }));
          break;
        case 'pacing_preference':
          setDefaults(prev => ({ ...prev, preferredPacing: choice.pacing }));
          break;
        case 'hook_preference':
          setDefaults(prev => ({ ...prev, preferredHookStyle: choice.hook_style }));
          break;
        case 'voice_preference':
          setDefaults(prev => ({ ...prev, preferredVoice: choice.voice_id }));
          break;
      }
    } catch (error) {
      console.error('Error recording choice:', error);
    }
  }, [projectId, recordLearning]);

  const getDefaultForContext = useCallback((context: string): any => {
    switch (context) {
      case 'engine':
        return defaults.preferredEngine;
      case 'voice':
        return defaults.preferredVoice;
      case 'pacing':
        return defaults.preferredPacing;
      case 'hook':
        return defaults.preferredHookStyle;
      case 'language':
        return defaults.preferredLanguage;
      case 'market':
        return defaults.preferredMarket;
      case 'duration':
        return defaults.averageSceneDuration;
      case 'variations':
        return defaults.variationsPerProject;
      default:
        return null;
    }
  }, [defaults]);

  const suggestEngine = useCallback(async (sceneType: string): Promise<string> => {
    try {
      const result = await selectEngine(
        {
          scene_type: sceneType,
          language: defaults.preferredLanguage,
          market: defaults.preferredMarket,
          budget_tier: defaults.autoOptimizeCost ? 'budget' : 'normal',
        },
        { duration_sec: defaults.averageSceneDuration }
      );
      return result.engine;
    } catch (error) {
      return defaults.preferredEngine || 'pika';
    }
  }, [defaults, selectEngine]);

  return {
    defaults,
    isLoading,
    applyDefaults,
    recordChoice,
    getDefaultForContext,
    suggestEngine,
  };
}
