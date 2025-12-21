/**
 * AI Gateway Helper - Google Gemini (primary) + OpenAI ChatGPT (fallback)
 * 
 * This module replaces Lovable AI Gateway with direct API calls to:
 * 1. Google Gemini API (primary)
 * 2. OpenAI API (fallback if Gemini fails)
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

export interface AIRequestOptions {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  model: string;
  provider: 'gemini' | 'openai';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Error types for better handling
export type AIErrorType = 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'AUTH_ERROR' | 'API_ERROR' | 'UNKNOWN';

export class AIError extends Error {
  type: AIErrorType;
  provider: 'gemini' | 'openai';
  retryAfterSeconds?: number;
  
  constructor(message: string, type: AIErrorType, provider: 'gemini' | 'openai', retryAfterSeconds?: number) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.provider = provider;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Model mappings
const GEMINI_MODELS: Record<string, string> = {
  'default': 'gemini-2.0-flash',
  'fast': 'gemini-2.0-flash',
  'pro': 'gemini-2.5-pro-preview-06-05',
  'flash': 'gemini-2.0-flash',
};

const OPENAI_MODELS: Record<string, string> = {
  'default': 'gpt-4o-mini',
  'fast': 'gpt-4o-mini',
  'pro': 'gpt-4o',
  'flash': 'gpt-4o-mini',
};

/**
 * Parse error response and extract retry delay if available
 */
function parseRetryDelay(errorText: string): number | undefined {
  try {
    const data = JSON.parse(errorText);
    // Gemini format
    const retryInfo = data.error?.details?.find((d: any) => d['@type']?.includes('RetryInfo'));
    if (retryInfo?.retryDelay) {
      const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
      return isNaN(seconds) ? undefined : Math.ceil(seconds);
    }
    // OpenAI format - check headers would be better but we parse text here
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Call Google Gemini API
 */
async function callGemini(options: AIRequestOptions): Promise<AIResponse> {
  const apiKey = Deno.env.get('Gemini');
  if (!apiKey) {
    throw new AIError('Gemini API key not configured', 'AUTH_ERROR', 'gemini');
  }

  const model = GEMINI_MODELS[options.model || 'default'] || GEMINI_MODELS.default;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Convert OpenAI-style messages to Gemini format
  const contents = options.messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: typeof m.content === 'string' 
        ? [{ text: m.content }]
        : m.content.map(c => c.type === 'text' ? { text: c.text } : { inlineData: { data: '', mimeType: 'image/jpeg' } })
    }));

  // Extract system instruction
  const systemMessage = options.messages.find(m => m.role === 'system');
  const systemInstruction = systemMessage && typeof systemMessage.content === 'string' 
    ? { parts: [{ text: systemMessage.content }] }
    : undefined;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini] Error:', response.status, errorText);
    
    const retryAfter = parseRetryDelay(errorText);
    
    if (response.status === 429) {
      // Check if it's quota exceeded vs rate limit
      const isQuotaExceeded = errorText.includes('RESOURCE_EXHAUSTED') || 
                               errorText.includes('quota') ||
                               errorText.includes('exceeded');
      throw new AIError(
        isQuotaExceeded 
          ? 'Gemini API quota exceeded. Please try again later or check your billing settings.'
          : 'Gemini API rate limited. Please wait a moment and try again.',
        isQuotaExceeded ? 'QUOTA_EXCEEDED' : 'RATE_LIMIT',
        'gemini',
        retryAfter
      );
    }
    
    if (response.status === 401 || response.status === 403) {
      throw new AIError('Gemini API key is invalid or expired', 'AUTH_ERROR', 'gemini');
    }
    
    throw new AIError(`Gemini API error: ${response.status}`, 'API_ERROR', 'gemini');
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return {
    content,
    model,
    provider: 'gemini',
    usage: data.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount || 0,
      completionTokens: data.usageMetadata.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata.totalTokenCount || 0,
    } : undefined,
  };
}

/**
 * Call OpenAI API (fallback)
 */
async function callOpenAI(options: AIRequestOptions): Promise<AIResponse> {
  const apiKey = Deno.env.get('OpenAI');
  if (!apiKey) {
    throw new AIError('OpenAI API key not configured', 'AUTH_ERROR', 'openai');
  }

  const model = OPENAI_MODELS[options.model || 'default'] || OPENAI_MODELS.default;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OpenAI] Error:', response.status, errorText);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new AIError(
        'OpenAI API rate limited. Please wait a moment and try again.',
        'RATE_LIMIT',
        'openai',
        retryAfter ? parseInt(retryAfter) : undefined
      );
    }
    
    if (response.status === 401) {
      throw new AIError('OpenAI API key is invalid or expired', 'AUTH_ERROR', 'openai');
    }
    
    throw new AIError(`OpenAI API error: ${response.status}`, 'API_ERROR', 'openai');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content,
    model,
    provider: 'openai',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
  };
}

/**
 * Main AI Gateway function - tries Gemini first, falls back to OpenAI
 */
export async function callAI(options: AIRequestOptions): Promise<AIResponse> {
  let geminiError: AIError | Error | null = null;
  let openAIError: AIError | Error | null = null;

  // Try Gemini first
  try {
    console.log('[AI-Gateway] Trying Gemini...');
    return await callGemini(options);
  } catch (err) {
    geminiError = err as AIError | Error;
    console.warn('[AI-Gateway] Gemini failed, trying OpenAI fallback:', err);
  }
    
  // Try OpenAI as fallback
  try {
    console.log('[AI-Gateway] Trying OpenAI fallback...');
    return await callOpenAI(options);
  } catch (err) {
    openAIError = err as AIError | Error;
    console.error('[AI-Gateway] Both providers failed');
  }

  // Both failed - return the most informative error
  // Prioritize quota/rate limit errors as they're actionable
  if (geminiError instanceof AIError && (geminiError.type === 'QUOTA_EXCEEDED' || geminiError.type === 'RATE_LIMIT')) {
    if (openAIError instanceof AIError && openAIError.type === 'AUTH_ERROR') {
      // Gemini is rate limited and OpenAI key is invalid
      throw new AIError(
        'AI service temporarily unavailable. Gemini quota exceeded and backup service unavailable. Please try again later.',
        'QUOTA_EXCEEDED',
        'gemini',
        geminiError.retryAfterSeconds
      );
    }
    throw geminiError;
  }
  
  if (openAIError instanceof AIError && (openAIError.type === 'QUOTA_EXCEEDED' || openAIError.type === 'RATE_LIMIT')) {
    throw openAIError;
  }

  // Generic error combining both
  const geminiMsg = geminiError instanceof AIError ? geminiError.message : String(geminiError);
  const openAIMsg = openAIError instanceof AIError ? openAIError.message : String(openAIError);
  throw new AIError(
    `AI providers unavailable. Please check your API keys and try again.`,
    'API_ERROR',
    'gemini'
  );
}

/**
 * Check if AI is available (at least one provider configured)
 */
export function isAIAvailable(): boolean {
  return !!(Deno.env.get('Gemini') || Deno.env.get('OpenAI'));
}

/**
 * Get available providers
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (Deno.env.get('Gemini')) providers.push('gemini');
  if (Deno.env.get('OpenAI')) providers.push('openai');
  return providers;
}
