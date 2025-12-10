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
  projectId?: string;
  productName: string;
  productDescription?: string;
  imageTypes?: ImageType[];
  imageType?: string; // Single image type for simpler calls
  prompt?: string; // Direct prompt
  market?: Market;
  audience?: Audience;
  referenceImageUrl?: string;
  customPrompt?: string;
  resolution?: string;
  engine?: string;
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

    // Check if n8n backend mode is enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('use_n8n_backend, ai_operator_enabled, preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    const useN8nBackend = userSettings?.use_n8n_backend || false;
    const prefs = userSettings?.preferences as any;
    const stageWebhooks = prefs?.stage_webhooks || {};
    const imageGenWebhook = stageWebhooks['image_generation'];

    const requestBody = await req.json();
    const { 
      projectId, 
      productName = 'Product',
      productDescription = '',
      imageTypes: rawImageTypes,
      imageType,
      prompt: directPrompt,
      market = 'us',
      audience = 'both',
      referenceImageUrl,
      customPrompt,
      resolution,
      engine
    }: ImageGenerationRequest = requestBody;

    // Route to n8n webhook if enabled and configured
    if (useN8nBackend && imageGenWebhook?.enabled && imageGenWebhook?.webhook_url) {
      console.log('[ai-image-generator] Routing to n8n webhook');
      
      try {
        const webhookPayload = {
          action: 'generate_images',
          project_id: projectId,
          user_id: user.id,
          product_name: productName,
          product_description: productDescription,
          image_types: rawImageTypes || [imageType || 'product'],
          engine: engine || 'nanobanana',
          market,
          audience,
          reference_image_url: referenceImageUrl,
          custom_prompt: customPrompt,
          resolution,
          timestamp: new Date().toISOString()
        };

        const n8nApiKey = prefs?.n8n_api_key;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (n8nApiKey) {
          headers['Authorization'] = `Bearer ${n8nApiKey}`;
        }

        const response = await fetch(imageGenWebhook.webhook_url, {
          method: 'POST',
          headers,
          body: JSON.stringify(webhookPayload),
        });

        // Log the webhook call
        if (projectId) {
          await supabase.from('analytics_events').insert({
            user_id: user.id,
            project_id: projectId,
            event_type: 'image_generation_n8n',
            event_data: { webhook_status: response.status }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          method: 'n8n_webhook',
          message: 'Image generation request sent to n8n webhook',
          webhook_status: response.status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (webhookError: any) {
        console.error('[ai-image-generator] n8n webhook error:', webhookError);
        // Fall through to internal generation
      }
    }

    // Handle both single imageType and array imageTypes
    let imageTypes: ImageType[] = [];
    if (rawImageTypes && rawImageTypes.length > 0) {
      imageTypes = rawImageTypes;
    } else if (imageType) {
      // Map simple types to our internal types
      const typeMap: Record<string, ImageType> = {
        'product': 'amazon_style',
        'lifestyle': 'lifestyle',
        'before-after': 'before_after',
        'mockup': 'packaging',
        'ugc': 'lifestyle',
        'thumbnail': 'thumbnail',
      };
      const mappedType = typeMap[imageType] || 'amazon_style';
      imageTypes = [mappedType as ImageType];
    } else {
      // Default to amazon style if no type specified
      imageTypes = ['amazon_style'];
    }

    console.log(`Generating ${imageTypes.length} images with types:`, imageTypes);

    const generatedImages: { type: string; url: string; id?: string }[] = [];
    const errors: { type: string; error: string }[] = [];

    // Generate each image type
    for (const imageType of imageTypes) {
      try {
        // Build the prompt - use direct prompt if provided, otherwise build from template
        let basePrompt: string;
        
        if (directPrompt) {
          basePrompt = directPrompt;
        } else if (customPrompt) {
          basePrompt = customPrompt;
        } else {
          const templateFunc = IMAGE_TYPE_PROMPTS[imageType];
          if (templateFunc) {
            basePrompt = templateFunc(productName, productDescription);
          } else {
            basePrompt = `Professional product photo of ${productName}. ${productDescription}. High quality, studio lighting, 8k resolution.`;
          }
        }
        
        // Add market-specific modifiers
        const marketMod = MARKET_MODIFIERS[market];
        if (marketMod && !directPrompt) {
          basePrompt += `. ${marketMod}`;
        }
        
        // Add audience-specific modifiers
        const audienceMod = AUDIENCE_MODIFIERS[audience];
        if (audienceMod && !directPrompt) {
          basePrompt += `. ${audienceMod}`;
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

        // Save to database if projectId is provided
        let recordId: string | undefined;
        if (projectId) {
          const { data: imageRecord, error: insertError } = await supabase
            .from('generated_images')
            .insert({
              project_id: projectId,
              user_id: user.id,
              image_type: imageType,
              prompt: basePrompt,
              engine_name: engine || 'nano_banana',
              image_url: imageData,
              status: 'completed',
              metadata: {
                market,
                audience,
                resolution,
                generated_at: new Date().toISOString()
              }
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Failed to save ${imageType}:`, insertError);
          } else {
            recordId = imageRecord?.id;
          }
        }

        generatedImages.push({
          type: imageType,
          url: imageData,
          id: recordId
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

    // Log analytics if projectId provided
    if (projectId) {
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
        engine_name: engine || 'nano_banana',
        operation_type: 'image',
        cost_usd: generatedImages.length * 0.02
      });
    }

    console.log(`Image generation complete: ${generatedImages.length} success, ${errors.length} errors`);

    // For single image requests, also return imageUrl at top level for compatibility
    const singleImageUrl = generatedImages.length > 0 ? generatedImages[0].url : undefined;

    return new Response(JSON.stringify({
      success: true,
      imageUrl: singleImageUrl, // Backwards compatibility
      images: generatedImages,
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
