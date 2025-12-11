import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, adAnalysis, productContext, market, analysis, scenes, videoUrl, originalHook, count, conversionGoal } = await req.json();

    console.log('[free-tier-creative-engine] Action:', action);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let result: any = {};

    switch (action) {
      case 'analyze_marketing': {
        const prompt = `You are a performance marketing expert. Analyze this ad and provide detailed marketing intelligence.

Ad Analysis: ${JSON.stringify(adAnalysis)}
Product Context: ${JSON.stringify(productContext || {})}
Target Market: ${market || 'global'}

Provide a JSON response with:
{
  "hookStrength": 0-10,
  "emotionalTriggers": ["trigger1", "trigger2"],
  "problemClarity": 0-10,
  "demoPower": 0-10,
  "socialProofElements": ["element1"],
  "offerClarity": 0-10,
  "ctaEffectiveness": 0-10,
  "editingPacing": "fast|medium|slow",
  "messagingTone": "energetic|calm|emotional|professional",
  "improvements": [
    {
      "area": "hook",
      "currentScore": 6,
      "suggestion": "Add a question hook to increase curiosity",
      "priority": "high",
      "canImplementFree": true,
      "implementation": "Use zoom-pop effect with text overlay"
    }
  ]
}

Return ONLY valid JSON.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        result = { analysis: JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()) };
        break;
      }

      case 'generate_hooks': {
        const prompt = `Generate ${count || 10} powerful hook variations for this product.

Product: ${JSON.stringify(productContext || {})}
Market: ${market || 'global'}
Original Hook: ${originalHook || 'none'}

Return a JSON array of hook scripts (2-3 seconds each), optimized for ${market} market:
["Hook 1 text...", "Hook 2 text...", ...]

Return ONLY valid JSON array.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        result = { hooks: JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()) };
        break;
      }

      case 'generate_ctas': {
        const prompt = `Generate ${count || 10} high-converting CTA variations.

Product: ${JSON.stringify(productContext || {})}
Market: ${market || 'global'}
Conversion Goal: ${conversionGoal || 'cod'}

Return a JSON array of CTA scripts optimized for ${conversionGoal} conversions in ${market}:
["CTA 1...", "CTA 2...", ...]

Return ONLY valid JSON array.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        result = { ctas: JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim()) };
        break;
      }

      case 'analyze_scenes': {
        result = {
          sceneAnalysis: (scenes || []).map((scene: any, i: number) => ({
            sceneId: `scene-${i}`,
            startTime: scene.startTime || i * 3,
            endTime: scene.endTime || (i + 1) * 3,
            type: scene.type || 'showcase',
            quality: Math.floor(Math.random() * 4) + 6,
            replacement: scene.quality < 7 ? { strategy: 'motion-image', source: 'motion-image' } : undefined
          }))
        };
        break;
      }

      case 'generate_improvements': {
        result = {
          improvements: [
            { area: 'hook', currentScore: analysis?.hookStrength || 6, suggestion: 'Add zoom-pop effect', priority: 'high', canImplementFree: true, implementation: 'FFMPEG zoom filter' },
            { area: 'pacing', currentScore: 7, suggestion: 'Increase cut frequency to 1-2s', priority: 'medium', canImplementFree: true, implementation: 'Dynamic pacing transform' },
            { area: 'color', currentScore: 6, suggestion: 'Apply warm color grade', priority: 'low', canImplementFree: true, implementation: 'Color balance filter' },
          ]
        };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log('[free-tier-creative-engine] Completed:', action);

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[free-tier-creative-engine] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
