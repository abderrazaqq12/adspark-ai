import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fallback order for AI providers
const FALLBACK_ORDER = ['gemini', 'chatgpt', 'deepseek', 'claude', 'llama'] as const;
type AIAgent = typeof FALLBACK_ORDER[number];

interface AIRequestBody {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  preferredAgent?: AIAgent;
}

const getApiKey = (agent: AIAgent): string | undefined => {
  switch (agent) {
    case 'gemini': return Deno.env.get('GEMINI_API_KEY') || Deno.env.get('Gemini');
    case 'chatgpt': return Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OpenAI');
    case 'deepseek': return Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('deepsik');
    case 'claude': return Deno.env.get('ANTHROPIC_API_KEY');
    case 'llama': return Deno.env.get('OPENROUTER_API_KEY');
    default: return undefined;
  }
};

const getApiEndpoint = (agent: AIAgent): string => {
  switch (agent) {
    case 'chatgpt': return 'https://api.openai.com/v1/chat/completions';
    case 'gemini': return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    case 'deepseek': return 'https://api.deepseek.com/v1/chat/completions';
    case 'claude': return 'https://api.anthropic.com/v1/messages';
    case 'llama': return 'https://openrouter.ai/api/v1/chat/completions';
    default: return '';
  }
};

const formatRequestBody = (agent: AIAgent, prompt: string, systemPrompt: string, maxTokens: number): object => {
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

const getRequestHeaders = (agent: AIAgent, apiKey: string): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

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
      // Gemini uses query param
      break;
  }

  return headers;
};

const extractResponseText = (agent: AIAgent, data: any): string => {
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

const callProvider = async (
  agent: AIAgent, 
  prompt: string, 
  systemPrompt: string, 
  maxTokens: number
): Promise<{ success: boolean; response?: string; error?: string }> => {
  const apiKey = getApiKey(agent);
  
  if (!apiKey) {
    return { success: false, error: `No API key configured for ${agent}` };
  }

  try {
    let endpoint = getApiEndpoint(agent);
    const headers = getRequestHeaders(agent, apiKey);
    const body = formatRequestBody(agent, prompt, systemPrompt, maxTokens);

    // Gemini uses query param for API key
    if (agent === 'gemini') {
      endpoint = `${endpoint}?key=${apiKey}`;
    }

    console.log(`[AI Fallback] Trying ${agent}...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Fallback] ${agent} failed with status ${response.status}: ${errorText}`);
      
      if (response.status === 429) {
        return { success: false, error: `${agent} rate limited` };
      }
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: `${agent} authentication failed` };
      }
      return { success: false, error: `${agent} error: ${response.status}` };
    }

    const data = await response.json();
    const text = extractResponseText(agent, data);

    if (!text) {
      return { success: false, error: `${agent} returned empty response` };
    }

    console.log(`[AI Fallback] ✓ ${agent} succeeded`);
    return { success: true, response: text };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AI Fallback] ${agent} error:`, error);
    return { success: false, error: `${agent} request failed: ${errorMessage}` };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, systemPrompt = 'You are a helpful AI assistant.', maxTokens = 1000, preferredAgent } = await req.json() as AIRequestBody;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build provider order: preferred first, then fallbacks
    const providerOrder: AIAgent[] = preferredAgent 
      ? [preferredAgent, ...FALLBACK_ORDER.filter(a => a !== preferredAgent)]
      : [...FALLBACK_ORDER];

    const errors: string[] = [];
    
    // Try each provider in order
    for (const agent of providerOrder) {
      const result = await callProvider(agent, prompt, systemPrompt, maxTokens);
      
      if (result.success && result.response) {
        return new Response(
          JSON.stringify({ 
            response: result.response,
            provider: agent,
            fallbacksAttempted: errors.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (result.error) {
        errors.push(result.error);
      }
    }

    // All providers failed
    console.error('[AI Fallback] All providers failed:', errors);
    return new Response(
      JSON.stringify({ 
        error: 'All AI providers failed',
        details: errors
      }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI Fallback] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
