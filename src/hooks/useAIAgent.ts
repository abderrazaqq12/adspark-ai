import { useState, useEffect, useCallback } from 'react';
import { getUser, getAuthHeaders } from '@/utils/auth';

export type AIAgentModel = 'chatgpt' | 'gemini' | 'claude' | 'llama' | 'deepseek';

// Fallback order for AI agents
const AI_AGENT_FALLBACK_ORDER: AIAgentModel[] = ['gemini', 'chatgpt', 'deepseek', 'claude', 'llama'];

interface UseAIAgentReturn {
  aiAgent: AIAgentModel;
  loading: boolean;
  refreshAgent: () => Promise<void>;
  getFallbackAgents: (currentAgent: AIAgentModel) => AIAgentModel[];
}

export const useAIAgent = (): UseAIAgentReturn => {
  const [aiAgent, setAiAgent] = useState<AIAgentModel>('gemini');
  const [loading, setLoading] = useState(true);

  const loadAIAgent = useCallback(async () => {
    try {
      const user = getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // VPS-First: Use backend API
      const headers = getAuthHeaders();
      const response = await fetch('/api/settings', { headers });

      if (response.ok) {
        const data = await response.json();
        const prefs = data?.settings?.preferences || data?.preferences || {};
        const savedAgent = prefs.ai_agent as AIAgentModel;
        if (['chatgpt', 'gemini', 'claude', 'llama', 'deepseek'].includes(savedAgent)) {
          setAiAgent(savedAgent);
        }
      }
    } catch (error) {
      console.error('Error loading AI agent setting:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Get fallback agents in order, excluding the current one
  const getFallbackAgents = useCallback((currentAgent: AIAgentModel): AIAgentModel[] => {
    return AI_AGENT_FALLBACK_ORDER.filter(agent => agent !== currentAgent);
  }, []);

  useEffect(() => {
    loadAIAgent();
  }, [loadAIAgent]);

  return {
    aiAgent,
    loading,
    refreshAgent: loadAIAgent,
    getFallbackAgents
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
    case 'deepseek':
      return 'deepseek/deepseek-chat';
    case 'gemini':
    default:
      return 'google/gemini-2.5-flash';
  }
};

// API key mapping for each agent
export const getApiKeyForAgent = (aiAgent: AIAgentModel): string => {
  switch (aiAgent) {
    case 'chatgpt':
      return 'OPENAI_API_KEY';
    case 'claude':
      return 'ANTHROPIC_API_KEY';
    case 'llama':
      return 'OPENROUTER_API_KEY';
    case 'deepseek':
      return 'DEEPSEEK_API_KEY';
    case 'gemini':
    default:
      return 'GEMINI_API_KEY';
  }
};

// Test endpoint for each agent
export const getTestEndpointForAgent = (aiAgent: AIAgentModel): { url: string; headers: (key: string) => Record<string, string>; body: object } => {
  switch (aiAgent) {
    case 'chatgpt':
      return {
        url: 'https://api.openai.com/v1/models',
        headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
        body: {}
      };
    case 'claude':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }),
        body: { model: 'claude-sonnet-4-5-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }
      };
    case 'llama':
      return {
        url: 'https://openrouter.ai/api/v1/models',
        headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
        body: {}
      };
    case 'deepseek':
      return {
        url: 'https://api.deepseek.com/v1/models',
        headers: (key) => ({ 'Authorization': `Bearer ${key}` }),
        body: {}
      };
    case 'gemini':
    default:
      return {
        url: 'https://generativelanguage.googleapis.com/v1beta/models?key=',
        headers: () => ({}),
        body: {}
      };
  }
};
