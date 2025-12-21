import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProviderTestResult {
  provider: string;
  configured: boolean;
  success: boolean;
  message: string;
  latency?: number;
}

async function testGemini(): Promise<ProviderTestResult> {
  const apiKey = Deno.env.get('Gemini');
  if (!apiKey) {
    return { provider: 'gemini', configured: false, success: false, message: 'Not configured' };
  }

  const start = Date.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    );
    const latency = Date.now() - start;

    if (response.ok) {
      return { provider: 'gemini', configured: true, success: true, message: 'Connected successfully', latency };
    }
    
    if (response.status === 429) {
      return { provider: 'gemini', configured: true, success: false, message: 'Quota exceeded - rate limited', latency };
    }
    
    const error = await response.json();
    return { provider: 'gemini', configured: true, success: false, message: error.error?.message || 'Invalid API key', latency };
  } catch (e) {
    return { provider: 'gemini', configured: true, success: false, message: `Connection failed: ${(e as Error).message}` };
  }
}

async function testOpenAI(): Promise<ProviderTestResult> {
  const apiKey = Deno.env.get('OpenAI');
  if (!apiKey) {
    return { provider: 'openai', configured: false, success: false, message: 'Not configured' };
  }

  const start = Date.now();
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;

    if (response.ok) {
      return { provider: 'openai', configured: true, success: true, message: 'Connected successfully', latency };
    }
    
    if (response.status === 429) {
      return { provider: 'openai', configured: true, success: false, message: 'Rate limited', latency };
    }
    
    const error = await response.json();
    return { provider: 'openai', configured: true, success: false, message: error.error?.message || 'Invalid API key', latency };
  } catch (e) {
    return { provider: 'openai', configured: true, success: false, message: `Connection failed: ${(e as Error).message}` };
  }
}

async function testOpenRouter(): Promise<ProviderTestResult> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) {
    return { provider: 'openrouter', configured: false, success: false, message: 'Not configured' };
  }

  const start = Date.now();
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const latency = Date.now() - start;

    if (response.ok) {
      return { provider: 'openrouter', configured: true, success: true, message: 'Connected successfully', latency };
    }
    
    if (response.status === 429) {
      return { provider: 'openrouter', configured: true, success: false, message: 'Rate limited', latency };
    }
    
    const error = await response.json();
    return { provider: 'openrouter', configured: true, success: false, message: error.error?.message || 'Invalid API key', latency };
  } catch (e) {
    return { provider: 'openrouter', configured: true, success: false, message: `Connection failed: ${(e as Error).message}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[test-ai-providers] Testing AI providers for user ${user.id}`);

    // Test all providers in parallel
    const [geminiResult, openaiResult, openrouterResult] = await Promise.all([
      testGemini(),
      testOpenAI(),
      testOpenRouter(),
    ]);

    const results = [geminiResult, openaiResult, openrouterResult];
    
    // Calculate summary
    const configured = results.filter(r => r.configured).length;
    const working = results.filter(r => r.success).length;
    
    console.log(`[test-ai-providers] Results: ${working}/${configured} providers working`);

    return new Response(JSON.stringify({
      success: true,
      results,
      summary: {
        configured,
        working,
        fallbackAvailable: working >= 2,
        primaryProvider: results.find(r => r.success)?.provider || null,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const error = e as Error;
    console.error('[test-ai-providers] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
