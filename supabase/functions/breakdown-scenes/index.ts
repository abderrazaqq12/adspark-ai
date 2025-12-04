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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
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

    console.log(`[breakdown-scenes] Authenticated user: ${user.id}`);

    const { scriptId, scripts } = await req.json();

    // scripts is an array of { id, text, audioUrl } - one per voice-over script
    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      return new Response(JSON.stringify({ error: 'Scripts array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get engines for routing recommendations
    const { data: engines } = await supabase
      .from('ai_engines')
      .select('*')
      .eq('status', 'active');

    const engineList = engines?.map(e => `${e.name} (${e.type}): ${e.description}`).join('\n') || '';

    // Process each script and generate scenes that match the voice-over
    const allScenesByScript: any[] = [];
    let globalSceneIndex = 0;

    for (let scriptIndex = 0; scriptIndex < scripts.length; scriptIndex++) {
      const script = scripts[scriptIndex];
      const scriptText = script.text;

      if (!scriptText || !scriptText.trim()) {
        continue;
      }

      console.log(`[breakdown-scenes] Processing script ${scriptIndex + 1}/${scripts.length}`);

      const systemPrompt = `You are a professional video ad producer. Break down voice-over scripts into scenes that will sync with the audio.

IMPORTANT: Each scene must match a segment of the voice-over. Do NOT generate visual content or AI-generated imagery descriptions - those will be added in the video generation step.

Available AI engines for later video generation:
${engineList}

Output JSON array with this structure:
{
  "scenes": [
    {
      "index": 1,
      "text": "The exact voice-over text for this scene segment",
      "scene_type": "hook|problem|solution|social_proof|cta|broll|avatar|product|testimonial|transition",
      "duration_sec": 5,
      "notes": "Brief production notes about this scene"
    }
  ]
}

Rules:
- Break the script into 3-6 logical segments
- Each scene's text must be the EXACT voice-over text for that segment
- Duration should match typical speaking pace (~2.5 words per second)
- Do NOT include visual prompts - those come later
- Focus on scene type and pacing only`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Break down this voice-over script into scenes:\n\n"${scriptText}"\n\nCreate scenes that match the natural flow of the narration.` }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        throw new Error('Failed to break down scenes');
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || '{}';
      
      // Parse scenes from AI response
      let parsedScenes: any[] = [];
      try {
        const jsonMatch = content.match(/\{[\s\S]*"scenes"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedScenes = parsed.scenes || [];
        }
      } catch (e) {
        console.error('Error parsing scenes:', e);
        // Create basic scene breakdown as fallback
        const sentences = scriptText.split(/[.!?]+/).filter((s: string) => s.trim());
        parsedScenes = sentences.slice(0, 6).map((text: string, i: number) => ({
          index: i + 1,
          text: text.trim(),
          scene_type: i === 0 ? 'hook' : i === sentences.length - 1 ? 'cta' : 'solution',
          duration_sec: Math.max(3, Math.round(text.split(/\s+/).length / 2.5)),
          notes: ''
        }));
      }

      // Add script index and global scene index
      parsedScenes.forEach((scene, idx) => {
        allScenesByScript.push({
          ...scene,
          script_index: scriptIndex,
          script_id: script.id || scriptIndex,
          global_index: globalSceneIndex + idx,
        });
      });

      globalSceneIndex += parsedScenes.length;
    }

    // Save scenes to database if scriptId provided
    if (scriptId && allScenesByScript.length > 0) {
      // Delete existing scenes
      await supabase.from('scenes').delete().eq('script_id', scriptId);

      const scenesToInsert = allScenesByScript.map((scene, idx) => ({
        script_id: scriptId,
        index: idx,
        text: scene.text,
        scene_type: scene.scene_type || 'broll',
        duration_sec: scene.duration_sec || 5,
        status: 'pending',
        metadata: { 
          notes: scene.notes,
          script_index: scene.script_index,
        }
      }));

      const { error: insertError } = await supabase
        .from('scenes')
        .insert(scenesToInsert);

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      // Update script status
      await supabase
        .from('scripts')
        .update({ status: 'scenes_ready' })
        .eq('id', scriptId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      scenes: allScenesByScript,
      count: allScenesByScript.length,
      scripts_processed: scripts.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in breakdown-scenes:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
