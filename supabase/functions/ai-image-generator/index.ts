import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ImageType = 'product' | 'lifestyle' | 'before-after' | 'mockup' | 'ugc' | 'thumbnail' | 'amazon_style' | 'before_after' | 'packaging' | 'hero';
type Market = 'sa' | 'ae' | 'kw' | 'ma' | 'eu' | 'us' | 'latam';

const MARKET_MODIFIERS: Record<Market, string> = {
  sa: 'warm middle-eastern aesthetic, luxurious setting',
  ae: 'sleek modern premium aesthetic, Dubai luxury style',
  kw: 'clean professional aesthetic, Gulf region style',
  ma: 'vibrant authentic Moroccan aesthetic',
  eu: 'minimalist European style, sophisticated',
  us: 'American lifestyle aesthetic, bold aspirational',
  latam: 'vibrant colorful Latin American style'
};

const AUDIENCE_MODIFIERS: Record<string, string> = {
  men: 'male-focused imagery, masculine aesthetic',
  women: 'female-focused imagery, feminine aesthetic',
  both: 'gender-neutral appeal, inclusive imagery',
  kids: 'child-friendly, colorful, playful',
  athletes: 'athletic, fitness setting, energetic',
  beauty: 'beauty setting, soft glowing lighting',
  tech: 'modern tech setting, sleek gadgets'
};

const getImagePrompt = (imageType: string, product: string, desc: string, audienceMod: string): string => {
  const prompts: Record<string, string> = {
    product: `${product} ${desc} on clean white studio background with soft balanced lighting. ${audienceMod}`,
    lifestyle: `${product} ${desc} in realistic everyday environment. ${audienceMod} Natural soft lighting.`,
    amazon_style: `${product} ${desc} centered on white studio background, professional product photography. ${audienceMod}`,
    hero: `${product} ${desc} hero-style visual with dramatic elegant background. ${audienceMod}`,
  };
  return prompts[imageType] || `Professional product photo of ${product}. ${desc}. ${audienceMod}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const geminiApiKey = Deno.env.get('Gemini');
    const openaiApiKey = Deno.env.get('OpenAI');
    
    if (!geminiApiKey && !openaiApiKey) {
      throw new Error('No AI provider configured. Please add Gemini or OpenAI API key.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header required');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Invalid authorization');

    const { projectId, productName = 'Product', productDescription = '', imageTypes: rawImageTypes, imageType, prompt: directPrompt, market = 'us', audience = 'both', referenceImageUrl, customPrompt } = await req.json();

    let imageTypes: ImageType[] = rawImageTypes?.length > 0 ? rawImageTypes : [imageType || 'amazon_style'];

    console.log(`Generating ${imageTypes.length} images:`, imageTypes);

    const generatedImages: { type: string; url: string; id?: string }[] = [];
    const errors: { type: string; error: string }[] = [];

    for (const imgType of imageTypes) {
      try {
        const audienceMod = AUDIENCE_MODIFIERS[audience] || '';
        let basePrompt = directPrompt || customPrompt || getImagePrompt(imgType, productName, productDescription, audienceMod);
        const marketMod = MARKET_MODIFIERS[market as Market];
        if (marketMod && !directPrompt) basePrompt += `. ${marketMod}`;

        console.log(`Generating ${imgType}...`);

        let imageData: string | null = null;

        // Try Gemini first
        if (geminiApiKey) {
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: basePrompt }] }],
                generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
              if (imagePart?.inlineData) {
                imageData = `data:image/png;base64,${imagePart.inlineData.data}`;
              }
            }
          } catch (e) { console.error('Gemini error:', e); }
        }

        // Fallback to OpenAI
        if (!imageData && openaiApiKey) {
          try {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'dall-e-3', prompt: basePrompt, n: 1, size: '1024x1024' }),
            });

            if (response.ok) {
              const data = await response.json();
              imageData = data.data?.[0]?.url;
            }
          } catch (e) { console.error('OpenAI error:', e); }
        }

        if (!imageData) {
          errors.push({ type: imgType, error: 'No image generated' });
          continue;
        }

        let recordId: string | undefined;
        if (projectId) {
          const { data: imageRecord } = await supabase.from('generated_images').insert({
            project_id: projectId, user_id: user.id, image_type: imgType, prompt: basePrompt,
            engine_name: geminiApiKey ? 'gemini' : 'openai', image_url: imageData, status: 'completed',
            metadata: { market, audience, generated_at: new Date().toISOString() }
          }).select().single();
          recordId = imageRecord?.id;
        }

        generatedImages.push({ type: imgType, url: imageData, id: recordId });
        console.log(`Successfully generated ${imgType}`);
        await new Promise(r => setTimeout(r, 500));

      } catch (imageError) {
        console.error(`Error generating ${imgType}:`, imageError);
        errors.push({ type: imgType, error: imageError instanceof Error ? imageError.message : 'Unknown error' });
      }
    }

    if (projectId) {
      await supabase.from('analytics_events').insert({
        user_id: user.id, project_id: projectId, event_type: 'image_generation',
        event_data: { total_requested: imageTypes.length, total_generated: generatedImages.length, total_failed: errors.length }
      });
      await supabase.from('ai_costs').insert({
        user_id: user.id, project_id: projectId, engine_name: 'gemini', operation_type: 'image', cost_usd: generatedImages.length * 0.02
      });
    }

    return new Response(JSON.stringify({ success: true, images: generatedImages, errors, method: 'direct_api' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI Image Generator error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
