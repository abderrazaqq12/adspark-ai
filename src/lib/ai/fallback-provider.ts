/**
 * AI Provider Fallback System
 * Automatically switches to backup AI providers when the primary is unavailable
 */

import { AIAgentModel, getModelName, getApiKeyForAgent } from '@/hooks/useAIAgent';

// Fallback order - will try each in sequence if previous fails
const FALLBACK_ORDER: AIAgentModel[] = ['gemini', 'chatgpt', 'deepseek', 'claude', 'llama'];

export interface AIProviderResult {
  success: boolean;
  provider: AIAgentModel;
  response?: any;
  error?: string;
}

export interface AIRequestOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Get ordered list of providers to try, starting with preferred and then fallbacks
 */
export const getProviderOrder = (preferred: AIAgentModel, availableKeys: string[]): AIAgentModel[] => {
  const order: AIAgentModel[] = [preferred];
  
  // Add fallbacks in order, excluding the preferred one
  for (const agent of FALLBACK_ORDER) {
    if (agent !== preferred) {
      const keyName = getApiKeyForAgent(agent);
      // Only add if the key is available
      if (availableKeys.includes(keyName)) {
        order.push(agent);
      }
    }
  }
  
  return order;
};

/**
 * Test if a provider is available by checking if its API key exists
 */
export const isProviderAvailable = (agent: AIAgentModel, availableKeys: string[]): boolean => {
  const keyName = getApiKeyForAgent(agent);
  return availableKeys.includes(keyName);
};

/**
 * Get the API endpoint for a given agent
 */
export const getApiEndpoint = (agent: AIAgentModel): string => {
  switch (agent) {
    case 'chatgpt':
      return 'https://api.openai.com/v1/chat/completions';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    case 'deepseek':
      return 'https://api.deepseek.com/v1/chat/completions';
    case 'claude':
      return 'https://api.anthropic.com/v1/messages';
    case 'llama':
      return 'https://openrouter.ai/api/v1/chat/completions';
    default:
      return '';
  }
};

/**
 * Format request body for different providers
 */
export const formatRequestBody = (agent: AIAgentModel, options: AIRequestOptions): object => {
  const { prompt, systemPrompt = 'You are a helpful AI assistant.', maxTokens = 1000 } = options;

  switch (agent) {
    case 'chatgpt':
      return {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens
      };
    case 'gemini':
      return {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };
    case 'deepseek':
      return {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens
      };
    case 'claude':
      return {
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      };
    case 'llama':
      return {
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens
      };
    default:
      return {};
  }
};

/**
 * Get headers for different providers
 */
export const getRequestHeaders = (agent: AIAgentModel, apiKey: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  switch (agent) {
    case 'chatgpt':
    case 'deepseek':
    case 'llama':
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    case 'claude':
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
    case 'gemini':
      // Gemini uses query param, not header
      break;
  }

  return headers;
};

/**
 * Extract response text from different provider formats
 */
export const extractResponseText = (agent: AIAgentModel, data: any): string => {
  switch (agent) {
    case 'chatgpt':
    case 'deepseek':
    case 'llama':
      return data.choices?.[0]?.message?.content || '';
    case 'gemini':
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    case 'claude':
      return data.content?.[0]?.text || '';
    default:
      return '';
  }
};

/**
 * Log provider status for debugging
 */
export const logProviderAttempt = (agent: AIAgentModel, success: boolean, error?: string) => {
  if (success) {
    console.log(`[AI Fallback] ✓ ${agent} succeeded`);
  } else {
    console.warn(`[AI Fallback] ✗ ${agent} failed: ${error}`);
  }
};
