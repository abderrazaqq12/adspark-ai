import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cost estimates per operation (in USD)
const COST_ESTIMATES: Record<string, number> = {
  // Text generation
  'google/gemini-2.5-flash': 0.001,
  'google/gemini-2.5-flash-lite': 0.0005,
  'google/gemini-2.5-pro': 0.005,
  'openai/gpt-5': 0.01,
  'openai/gpt-5-mini': 0.002,
  'openai/gpt-5-nano': 0.0008,
  'lovable-ai': 0.001,
  
  // Audio
  'elevenlabs': 0.05,
  'openai-tts': 0.03,
  
  // Image
  'nano-banana': 0.02,
  'flux': 0.05,
  'leonardo': 0.04,
  
  // Video
  'runway': 0.50,
  'sora': 0.75,
  'veo': 0.40,
  'pika': 0.25,
  'heygen': 0.60,
  'hailuo': 0.15,
  'luma': 0.30,
  'kling': 0.35,
  
  'default': 0.01,
};

function getEstimatedCost(engine: string): number {
  const normalized = engine.toLowerCase().replace(/[\s_]+/g, '-');
  
  for (const [key, cost] of Object.entries(COST_ESTIMATES)) {
    if (normalized.includes(key.replace(/\//g, '-')) || key.includes(normalized)) {
      return cost;
    }
  }
  
  return COST_ESTIMATES.default;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    const {
      pipeline_stage,
      engine_name,
      operation_type,
      cost_usd,
      project_id,
      tokens_used,
      duration_sec,
      metadata,
      user_id: providedUserId, // Allow passing user_id for server-to-server calls
    } = body;

    const finalUserId = userId || providedUserId;
    
    if (!finalUserId) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pipeline_stage || !engine_name || !operation_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: pipeline_stage, engine_name, operation_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finalCost = cost_usd ?? getEstimatedCost(engine_name);

    const { data, error } = await supabase
      .from('cost_transactions')
      .insert({
        user_id: finalUserId,
        project_id: project_id || null,
        pipeline_stage,
        engine_name,
        operation_type,
        cost_usd: finalCost,
        tokens_used: tokens_used || null,
        duration_sec: duration_sec || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting cost transaction:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cost tracked: $${finalCost.toFixed(4)} for ${operation_type} via ${engine_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        cost: finalCost,
        transaction_id: data.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Track cost error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
