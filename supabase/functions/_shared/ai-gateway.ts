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
 * Call Google Gemini API
 */
async function callGemini(options: AIRequestOptions): Promise<AIResponse> {
  const apiKey = Deno.env.get('Gemini');
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
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
    throw new Error(`Gemini API error: ${response.status}`);
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
    throw new Error('OpenAI API key not configured');
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
    throw new Error(`OpenAI API error: ${response.status}`);
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
  // Try Gemini first
  try {
    console.log('[AI-Gateway] Trying Gemini...');
    return await callGemini(options);
  } catch (geminiError) {
    console.warn('[AI-Gateway] Gemini failed, trying OpenAI fallback:', geminiError);
    
    // Try OpenAI as fallback
    try {
      console.log('[AI-Gateway] Trying OpenAI fallback...');
      return await callOpenAI(options);
    } catch (openAIError) {
      console.error('[AI-Gateway] Both providers failed');
      throw new Error(`AI providers failed. Gemini: ${geminiError}. OpenAI: ${openAIError}`);
    }
  }
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
