import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AIAgentModel = 'chatgpt' | 'gemini';

interface UseAIAgentReturn {
  aiAgent: AIAgentModel;
  loading: boolean;
  refreshAgent: () => Promise<void>;
}

export const useAIAgent = (): UseAIAgentReturn => {
  const [aiAgent, setAiAgent] = useState<AIAgentModel>('gemini');
  const [loading, setLoading] = useState(true);

  const loadAIAgent = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings?.preferences) {
        const prefs = settings.preferences as Record<string, string>;
        const savedAgent = prefs.ai_agent as AIAgentModel;
        if (savedAgent === 'chatgpt' || savedAgent === 'gemini') {
          setAiAgent(savedAgent);
        }
      }
    } catch (error) {
      console.error('Error loading AI agent setting:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAIAgent();
  }, [loadAIAgent]);

  return {
    aiAgent,
    loading,
    refreshAgent: loadAIAgent
  };
};

// Helper function to get the model name for API calls
export const getModelName = (aiAgent: AIAgentModel): string => {
  switch (aiAgent) {
    case 'chatgpt':
      return 'openai/gpt-5-mini';
    case 'gemini':
    default:
      return 'google/gemini-2.5-flash';
  }
};
