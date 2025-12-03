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
}

interface UserSettings {
  use_free_tier_only: boolean;
}

function routeScene(
  scene: Scene,
  engines: Engine[],
  userSettings: UserSettings
): Engine | null {
  const { scene_type, visual_prompt } = scene;
  const lowercasePrompt = visual_prompt?.toLowerCase() || '';

  // Filter active engines
  let availableEngines = engines.filter(e => e.status === 'active');

  // Apply free tier filter if needed
  if (userSettings.use_free_tier_only) {
    availableEngines = availableEngines.filter(e => e.supports_free_tier);
  }

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

  // 3. High complexity / cinematic scenes
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

  // 4. Fast social / simple UGC
  if (scene_type === 'broll' || 
      scene_type === 'transition' ||
      lowercasePrompt.includes('simple') ||
      lowercasePrompt.includes('quick')) {
    const fastEngines = availableEngines.filter(e => 
      e.type === 'text_to_video' && e.supports_free_tier
    );
    if (fastEngines.length > 0) {
      return fastEngines.sort((a, b) => b.priority_score - a.priority_score)[0];
    }
  }

  // 5. Default: best available text_to_video engine
  const textToVideoEngines = availableEngines.filter(e => e.type === 'text_to_video');
  if (textToVideoEngines.length > 0) {
    return textToVideoEngines.sort((a, b) => b.priority_score - a.priority_score)[0];
  }

  // Fallback to any available engine
  return availableEngines.sort((a, b) => b.priority_score - a.priority_score)[0] || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sceneIds, userId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all engines
    const { data: engines } = await supabase
      .from('ai_engines')
      .select('*')
      .eq('status', 'active');

    // Get user settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const settings: UserSettings = {
      use_free_tier_only: userSettings?.use_free_tier_only || false
    };

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
        engine_type: engine?.type || 'text_to_video'
      };
    });

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
