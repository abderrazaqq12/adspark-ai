import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Engine-specific video generation functions
async function generateWithNanoBanana(prompt: string, imageUrl?: string): Promise<{ videoUrl?: string; error?: string }> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
  
  try {
    // Use Gemini's image generation to create animated scene
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { 
            role: 'user', 
            content: imageUrl 
              ? [
                  { type: 'text', text: `Create an animated scene based on this image: ${prompt}` },
                  { type: 'image_url', image_url: { url: imageUrl } }
                ]
              : `Generate a short video scene: ${prompt}`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      return { error: 'NanoBanana generation failed' };
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    return { videoUrl: imageData }; // Returns animated image/GIF
  } catch (error: unknown) {
    console.error('NanoBanana error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function generateWithPika(prompt: string): Promise<{ videoUrl?: string; taskId?: string; error?: string }> {
  const pikaApiKey = Deno.env.get('PIKA_API_KEY');
  
  if (!pikaApiKey) {
    return { error: 'Pika API key not configured' };
  }

  // Pika Labs API integration
  // Note: Actual API implementation depends on Pika's API structure
  return { 
    taskId: `pika_${Date.now()}`,
    error: 'Pika integration pending API access'
  };
}

async function generateWithRunway(prompt: string): Promise<{ videoUrl?: string; taskId?: string; error?: string }> {
  const runwayApiKey = Deno.env.get('RUNWAY_API_KEY');
  
  if (!runwayApiKey) {
    return { error: 'Runway API key not configured' };
  }

  try {
    // Runway Gen-3 API
    const response = await fetch('https://api.runwayml.com/v1/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        duration: 5,
        aspect_ratio: '16:9'
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `Runway error: ${error}` };
    }

    const data = await response.json();
    return { 
      taskId: data.id,
      videoUrl: data.url 
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function generateWithHeyGen(prompt: string, avatarId?: string): Promise<{ videoUrl?: string; taskId?: string; error?: string }> {
  const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
  
  if (!heygenApiKey) {
    return { error: 'HeyGen API key not configured' };
  }

  try {
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: 'avatar',
            avatar_id: avatarId || 'default_avatar',
            avatar_style: 'normal'
          },
          voice: {
            type: 'text',
            input_text: prompt,
            voice_id: 'en-US-JennyNeural'
          }
        }],
        dimension: { width: 1920, height: 1080 }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `HeyGen error: ${error}` };
    }

    const data = await response.json();
    return { 
      taskId: data.data?.video_id,
      videoUrl: data.data?.video_url
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sceneId, engineName, prompt, imageUrl, avatarId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update scene status to generating
    await supabase
      .from('scenes')
      .update({ status: 'generating' })
      .eq('id', sceneId);

    let result: { videoUrl?: string; taskId?: string; error?: string };

    // Route to appropriate engine
    const engineLower = (engineName || '').toLowerCase();
    
    if (engineLower.includes('nanobanana') || engineLower.includes('gemini')) {
      result = await generateWithNanoBanana(prompt, imageUrl);
    } else if (engineLower.includes('pika')) {
      result = await generateWithPika(prompt);
    } else if (engineLower.includes('runway')) {
      result = await generateWithRunway(prompt);
    } else if (engineLower.includes('heygen')) {
      result = await generateWithHeyGen(prompt, avatarId);
    } else {
      // Default to NanoBanana (free)
      result = await generateWithNanoBanana(prompt, imageUrl);
    }

    // Update scene with result
    if (result.videoUrl) {
      await supabase
        .from('scenes')
        .update({ 
          status: 'completed',
          video_url: result.videoUrl,
          metadata: { task_id: result.taskId }
        })
        .eq('id', sceneId);
    } else if (result.taskId) {
      // Async generation - store task ID for webhook
      await supabase
        .from('scenes')
        .update({ 
          status: 'generating',
          metadata: { task_id: result.taskId, engine: engineName }
        })
        .eq('id', sceneId);
    } else {
      await supabase
        .from('scenes')
        .update({ 
          status: 'failed',
          metadata: { error: result.error }
        })
        .eq('id', sceneId);
    }

    return new Response(JSON.stringify({ 
      success: !result.error,
      ...result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-scene-video:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
