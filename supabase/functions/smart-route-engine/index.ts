import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Smart Engine Routing - Like Runway Smart Routing
// Routes scenes to the optimal AI engine based on scene type, user plan, and availability

interface SceneTypeRouting {
  scene_type: string;
  primary_engines: string[];
  secondary_engines: string[];
  requires_avatar: boolean;
  requires_premium: boolean;
}

// Comprehensive routing table based on scene types
const SCENE_ROUTING_TABLE: SceneTypeRouting[] = [
  {
    scene_type: 'talking_head',
    primary_engines: ['HeyGen', 'Synthesia'],
    secondary_engines: ['D-ID', 'Elai.io'],
    requires_avatar: true,
    requires_premium: false
  },
  {
    scene_type: 'avatar',
    primary_engines: ['HeyGen', 'Synthesia'],
    secondary_engines: ['D-ID', 'Opus UGC'],
    requires_avatar: true,
    requires_premium: false
  },
  {
    scene_type: 'testimonial',
    primary_engines: ['HeyGen', 'Opus UGC'],
    secondary_engines: ['Synthesia', 'Arcads'],
    requires_avatar: true,
    requires_premium: false
  },
  {
    scene_type: 'product_closeup',
    primary_engines: ['Veo 3.1', 'Runway Gen-3'],
    secondary_engines: ['Pika 2.1', 'Kling AI'],
    requires_avatar: false,
    requires_premium: true
  },
  {
    scene_type: 'product',
    primary_engines: ['NanoBanana', 'Runway Gen-3'],
    secondary_engines: ['Pika 2.1', 'Luma Dream Machine'],
    requires_avatar: false,
    requires_premium: false
  },
  {
    scene_type: 'gadget_demo',
    primary_engines: ['Pika 2.1', 'Kling AI'],
    secondary_engines: ['Runway Gen-3', 'Luma Dream Machine'],
    requires_avatar: false,
    requires_premium: false
  },
  {
    scene_type: 'unboxing',
    primary_engines: ['Runway Gen-3', 'Luma Dream Machine'],
    secondary_engines: ['Pika 2.1', 'Kling AI'],
    requires_avatar: false,
    requires_premium: true
  },
  {
    scene_type: 'cinematic',
    primary_engines: ['Sora', 'Veo 3.1'],
    secondary_engines: ['Runway Gen-3', 'Kling AI'],
    requires_avatar: false,
    requires_premium: true
  },
  {
    scene_type: 'broll',
    primary_engines: ['Luma Dream Machine', 'NanoBanana'],
    secondary_engines: ['Pika 2.1', 'Hailuo'],
    requires_avatar: false,
    requires_premium: false
  },
  {
    scene_type: 'fast_social',
    primary_engines: ['Pika 2.1', 'Hailuo'],
    secondary_engines: ['NanoBanana', 'Luma Dream Machine'],
    requires_avatar: false,
    requires_premium: false
  },
  {
    scene_type: 'complex_physics',
    primary_engines: ['Kling AI', 'Sora'],
    secondary_engines: ['Runway Gen-3', 'Veo 3.1'],
    requires_avatar: false,
    requires_premium: true
  },
  {
    scene_type: 'hook',
    primary_engines: ['Runway Gen-3', 'Pika 2.1'],
    secondary_engines: ['Sora', 'Kling AI'],
    requires_avatar: false,
    requires_premium: false
  },
  {
    scene_type: 'cta',
    primary_engines: ['NanoBanana', 'Pika 2.1'],
    secondary_engines: ['Luma Dream Machine', 'Hailuo'],
    requires_avatar: false,
    requires_premium: false
  },
  {
    scene_type: 'transition',
    primary_engines: ['NanoBanana', 'Hailuo'],
    secondary_engines: ['Pika 2.1', 'Luma Dream Machine'],
    requires_avatar: false,
    requires_premium: false
  },
  {
    scene_type: 'animation',
    primary_engines: ['Pika 2.1', 'Runway Gen-3'],
    secondary_engines: ['Luma Dream Machine', 'NanoBanana'],
    requires_avatar: false,
    requires_premium: false
  },
  {
    scene_type: 'social_fast',
    primary_engines: ['Pika 2.1', 'Hailuo'],
    secondary_engines: ['NanoBanana', 'Wan Video'],
    requires_avatar: false,
    requires_premium: false
  },
];

// Cost tier mapping
const TIER_ALLOWED_COSTS: Record<string, string[]> = {
  free: ['free'],
  cheap: ['free', 'cheap'],
  normal: ['free', 'cheap', 'normal'],
  expensive: ['free', 'cheap', 'normal', 'expensive'],
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sceneIds, forceEngine, optimizeFor } = await req.json();

    // Get user settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('pricing_tier, preferences, api_keys')
      .eq('user_id', user.id)
      .maybeSingle();

    const pricingTier = userSettings?.pricing_tier || 'normal';
    const allowedCosts = TIER_ALLOWED_COSTS[pricingTier] || TIER_ALLOWED_COSTS.normal;
    const availableApiKeys = userSettings?.api_keys || {};

    console.log(`[smart-route] User: ${user.id}, Tier: ${pricingTier}, Optimizing for: ${optimizeFor || 'balanced'}`);

    // Get all active engines
    const { data: engines } = await supabase
      .from('ai_engines')
      .select('*')
      .eq('status', 'active')
      .in('cost_tier', allowedCosts);

    // Get scenes to route
    const { data: scenes } = await supabase
      .from('scenes')
      .select('*')
      .in('id', sceneIds);

    if (!scenes || scenes.length === 0) {
      return new Response(JSON.stringify({ error: 'No scenes found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const routingResults = [];

    for (const scene of scenes) {
      let selectedEngine = null;
      let routingReason = '';

      // If force engine is specified, use it
      if (forceEngine) {
        selectedEngine = engines?.find((e: any) => e.name === forceEngine);
        routingReason = 'Manual override';
      }

      if (!selectedEngine) {
        // Find routing rule for this scene type
        const routingRule = SCENE_ROUTING_TABLE.find(r => r.scene_type === scene.scene_type) 
          || SCENE_ROUTING_TABLE.find(r => r.scene_type === 'broll'); // Default to broll

        // Check prompt content for smart routing hints
        const promptLower = (scene.visual_prompt || scene.text || '').toLowerCase();
        
        // Avatar detection
        const needsAvatar = routingRule?.requires_avatar || 
          promptLower.includes('person speaking') ||
          promptLower.includes('talking head') ||
          promptLower.includes('avatar') ||
          promptLower.includes('presenter');

        // Cinematic detection
        const isCinematic = promptLower.includes('cinematic') ||
          promptLower.includes('dramatic') ||
          promptLower.includes('luxury') ||
          promptLower.includes('epic');

        // Fast/simple detection
        const isFast = promptLower.includes('simple') ||
          promptLower.includes('quick') ||
          promptLower.includes('basic') ||
          optimizeFor === 'speed';

        // Cost optimization
        const optimizeCost = optimizeFor === 'cost' || pricingTier === 'free';

        // Try primary engines first, then secondary
        const enginePriority = [
          ...(routingRule?.primary_engines || []),
          ...(routingRule?.secondary_engines || [])
        ];

        // Filter engines based on availability and user API keys
        for (const engineName of enginePriority) {
          const engine = engines?.find((e: any) => 
            e.name.toLowerCase().includes(engineName.toLowerCase()) ||
            engineName.toLowerCase().includes(e.name.toLowerCase())
          );

          if (engine) {
            // Check if user has API key for premium engines
            const apiKeyEnv = engine.api_key_env;
            const hasApiKey = !apiKeyEnv || 
              engine.cost_tier === 'free' ||
              availableApiKeys[apiKeyEnv];

            if (hasApiKey) {
              // Check cost tier compatibility
              if (allowedCosts.includes(engine.cost_tier || 'normal')) {
                // Skip expensive engines if optimizing for cost
                if (optimizeCost && engine.cost_tier === 'expensive') {
                  continue;
                }

                selectedEngine = engine;
                routingReason = `Best match for ${scene.scene_type} scene`;
                break;
              }
            }
          }
        }

        // Fallback to any available engine
        if (!selectedEngine && engines && engines.length > 0) {
          // Sort by priority and cost
          const sortedEngines = [...engines].sort((a: any, b: any) => {
            if (optimizeCost) {
              const costOrder = { free: 0, cheap: 1, normal: 2, expensive: 3 };
              return (costOrder[a.cost_tier as keyof typeof costOrder] || 2) - 
                     (costOrder[b.cost_tier as keyof typeof costOrder] || 2);
            }
            return (b.priority_score || 50) - (a.priority_score || 50);
          });

          selectedEngine = sortedEngines[0];
          routingReason = 'Fallback - best available engine';
        }
      }

      // Update scene with selected engine
      if (selectedEngine) {
        await supabase
          .from('scenes')
          .update({
            engine_id: selectedEngine.id,
            engine_name: selectedEngine.name
          })
          .eq('id', scene.id);

        routingResults.push({
          scene_id: scene.id,
          scene_type: scene.scene_type,
          engine_id: selectedEngine.id,
          engine_name: selectedEngine.name,
          cost_tier: selectedEngine.cost_tier,
          reason: routingReason
        });
      } else {
        routingResults.push({
          scene_id: scene.id,
          scene_type: scene.scene_type,
          engine_id: null,
          engine_name: 'No engine available',
          cost_tier: null,
          reason: 'No compatible engine found for user tier'
        });
      }
    }

    // Calculate estimated cost
    const costEstimate = routingResults.reduce((total, result) => {
      const costMap: Record<string, number> = { free: 0, cheap: 0.05, normal: 0.15, expensive: 0.50 };
      return total + (costMap[result.cost_tier as string] || 0.15);
    }, 0);

    return new Response(JSON.stringify({
      success: true,
      pricing_tier: pricingTier,
      routing: routingResults,
      estimated_cost: costEstimate.toFixed(2),
      scenes_routed: routingResults.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in smart-route-engine:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
