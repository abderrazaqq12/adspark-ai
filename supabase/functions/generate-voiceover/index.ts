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
    const { text, language = 'en', voiceId, scriptId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!elevenLabsKey) {
      return new Response(JSON.stringify({ 
        error: 'ElevenLabs API key not configured',
        message: 'Please add ELEVENLABS_API_KEY to your secrets'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map language to voice
    const voiceMap: Record<string, string> = {
      'en': voiceId || 'EXAVITQu4vr4xnSDxMaL', // Sarah
      'ar': voiceId || 'pFZP5JQG7iQjIQuC4Bku', // Lily (works for Arabic)
      'es': voiceId || 'FGY2WhTYpPnrIDTdsKH5', // Laura
      'fr': voiceId || 'XB0fDUnXU5powFXDhCwa', // Charlotte
    };

    const selectedVoice = voiceMap[language] || voiceMap['en'];

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
        model_id: 'eleven_multilingual_v2',
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
