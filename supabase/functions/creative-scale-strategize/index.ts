import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIAvailable } from "../_shared/ai-gateway.ts";

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
    const { analysis, target_framework, variation_count = 3 } = await req.json();
    
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

    if (!isAIAvailable()) {
      return new Response(
        JSON.stringify({ error: 'No AI provider configured. Please add Gemini or OpenAI API key.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[creative-scale-strategize] Creating blueprint for analysis: ${analysis.id}`);

    // Summarize segments for prompt
    const segmentsSummary = analysis.segments.map((s: any) => 
      `${s.type}(${s.start_ms}-${s.end_ms}ms, attention:${s.attention_score})`
    ).join(', ');

    const systemPrompt = `You are a marketing strategist. Your ONLY job is to create strategic blueprints based on video analysis.

OUTPUT RULES:
- Return ONLY valid JSON matching the schema exactly
- NO timestamps, NO milliseconds in variation ideas
- NO engine assumptions, NO technical specifications
- ONLY high-level marketing intent and abstract actions
- Every variation idea must be actionable but abstract

FRAMEWORKS (choose most appropriate):
- AIDA: Attention → Interest → Desire → Action
- PAS: Problem → Agitate → Solution
- BAB: Before → After → Bridge
- FAB: Features → Advantages → Benefits
- UGC: Authentic user-generated style
- OFFER_STACK: Value stacking approach

ABSTRACT ACTIONS (use these exactly):
- replace_segment: Swap content while keeping timing
- remove_segment: Cut entirely
- compress_segment: Shorten without removing
- reorder_segments: Change sequence
- emphasize_segment: Make more prominent
- split_segment: Divide into parts
- merge_segments: Combine adjacent segments`;

    const userPrompt = `Create a CreativeBlueprint based on this VideoAnalysis:

Analysis ID: ${analysis.id}
Segments: ${segmentsSummary}
Overall Scores:
- Hook Strength: ${analysis.overall_scores?.hook_strength || 'unknown'}
- Message Clarity: ${analysis.overall_scores?.message_clarity || 'unknown'}
- Pacing Consistency: ${analysis.overall_scores?.pacing_consistency || 'unknown'}
- CTA Effectiveness: ${analysis.overall_scores?.cta_effectiveness || 'unknown'}

Detected Style: ${analysis.detected_style}
Duration: ${analysis.metadata?.duration_ms}ms
${target_framework ? `Preferred Framework: ${target_framework}` : 'Choose the best framework based on the content.'}

Generate exactly ${safeVariationCount} variation ideas (must be between 1-20).

Return this exact JSON structure:
{
  "id": "blueprint_${crypto.randomUUID()}",
  "source_analysis_id": "${analysis.id}",
  "created_at": "${new Date().toISOString()}",
  "framework": "<AIDA|PAS|BAB|FAB|ACCA|QUEST|STAR|UGC|OFFER_STACK>",
  "framework_rationale": "<why this framework fits the analyzed content>",
  "objective": {
    "primary_goal": "<e.g. increase click-through, boost engagement>",
    "target_emotion": "<e.g. urgency, curiosity, trust, excitement>",
    "key_message": "<core message to convey>"
  },
  "strategic_insights": [
    "<insight about current strengths>",
    "<insight about improvement opportunities>"
  ],
  "variation_ideas": [
    {
      "id": "var_0",
      "action": "<replace_segment|remove_segment|compress_segment|reorder_segments|emphasize_segment|split_segment|merge_segments>",
      "target_segment_type": "<hook|problem|solution|benefit|proof|cta|filler>",
      "intent": "<human-readable intent, e.g. 'strengthen opening hook with more urgency'>",
      "priority": "<high|medium|low>",
      "reasoning": "<why this variation would improve performance>"
    }
  ],
  "recommended_duration_range": {
    "min_ms": <minimum recommended duration>,
    "max_ms": <maximum recommended duration>
  },
  "target_formats": ["9:16", "1:1"]
}

Return ONLY the JSON, no markdown, no explanation.`;

    const aiResponse = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
    });

    const content = aiResponse.content;

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
    } catch (parseErr) {
      console.error('[creative-scale-strategize] JSON parse error:', parseErr);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response as JSON', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[creative-scale-strategize] Success: ${blueprint.variation_ideas?.length || 0} variations generated (provider: ${aiResponse.provider})`);

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
          processed_at: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[creative-scale-strategize] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
