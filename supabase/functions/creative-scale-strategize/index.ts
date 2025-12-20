import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI } from "../_shared/ai-gateway.ts";

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

    console.log(`[creative-scale-strategize] Creating blueprint for analysis: ${analysis.id}, goal: ${optimization_goal}`);

    // Summarize segments for prompt
    const segmentsSummary = analysis.segments.map((s: any) => 
      `${s.type}(${s.start_ms}-${s.end_ms}ms, attention:${s.attention_score?.toFixed(2) || 'N/A'}, clarity:${s.clarity_score?.toFixed(2) || 'N/A'})`
    ).join('\n- ');

    const systemPrompt = `You are an elite performance marketing strategist and creative director. Your ONLY job is to analyze video ads and generate INNOVATIVE, ACTIONABLE strategies to improve them.

CRITICAL RULES:
1. ALWAYS generate NEW, CREATIVE strategies - never generic advice
2. Each variation must be UNIQUE and SPECIFIC to the video analyzed
3. Focus on PERFORMANCE IMPROVEMENTS - CTR, retention, conversions
4. Include specific timing recommendations when relevant
5. Output valid JSON ONLY - no markdown, no explanations outside JSON

OPTIMIZATION GOAL: ${optimization_goal.toUpperCase()}
${optimization_goal === 'retention' ? '- Focus on keeping viewers watching longer, reduce drop-off points' : ''}
${optimization_goal === 'ctr' ? '- Focus on driving clicks, strong CTAs, curiosity gaps' : ''}
${optimization_goal === 'cpa' ? '- Focus on qualified leads, clear value props, trust signals' : ''}

RISK TOLERANCE: ${risk_tolerance.toUpperCase()}
${risk_tolerance === 'low' ? '- Safe optimizations, proven patterns' : ''}
${risk_tolerance === 'medium' ? '- Balanced approach, some experimentation' : ''}
${risk_tolerance === 'high' ? '- Bold changes, test disruptive formats' : ''}

PLATFORM: ${platform.toUpperCase()}
FUNNEL STAGE: ${funnel_stage.toUpperCase()}

FRAMEWORKS TO CHOOSE FROM (pick ONE primary):
- AIDA: Attention → Interest → Desire → Action
- PAS: Problem → Agitate → Solution  
- BAB: Before → After → Bridge
- HOOK_BENEFIT_CTA: Direct hook to benefit to action
- 4Ps: Picture → Promise → Prove → Push
- UGC: User-generated content style
- OFFER_STACK: Value stacking approach

ABSTRACT ACTIONS (use exactly):
- replace_segment: Swap content while keeping timing
- remove_segment: Cut entirely
- compress_segment: Shorten without removing
- reorder_segments: Change sequence
- emphasize_segment: Make more prominent
- split_segment: Divide into parts
- merge_segments: Combine adjacent segments
- add_segment: Insert new content

ALWAYS GENERATE ${safeVariationCount} UNIQUE VARIATIONS with different strategies!`;

    const userPrompt = `Analyze this video ad and generate ${safeVariationCount} UNIQUE improvement strategies:

VIDEO ANALYSIS:
- ID: ${analysis.id}
- Duration: ${analysis.metadata?.duration_ms}ms
- Detected Style: ${analysis.detected_style}
- Format: ${analysis.metadata?.format || '9:16'}

SEGMENTS:
- ${segmentsSummary}

CURRENT SCORES:
- Hook Strength: ${(analysis.overall_scores?.hook_strength * 100)?.toFixed(0) || '?'}%
- Message Clarity: ${(analysis.overall_scores?.message_clarity * 100)?.toFixed(0) || '?'}%
- Pacing Consistency: ${(analysis.overall_scores?.pacing_consistency * 100)?.toFixed(0) || '?'}%
- CTA Effectiveness: ${(analysis.overall_scores?.cta_effectiveness * 100)?.toFixed(0) || '?'}%

${target_framework ? `PREFERRED FRAMEWORK: ${target_framework}` : 'Choose the best framework based on analysis.'}

Generate EXACTLY ${safeVariationCount} unique variation strategies. Each must have a DIFFERENT approach!

Return this exact JSON structure:
{
  "id": "blueprint_${crypto.randomUUID()}",
  "source_analysis_id": "${analysis.id}",
  "created_at": "${new Date().toISOString()}",
  "framework": "<AIDA|PAS|BAB|HOOK_BENEFIT_CTA|4Ps|UGC|OFFER_STACK>",
  "framework_rationale": "<2-3 sentences explaining why this framework was chosen based on the specific video content>",
  "detected_problems": [
    {
      "type": "<HOOK_WEAK|MID_PACING_DROP|CTA_WEAK|PROOF_MISSING|BENEFIT_UNCLEAR|DURATION_TOO_LONG|etc>",
      "severity": "<high|medium|low>",
      "segment_affected": "<segment type>",
      "description": "<specific observation>"
    }
  ],
  "objective": {
    "primary_goal": "<specific goal based on ${optimization_goal}>",
    "target_emotion": "<primary emotion to evoke>",
    "key_message": "<core value proposition>"
  },
  "strategic_insights": [
    "<insight 1: specific observation about current strengths>",
    "<insight 2: specific opportunity for improvement>",
    "<insight 3: platform-specific recommendation for ${platform}>"
  ],
  "variation_ideas": [
    {
      "id": "var_0",
      "action": "<action from list>",
      "target_segment_type": "<hook|problem|solution|benefit|proof|cta|filler>",
      "intent": "<specific, creative strategy description>",
      "priority": "<high|medium|low>",
      "reasoning": "<why this will improve ${optimization_goal}>",
      "expected_impact": "<predicted improvement, e.g. '+15% retention'>",
      "risk_level": "<low|medium|high>"
    }
  ],
  "recommended_duration_range": {
    "min_ms": <number>,
    "max_ms": <number>
  },
  "target_formats": ["9:16", "1:1"],
  "brain_v2_decision": {
    "confidence_score": <0.0-1.0>,
    "alternative_frameworks_considered": ["<framework1>", "<framework2>"],
    "optimization_focus": "${optimization_goal}"
  }
}

IMPORTANT: Generate exactly ${safeVariationCount} items in variation_ideas array!`;

    // Call AI Gateway (Gemini primary, OpenAI fallback)
    const aiResponse = await callAI({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8, // Higher temperature for more creative outputs
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
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
