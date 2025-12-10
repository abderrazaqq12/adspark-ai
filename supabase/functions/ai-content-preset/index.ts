import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PresetRequest {
  action: string;
  model: string;
  prompt?: string;
  language?: string;
  targetMarket?: string;
  audience?: {
    age?: string;
    gender?: string;
  };
  productContext?: {
    name?: string;
    description?: string;
  };
  inputData?: {
    imageUrl?: string;
    videoUrl?: string;
    screenRecording?: string;
  };
  presetConfig?: {
    duration?: number;
    sceneTemplate?: string[];
    style?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body: PresetRequest = await req.json();
    console.log("Content Preset request:", body.action, body.model);

    let result: any;

    switch (body.action) {
      case "show-your-app":
        result = await handleShowYourApp(body, supabase);
        break;
      case "unboxing-pov":
        result = await handleUnboxingPOV(body, supabase);
        break;
      default:
        throw new Error(`Unknown preset: ${body.action}`);
    }

    // Log usage
    await supabase.from("cost_transactions").insert({
      user_id: user.id,
      operation_type: "content_preset",
      engine_name: body.model,
      pipeline_stage: "video_generation",
      cost_usd: result.cost || 0.10,
      metadata: {
        preset: body.action,
        language: body.language,
        targetMarket: body.targetMarket,
        duration: body.presetConfig?.duration,
      },
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Content Preset error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Preset execution failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Preset Handlers

async function handleShowYourApp(body: PresetRequest, supabase: any) {
  console.log("Show Your App preset - App demo video");
  
  const sceneTemplate = body.presetConfig?.sceneTemplate || [
    "intro",
    "problem",
    "app-demo",
    "features",
    "cta"
  ];
  
  // Generate scene breakdown for app demo
  const scenes = sceneTemplate.map((scene, index) => ({
    id: `scene-${index}`,
    type: scene,
    duration: 6,
    description: getAppDemoSceneDescription(scene, body.productContext?.name),
    visualPrompt: generateAppDemoPrompt(scene, body.productContext, body.language),
  }));
  
  return {
    success: true,
    presetId: `show-app-${Date.now()}`,
    scenes,
    totalDuration: scenes.reduce((acc, s) => acc + s.duration, 0),
    style: "app-demo",
    cost: 0.12,
    status: "ready",
    message: `App demo preset generated with ${scenes.length} scenes`,
  };
}

async function handleUnboxingPOV(body: PresetRequest, supabase: any) {
  console.log("Unboxing POV preset - First-person unboxing");
  
  const sceneTemplate = body.presetConfig?.sceneTemplate || [
    "package-shot",
    "opening",
    "reveal",
    "features",
    "reaction"
  ];
  
  const scenes = sceneTemplate.map((scene, index) => ({
    id: `scene-${index}`,
    type: scene,
    duration: 8,
    description: getUnboxingSceneDescription(scene, body.productContext?.name),
    visualPrompt: generateUnboxingPrompt(scene, body.productContext, body.language),
    camera: "first-person",
  }));
  
  return {
    success: true,
    presetId: `unboxing-${Date.now()}`,
    scenes,
    totalDuration: scenes.reduce((acc, s) => acc + s.duration, 0),
    style: "unboxing-pov",
    cost: 0.15,
    status: "ready",
    message: `Unboxing POV preset generated with ${scenes.length} scenes`,
  };
}

// Helper functions

function getAppDemoSceneDescription(scene: string, productName?: string): string {
  const descriptions: Record<string, string> = {
    "intro": `Opening shot introducing ${productName || 'the app'}`,
    "problem": "Showing the problem the app solves",
    "app-demo": "Live demo of the app interface and features",
    "features": "Highlighting key features with visual callouts",
    "cta": "Call-to-action with download/signup prompt",
  };
  return descriptions[scene] || scene;
}

function getUnboxingSceneDescription(scene: string, productName?: string): string {
  const descriptions: Record<string, string> = {
    "package-shot": `Beautiful product packaging for ${productName || 'the product'}`,
    "opening": "Hands opening the package with anticipation",
    "reveal": "First look at the product inside",
    "features": "Showing product details and quality",
    "reaction": "Positive reaction and final thoughts",
  };
  return descriptions[scene] || scene;
}

function generateAppDemoPrompt(scene: string, context?: { name?: string; description?: string }, language?: string): string {
  const productName = context?.name || "the app";
  const prompts: Record<string, string> = {
    "intro": `Clean modern smartphone screen showing ${productName} app logo, soft gradient background, professional app intro`,
    "problem": `Split screen showing frustration vs solution, before/after concept, relatable problem scenario`,
    "app-demo": `Hands holding phone, ${productName} interface visible, smooth scrolling, modern UI, finger tapping`,
    "features": `Feature icons floating around phone, highlight effects, modern tech aesthetic, key benefits shown`,
    "cta": `Download button prominent, app store badges, phone with ${productName}, compelling call to action`,
  };
  return prompts[scene] || `${scene} for ${productName}`;
}

function generateUnboxingPrompt(scene: string, context?: { name?: string; description?: string }, language?: string): string {
  const productName = context?.name || "the product";
  const prompts: Record<string, string> = {
    "package-shot": `Premium product box for ${productName}, clean white background, elegant packaging, studio lighting`,
    "opening": `First-person POV hands carefully opening ${productName} box, anticipation, ASMR style`,
    "reveal": `Product reveal moment, ${productName} emerging from box, golden hour lighting, premium feel`,
    "features": `Close-up of ${productName} details, quality materials, hands showcasing features`,
    "reaction": `Excited expression, holding ${productName}, genuine happiness, positive review vibe`,
  };
  return prompts[scene] || `${scene} for ${productName}`;
}
