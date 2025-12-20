import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIAvailable } from "../_shared/ai-gateway.ts";

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[breakdown-scenes] Authenticated user: ${user.id}`);

    const { scriptId, scripts } = await req.json();

    if (!scripts || !Array.isArray(scripts) || scripts.length === 0) {
      return new Response(JSON.stringify({ error: 'Scripts array is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!isAIAvailable()) {
      return new Response(JSON.stringify({ error: 'No AI provider configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: engines } = await supabase.from('ai_engines').select('*').eq('status', 'active');
    const engineList = engines?.map(e => `${e.name} (${e.type}): ${e.description}`).join('\n') || '';

    const allScenesByScript: any[] = [];
    let globalSceneIndex = 0;

    for (let scriptIndex = 0; scriptIndex < scripts.length; scriptIndex++) {
      const script = scripts[scriptIndex];
      const scriptText = script.text;
      if (!scriptText?.trim()) continue;

      console.log(`[breakdown-scenes] Processing script ${scriptIndex + 1}/${scripts.length}`);

      const systemPrompt = `Professional video ad producer. Break down voice-over scripts into scenes.\n\nAvailable engines:\n${engineList}\n\nOutput JSON: { "scenes": [{ "index": 1, "text": "exact voice-over text", "scene_type": "hook|problem|solution|cta|broll", "duration_sec": 5, "notes": "" }] }`;

      const aiResponse = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Break down this script into 3-6 scenes:\n\n"${scriptText}"` }
        ],
      });

      let parsedScenes: any[] = [];
      try {
        const jsonMatch = aiResponse.content.match(/\{[\s\S]*"scenes"[\s\S]*\}/);
        if (jsonMatch) {
          parsedScenes = JSON.parse(jsonMatch[0]).scenes || [];
        }
      } catch {
        const sentences = scriptText.split(/[.!?]+/).filter((s: string) => s.trim());
        parsedScenes = sentences.slice(0, 6).map((text: string, i: number) => ({
          index: i + 1, text: text.trim(), scene_type: i === 0 ? 'hook' : i === sentences.length - 1 ? 'cta' : 'solution',
          duration_sec: Math.max(3, Math.round(text.split(/\s+/).length / 2.5)), notes: ''
        }));
      }

      parsedScenes.forEach((scene, idx) => {
        allScenesByScript.push({ ...scene, script_index: scriptIndex, script_id: script.id || scriptIndex, global_index: globalSceneIndex + idx });
      });
      globalSceneIndex += parsedScenes.length;
    }

    if (scriptId && allScenesByScript.length > 0) {
      await supabase.from('scenes').delete().eq('script_id', scriptId);
      const scenesToInsert = allScenesByScript.map((scene, idx) => ({
        script_id: scriptId, index: idx, text: scene.text, scene_type: scene.scene_type || 'broll',
        duration_sec: scene.duration_sec || 5, status: 'pending', metadata: { notes: scene.notes, script_index: scene.script_index }
      }));
      await supabase.from('scenes').insert(scenesToInsert);
      await supabase.from('scripts').update({ status: 'scenes_ready' }).eq('id', scriptId);
    }

    return new Response(JSON.stringify({ success: true, scenes: allScenesByScript, count: allScenesByScript.length, scripts_processed: scripts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in breakdown-scenes:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
