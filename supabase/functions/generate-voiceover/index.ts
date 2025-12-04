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
    const elevenLabsKey = Deno.env.get('ElevenLabs');
    
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

    console.log(`[generate-voiceover] Authenticated user: ${user.id}`);

    if (!elevenLabsKey) {
      return new Response(JSON.stringify({ 
        error: 'ElevenLabs API key not configured',
        message: 'Please add ELEVENLABS_API_KEY to your secrets'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, text, language = 'en', voiceId, model = 'eleven_multilingual_v2', scriptId } = await req.json();

    // Handle fetching user's voices
    if (action === 'get_voices') {
      console.log('[generate-voiceover] Fetching user voices from ElevenLabs');
      
      const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': elevenLabsKey,
        },
      });

      if (!voicesResponse.ok) {
        const errorText = await voicesResponse.text();
        console.error('ElevenLabs voices API error:', errorText);
        throw new Error('Failed to fetch voices');
      }

      const voicesData = await voicesResponse.json();
      
      // Separate library voices from user's cloned voices
      const libraryVoices = voicesData.voices?.filter((v: any) => v.category === 'premade') || [];
      const myVoices = voicesData.voices?.filter((v: any) => v.category !== 'premade') || [];

      return new Response(JSON.stringify({ 
        success: true, 
        library_voices: libraryVoices.map((v: any) => ({
          id: v.voice_id,
          name: v.name,
          category: v.category,
          labels: v.labels,
          preview_url: v.preview_url,
        })),
        my_voices: myVoices.map((v: any) => ({
          id: v.voice_id,
          name: v.name,
          category: v.category,
          labels: v.labels,
          preview_url: v.preview_url,
        })),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default voice map based on language
    const defaultVoiceMap: Record<string, string> = {
      'en': 'EXAVITQu4vr4xnSDxMaL', // Sarah
      'ar': 'pFZP5JQG7iQjIQuC4Bku', // Lily
      'es': 'FGY2WhTYpPnrIDTdsKH5', // Laura
      'fr': 'XB0fDUnXU5powFXDhCwa', // Charlotte
    };

    const selectedVoice = voiceId || defaultVoiceMap[language] || defaultVoiceMap['en'];

    // Supported models
    const supportedModels = [
      'eleven_multilingual_v2',
      'eleven_turbo_v2_5',
      'eleven_turbo_v2',
      'eleven_monolingual_v1',
      'eleven_multilingual_v1',
      'eleven_flash_v2_5', // v3 Flash
      'eleven_flash_v2', // v3 Flash legacy
    ];

    const modelToUse = supportedModels.includes(model) ? model : 'eleven_multilingual_v2';

    console.log(`[generate-voiceover] Generating with voice: ${selectedVoice}, model: ${modelToUse}, language: ${language}`);

    // Generate voice using ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': elevenLabsKey,
      },
      body: JSON.stringify({
        text,
        model_id: modelToUse,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error('Failed to generate voiceover');
    }

    // Get audio as buffer
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    // Upload to storage
    const fileName = `voiceovers/${scriptId || crypto.randomUUID()}_${Date.now()}.mp3`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      // Return base64 if storage fails
      return new Response(JSON.stringify({ 
        success: true, 
        audio_base64: audioBase64,
        format: 'mp3'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: publicUrl } = supabase.storage
      .from('audio')
      .getPublicUrl(fileName);

    // Update script with voiceover URL if scriptId provided
    if (scriptId) {
      await supabase
        .from('scripts')
        .update({ 
          metadata: { voiceover_url: publicUrl.publicUrl }
        })
        .eq('id', scriptId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      audio_url: publicUrl.publicUrl,
      file_name: fileName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-voiceover:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
