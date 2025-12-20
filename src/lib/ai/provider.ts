/**
 * AI Provider Abstraction
 * Supports multiple AI backends: Lovable AI, OpenAI, Gemini, Ollama
 */

import { config, AIProvider } from '@/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProviderAdapter {
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;
  streamChat(options: ChatCompletionOptions, onChunk: (chunk: string) => void): Promise<void>;
  isAvailable(): Promise<boolean>;
}

// Model mappings for different providers - Gemini is default, OpenAI is backup
const MODEL_MAPPINGS: Record<AIProvider, Record<string, string>> = {
  gemini: {
    default: 'gemini-2.0-flash',
    fast: 'gemini-2.0-flash',
    smart: 'gemini-2.5-pro-preview-06-05',
  },
  openai: {
    default: 'gpt-4o-mini',
    fast: 'gpt-4o-mini',
    smart: 'gpt-4o',
  },
  lovable: {
    default: 'gemini-2.0-flash',
    fast: 'gemini-2.0-flash',
    smart: 'gemini-2.5-pro-preview-06-05',
  },
  ollama: {
    default: 'llama3.2',
    fast: 'llama3.2',
    smart: 'llama3.2:70b',
  },
  custom: {
    default: 'default',
  },
};

// Get the model for a specific provider
export const getModelForProvider = (provider: AIProvider, modelAlias: string = 'default'): string => {
  return MODEL_MAPPINGS[provider]?.[modelAlias] || MODEL_MAPPINGS[provider]?.default || modelAlias;
};

// Factory function to get the appropriate AI adapter
export const getAIAdapter = async (provider?: AIProvider): Promise<AIProviderAdapter> => {
  const targetProvider = provider || config.ai.defaultProvider;
  
  switch (targetProvider) {
    case 'lovable':
      const { LovableAIAdapter } = await import('./lovable');
      return new LovableAIAdapter();
    case 'openai':
      const { OpenAIAdapter } = await import('./openai');
      return new OpenAIAdapter();
    case 'gemini':
      const { GeminiAdapter } = await import('./gemini');
      return new GeminiAdapter();
    case 'ollama':
      const { OllamaAdapter } = await import('./ollama');
      return new OllamaAdapter();
    default:
      const { LovableAIAdapter: DefaultAdapter } = await import('./lovable');
      return new DefaultAdapter();
  }
};

// Helper to check which providers are available
export const getAvailableProviders = async (): Promise<AIProvider[]> => {
  const providers: AIProvider[] = ['lovable', 'openai', 'gemini', 'ollama'];
  const available: AIProvider[] = [];
  
  for (const provider of providers) {
    try {
      const adapter = await getAIAdapter(provider);
      if (await adapter.isAvailable()) {
        available.push(provider);
      }
    } catch {
      // Provider not available
    }
  }
  
  return available;
};
