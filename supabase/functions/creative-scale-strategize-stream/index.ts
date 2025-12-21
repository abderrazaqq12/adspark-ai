import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, AIError } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// SSE Helper - sends a progress event
function createSSEMessage(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        controller.enqueue(encoder.encode(createSSEMessage(event, data)));
      };

      try {
        const { analysis, target_framework, variation_count = 3, optimization_goal = 'retention', risk_tolerance = 'medium', platform = 'general', funnel_stage = 'cold' } = await req.json();

        // Clamp variation count to safe limits (1-20)
        const safeVariationCount = Math.max(1, Math.min(20, variation_count));

        // Send initial progress
        sendEvent('progress', { 
          step: 1, 
          totalSteps: 5, 
          message: 'Initializing AI strategy engine...', 
          variationCount: safeVariationCount,
          percentage: 10
        });

        // Get user ID from auth header
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
          sendEvent('error', { message: 'Valid VideoAnalysis with segments is required' });
          controller.close();
          return;
        }

        // Progress: Loading API keys
        sendEvent('progress', { 
          step: 2, 
          totalSteps: 5, 
          message: 'Loading AI provider configuration...', 
          percentage: 20
        });

        // Fetch user-provided API keys
        const apiKeys: Record<string, string> = {};
        if (userId) {
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
            const supabase = createClient(supabaseUrl, supabaseKey);
            const providers = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY'];

            await Promise.all(providers.map(async (provider) => {
              const { data, error } = await supabase.rpc('get_user_api_key', {
                p_user_id: userId,
                p_provider: provider
              });
              if (!error && data) {
                apiKeys[provider] = data;
              }
            }));
          } catch (e) {
            console.warn('[creative-scale-strategize-stream] Failed to fetch user API keys:', e);
          }
        }

        // Progress: Analyzing video
        sendEvent('progress', { 
          step: 3, 
          totalSteps: 5, 
          message: `Analyzing video segments (${analysis.segments.length} detected)...`, 
          percentage: 35
        });

        // Summarize segments
        const segmentsSummary = analysis.segments.map((s: any) =>
          `${s.type}(${s.start_ms}-${s.end_ms}ms, attention:${s.attention_score?.toFixed(2) || 'N/A'})`
        ).join('\n- ');

        const durationMs = analysis.metadata?.duration_ms || 0;
        const isShortVideo = durationMs < 15000;
        const isLongVideo = durationMs > 35000;

        let strategySpecifics = '';
        if (isShortVideo) {
          strategySpecifics = `CRITICAL - SHORT VIDEO (${(durationMs / 1000).toFixed(1)}s): Use 'duplicate_segment' or 'emphasize_segment' to EXTEND to 15+ seconds.`;
        } else if (isLongVideo) {
          strategySpecifics = `CRITICAL - LONG VIDEO (${(durationMs / 1000).toFixed(1)}s): Use 'remove_segment' or 'compress_segment' to REDUCE to under 35 seconds.`;
        }

        // Progress: Generating strategies
        sendEvent('progress', { 
          step: 4, 
          totalSteps: 5, 
          message: `AI generating ${safeVariationCount} unique variations...`, 
          percentage: 50,
          generating: true
        });

        const systemPrompt = `You are an elite performance marketing strategist. Generate EXACTLY ${safeVariationCount} UNIQUE strategies.

MANDATORY DURATION: 15-35 seconds. ${strategySpecifics}
OPTIMIZATION GOAL: ${optimization_goal.toUpperCase()}
RISK TOLERANCE: ${risk_tolerance.toUpperCase()}
PLATFORM: ${platform.toUpperCase()} (Only valid platforms: TikTok, Meta, Snapchat, YouTube)
FUNNEL STAGE: ${funnel_stage.toUpperCase()}

AVAILABLE FRAMEWORKS (13 total):
- AIDA: Attention-Interest-Desire-Action (classic funnel)
- PAS: Problem-Agitate-Solution (pain-driven)
- BAB: Before-After-Bridge (transformation)
- 4Ps: Promise-Picture-Proof-Push (high-ticket)
- HOOK_BENEFIT_CTA: Fast direct flow (short-form)
- ACC: Awareness-Comprehension-Conviction (complex products)
- UGC_NATIVE_STORY: Authentic UGC style (Gen Z, DTC)
- HOOK_BENEFIT_OBJECTION_CTA: Handle objections
- HELP: Help-Educate-Listen-Promote (service-first, trust building)
- QUEST: Qualify-Understand-Educate-Stimulate-Transition (high-ticket sales)
- US_VS_THEM: Disruptor positioning (market challengers)
- PASTOR: Person-Ache-Solution-Transformation-Offer-Response (story-driven)
- THREE_WHYS: Why You? Why This? Why Now? (minimalist, urgent)

ACTIONS: duplicate_segment, reorder_segments, emphasize_segment, split_segment, merge_segments, remove_segment, compress_segment

Output valid JSON ONLY with exactly ${safeVariationCount} variation_ideas.`;

        const userPrompt = `Generate ${safeVariationCount} strategies for video:
- Duration: ${durationMs}ms
- Style: ${analysis.detected_style}
- Segments: ${segmentsSummary}

Return JSON with: id, framework, framework_rationale, detected_problems[], objective, strategic_insights[], variation_ideas[${safeVariationCount}], recommended_duration_range, target_formats[], brain_v2_decision.`;

        // Simulate per-variation progress during AI call
        let progressInterval: number | undefined;
        let currentVariation = 0;
        
        progressInterval = setInterval(() => {
          currentVariation++;
          if (currentVariation <= safeVariationCount) {
            sendEvent('variation_progress', {
              current: currentVariation,
              total: safeVariationCount,
              message: `Creating variation ${currentVariation}/${safeVariationCount}...`,
              percentage: 50 + Math.floor((currentVariation / safeVariationCount) * 40)
            });
          }
        }, 800); // Update every 800ms

        try {
          const aiResponse = await callAI({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.8,
            apiKeys,
          });

          clearInterval(progressInterval);

          const content = aiResponse.content || '';

          // Progress: Parsing response
          sendEvent('progress', { 
            step: 5, 
            totalSteps: 5, 
            message: 'Processing AI response...', 
            percentage: 92
          });

          // Parse JSON from response
          let blueprint;
          let jsonStr = content;
          if (content.includes('```json')) {
            jsonStr = content.split('```json')[1].split('```')[0].trim();
          } else if (content.includes('```')) {
            jsonStr = content.split('```')[1].split('```')[0].trim();
          }
          blueprint = JSON.parse(jsonStr);

          // Guarantee exact variation count
          const generatedCount = blueprint.variation_ideas?.length || 0;
          
          if (generatedCount < safeVariationCount) {
            const variations = blueprint.variation_ideas || [];
            const needed = safeVariationCount - generatedCount;
            
            for (let i = 0; i < needed; i++) {
              let sourceVariation = variations.length > 0 
                ? variations[i % variations.length]
                : {
                    id: `var_fallback_${i}`,
                    action: 'emphasize_segment',
                    target_segment_type: 'hook',
                    intent: 'Increase engagement',
                    priority: 'medium',
                    reasoning: 'Automated variation',
                    expected_impact: 'Moderate improvement',
                    risk_level: 'low'
                  };

              variations.push({
                ...sourceVariation,
                id: `var_${generatedCount + i}`,
                priority: sourceVariation.priority === 'high' ? 'medium' : 'high',
                reasoning: `${sourceVariation.reasoning} (Variation ${generatedCount + i + 1})`
              });
            }
            blueprint.variation_ideas = variations;
          }

          // Send completion with data
          sendEvent('complete', {
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
          });

        } catch (aiError) {
          clearInterval(progressInterval);
          
          if (aiError instanceof AIError) {
            sendEvent('error', {
              message: aiError.message,
              errorType: aiError.type,
              provider: aiError.provider,
              retryAfterSeconds: aiError.retryAfterSeconds
            });
          } else {
            sendEvent('error', {
              message: aiError instanceof Error ? aiError.message : 'AI generation failed'
            });
          }
        }

        controller.close();

      } catch (err) {
        console.error('[creative-scale-strategize-stream] Error:', err);
        controller.enqueue(encoder.encode(createSSEMessage('error', {
          message: err instanceof Error ? err.message : 'Unknown error'
        })));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
});
