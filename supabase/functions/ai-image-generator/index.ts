import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ImageType = 'amazon_style' | 'before_after' | 'lifestyle' | 'packaging' | 'thumbnail' | 'hero';
type Market = 'sa' | 'ae' | 'kw' | 'ma' | 'eu' | 'us' | 'latam';
type Audience = 'men' | 'women' | 'both' | 'kids' | 'elderly' | 'athletes' | 'beauty' | 'tech' | 'pets' | 'health' | 'parents';

interface ImageGenerationRequest {
  projectId: string;
  productName: string;
  productDescription?: string;
  imageTypes: ImageType[];
  market?: Market;
  audience?: Audience;
  referenceImageUrl?: string;
  customPrompt?: string;
}

// Market-specific visual modifiers
const MARKET_MODIFIERS: Record<Market, string> = {
  sa: 'warm middle-eastern aesthetic, luxurious setting, culturally appropriate for Saudi Arabia',
  ae: 'sleek modern premium aesthetic, Dubai luxury style',
  kw: 'clean professional aesthetic, Gulf region style',
  ma: 'vibrant authentic Moroccan aesthetic, warm colors',
  eu: 'minimalist European style, clean modern aesthetic, sophisticated',
  us: 'American lifestyle aesthetic, bold aspirational imagery',
  latam: 'vibrant colorful Latin American style, dynamic energy'
};

// Audience-specific visual modifiers
const AUDIENCE_MODIFIERS: Record<Audience, string> = {
  men: 'male-focused imagery, masculine aesthetic',
  women: 'female-focused imagery, feminine aesthetic',
  both: 'gender-neutral appeal',
  kids: 'child-friendly, colorful, playful',
  elderly: 'mature audience, elegant, trustworthy',
  athletes: 'athletic person, fitness setting, energetic mood',
  beauty: 'beauty setting, soft lighting, skincare aesthetic',
  tech: 'modern tech setting, sleek gadgets, professional lighting',
  pets: 'pet-friendly, warm, family atmosphere',
  health: 'healthy lifestyle, wellness, natural',
  parents: 'family-oriented, nurturing, practical'
};

// Image type prompt templates
const IMAGE_TYPE_PROMPTS: Record<ImageType, (product: string, desc: string) => string> = {
  amazon_style: (product, desc) => 
    `Professional Amazon-style product photo of ${product}. ${desc}. Clean white background, studio lighting, high resolution product shot, multiple angles visible, professional e-commerce photography, 8k quality`,
  
  before_after: (product, desc) => 
    `Before and after comparison image for ${product}. ${desc}. Split image showing transformation, left side shows problem, right side shows solution with product, dramatic improvement visible, professional advertising style`,
  
  lifestyle: (product, desc) => 
    `Lifestyle product photography of ${product} in use. ${desc}. Real-world setting, person using the product naturally, warm inviting atmosphere, professional advertising photography, aspirational imagery`,
  
  packaging: (product, desc) => 
    `Premium product packaging mockup for ${product}. ${desc}. Elegant box design, professional branding, studio lighting, luxury presentation, high-end packaging photography`,
  
  thumbnail: (product, desc) => 
    `Eye-catching video thumbnail for ${product}. ${desc}. Bold text overlay area, vibrant colors, attention-grabbing composition, social media optimized, 9:16 aspect ratio friendly`,
  
  hero: (product, desc) => 
    `Hero banner image for ${product} landing page. ${desc}. Wide format, dramatic lighting, product prominently featured, space for text overlay, premium advertising photography, 16:9 aspect ratio`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const { 
      projectId, 
      productName, 
      productDescription = '',
      imageTypes,
      market = 'us',
      audience = 'both',
      referenceImageUrl,
      customPrompt
    }: ImageGenerationRequest = await req.json();

    if (!projectId || !productName || !imageTypes || imageTypes.length === 0) {
      throw new Error('projectId, productName, and imageTypes are required');
    }

    console.log(`Generating ${imageTypes.length} images for project ${projectId}`);

    const generatedImages: { type: ImageType; url: string; id: string }[] = [];
    const errors: { type: ImageType; error: string }[] = [];

    // Generate each image type
    for (const imageType of imageTypes) {
      try {
        // Build the prompt
        let basePrompt = IMAGE_TYPE_PROMPTS[imageType](productName, productDescription);
        
        // Add market-specific modifiers
        const marketMod = MARKET_MODIFIERS[market];
        if (marketMod) {
          basePrompt += `. ${marketMod}`;
        }
        
        // Add audience-specific modifiers
        const audienceMod = AUDIENCE_MODIFIERS[audience];
        if (audienceMod) {
          basePrompt += `. ${audienceMod}`;
        }

        // Add custom prompt if provided
        if (customPrompt) {
          basePrompt += `. ${customPrompt}`;
        }

        // Add cultural considerations for specific markets
        if (market === 'sa' || market === 'ae' || market === 'kw') {
          if (audience === 'women') {
            basePrompt += '. Woman wearing hijab, modest elegant clothing';
          }
        }

        console.log(`Generating ${imageType} with prompt:`, basePrompt.substring(0, 200) + '...');

        // Call Lovable AI Image Generation (NanoBanana/Gemini)
        const messages: any[] = [
          { role: 'user', content: basePrompt }
        ];

        // If reference image provided, include it for style reference
        if (referenceImageUrl) {
          messages[0] = {
            role: 'user',
            content: [
              { type: 'text', text: `Create a new image in similar style: ${basePrompt}` },
              { type: 'image_url', image_url: { url: referenceImageUrl } }
            ]
          };
        }

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages,
            modalities: ['image', 'text']
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Image generation failed for ${imageType}:`, response.status, errorText);
          errors.push({ type: imageType, error: `API error: ${response.status}` });
          continue;
        }

        const aiResponse = await response.json();
        const imageData = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!imageData) {
          console.error(`No image data returned for ${imageType}`);
          errors.push({ type: imageType, error: 'No image generated' });
          continue;
        }

        // Save to database
        const { data: imageRecord, error: insertError } = await supabase
          .from('generated_images')
          .insert({
            project_id: projectId,
            user_id: user.id,
            image_type: imageType,
            prompt: basePrompt,
            engine_name: 'nano_banana',
            image_url: imageData, // Base64 data URL
            status: 'completed',
            metadata: {
              market,
              audience,
              generated_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Failed to save ${imageType}:`, insertError);
          errors.push({ type: imageType, error: 'Failed to save image' });
          continue;
        }

        generatedImages.push({
          type: imageType,
          url: imageData,
          id: imageRecord.id
        });

        console.log(`Successfully generated ${imageType}`);

        // Small delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));

      } catch (imageError) {
        console.error(`Error generating ${imageType}:`, imageError);
        const errorMsg = imageError instanceof Error ? imageError.message : 'Unknown error';
        errors.push({ type: imageType, error: errorMsg });
      }
    }

    // Log analytics
    await supabase.from('analytics_events').insert({
      user_id: user.id,
      project_id: projectId,
      event_type: 'image_generation',
      event_data: {
        total_requested: imageTypes.length,
        total_generated: generatedImages.length,
        total_failed: errors.length,
        image_types: imageTypes,
        market,
        audience
      }
    });

    // Track costs
    await supabase.from('ai_costs').insert({
      user_id: user.id,
      project_id: projectId,
      engine_name: 'nano_banana',
      operation_type: 'image',
      cost_usd: generatedImages.length * 0.02 // Estimated cost per image
    });

    console.log(`Image generation complete: ${generatedImages.length} success, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      generated: generatedImages,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        requested: imageTypes.length,
        completed: generatedImages.length,
        failed: errors.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Image generator error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
