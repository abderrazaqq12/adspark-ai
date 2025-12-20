import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIAvailable } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { videoUrl, sceneId } = await req.json();
    if (!videoUrl || !sceneId) throw new Error("videoUrl and sceneId are required");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: scene, error: sceneError } = await supabase.from("scenes").select(`id, visual_prompt, text, script:scripts!inner(id, project:projects!inner(id, user_id))`).eq("id", sceneId).single();
    if (sceneError || !scene) throw new Error("Scene not found");

    const scriptObj = scene.script as unknown as { project: { user_id: string } };
    if (scriptObj?.project?.user_id !== user.id) return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const prompt = scene.visual_prompt || scene.text;
    
    if (isAIAvailable()) {
      try {
        // Use Gemini image generation for thumbnail
        const geminiApiKey = Deno.env.get('Gemini');
        if (geminiApiKey) {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `Generate a video thumbnail image for: ${prompt}. Make it visually striking.` }] }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] }
            })
          });

          if (response.ok) {
            const data = await response.json();
            const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            if (imagePart?.inlineData) {
              const base64Data = imagePart.inlineData.data;
              const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              const fileName = `thumbnails/${sceneId}.png`;
              await supabase.storage.from("videos").upload(fileName, imageBuffer, { contentType: "image/png", upsert: true });
              const { data: { publicUrl } } = supabase.storage.from("videos").getPublicUrl(fileName);
              await supabase.from("scenes").update({ thumbnail_url: publicUrl }).eq("id", sceneId);
              return new Response(JSON.stringify({ success: true, thumbnailUrl: publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
          }
        }
      } catch (e) { console.error("Thumbnail generation error:", e); }
    }

    return new Response(JSON.stringify({ success: true, thumbnailUrl: null, message: "Thumbnail generation requires AI API key" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
