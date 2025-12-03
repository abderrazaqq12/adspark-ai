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
    const { scriptId, scriptText } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get engines for routing recommendations
    const { data: engines } = await supabase
      .from('ai_engines')
      .select('*')
      .eq('status', 'active');

    const engineList = engines?.map(e => `${e.name} (${e.type}): ${e.description}`).join('\n') || '';

    const systemPrompt = `You are a professional video ad producer. Break down scripts into scenes for AI video generation. Each scene should be 3-8 seconds.

Available AI engines:
${engineList}

Output JSON array with this structure:
{
  "scenes": [
    {
      "index": 1,
      "text": "Scene dialogue/narration text",
      "scene_type": "hook|problem|solution|social_proof|cta|broll|avatar|product|testimonial|transition",
      "visual_prompt": "Detailed visual description for AI video generation",
      "duration_sec": 5,
      "recommended_engine": "Engine name from list",
      "engine_reason": "Why this engine is best"
    }
  ]
}`;

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
          { role: 'user', content: `Break down this script into 4-8 video scenes:\n\n"${scriptText}"\n\nFor each scene:\n1. Extract the relevant text/narration\n2. Determine scene type\n3. Write a detailed visual prompt\n4. Estimate duration\n5. Recommend the best AI engine` }
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
        visual_prompt: `Scene ${i + 1}: ${text.trim().substring(0, 100)}`,
        duration_sec: 5,
        recommended_engine: 'Pika Labs'
      }));
    }

    // Map engine names to IDs
    const engineMap = new Map(engines?.map(e => [e.name.toLowerCase(), e]) || []);

    // Save scenes to database
    const scenesToInsert = parsedScenes.map((scene: any, idx: number) => {
      const engineName = scene.recommended_engine || 'Pika Labs';
      const engine = Array.from(engineMap.values()).find(e => 
        e.name.toLowerCase().includes(engineName.toLowerCase()) ||
        engineName.toLowerCase().includes(e.name.toLowerCase())
      );
      
      return {
        script_id: scriptId,
        index: scene.index || idx + 1,
        text: scene.text,
        scene_type: scene.scene_type || 'broll',
        visual_prompt: scene.visual_prompt,
        duration_sec: scene.duration_sec || 5,
        engine_id: engine?.id || null,
        engine_name: engine?.name || engineName,
        status: 'pending',
        metadata: { engine_reason: scene.engine_reason }
      };
    });

    const { data: insertedScenes, error: insertError } = await supabase
      .from('scenes')
      .insert(scenesToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    // Update script status
    await supabase
      .from('scripts')
      .update({ status: 'scenes_ready' })
      .eq('id', scriptId);

    return new Response(JSON.stringify({ 
      success: true, 
      scenes: insertedScenes,
      count: insertedScenes?.length || 0
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
