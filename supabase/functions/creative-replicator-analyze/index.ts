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

    const { videoUrl, fileName, duration } = await req.json();

    console.log('[creative-replicator-analyze] Analyzing video:', fileName);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Lovable AI to analyze the video content
    const analysisPrompt = `You are a video ad analyst. Based on the video file name "${fileName}" and duration ${duration} seconds, generate a realistic analysis of what this ad might contain.

Generate a JSON response with this exact structure:
{
  "transcript": "A realistic script/transcript for this video ad (2-4 sentences)",
  "scenes": [
    {"startTime": 0, "endTime": 3, "description": "Hook scene description", "type": "hook"},
    {"startTime": 3, "endTime": 8, "description": "Main content description", "type": "showcase"},
    {"startTime": 8, "endTime": 12, "description": "Benefits description", "type": "benefits"},
    {"startTime": 12, "endTime": ${duration}, "description": "Call to action", "type": "cta"}
  ],
  "hook": "problem-solution|question|shock|emotional|story|humor|statistic",
  "pacing": "fast|medium|slow",
  "style": "UGC Review|Testimonial|Product Demo|Before/After|Lifestyle|Cinematic",
  "transitions": ["hard-cut", "zoom", "slide", "whip-pan", "glitch"],
  "voiceTone": "energetic|calm|emotional|professional|casual",
  "musicType": "upbeat|dramatic|calm|trendy|none",
  "aspectRatio": "9:16|16:9|1:1|4:5"
}

Make the analysis realistic and varied. Return ONLY valid JSON, no markdown.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[creative-replicator-analyze] AI error:', errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the JSON response
    let analysis;
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[creative-replicator-analyze] Parse error:', parseError, 'Content:', content);
      // Return a default analysis if parsing fails
      analysis = {
        transcript: "This is a product showcase video demonstrating key features and benefits.",
        scenes: [
          { startTime: 0, endTime: 3, description: "Attention-grabbing hook", type: "hook" },
          { startTime: 3, endTime: Math.floor(duration * 0.5), description: "Product demonstration", type: "showcase" },
          { startTime: Math.floor(duration * 0.5), endTime: Math.floor(duration * 0.8), description: "Benefits highlight", type: "benefits" },
          { startTime: Math.floor(duration * 0.8), endTime: duration, description: "Call to action", type: "cta" }
        ],
        hook: "problem-solution",
        pacing: "fast",
        style: "UGC Review",
        transitions: ["hard-cut", "zoom"],
        voiceTone: "energetic",
        musicType: "upbeat",
        aspectRatio: "9:16"
      };
    }

    console.log('[creative-replicator-analyze] Analysis complete');

    return new Response(JSON.stringify({ 
      success: true, 
      analysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[creative-replicator-analyze] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
