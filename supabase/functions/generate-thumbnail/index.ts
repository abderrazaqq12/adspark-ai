import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Create client with user's auth context for verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { videoUrl, sceneId } = await req.json();

    if (!videoUrl || !sceneId) {
      throw new Error("videoUrl and sceneId are required");
    }

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user owns this scene through the script -> project chain
    const { data: scene, error: sceneError } = await supabase
      .from("scenes")
      .select(`
        id,
        visual_prompt,
        text,
        script:scripts!inner(
          id,
          project:projects!inner(
            id,
            user_id
          )
        )
      `)
      .eq("id", sceneId)
      .single();

    if (sceneError || !scene) {
      console.error('Scene lookup error:', sceneError);
      throw new Error("Scene not found");
    }

    // Check ownership - extract user_id from nested structure
    const scriptObj = scene.script as unknown as { project: { user_id: string } };
    const ownerId = scriptObj?.project?.user_id;
    if (ownerId !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied: You do not own this scene' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = scene.visual_prompt || scene.text;
    
    // Generate thumbnail using Lovable AI
    if (lovableApiKey) {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `Generate a video thumbnail image for: ${prompt}. Make it visually striking and representative of a video scene.`
            }
          ],
          modalities: ["image", "text"]
        })
      });

      const aiData = await aiResponse.json();
      const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (generatedImage) {
        // Extract base64 data
        const base64Data = generatedImage.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload to storage
        const fileName = `thumbnails/${sceneId}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("videos")
          .upload(fileName, imageBuffer, {
            contentType: "image/png",
            upsert: true
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("videos")
          .getPublicUrl(fileName);

        // Update scene with thumbnail
        await supabase
          .from("scenes")
          .update({ thumbnail_url: publicUrl })
          .eq("id", sceneId);

        return new Response(
          JSON.stringify({ success: true, thumbnailUrl: publicUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fallback: Use the video URL as is (frontend will capture frame)
    return new Response(
      JSON.stringify({ 
        success: true, 
        thumbnailUrl: null,
        message: "Thumbnail generation requires AI API key or frontend capture"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
