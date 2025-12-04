import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Scene {
  id: string;
  scene_type: string;
  visual_prompt: string;
  metadata?: any;
}

interface Engine {
  id: string;
  name: string;
  type: string;
  supports_free_tier: boolean;
  priority_score: number;
  status: string;
  cost_tier: string; // free, cheap, normal, expensive
}

interface UserSettings {
  pricing_tier: string; // free, cheap, normal, expensive
}

// Define which cost tiers are allowed for each pricing tier
const TIER_MAPPINGS: Record<string, string[]> = {
  free: ['free'],
  cheap: ['free', 'cheap'],
  normal: ['free', 'cheap', 'normal'],
  expensive: ['free', 'cheap', 'normal', 'expensive'],
};

function routeScene(
  scene: Scene,
  engines: Engine[],
  userSettings: UserSettings
): Engine | null {
  const { scene_type, visual_prompt } = scene;
  const lowercasePrompt = visual_prompt?.toLowerCase() || '';
  const pricingTier = userSettings.pricing_tier || 'normal';

  // Get allowed cost tiers based on user's pricing tier
  const allowedTiers = TIER_MAPPINGS[pricingTier] || TIER_MAPPINGS.normal;

  // Filter active engines and apply pricing tier filter
  let availableEngines = engines.filter(e => 
    e.status === 'active' && allowedTiers.includes(e.cost_tier || 'normal')
  );

  console.log(`[route-engine] User pricing tier: ${pricingTier}, allowed tiers: ${allowedTiers.join(', ')}`);
  console.log(`[route-engine] Available engines after tier filter: ${availableEngines.map(e => e.name).join(', ')}`);

  // 1. Avatar/Talking Head scenes
  if (scene_type === 'avatar' || scene_type === 'testimonial' || 
      lowercasePrompt.includes('person speaking') || 
      lowercasePrompt.includes('talking head') ||
      lowercasePrompt.includes('avatar')) {
    const avatarEngines = availableEngines.filter(e => e.type === 'avatar');
    if (avatarEngines.length > 0) {
      return avatarEngines.sort((a, b) => b.priority_score - a.priority_score)[0];
    }
  }

  // 2. Photo-based scenes (product close-ups, etc.)
  if (lowercasePrompt.includes('photo') || 
      lowercasePrompt.includes('product shot') ||
      lowercasePrompt.includes('image') ||
      scene_type === 'product') {
    const imageEngines = availableEngines.filter(e => e.type === 'image_to_video');
    if (imageEngines.length > 0) {
      return imageEngines.sort((a, b) => b.priority_score - a.priority_score)[0];
    }
  }

  // 3. High complexity / cinematic scenes - prioritize premium if available in tier
  if (scene_type === 'hook' || 
      lowercasePrompt.includes('cinematic') ||
      lowercasePrompt.includes('dramatic') ||
      lowercasePrompt.includes('luxury')) {
    const premiumEngines = availableEngines.filter(e => 
      e.type === 'text_to_video' && e.priority_score >= 85
    );
    if (premiumEngines.length > 0) {
      return premiumEngines.sort((a, b) => b.priority_score - a.priority_score)[0];
    }
  }

  // 4. Fast social / simple UGC - prefer cheaper options
  if (scene_type === 'broll' || 
      scene_type === 'transition' ||
      lowercasePrompt.includes('simple') ||
      lowercasePrompt.includes('quick')) {
    const fastEngines = availableEngines.filter(e => 
      e.type === 'text_to_video' && (e.cost_tier === 'free' || e.cost_tier === 'cheap')
    );
    if (fastEngines.length > 0) {
      return fastEngines.sort((a, b) => b.priority_score - a.priority_score)[0];
    }
  }

  // 5. Default: best available text_to_video engine within tier
  const textToVideoEngines = availableEngines.filter(e => e.type === 'text_to_video');
  if (textToVideoEngines.length > 0) {
    return textToVideoEngines.sort((a, b) => b.priority_score - a.priority_score)[0];
  }

  // Fallback to any available engine within tier
  return availableEngines.sort((a, b) => b.priority_score - a.priority_score)[0] || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate the request
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

    console.log(`[route-engine] Authenticated user: ${user.id}`);

    const { sceneIds } = await req.json();

    // Get all active engines
    const { data: engines } = await supabase
      .from('ai_engines')
      .select('*')
      .eq('status', 'active');

    // Get user settings using authenticated user's ID
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const settings: UserSettings = {
      pricing_tier: userSettings?.pricing_tier || 'normal'
    };

    console.log(`[route-engine] User settings - pricing_tier: ${settings.pricing_tier}`);

    // Get scenes
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

    // Route each scene
    const routingResults = scenes.map(scene => {
      const engine = routeScene(scene, engines || [], settings);
      return {
        scene_id: scene.id,
        engine_id: engine?.id || null,
        engine_name: engine?.name || 'Unknown',
        engine_type: engine?.type || 'text_to_video',
        cost_tier: engine?.cost_tier || 'normal'
      };
    });

    console.log(`[route-engine] Routing results:`, routingResults);

    // Update scenes with routed engines
    for (const result of routingResults) {
      await supabase
        .from('scenes')
        .update({ 
          engine_id: result.engine_id,
          engine_name: result.engine_name 
        })
        .eq('id', result.scene_id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      pricing_tier: settings.pricing_tier,
      routing: routingResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in route-engine:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
