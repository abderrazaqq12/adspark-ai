import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  videoUrl: string;
  fileName: string;
  duration: number;
  market?: string;
  language?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase (for future DB storage if needed)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { fileName, duration, market = "Saudi Arabia", language = "Arabic" }: AnalysisRequest = await req.json();

    console.log(`[AI-Brain] Analyzing ${fileName} (${duration}s) for ${market}/${language}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // 1. AI BRAIN: PLANNER ONLY
    // We strictly separate planning from execution.
    // This prompt generates a Scene Plan JSON.
    const analysisPrompt = `
      You are a Senior Video Ad Strategist. 
      Analyze the video context based on filename "${fileName}" (Duration: ${duration}s).
      Target Market: ${market}
      Language: ${language}

      OBJECTIVE:
      Break this video down into a high-converting Direct Response structure.
      You must identify where to cut the video to create a perfect ad flow.

      REQUIRED JSON STRUCTURE (Return ONLY this JSON):
      {
        "scenes": [
          { "type": "hook", "start": 0, "end": 3, "style": "fast", "description": "Visual hook to stop scroll" },
          { "type": "problem", "start": 3, "end": 7, "description": "Agitate the user pain point" },
          { "type": "solution", "start": 7, "end": 12, "description": "Introduce product as solution" },
          { "type": "benefits", "start": 12, "end": 18, "description": "Key features and social proof" },
          { "type": "cta", "start": 18, "end": ${duration}, "description": "Strong call to action" }
        ],
        "variants": 5,
        "market": "${market}",
        "language": "${language}",
        "hook": "shock", // Main hook angle
        "pacing": "fast", // fast, medium, slow
        "style": "UGC", // UGC, Cinematic, etc.
        "transcript": "Brief summary of the ad content",
        "strategy": {
          "pacing": "fast",
          "tone": "energetic",
          "hook_angle": "shock"
        }
      }

      RULES:
      1. 'scenes' must cover the entire duration if possible, or key parts.
      2. 'start' and 'end' are in seconds.
      3. Ensure 'end' > 'start'.
      4. Do not exceed ${duration} seconds.
      5. Adjust scene lengths based on the requested 'fast' or 'medium' pacing associated with the market.
      6. Return ONLY valid JSON. No markdown.
    `;

    // Using the configured AI Gateway (Generic OpenAI/Gemini interface)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Fast, efficient model for analysis
        messages: [
          { role: 'system', content: "You are a JSON-only API. You must output minified JSON with no markdown formatting." },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.2, // Low temperature for deterministic output
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI-Brain] Provider error:', errorText);
      throw new Error(`AI Provider failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI Brain');
    }

    // Robust JSON Parsing
    let analysis;
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('[AI-Brain] JSON Parse Error:', parseError);
      console.log('Raw content:', content);

      // Fallback Plan for robustness
      analysis = {
        scenes: [
          { type: "hook", start: 0, end: 3, style: "fast", description: "Hook" },
          { type: "body", start: 3, end: duration - 3, description: "Main Content" },
          { type: "cta", start: duration - 3, end: duration, description: "Call to Action" }
        ],
        market,
        language,
        fallback: true
      };
    }

    console.log('[AI-Brain] Plan generated successfully');

    return new Response(JSON.stringify({
      success: true,
      analysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[AI-Brain] Critical Error:', error);
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
