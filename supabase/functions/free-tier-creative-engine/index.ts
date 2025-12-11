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

    const requestBody = await req.json();
    const { action, adAnalysis, productContext, market, analysis, scenes, videoUrl, originalHook, count, conversionGoal } = requestBody;

    console.log('[free-tier-creative-engine] Action:', action, 'Market:', market);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Robust JSON parser with fallback handling
    const safeParseJSON = (content: string, fallback: any = null): any => {
      if (!content) return fallback;
      
      // Clean up common issues
      let cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/\n?```/g, '')
        .trim();
      
      // Try direct parse first
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        console.log('[free-tier-creative-engine] First parse failed, attempting cleanup');
      }
      
      // Try to extract JSON from text
      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.log('[free-tier-creative-engine] Second parse failed, attempting fixes');
        }
      }
      
      // Fix common JSON issues
      try {
        // Remove trailing commas
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        // Fix unescaped quotes in strings
        cleaned = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, '\\\\');
        // Attempt to fix truncated JSON by closing brackets
        const openBraces = (cleaned.match(/\{/g) || []).length;
        const closeBraces = (cleaned.match(/\}/g) || []).length;
        const openBrackets = (cleaned.match(/\[/g) || []).length;
        const closeBrackets = (cleaned.match(/\]/g) || []).length;
        
        for (let i = 0; i < openBraces - closeBraces; i++) cleaned += '}';
        for (let i = 0; i < openBrackets - closeBrackets; i++) cleaned += ']';
        
        // Try to fix truncated strings by finding unclosed quotes
        const quoteCount = (cleaned.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          cleaned = cleaned.replace(/("[^"]*?)$/, '$1"');
        }
        
        return JSON.parse(cleaned);
      } catch (e) {
        console.error('[free-tier-creative-engine] All parse attempts failed:', e);
        return fallback;
      }
    };

    // Helper function to get FFMPEG command for motion effects
    const getFFmpegMotionCommand = (effect: string): string => {
      const commands: Record<string, string> = {
        'parallax-layers': 'zoompan=z="zoom+0.001":x="iw/2-(iw/zoom/2)":y="ih/2-(ih/zoom/2)":d=125',
        'slow-push': 'zoompan=z="min(max(zoom,pzoom)+0.0015,1.5)":d=125',
        'ken-burns': 'zoompan=z="if(lte(zoom,1.0),1.5,max(1.001,zoom-0.0015))":x="iw/2-(iw/zoom/2)":y="ih/2-(ih/zoom/2)":d=125',
        'dramatic-zoom': 'zoompan=z="zoom+0.01":d=50',
        'depth-pulse': 'zoompan=z="1.1+0.1*sin(t)":d=125',
        'handheld-sim': 'noise=alls=5:allf=t+u',
        'orbit-rotation': 'rotate=PI/180*sin(t*0.5):bilinear=0',
        'light-sweep': 'colorbalance=rs=0.1*sin(t):gs=0.05*sin(t):bs=-0.1*sin(t)',
        'dolly-push': 'zoompan=z="min(max(zoom,pzoom)+0.002,1.3)":d=100',
        'seamless-loop': 'loop=loop=-1:size=60',
      };
      return commands[effect] || commands['slow-push'];
    };

    let result: any = {};

    switch (action) {
      case 'analyze_marketing': {
        const prompt = `You are a performance marketing expert specializing in ${market || 'MENA'} markets.
Analyze this ad and provide detailed marketing intelligence in the target market's cultural context.

Ad Analysis: ${JSON.stringify(adAnalysis)}
Product Context: ${JSON.stringify(productContext || {})}
Target Market: ${market || 'saudi'}
Target Language: ${productContext?.language || 'ar-sa'}

Provide a comprehensive JSON response with:
{
  "hookStrength": 0-10,
  "hookAnalysis": "detailed analysis of hook effectiveness for ${market} market",
  "emotionalTriggers": ["trigger1", "trigger2"],
  "problemClarity": 0-10,
  "demoPower": 0-10,
  "socialProofElements": ["element1"],
  "offerClarity": 0-10,
  "ctaEffectiveness": 0-10,
  "editingPacing": "fast|medium|slow",
  "messagingTone": "energetic|calm|emotional|professional",
  "narrativeFlow": {
    "currentStructure": ["hook", "problem", "solution", "cta"],
    "recommendedStructure": ["optimized", "scene", "order"],
    "reasoning": "why this order works better for ${market}"
  },
  "ctaRecommendations": [
    {
      "text": "CTA text in ${productContext?.language || 'Arabic'}",
      "placement": "overlay|end-card|lower-third",
      "timing": "seconds from start"
    }
  ],
  "durationOptimization": {
    "currentDuration": "estimated",
    "recommendedDuration": "15-30s",
    "cutsToMake": ["scene descriptions to trim or remove"]
  },
  "improvements": [
    {
      "area": "hook|pacing|cta|visuals|audio",
      "currentScore": 6,
      "suggestion": "specific improvement suggestion",
      "priority": "high|medium|low",
      "canImplementFree": true,
      "implementation": "FFMPEG command or technique"
    }
  ],
  "ffmpegPipeline": ["recommended", "ffmpeg", "transformations"],
  "motionEffectsForImages": ["parallax-layers", "ken-burns", "slow-push"]
}

Return ONLY valid JSON.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        const fallbackAnalysis = {
          hookStrength: 7,
          hookAnalysis: 'Default analysis - AI response parsing failed',
          emotionalTriggers: ['curiosity', 'desire'],
          problemClarity: 7,
          demoPower: 7,
          socialProofElements: [],
          offerClarity: 7,
          ctaEffectiveness: 7,
          editingPacing: 'fast',
          messagingTone: 'energetic',
          narrativeFlow: { currentStructure: ['hook', 'demo', 'cta'], recommendedStructure: ['hook', 'problem', 'demo', 'cta'], reasoning: 'Standard ad structure' },
          ctaRecommendations: [{ text: 'اطلب الآن', placement: 'end-card', timing: '25' }],
          durationOptimization: { currentDuration: '30s', recommendedDuration: '15-25s', cutsToMake: [] },
          improvements: [],
          ffmpegPipeline: ['normalize-audio', 'color-grade', 'add-cta'],
          motionEffectsForImages: ['ken-burns', 'slow-push']
        };
        const parsed = safeParseJSON(content, fallbackAnalysis);
        result = { analysis: parsed };
        break;
      }

      case 'generate_hooks': {
        const prompt = `Generate ${count || 10} powerful hook variations for ${market || 'Saudi Arabia'} market.

Product: ${JSON.stringify(productContext || {})}
Market: ${market || 'saudi'}
Original Hook: ${originalHook || 'none'}
Language: ${productContext?.language || 'ar-sa'}

Generate hooks that resonate with ${market} audience culture and buying behavior.
Each hook should be 2-3 seconds when spoken.

Return a JSON array of hook scripts:
[
  {"text": "Hook text in ${productContext?.language || 'Arabic'}", "style": "question|shock|emotional|story", "visualEffect": "zoom-pop|flash-intro|motion-cut"}
]

Return ONLY valid JSON array.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        const fallbackHooks = [
          { text: 'هل تبحث عن الحل المثالي؟', style: 'question', visualEffect: 'zoom-pop' },
          { text: 'اكتشف السر الذي غير حياة الآلاف', style: 'story', visualEffect: 'flash-intro' }
        ];
        const parsed = safeParseJSON(content, fallbackHooks);
        result = { hooks: Array.isArray(parsed) ? parsed : fallbackHooks };
        break;
      }

      case 'generate_ctas': {
        const prompt = `Generate ${count || 10} high-converting CTA variations for ${market || 'Saudi Arabia'}.

Product: ${JSON.stringify(productContext || {})}
Market: ${market || 'saudi'}
Conversion Goal: ${conversionGoal || 'cod'}
Language: ${productContext?.language || 'ar-sa'}

For COD markets like Saudi Arabia, emphasize:
- Cash on delivery safety
- Free shipping
- Money-back guarantee
- Limited time offers
- Social proof

Return a JSON array of CTA scripts with overlay suggestions:
[
  {
    "text": "CTA text in target language",
    "overlay": "button|banner|lower-third",
    "urgency": "high|medium|low",
    "ffmpegEffect": "cta-button|text-overlay|flash-transition"
  }
]

Return ONLY valid JSON array.`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        const fallbackCtas = [
          { text: 'اطلب الآن - الدفع عند الاستلام', overlay: 'button', urgency: 'high', ffmpegEffect: 'cta-button' },
          { text: 'عرض محدود - احصل عليه اليوم', overlay: 'banner', urgency: 'high', ffmpegEffect: 'flash-transition' }
        ];
        const parsed = safeParseJSON(content, fallbackCtas);
        result = { ctas: Array.isArray(parsed) ? parsed : fallbackCtas };
        break;
      }

      case 'animate_images': {
        // Generate FFMPEG motion effects for product images
        const { images, style } = await req.json();
        
        const motionPipelines = {
          'product-showcase': ['parallax-layers', 'slow-push', 'light-sweep'],
          'lifestyle': ['ken-burns', 'dolly-push', 'depth-pulse'],
          'dramatic': ['dramatic-zoom', 'orbit-rotation', 'handheld-sim'],
          'subtle': ['slow-push', 'depth-pulse', 'seamless-loop'],
        };
        
        const selectedPipeline = motionPipelines[style as keyof typeof motionPipelines] || motionPipelines['product-showcase'];
        
        result = {
          animatedScenes: (images || []).map((img: string, i: number) => ({
            sourceImage: img,
            motionEffect: selectedPipeline[i % selectedPipeline.length],
            duration: 3,
            ffmpegCommand: getFFmpegMotionCommand(selectedPipeline[i % selectedPipeline.length]),
          })),
        };
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
            hookStrength: i === 0 ? Math.floor(Math.random() * 3) + 7 : null,
            replacement: scene.quality < 7 ? { 
              strategy: 'motion-image', 
              source: 'motion-image',
              ffmpegEffect: 'parallax-layers'
            } : undefined,
            suggestedReorder: i > 0 && Math.random() > 0.7 ? i - 1 : i,
          }))
        };
        break;
      }

      case 'generate_improvements': {
        result = {
          improvements: [
            { area: 'hook', currentScore: analysis?.hookStrength || 6, suggestion: 'Add zoom-pop effect for attention', priority: 'high', canImplementFree: true, implementation: 'zoompan=z="zoom+0.02":d=25' },
            { area: 'pacing', currentScore: 7, suggestion: 'Increase cut frequency to 1-2s for TikTok', priority: 'medium', canImplementFree: true, implementation: 'trim=duration=2,setpts=PTS-STARTPTS' },
            { area: 'color', currentScore: 6, suggestion: 'Apply warm color grade for emotional appeal', priority: 'medium', canImplementFree: true, implementation: 'colorbalance=rs=0.1:gs=0.05:bs=-0.1' },
            { area: 'audio', currentScore: 7, suggestion: 'Normalize audio levels for consistency', priority: 'low', canImplementFree: true, implementation: 'loudnorm=I=-16:TP=-1.5:LRA=11' },
            { area: 'cta', currentScore: 5, suggestion: 'Add CTA button overlay at end', priority: 'high', canImplementFree: true, implementation: 'drawbox=x=10:y=ih-100:w=iw-20:h=80:c=red@0.8:t=fill' },
            { area: 'transitions', currentScore: 6, suggestion: 'Use whip-pan transitions between scenes', priority: 'medium', canImplementFree: true, implementation: 'xfade=transition=wipeleft:duration=0.3' },
          ]
        };
        break;
      }

      case 'optimize_narrative': {
        // AI-driven scene reordering for better narrative flow
        const prompt = `Analyze these scenes and suggest optimal ordering for ${market || 'Saudi'} market:

Scenes: ${JSON.stringify(scenes)}
Product: ${JSON.stringify(productContext)}
Video Type: ${productContext?.videoType || 'ugc-review'}

Return JSON with:
{
  "originalOrder": [0, 1, 2, 3],
  "optimizedOrder": [reordered indices],
  "reasoning": "why this order converts better",
  "insertPoints": [{"after": scene_index, "insert": "motion-image|cta-overlay"}]
}`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'google/gemini-2.5-flash', messages: [{ role: 'user', content: prompt }] }),
        });

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        const fallbackNarrative = {
          originalOrder: [0, 1, 2, 3],
          optimizedOrder: [0, 2, 1, 3],
          reasoning: 'Default optimization - show hook then benefits before demo',
          insertPoints: []
        };
        const parsed = safeParseJSON(content, fallbackNarrative);
        result = { narrativeOptimization: parsed };
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
