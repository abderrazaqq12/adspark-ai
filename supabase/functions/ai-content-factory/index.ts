import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { callAI, isAIAvailable } from "../_shared/ai-gateway.ts";

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

const MARKET_PROFILES: Record<Market, { tone: string; ctaStyle: string; psychology: string; trustSignals: string[] }> = {
  sa: { tone: 'emotional, trust-building, family-oriented', ctaStyle: 'COD emphasis, fast delivery', psychology: 'Trust and family values', trustSignals: ['الدفع عند الاستلام', 'توصيل سريع', 'ضمان الجودة'] },
  ae: { tone: 'luxurious, aspirational, modern', ctaStyle: 'exclusivity and premium', psychology: 'Luxury and status', trustSignals: ['Premium Quality', 'UAE Express', 'Exclusive'] },
  kw: { tone: 'refined, quality-focused', ctaStyle: 'elegant and direct', psychology: 'Quality and refinement', trustSignals: ['Kuwait Delivery', 'Quality Assured'] },
  ma: { tone: 'warm, community-oriented', ctaStyle: 'friendly and accessible', psychology: 'Community and authenticity', trustSignals: ['Livraison Maroc', 'Qualité garantie'] },
  eu: { tone: 'clean, elegant, sustainable', ctaStyle: 'soft, value-focused', psychology: 'Quality and sustainability', trustSignals: ['EU Quality', 'Sustainable', 'Free Returns'] },
  us: { tone: 'confident, lifestyle-focused', ctaStyle: 'action-oriented', psychology: 'Transformation and lifestyle', trustSignals: ['Free Shipping', 'Money-Back Guarantee'] },
  latam: { tone: 'high-energy, dramatic', ctaStyle: 'urgent with discounts', psychology: 'Emotional connection', trustSignals: ['Envío Rápido', 'Mejor Precio'] }
};

const LANGUAGE_CONFIG: Record<Language, { direction: string; name: string; systemNote: string }> = {
  ar: { direction: 'rtl', name: 'Arabic', systemNote: 'Write in Arabic Gulf/Saudi dialect.' },
  en: { direction: 'ltr', name: 'English', systemNote: 'Write in clear English.' },
  es: { direction: 'ltr', name: 'Spanish', systemNote: 'Write in Latin American Spanish.' },
  fr: { direction: 'ltr', name: 'French', systemNote: 'Write in elegant French.' },
  de: { direction: 'ltr', name: 'German', systemNote: 'Write in precise German.' },
  pt: { direction: 'ltr', name: 'Portuguese', systemNote: 'Write in Brazilian Portuguese.' }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!isAIAvailable()) {
      throw new Error('No AI provider configured. Please add Gemini or OpenAI API key.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization header required');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Invalid authorization');

    const { projectId, productName = '', productDescription = '', productFeatures = [], productPrice = '', contentTypes = [], language = 'ar' as Language, market = 'sa' as Market, audience = 'both' as Audience, customPrompt = '', hooksCount = 30, scriptsCount = 5, offersCount = 10 } = await req.json();

    if (!productName || !contentTypes || contentTypes.length === 0) throw new Error('productName and contentTypes are required');

    const normalizeMarket = (m: string): Market => {
      const marketMap: Record<string, Market> = { 'sa': 'sa', 'saudi': 'sa', 'ae': 'ae', 'uae': 'ae', 'kw': 'kw', 'ma': 'ma', 'eu': 'eu', 'us': 'us', 'latam': 'latam' };
      return marketMap[(m || 'sa').toLowerCase().trim()] || 'sa';
    };

    const normalizeLanguage = (l: string): Language => {
      const langMap: Record<string, Language> = { 'ar': 'ar', 'en': 'en', 'es': 'es', 'fr': 'fr', 'de': 'de', 'pt': 'pt' };
      return langMap[(l || 'ar').toLowerCase().trim()] || 'ar';
    };

    const effectiveMarket = normalizeMarket(market);
    const effectiveLanguage = normalizeLanguage(language);
    const marketProfile = MARKET_PROFILES[effectiveMarket];
    const langConfig = LANGUAGE_CONFIG[effectiveLanguage];

    const results: Record<string, any> = {};

    const contextBlock = `PRODUCT: ${productName}\nDescription: ${productDescription}\nFeatures: ${productFeatures.join(', ')}\nPrice: ${productPrice}\n\nMARKET: ${effectiveMarket.toUpperCase()} - Tone: ${marketProfile.tone}\nAUDIENCE: ${audience}\nLANGUAGE: ${langConfig.name}\n${langConfig.systemNote}\n${customPrompt ? `ADDITIONAL: ${customPrompt}` : ''}`;

    for (const contentType of contentTypes) {
      try {
        let prompt = contextBlock + '\n\n';
        
        if (contentType === 'hooks') {
          prompt += `Generate ${hooksCount} marketing hooks for video ads. Output JSON: { "hooks": [{ "text": "...", "type": "problem|curiosity|urgency|benefit", "duration": "6s|15s" }] }`;
        } else if (contentType === 'scripts') {
          prompt += `Generate ${scriptsCount} video ad scripts. Output JSON: { "scripts": [{ "title": "...", "duration": "15s|30s", "script": "...", "scenes": [...] }] }`;
        } else if (contentType === 'offers') {
          prompt += `Generate ${offersCount} compelling offers. Output JSON: { "offers": [{ "headline": "...", "description": "...", "urgencyText": "...", "type": "bundle|scarcity|bonus" }] }`;
        } else if (contentType === 'description') {
          prompt += `Generate product description. Output JSON: { "headline": "...", "subheadline": "...", "body": "...", "bulletPoints": [...] }`;
        } else if (contentType === 'landing_page') {
          prompt += `Generate landing page content. Output JSON with hero, problem, solution, features, testimonials, faq, guarantee sections.`;
        } else {
          prompt += `Generate 10 marketing angles. Output JSON: { "angles": [{ "name": "...", "headline": "...", "targetEmotion": "..." }] }`;
        }

        console.log(`Generating ${contentType}...`);

        const aiResponse = await callAI({
          messages: [
            { role: 'system', content: `Expert e-commerce copywriter for ${effectiveMarket.toUpperCase()} market. Output valid JSON.` },
            { role: 'user', content: prompt }
          ],
          maxTokens: 4000
        });

        try {
          const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
          results[contentType] = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: aiResponse.content };
        } catch { results[contentType] = { raw: aiResponse.content }; }

        if (projectId && contentType === 'hooks' && results[contentType].hooks) {
          for (const hook of results[contentType].hooks) {
            await supabase.from('marketing_content').insert({
              project_id: projectId, user_id: user.id, content_type: 'hook', content_text: hook.text, language, market, audience, metadata: { type: hook.type }
            });
          }
        }

        console.log(`Successfully generated ${contentType}`);
      } catch (contentError) {
        console.error(`Error generating ${contentType}:`, contentError);
        results[contentType] = { error: contentError instanceof Error ? contentError.message : 'Unknown error' };
      }
    }

    if (projectId) {
      await supabase.from('ai_costs').insert({ user_id: user.id, project_id: projectId, engine_name: 'gemini', operation_type: 'script', cost_usd: contentTypes.length * 0.005 });
    }

    return new Response(JSON.stringify({ success: true, content: results, metadata: { language, market, audience, generated_at: new Date().toISOString() } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Content Factory error:', error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
