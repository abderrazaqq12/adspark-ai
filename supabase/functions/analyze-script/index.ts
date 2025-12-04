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
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { script } = await req.json();
    console.log('Analyzing script:', script.substring(0, 100) + '...');

    if (!script || typeof script !== 'string') {
      throw new Error('Script is required and must be a string');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Call Lovable AI to analyze the script and generate scenes
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert video production AI assistant. Analyze video ad scripts and break them down into detailed scenes for video generation.

For each scene, provide:
- A clear title (2-5 words)
- Description of what happens
- Duration in seconds (typically 3-5 seconds per scene)
- A detailed visual prompt optimized for AI video generation (include shot type, setting, mood, actions)

Format your response as a JSON array of scenes. Each scene must have: title, description, duration, visualPrompt

Example output:
{
  "scenes": [
    {
      "title": "Product Introduction",
      "description": "Opening shot establishing the product",
      "duration": 4,
      "visualPrompt": "Close-up cinematic shot of a modern smartphone on a minimalist desk, soft natural lighting from window, professional product photography style, shallow depth of field"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Analyze this video ad script and break it down into 3-7 scenes optimized for AI video generation:\n\n${script}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    const content = aiData.choices[0].message.content;
    
    // Extract JSON from the response (handle markdown code blocks)
    let scenes;
    try {
      // Try to find JSON in code blocks first
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch) {
        scenes = JSON.parse(jsonMatch[1]);
      } else {
        // Try to parse the entire content as JSON
        scenes = JSON.parse(content);
      }

      // Ensure we have the scenes array
      if (!scenes.scenes) {
        scenes = { scenes: scenes };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse scene data from AI response');
    }

    console.log('Successfully parsed scenes:', scenes.scenes.length);

    return new Response(
      JSON.stringify(scenes),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in analyze-script function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});
