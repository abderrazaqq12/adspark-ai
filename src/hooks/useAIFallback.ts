import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAIAgent, AIAgentModel } from './useAIAgent';
import { toast } from 'sonner';

interface AIFallbackRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
}

interface AIFallbackResponse {
  response: string;
  provider: AIAgentModel;
  fallbacksAttempted: number;
}

interface UseAIFallbackReturn {
  callAI: (request: AIFallbackRequest) => Promise<AIFallbackResponse | null>;
  loading: boolean;
  error: string | null;
  lastProvider: AIAgentModel | null;
  preferredAgent: AIAgentModel;
}

export const useAIFallback = (): UseAIFallbackReturn => {
  const { aiAgent } = useAIAgent();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<AIAgentModel | null>(null);

  const callAI = useCallback(async (request: AIFallbackRequest): Promise<AIFallbackResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-fallback', {
        body: {
          prompt: request.prompt,
          systemPrompt: request.systemPrompt || 'You are a helpful AI assistant.',
          maxTokens: request.maxTokens || 1000,
          preferredAgent: aiAgent
        }
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setLastProvider(data.provider as AIAgentModel);
      
      // Notify if fallback was used
      if (data.fallbacksAttempted > 0) {
        toast.info(`Used ${data.provider} as fallback (${data.fallbacksAttempted} provider(s) were unavailable)`);
      }

      return {
        response: data.response,
        provider: data.provider as AIAgentModel,
        fallbacksAttempted: data.fallbacksAttempted
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'AI request failed';
      setError(errorMessage);
      toast.error(`AI Error: ${errorMessage}`);
      return null;
    } finally {
      setLoading(false);
    }
  }, [aiAgent]);

  return {
    callAI,
    loading,
    error,
    lastProvider,
    preferredAgent: aiAgent
  };
};

export default useAIFallback;
