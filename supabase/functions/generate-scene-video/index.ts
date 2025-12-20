import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Engine-specific video generation functions using Gemini
async function generateWithGemini(prompt: string, imageUrl?: string): Promise<{ videoUrl?: string; error?: string }> {
  const geminiApiKey = Deno.env.get('Gemini');
  if (!geminiApiKey) return { error: 'Gemini API key not configured' };
  
  try {
    const contents: any[] = [{ role: 'user', parts: [] }];
    
    if (imageUrl) {
      contents[0].parts.push({ text: `Create an animated scene based on this image: ${prompt}` });
      // For image input, we'd need to fetch and convert to base64, simplified here
    } else {
      contents[0].parts.push({ text: `Generate a short video scene: ${prompt}` });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
      }),
    });

    if (!response.ok) return { error: 'Gemini generation failed' };

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (imagePart?.inlineData) {
      return { videoUrl: `data:image/png;base64,${imagePart.inlineData.data}` };
    }
    return { error: 'No image generated' };
  } catch (error) {
    console.error('Gemini error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function generateWithRunway(prompt: string): Promise<{ videoUrl?: string; taskId?: string; error?: string }> {
  const runwayApiKey = Deno.env.get('Runway');
  if (!runwayApiKey) return { error: 'Runway API key not configured' };

  try {
    const response = await fetch('https://api.runwayml.com/v1/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${runwayApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, duration: 5, aspect_ratio: '16:9' }),
    });
    if (!response.ok) return { error: `Runway error: ${response.status}` };
    const data = await response.json();
    return { taskId: data.id, videoUrl: data.url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function generateWithHeyGen(prompt: string, avatarId?: string): Promise<{ videoUrl?: string; taskId?: string; error?: string }> {
  const heygenApiKey = Deno.env.get('heygen_api');
  if (!heygenApiKey) return { error: 'HeyGen API key not configured' };

  try {
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: { 'X-Api-Key': heygenApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_inputs: [{ character: { type: 'avatar', avatar_id: avatarId || 'default_avatar' }, voice: { type: 'text', input_text: prompt, voice_id: 'en-US-JennyNeural' } }],
        dimension: { width: 1920, height: 1080 }
      }),
    });
    if (!response.ok) return { error: `HeyGen error: ${response.status}` };
    const data = await response.json();
    return { taskId: data.data?.video_id, videoUrl: data.data?.video_url };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { sceneId, engineName, prompt, imageUrl, avatarId } = await req.json();

    await supabase.from('scenes').update({ status: 'generating' }).eq('id', sceneId);

    let result: { videoUrl?: string; taskId?: string; error?: string };
    const engineLower = (engineName || '').toLowerCase();
    
    if (engineLower.includes('runway')) {
      result = await generateWithRunway(prompt);
    } else if (engineLower.includes('heygen')) {
      result = await generateWithHeyGen(prompt, avatarId);
    } else {
      // Default to Gemini
      result = await generateWithGemini(prompt, imageUrl);
    }

    if (result.videoUrl) {
      await supabase.from('scenes').update({ status: 'completed', video_url: result.videoUrl, metadata: { task_id: result.taskId } }).eq('id', sceneId);
    } else if (result.taskId) {
      await supabase.from('scenes').update({ status: 'generating', metadata: { task_id: result.taskId, engine: engineName } }).eq('id', sceneId);
    } else {
      await supabase.from('scenes').update({ status: 'failed', metadata: { error: result.error } }).eq('id', sceneId);
    }

    return new Response(JSON.stringify({ success: !result.error, ...result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-scene-video:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
