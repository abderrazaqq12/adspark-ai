import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AIAgentModel = 'chatgpt' | 'gemini' | 'claude' | 'llama';

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
        if (['chatgpt', 'gemini', 'claude', 'llama'].includes(savedAgent)) {
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
    case 'claude':
      return 'anthropic/claude-sonnet-4-5';
    case 'llama':
      return 'meta/llama-3.3-70b';
    case 'gemini':
    default:
      return 'google/gemini-2.5-flash';
  }
};
