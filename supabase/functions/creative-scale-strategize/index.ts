import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, AIError } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cost tracking helper
async function trackCost(userId: string, pipelineStage: string, engineName: string, operationType: string, costUsd: number) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('cost_transactions').insert({
      user_id: userId,
      pipeline_stage: pipelineStage,
      engine_name: engineName,
      operation_type: operationType,
      cost_usd: costUsd,
      metadata: { source: 'creative-scale' }
    });
  } catch (e) {
    console.warn('[cost-tracking] Failed to track cost:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysis, target_framework, variation_count = 3, optimization_goal = 'retention', risk_tolerance = 'medium', platform = 'general', funnel_stage = 'cold' } = await req.json();

    // Clamp variation count to safe limits (1-20)
    const safeVariationCount = Math.max(1, Math.min(20, variation_count));

    // Get user ID from auth header for cost tracking
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.warn('[auth] Failed to get user:', e);
      }
    }

    if (!analysis || !analysis.segments) {
      return new Response(
        JSON.stringify({ error: 'Valid VideoAnalysis with segments is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Fetch user-provided API keys from database
    const apiKeys: Record<string, string> = {};
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Define keys to fetch
        const providers = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY'];

        await Promise.all(providers.map(async (provider) => {
          const { data, error } = await supabase.rpc('get_user_api_key', {
            p_user_id: userId,
            p_provider: provider
          });

          if (!error && data) {
            apiKeys[provider] = data;
            console.log(`[creative-scale-strategize] Loaded user key for ${provider}`);
          }
        }));
      } catch (e) {
        console.warn('[creative-scale-strategize] Failed to fetch user API keys:', e);
      }
    }

    console.log(`[creative-scale-strategize] Creating blueprint for analysis: ${analysis.id}, goal: ${optimization_goal}`);

    // Summarize segments for prompt
    const segmentsSummary = analysis.segments.map((s: any) =>
      `${s.type}(${s.start_ms}-${s.end_ms}ms, attention:${s.attention_score?.toFixed(2) || 'N/A'}, clarity:${s.clarity_score?.toFixed(2) || 'N/A'})`
    ).join('\n- ');

    const durationMs = analysis.metadata?.duration_ms || 0;
    const isShortVideo = durationMs < 15000;
    const isLongVideo = durationMs > 35000;

    let strategySpecifics = '';
    if (isShortVideo) {
      strategySpecifics = `
CRITICAL - SHORT VIDEO DETECTED (${(durationMs / 1000).toFixed(1)}s):
- The video is TOO SHORT (under 15s).
- DO NOT use 'remove_segment' or 'compress_segment' - it will be too short!
- YOU MUST use 'duplicate_segment' to loop key moments or 'emphasize_segment' to slow down.
- Your goal is to EXTEND the duration to at least 15 seconds.`;
    } else if (isLongVideo) {
      strategySpecifics = `
CRITICAL - LONG VIDEO DETECTED (${(durationMs / 1000).toFixed(1)}s):
- The video is TOO LONG (over 35s).
- Favor 'remove_segment' (cut boring parts) and 'compress_segment' (speed up).
- Your goal is to REDUCE duration to under 35 seconds.`;
    }

    const systemPrompt = `You are an elite performance marketing strategist and creative director. Your ONLY job is to analyze video ads and generate INNOVATIVE, ACTIONABLE strategies to improve them.

CRITICAL RULES:
1. ALWAYS generate EXACTLY ${safeVariationCount} UNIQUE strategies.
2. Each variation must be UNIQUE and SPECIFIC to the video analyzed.
3. Focus on PERFORMANCE - CTR, retention, conversions.
4. Output valid JSON ONLY.

OPTIMIZATION GOAL: ${optimization_goal.toUpperCase()}
RISK TOLERANCE: ${risk_tolerance.toUpperCase()}
PLATFORM: ${platform.toUpperCase()}
FUNNEL STAGE: ${funnel_stage.toUpperCase()}

FRAMEWORKS (pick ONE primary):
- AIDA, PAS, BAB, HOOK_BENEFIT_CTA, 4Ps, UGC, OFFER_STACK

ABSTRACT ACTIONS (select carefully):
- duplicate_segment: Repeat a high-performing segment (good for short videos/looping)
- reorder_segments: Change sequence
- emphasize_segment: Make more prominent (effectively slows it down)
- split_segment: Divide into parts
- merge_segments: Combine adjacent segments
- remove_segment: Cut entirely (ONLY for long videos)
- compress_segment: Shorten (ONLY for long videos)
${strategySpecifics}

TARGET DURATION: 15 to 35 SECONDS (Strictly enforce this range!)
`;

    const userPrompt = `Analyze this video ad and generate ${safeVariationCount} UNIQUE improvement strategies:

VIDEO ANALYSIS:
- ID: ${analysis.id}
- Duration: ${durationMs}ms
- Detected Style: ${analysis.detected_style}
- Format: ${analysis.metadata?.format || '9:16'}

SEGMENTS:
- ${segmentsSummary}

${target_framework ? `PREFERRED FRAMEWORK: ${target_framework}` : 'Choose the best framework based on analysis.'}

Generate EXACTLY ${safeVariationCount} unique variation strategies.

Return this exact JSON structure:
{
  "id": "blueprint_${crypto.randomUUID()}",
  "source_analysis_id": "${analysis.id}",
  "created_at": "${new Date().toISOString()}",
  "framework": "<AIDA|PAS|BAB|HOOK_BENEFIT_CTA|4Ps|UGC|OFFER_STACK>",
  "framework_rationale": "<reasoning>",
  "detected_problems": [
    { "type": "<problem_type>", "severity": "<high|medium|low>", "segment_affected": "<type>", "description": "<desc>" }
  ],
  "objective": { "primary_goal": "${optimization_goal}", "target_emotion": "<emotion>", "key_message": "<message>" },
  "strategic_insights": ["<insight1>", "<insight2>"],
  "variation_ideas": [
    {
      "id": "var_0",
      "action": "<action from list>",
      "target_segment_type": "<target>",
      "intent": "<intent>",
      "priority": "<high|medium|low>",
      "reasoning": "<reasoning>",
      "expected_impact": "<impact>",
      "risk_level": "<risk>"
    }
    // ... exactly ${safeVariationCount} items
  ],
  "recommended_duration_range": { "min_ms": 15000, "max_ms": 35000 },
  "target_formats": ["9:16", "1:1"],
  "brain_v2_decision": {
    "confidence_score": 0.95,
    "alternative_frameworks_considered": [],
    "optimization_focus": "${optimization_goal}"
  }
}

IMPORTANT: You MUST generate exactly ${safeVariationCount} items in the 'variation_ideas' array. Do not fail this constraint.

    // Call AI Gateway (Gemini primary, OpenAI fallback)
    const aiResponse = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8, // Higher temperature for more creative outputs
      apiKeys,
    });

    const content = aiResponse.content || '';

    // Parse JSON from response
    let blueprint;
    try {
      let jsonStr = content;
      if (content.includes('```json')) {
    jsonStr = content.split('```json')[1].split('```')[0].trim();
  } else if (content.includes('```')) {
    jsonStr = content.split('```')[1].split('```')[0].trim();
  }
  blueprint = JSON.parse(jsonStr);

  // ==========================================
  // GUARANTEE EXACT VARIATION COUNT
  // ==========================================
  // If AI generated fewer than requested, pad with variations
  const generatedCount = blueprint.variation_ideas?.length || 0;

  if (generatedCount < safeVariationCount) {
    console.log(`[creative-scale-strategize] AI generated ${generatedCount}/${safeVariationCount} variations. Padding...`);

    const variations = blueprint.variation_ideas || [];
    const needed = safeVariationCount - generatedCount;

    // Duplicate existing variations with slight modifications to ensure uniqueness
    for (let i = 0; i < needed; i++) {
      const sourceIdx = i % Math.max(1, variations.length);
      const sourceVariation = variations[sourceIdx] || {
        id: `var_fallback_${i}`,
        action: 'emphasize_segment',
        target_segment_type: 'hook',
        intent: 'Increase engagement',
        priority: 'medium',
        reasoning: 'Automated variation to meet count requirement',
        expected_impact: 'Moderate improvement',
        risk_level: 'low'
      };

      // Create a modified copy
      const newVariation = {
        ...sourceVariation,
        id: `var_${generatedCount + i}`,
        priority: sourceVariation.priority === 'high' ? 'medium' : 'high', // Flip priority for distinction
        reasoning: `${sourceVariation.reasoning} (Variation ${generatedCount + i + 1})`
      };

      variations.push(newVariation);
    }

    blueprint.variation_ideas = variations;
    console.log(`[creative-scale-strategize] Padded to ${blueprint.variation_ideas.length} variations`);
  }

} catch (parseErr) {
  console.error('[creative-scale-strategize] JSON parse error:', parseErr);
  console.error('[creative-scale-strategize] Raw content:', content.substring(0, 500));
  return new Response(
    JSON.stringify({ error: 'Failed to parse AI response as JSON', raw: content.substring(0, 500) }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log(`[creative-scale-strategize] Success: ${blueprint.variation_ideas?.length || 0} variations generated via ${aiResponse.provider}`);

// Track cost for successful strategy generation
if (userId) {
  await trackCost(userId, 'creative_scale_strategy', aiResponse.provider, 'strategy_generation', 0.002);
}

return new Response(
  JSON.stringify({
    success: true,
    blueprint,
    meta: {
      source_analysis_id: analysis.id,
      framework: blueprint.framework,
      variations_count: blueprint.variation_ideas?.length || 0,
      provider: aiResponse.provider,
      optimization_goal,
      risk_tolerance,
      platform,
      funnel_stage,
      processed_at: new Date().toISOString()
    }
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

  } catch (err) {
  console.error('[creative-scale-strategize] Error:', err);

  // Handle AIError with specific status codes and user-friendly messages
  if (err instanceof AIError) {
    const statusCode = err.type === 'QUOTA_EXCEEDED' || err.type === 'RATE_LIMIT' ? 429 :
      err.type === 'AUTH_ERROR' ? 401 : 500;

    return new Response(
      JSON.stringify({
        error: err.message,
        errorType: err.type,
        provider: err.provider,
        retryAfterSeconds: err.retryAfterSeconds,
        userMessage: getUserFriendlyMessage(err)
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
});

// Helper to generate user-friendly error messages
function getUserFriendlyMessage(err: AIError): string {
  switch (err.type) {
    case 'QUOTA_EXCEEDED':
      return 'AI service quota exceeded. Your daily/monthly limit has been reached. Please try again later or upgrade your plan.';
    case 'RATE_LIMIT':
      return `Too many requests. Please wait ${err.retryAfterSeconds || 'a few'} seconds and try again.`;
    case 'AUTH_ERROR':
      return 'AI service authentication failed. Please check your API key configuration in Settings.';
    default:
      return 'AI service temporarily unavailable. Please try again in a moment.';
  }
}
