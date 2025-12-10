import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ContentType = 'description' | 'landing_page' | 'hooks' | 'scripts' | 'offers' | 'angles';
type Market = 'sa' | 'ae' | 'kw' | 'ma' | 'eu' | 'us' | 'latam';
type Audience = 'men' | 'women' | 'both' | 'kids' | 'elderly' | 'athletes' | 'beauty' | 'tech' | 'pets' | 'health' | 'parents';
type Language = 'ar' | 'en' | 'es' | 'fr' | 'de' | 'pt';

interface ContentFactoryRequest {
  projectId: string;
  productName: string;
  productDescription?: string;
  productFeatures?: string[];
  productPrice?: string;
  contentTypes: ContentType[];
  language: Language;
  market: Market;
  audience: Audience;
  customPrompt?: string;
  hooksCount?: number;
  scriptsCount?: number;
  offersCount?: number;
}

// Market-specific cultural profiles
const MARKET_PROFILES: Record<Market, { tone: string; ctaStyle: string; psychology: string; trustSignals: string[] }> = {
  sa: {
    tone: 'emotional, trust-building, family-oriented, direct benefits',
    ctaStyle: 'COD emphasis, fast delivery promise, quality guarantee',
    psychology: 'Trust and family values are paramount. Emphasize reliability, quality, and personal benefits.',
    trustSignals: ['الدفع عند الاستلام', 'توصيل سريع', 'ضمان الجودة', 'منتج أصلي']
  },
  ae: {
    tone: 'luxurious, aspirational, modern, premium',
    ctaStyle: 'exclusivity and premium experience',
    psychology: 'Luxury and status matter. Emphasize premium quality and exclusive access.',
    trustSignals: ['Premium Quality', 'UAE Express', 'Luxury Experience', 'Exclusive']
  },
  kw: {
    tone: 'refined, quality-focused, elegant',
    ctaStyle: 'elegant and direct, quality emphasis',
    psychology: 'Quality and refinement. Focus on product excellence.',
    trustSignals: ['Kuwait Delivery', 'Quality Assured', 'Premium Product']
  },
  ma: {
    tone: 'warm, community-oriented, authentic',
    ctaStyle: 'friendly and accessible',
    psychology: 'Community and authenticity. Relatable stories work best.',
    trustSignals: ['Livraison Maroc', 'Qualité garantie', 'Produit authentique']
  },
  eu: {
    tone: 'clean, elegant, minimalistic, sustainable',
    ctaStyle: 'soft, non-pushy, value-focused',
    psychology: 'Quality and sustainability. Avoid aggressive sales tactics.',
    trustSignals: ['EU Quality', 'Sustainable', 'GDPR Compliant', 'Free Returns']
  },
  us: {
    tone: 'confident, lifestyle-focused, transformational',
    ctaStyle: 'action-oriented, benefit-driven',
    psychology: 'Transformation and lifestyle. Before/after narratives work well.',
    trustSignals: ['Free Shipping', 'Money-Back Guarantee', '⭐⭐⭐⭐⭐ Reviews', 'USA Based']
  },
  latam: {
    tone: 'high-energy, dramatic, emotional, urgent',
    ctaStyle: 'urgent with discounts, scarcity',
    psychology: 'Emotional connection and urgency. Dramatic pain points resonate.',
    trustSignals: ['Envío Rápido', 'Mejor Precio', 'Oferta Limitada', 'Garantía Total']
  }
};

// Language-specific formatting
const LANGUAGE_CONFIG: Record<Language, { direction: string; name: string; systemNote: string }> = {
  ar: { direction: 'rtl', name: 'Arabic', systemNote: 'Write in Arabic. Use Gulf/Saudi dialect for spoken content. Format for RTL display.' },
  en: { direction: 'ltr', name: 'English', systemNote: 'Write in clear, engaging English.' },
  es: { direction: 'ltr', name: 'Spanish', systemNote: 'Write in Spanish. Use Latin American Spanish unless targeting Spain.' },
  fr: { direction: 'ltr', name: 'French', systemNote: 'Write in French. Use elegant, refined language.' },
  de: { direction: 'ltr', name: 'German', systemNote: 'Write in German. Be precise and professional.' },
  pt: { direction: 'ltr', name: 'Portuguese', systemNote: 'Write in Portuguese. Use Brazilian Portuguese unless specified.' }
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const requestData = await req.json();
    
    const {
      projectId,
      productName = '',
      productDescription = '',
      productFeatures = [],
      productPrice = '',
      contentTypes = [],
      language = 'ar' as Language,
      market = 'sa' as Market,
      audience = 'both' as Audience,
      customPrompt = '',
      hooksCount = 30,
      scriptsCount = 5,
      offersCount = 10
    } = requestData;

    if (!productName || !contentTypes || contentTypes.length === 0) {
      throw new Error('productName and contentTypes are required');
    }

    // Use a default projectId if not provided
    const effectiveProjectId = projectId || 'studio-session';

    console.log(`Content Factory: Generating ${contentTypes.join(', ')} for ${productName}`);

    const effectiveMarket: Market = market || 'sa';
    const effectiveLanguage: Language = language || 'ar';

    const marketProfile = MARKET_PROFILES[effectiveMarket];
    const langConfig = LANGUAGE_CONFIG[effectiveLanguage];

    const results: Record<string, any> = {};

    // Build context for all content generation
    const contextBlock = `
PRODUCT INFORMATION:
- Name: ${productName}
- Description: ${productDescription}
- Features: ${productFeatures.join(', ')}
- Price: ${productPrice}

TARGET MARKET: ${effectiveMarket.toUpperCase()}
- Tone: ${marketProfile.tone}
- CTA Style: ${marketProfile.ctaStyle}
- Psychology: ${marketProfile.psychology}
- Trust Signals: ${marketProfile.trustSignals.join(', ')}

TARGET AUDIENCE: ${audience}
TARGET LANGUAGE: ${langConfig.name}
${langConfig.systemNote}

${customPrompt ? `ADDITIONAL INSTRUCTIONS: ${customPrompt}` : ''}
`;

    // Generate each content type
    for (const contentType of contentTypes) {
      try {
        let prompt = '';
        
        switch (contentType) {
          case 'description':
            prompt = `${contextBlock}

Generate a compelling product description for e-commerce.
Include:
- Attention-grabbing headline
- Key benefits (not just features)
- Emotional connection
- Clear value proposition
- Appropriate for the target market culture

Output format:
{
  "headline": "...",
  "subheadline": "...",
  "body": "...",
  "bulletPoints": ["...", "..."],
  "closingStatement": "..."
}`;
            break;

          case 'hooks':
            prompt = `${contextBlock}

Generate ${hooksCount} attention-grabbing marketing hooks for video ads.
Mix of:
- Problem-agitation hooks (pain points)
- Curiosity hooks (intrigue)
- Social proof hooks (results, testimonials)
- Urgency hooks (limited time)
- Benefit hooks (transformation)
- Question hooks (engagement)

Each hook should be:
- 3-8 words for 6-second videos
- Culturally appropriate for ${market}
- In ${langConfig.name}

Output as JSON array:
{
  "hooks": [
    { "text": "...", "type": "problem|curiosity|social_proof|urgency|benefit|question", "duration": "6s|15s" },
    ...
  ]
}`;
            break;

          case 'scripts':
            prompt = `${contextBlock}

Generate ${scriptsCount} video ad scripts in different styles:
1. 6-second hook-only (TikTok opener)
2. 15-second fast-paced
3. 30-second problem-solution (UGC style)
4. 30-second testimonial style
5. 40-second storytelling

Each script should include:
- Hook (first 2-3 seconds)
- Body content
- Call-to-action
- Scene directions [in brackets]
- Timing notes

Output format:
{
  "scripts": [
    {
      "title": "...",
      "duration": "6s|15s|30s|40s",
      "style": "hook|fast|problem_solution|testimonial|storytelling",
      "script": "...",
      "scenes": [
        { "text": "...", "duration": 3, "type": "hook|problem|solution|cta|broll" }
      ]
    },
    ...
  ]
}`;
            break;

          case 'offers':
            prompt = `${contextBlock}

Generate ${offersCount} compelling offer ideas using pricing psychology:
Include:
- Price anchoring offers
- Bundle deals
- Bonus offers
- Scarcity/urgency offers
- Risk reversal offers
- First-time buyer offers

Each offer should feel natural for ${market} market.

Output format:
{
  "offers": [
    {
      "headline": "...",
      "description": "...",
      "urgencyText": "...",
      "bonusText": "...",
      "guaranteeText": "...",
      "type": "anchor|bundle|bonus|scarcity|risk_reversal|first_time"
    },
    ...
  ]
}`;
            break;

          case 'angles':
            prompt = `${contextBlock}

Generate 10 unique marketing angles for advertising.
Each angle should be a different approach to selling the product:
- Health/wellness angle
- Convenience angle
- Status/luxury angle
- Fear of missing out angle
- Social proof angle
- Problem-solution angle
- Lifestyle angle
- Value/savings angle
- Quality/durability angle
- Innovation angle

Output format:
{
  "angles": [
    {
      "name": "...",
      "headline": "...",
      "targetEmotion": "...",
      "keyMessage": "...",
      "bestFor": "platform or audience"
    },
    ...
  ]
}`;
            break;

          case 'landing_page':
            prompt = `${contextBlock}

Generate content for a high-converting landing page:
- Hero section (headline, subheadline, CTA)
- Problem section
- Solution section
- Features/benefits section (with icons/visuals suggested)
- Social proof section (testimonial templates)
- FAQ section (5-7 questions)
- Guarantee section
- Final CTA section

Output format:
{
  "hero": {
    "headline": "...",
    "subheadline": "...",
    "ctaText": "...",
    "trustBadges": ["...", "..."]
  },
  "problem": {
    "headline": "...",
    "points": ["...", "..."]
  },
  "solution": {
    "headline": "...",
    "description": "..."
  },
  "features": [
    { "icon": "suggested-icon", "title": "...", "description": "..." }
  ],
  "testimonials": [
    { "name": "...", "quote": "...", "rating": 5 }
  ],
  "faq": [
    { "question": "...", "answer": "..." }
  ],
  "guarantee": {
    "headline": "...",
    "description": "..."
  },
  "finalCta": {
    "headline": "...",
    "ctaText": "...",
    "urgencyText": "..."
  }
}`;
            break;
        }

        console.log(`Generating ${contentType}...`);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
                role: 'system', 
                content: `You are an expert e-commerce copywriter and marketing strategist specializing in ${effectiveMarket.toUpperCase()} market. 
You create culturally appropriate, high-converting content in ${langConfig.name}.
Always output valid JSON as specified.` 
              },
              { role: 'user', content: prompt }
            ],
            max_tokens: 4000
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Content generation failed for ${contentType}:`, response.status, errorText);
          results[contentType] = { error: `API error: ${response.status}` };
          continue;
        }

        const aiResponse = await response.json();
        const contentText = aiResponse.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        try {
          const jsonMatch = contentText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            results[contentType] = JSON.parse(jsonMatch[0]);
          } else {
            results[contentType] = { raw: contentText };
          }
        } catch (parseError) {
          console.error(`Failed to parse ${contentType}:`, parseError);
          results[contentType] = { raw: contentText };
        }

        // Save to marketing_content table (only if projectId was provided)
        if (projectId && contentType === 'hooks' && results[contentType].hooks) {
          for (const hook of results[contentType].hooks) {
            await supabase.from('marketing_content').insert({
              project_id: projectId,
              user_id: user.id,
              content_type: 'hook',
              content_text: hook.text,
              language,
              market,
              audience,
              metadata: { type: hook.type, duration: hook.duration }
            });
          }
        }

        console.log(`Successfully generated ${contentType}`);

      } catch (contentError) {
        console.error(`Error generating ${contentType}:`, contentError);
        const errorMsg = contentError instanceof Error ? contentError.message : 'Unknown error';
        results[contentType] = { error: errorMsg };
      }
    }

    // Track costs (only if projectId was provided)
    if (projectId) {
      await supabase.from('ai_costs').insert({
        user_id: user.id,
        project_id: projectId,
        engine_name: 'gemini-2.5-flash',
        operation_type: 'script',
        cost_usd: contentTypes.length * 0.005
      });

      // Log analytics
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        project_id: projectId,
        event_type: 'content_factory',
        event_data: {
          content_types: contentTypes,
          language,
          market,
          audience
        }
      });
    }

    console.log(`Content Factory complete${projectId ? ` for project ${projectId}` : ''}`);

    return new Response(JSON.stringify({
      success: true,
      content: results,
      metadata: {
        language,
        market,
        audience,
        generated_at: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Content Factory error:', error);
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
