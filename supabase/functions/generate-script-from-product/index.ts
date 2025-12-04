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

    console.log(`[generate-script-from-product] Authenticated user: ${user.id}`);

    const { productName, productDescription, productImageUrl, productLink, language = 'en', tone = 'engaging' } = await req.json();

    if (!productName) {
      return new Response(JSON.stringify({ error: 'Product name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const languageNames: Record<string, string> = {
      'en': 'English',
      'ar': 'Arabic (Saudi dialect)',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'hi': 'Hindi',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
    };

    const targetLanguage = languageNames[language] || 'English';

    const systemPrompt = `You are an expert video ad scriptwriter. Create compelling, natural-sounding voice-over scripts for video advertisements.

Your scripts should:
- Be 30-60 seconds when read aloud (roughly 75-150 words)
- Start with an attention-grabbing hook
- Address a pain point or desire
- Present the product as the solution
- Include a clear call-to-action
- Sound natural when spoken, not like text
- Use conversational language appropriate for ${targetLanguage}

Tone: ${tone}
Target Language: ${targetLanguage}

Output ONLY the script text, nothing else. No stage directions, no speaker labels.`;

    const userPrompt = `Create a compelling video ad script for:

Product Name: ${productName}
${productDescription ? `Description: ${productDescription}` : ''}
${productLink ? `Website: ${productLink}` : ''}

Write a ${targetLanguage} voice-over script that sells this product effectively.`;

    console.log('[generate-script-from-product] Calling AI to generate script');

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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', errorText);
      throw new Error('Failed to generate script');
    }

    const aiData = await response.json();
    const generatedScript = aiData.choices?.[0]?.message?.content?.trim() || '';

    console.log('[generate-script-from-product] Script generated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      script: generatedScript,
      language: language,
      word_count: generatedScript.split(/\s+/).length,
      estimated_duration_seconds: Math.round(generatedScript.split(/\s+/).length / 2.5),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-script-from-product:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
