import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BatchConfig {
  scriptId: string;
  variationsPerScene: number;
  randomEngines: boolean;
  randomPacing: boolean;
  randomTransitions: boolean;
}

interface QueueItem {
  sceneId: string;
  engineId: string;
  engineName: string;
  variationIndex: number;
  prompt: string;
  costTier: string;
}

interface Engine {
  id: string;
  name: string;
  type: string;
  status: string;
  cost_tier: string;
  supports_free_tier: boolean;
  priority_score: number;
}

// Define which cost tiers are allowed for each pricing tier
const TIER_MAPPINGS: Record<string, string[]> = {
  free: ['free'],
  cheap: ['free', 'cheap'],
  normal: ['free', 'cheap', 'normal'],
  expensive: ['free', 'cheap', 'normal', 'expensive'],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { scriptId, variationsPerScene = 3, randomEngines = true, randomPacing = true } = await req.json() as BatchConfig;

    if (!scriptId) {
      return new Response(
        JSON.stringify({ error: "scriptId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[batch-generate] Starting batch generation for script: ${scriptId}, variations: ${variationsPerScene}`);

    // Fetch user settings to get pricing tier
    const { data: userSettings } = await supabase
      .from("user_settings")
      .select("pricing_tier")
      .eq("user_id", user.id)
      .maybeSingle();

    const pricingTier = userSettings?.pricing_tier || 'normal';
    const allowedTiers = TIER_MAPPINGS[pricingTier] || TIER_MAPPINGS.normal;

    console.log(`[batch-generate] User pricing tier: ${pricingTier}, allowed tiers: ${allowedTiers.join(', ')}`);

    // Fetch scenes for the script
    const { data: scenes, error: scenesError } = await supabase
      .from("scenes")
      .select("*")
      .eq("script_id", scriptId)
      .order("index", { ascending: true });

    if (scenesError) {
      console.error("Error fetching scenes:", scenesError);
      throw new Error("Failed to fetch scenes");
    }

    if (!scenes || scenes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No scenes found for this script" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active engines and filter by pricing tier
    const { data: allEngines, error: enginesError } = await supabase
      .from("ai_engines")
      .select("*")
      .eq("status", "active");

    if (enginesError || !allEngines || allEngines.length === 0) {
      console.error("Error fetching engines:", enginesError);
      throw new Error("No active engines available");
    }

    // Filter engines by user's pricing tier
    const engines = (allEngines as Engine[]).filter(e => 
      allowedTiers.includes(e.cost_tier || 'normal')
    );

    if (engines.length === 0) {
      return new Response(
        JSON.stringify({ error: `No engines available for ${pricingTier} tier` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[batch-generate] ${engines.length} engines available after tier filter: ${engines.map(e => e.name).join(', ')}`);

    // Group engines by type for smart selection
    const enginesByType: Record<string, Engine[]> = {
      avatar: engines.filter(e => e.type === "avatar"),
      text_to_video: engines.filter(e => e.type === "text_to_video"),
      image_to_video: engines.filter(e => e.type === "image_to_video"),
    };

    // Generate queue items for all variations
    const queueItems: QueueItem[] = [];
    const pacingOptions = [0.8, 1.0, 1.2, 1.5]; // Speed multipliers
    const transitionOptions = ["cut", "fade", "dissolve", "wipe"];

    for (const scene of scenes) {
      for (let v = 0; v < variationsPerScene; v++) {
        // Select engine based on scene type or random if enabled
        let selectedEngine: Engine;
        
        if (randomEngines) {
          // Smart random: pick from appropriate type based on scene
          const sceneType = scene.scene_type || "broll";
          let eligibleEngines = engines;
          
          if (sceneType === "avatar" || sceneType === "testimonial") {
            eligibleEngines = enginesByType.avatar.length > 0 ? enginesByType.avatar : engines;
          } else if (scene.visual_prompt?.toLowerCase().includes("photo") || 
                     scene.visual_prompt?.toLowerCase().includes("image")) {
            eligibleEngines = enginesByType.image_to_video.length > 0 ? enginesByType.image_to_video : engines;
          } else {
            eligibleEngines = enginesByType.text_to_video.length > 0 ? enginesByType.text_to_video : engines;
          }
          
          selectedEngine = eligibleEngines[Math.floor(Math.random() * eligibleEngines.length)];
        } else {
          // Use pre-assigned engine or first available
          selectedEngine = engines.find(e => e.id === scene.engine_id) || engines[0];
        }

        // Generate variation-specific prompt
        let variationPrompt = scene.visual_prompt || scene.text;
        
        // Add pacing variation
        if (randomPacing) {
          const pacing = pacingOptions[Math.floor(Math.random() * pacingOptions.length)];
          variationPrompt += ` [pacing: ${pacing}x]`;
        }

        // Add transition suggestion
        const transition = transitionOptions[Math.floor(Math.random() * transitionOptions.length)];

        queueItems.push({
          sceneId: scene.id,
          engineId: selectedEngine.id,
          engineName: selectedEngine.name,
          variationIndex: v + 1,
          prompt: variationPrompt,
          costTier: selectedEngine.cost_tier || 'normal',
        });
      }
    }

    console.log(`[batch-generate] Generated ${queueItems.length} queue items for ${scenes.length} scenes`);

    // Insert into generation_queue
    const queueInserts = queueItems.map((item, index) => ({
      user_id: user.id,
      scene_id: item.sceneId,
      engine_id: item.engineId,
      status: "queued",
      priority: 50 - index, // Earlier items have higher priority
      attempts: 0,
      max_attempts: 3,
    }));

    const { data: queueData, error: queueError } = await supabase
      .from("generation_queue")
      .insert(queueInserts)
      .select();

    if (queueError) {
      console.error("Error inserting queue items:", queueError);
      throw new Error("Failed to create generation queue");
    }

    // Update script status
    await supabase
      .from("scripts")
      .update({ status: "processing" })
      .eq("id", scriptId);

    // Return batch info
    const batchSummary = {
      scriptId,
      pricingTier,
      totalScenes: scenes.length,
      variationsPerScene,
      totalVariations: queueItems.length,
      queuedItems: queueData?.length || 0,
      engines: [...new Set(queueItems.map(q => q.engineName))],
      costTiers: [...new Set(queueItems.map(q => q.costTier))],
      estimatedTime: `${Math.ceil(queueItems.length * 30 / 60)} minutes`,
    };

    console.log("[batch-generate] Batch generation queued successfully:", batchSummary);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Batch generation queued successfully",
        batch: batchSummary 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Batch generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Batch generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
