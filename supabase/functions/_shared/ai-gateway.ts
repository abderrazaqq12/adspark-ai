/**
 * AI Gateway Helper - Multi-provider with automatic fallback
 * 
 * Priority order: Gemini → OpenAI → OpenRouter
 * Automatically switches providers when quota/rate limits are hit
 * 
 * NOTE: This is for TEXT-BASED operations only (analysis, content generation, strategy)
 * Video generation and image generation use separate APIs and are NOT affected by this gateway
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
  provider: 'gemini' | 'openai' | 'openrouter';
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
  provider: 'gemini' | 'openai' | 'openrouter';
  retryAfterSeconds?: number;
  
  constructor(message: string, type: AIErrorType, provider: 'gemini' | 'openai' | 'openrouter', retryAfterSeconds?: number) {
    super(message);
    this.name = 'AIError';
    this.type = type;
    this.provider = provider;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Model mappings for each provider
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

const OPENROUTER_MODELS: Record<string, string> = {
  'default': 'google/gemini-2.0-flash-001',
  'fast': 'google/gemini-2.0-flash-001',
  'pro': 'anthropic/claude-3.5-sonnet',
  'flash': 'google/gemini-2.0-flash-001',
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
          ? 'Gemini API quota exceeded. Trying fallback provider...'
          : 'Gemini API rate limited. Trying fallback provider...',
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
 * Call OpenAI API
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
      const isQuotaExceeded = errorText.includes('quota') || 
                               errorText.includes('billing') ||
                               errorText.includes('exceeded');
      throw new AIError(
        isQuotaExceeded 
          ? 'OpenAI API quota exceeded. Trying fallback provider...'
          : 'OpenAI API rate limited. Trying fallback provider...',
        isQuotaExceeded ? 'QUOTA_EXCEEDED' : 'RATE_LIMIT',
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
 * Call OpenRouter API (third fallback)
 */
async function callOpenRouter(options: AIRequestOptions): Promise<AIResponse> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    throw new AIError('OpenRouter API key not configured', 'AUTH_ERROR', 'openrouter');
  }

  const model = OPENROUTER_MODELS[options.model || 'default'] || OPENROUTER_MODELS.default;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://flowscale.app',
      'X-Title': 'FlowScale Creative Platform',
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
    console.error('[OpenRouter] Error:', response.status, errorText);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const isQuotaExceeded = errorText.includes('quota') || 
                               errorText.includes('credits') ||
                               errorText.includes('limit');
      throw new AIError(
        isQuotaExceeded 
          ? 'OpenRouter API quota/credits exceeded.'
          : 'OpenRouter API rate limited.',
        isQuotaExceeded ? 'QUOTA_EXCEEDED' : 'RATE_LIMIT',
        'openrouter',
        retryAfter ? parseInt(retryAfter) : undefined
      );
    }
    
    if (response.status === 401 || response.status === 403) {
      throw new AIError('OpenRouter API key is invalid or expired', 'AUTH_ERROR', 'openrouter');
    }
    
    throw new AIError(`OpenRouter API error: ${response.status}`, 'API_ERROR', 'openrouter');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return {
    content,
    model,
    provider: 'openrouter',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens || 0,
      completionTokens: data.usage.completion_tokens || 0,
      totalTokens: data.usage.total_tokens || 0,
    } : undefined,
  };
}

// Provider info for logging
type ProviderName = 'gemini' | 'openai' | 'openrouter';
type ProviderFunction = (options: AIRequestOptions) => Promise<AIResponse>;

interface ProviderConfig {
  name: ProviderName;
  call: ProviderFunction;
  isConfigured: () => boolean;
}

/**
 * Main AI Gateway function - tries providers in order with automatic fallback
 * Order: Gemini → OpenAI → OpenRouter
 */
export async function callAI(options: AIRequestOptions): Promise<AIResponse> {
  const providers: ProviderConfig[] = [
    { 
      name: 'gemini', 
      call: callGemini, 
      isConfigured: () => !!Deno.env.get('Gemini') 
    },
    { 
      name: 'openai', 
      call: callOpenAI, 
      isConfigured: () => !!Deno.env.get('OpenAI') 
    },
    { 
      name: 'openrouter', 
      call: callOpenRouter, 
      isConfigured: () => !!Deno.env.get('OPENROUTER_API_KEY') 
    },
  ];

  const errors: { provider: ProviderName; error: AIError | Error }[] = [];
  
  // Try each provider in order
  for (const provider of providers) {
    if (!provider.isConfigured()) {
      console.log(`[AI-Gateway] Skipping ${provider.name} - not configured`);
      continue;
    }

    try {
      console.log(`[AI-Gateway] Trying ${provider.name}...`);
      const response = await provider.call(options);
      console.log(`[AI-Gateway] Success with ${provider.name}`);
      return response;
    } catch (err) {
      const error = err as AIError | Error;
      errors.push({ provider: provider.name, error });
      
      // Log the failure and continue to next provider
      if (error instanceof AIError) {
        console.warn(`[AI-Gateway] ${provider.name} failed (${error.type}): ${error.message}`);
        
        // If it's an auth error, this provider won't work - continue to next
        if (error.type === 'AUTH_ERROR') {
          console.warn(`[AI-Gateway] ${provider.name} auth failed, trying next provider...`);
          continue;
        }
        
        // For quota/rate limits, definitely try next provider
        if (error.type === 'QUOTA_EXCEEDED' || error.type === 'RATE_LIMIT') {
          console.warn(`[AI-Gateway] ${provider.name} quota/rate limited, trying next provider...`);
          continue;
        }
      } else {
        console.warn(`[AI-Gateway] ${provider.name} failed with error:`, error);
      }
    }
  }

  // All providers failed
  console.error('[AI-Gateway] All providers failed');
  
  // Build informative error message
  const configuredProviders = providers.filter(p => p.isConfigured()).map(p => p.name);
  
  if (configuredProviders.length === 0) {
    throw new AIError(
      'No AI providers configured. Please add at least one API key (Gemini, OpenAI, or OpenRouter) in Settings.',
      'AUTH_ERROR',
      'gemini'
    );
  }

  // Find the most relevant error to return
  // Prioritize quota/rate limit errors as they're actionable
  const quotaError = errors.find(e => e.error instanceof AIError && e.error.type === 'QUOTA_EXCEEDED');
  const rateLimitError = errors.find(e => e.error instanceof AIError && e.error.type === 'RATE_LIMIT');
  const authErrors = errors.filter(e => e.error instanceof AIError && e.error.type === 'AUTH_ERROR');
  
  // If all configured providers have auth errors, report that
  if (authErrors.length === configuredProviders.length) {
    throw new AIError(
      `All configured AI providers (${configuredProviders.join(', ')}) have invalid API keys. Please check your API key configuration in Settings.`,
      'AUTH_ERROR',
      authErrors[0]?.provider || 'gemini'
    );
  }

  // If we hit quota/rate limits on all working providers
  if (quotaError || rateLimitError) {
    const relevantError = (quotaError?.error || rateLimitError?.error) as AIError;
    throw new AIError(
      `All AI providers are currently unavailable (quota exceeded or rate limited). Tried: ${configuredProviders.join(' → ')}. Please wait and try again.`,
      relevantError.type,
      relevantError.provider,
      relevantError.retryAfterSeconds
    );
  }

  // Generic error
  throw new AIError(
    `AI service unavailable. All providers failed (${configuredProviders.join(', ')}). Please try again later.`,
    'API_ERROR',
    'gemini'
  );
}

/**
 * Check if AI is available (at least one provider configured)
 */
export function isAIAvailable(): boolean {
  return !!(Deno.env.get('Gemini') || Deno.env.get('OpenAI') || Deno.env.get('OPENROUTER_API_KEY'));
}

/**
 * Get available providers
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = [];
  if (Deno.env.get('Gemini')) providers.push('gemini');
  if (Deno.env.get('OpenAI')) providers.push('openai');
  if (Deno.env.get('OPENROUTER_API_KEY')) providers.push('openrouter');
  return providers;
}
