import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[process-queue] Authenticated user: ${user.id}`);

    const { limit = 5 } = await req.json().catch(() => ({}));

    console.log(`Processing queue, limit: ${limit}`);

    // Fetch queued items for the authenticated user with highest priority
    const { data: queueItems, error: fetchError } = await supabase
      .from("generation_queue")
      .select(`
        *,
        scenes (
          id,
          text,
          visual_prompt,
          scene_type,
          script_id
        ),
        ai_engines (
          id,
          name,
          type,
          api_base_url,
          api_key_env
        )
      `)
      .eq("status", "queued")
      .eq("user_id", user.id)
      .lt("attempts", 3)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError) {
      console.error("Error fetching queue:", fetchError);
      throw new Error("Failed to fetch queue items");
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No items in queue", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${queueItems.length} items to process`);

    const results: any[] = [];

    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabase
          .from("generation_queue")
          .update({ 
            status: "processing", 
            started_at: new Date().toISOString(),
            attempts: (item.attempts || 0) + 1
          })
          .eq("id", item.id);

        const scene = item.scenes;
        const engine = item.ai_engines;

        if (!scene || !engine) {
          throw new Error("Missing scene or engine data");
        }

        console.log(`Processing scene ${scene.id} with engine ${engine.name}`);

        // Call the generate-scene-video function with auth token
        const { data: genData, error: genError } = await supabase.functions.invoke(
          "generate-scene-video",
          {
            body: {
              sceneId: scene.id,
              engineName: engine.name,
              prompt: scene.visual_prompt || scene.text,
            },
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (genError) {
          throw new Error(genError.message || "Generation failed");
        }

        // Update queue item as completed
        await supabase
          .from("generation_queue")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          queueId: item.id,
          sceneId: scene.id,
          status: "completed",
          videoUrl: genData?.videoUrl,
        });

      } catch (error: any) {
        console.error(`Error processing queue item ${item.id}:`, error);

        // Update as failed if max attempts reached
        const newAttempts = (item.attempts || 0) + 1;
        const newStatus = newAttempts >= (item.max_attempts || 3) ? "failed" : "queued";

        await supabase
          .from("generation_queue")
          .update({
            status: newStatus,
            error_message: error.message,
          })
          .eq("id", item.id);

        results.push({
          queueId: item.id,
          sceneId: item.scene_id,
          status: newStatus,
          error: error.message,
        });
      }
    }

    // Check remaining queue items for this user
    const { count } = await supabase
      .from("generation_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "queued")
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
        remainingInQueue: count || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Queue processing error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Queue processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
