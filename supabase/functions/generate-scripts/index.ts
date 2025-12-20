import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI, isAIAvailable } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!isAIAvailable()) {
      return new Response(JSON.stringify({ error: 'No AI provider configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const { productName, productDescription, scriptType = 'ugc', scriptTypeName = 'UGC Product Ad', count = 5, language = 'ar', market = 'gcc', customPrompt = null, audienceAge = '25-34', audienceGender = 'all' } = await req.json();

    if (!productName) {
      return new Response(JSON.stringify({ error: 'Product name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[generate-scripts] Generating ${count} ${scriptType} scripts for: ${productName}`);

    const scriptTypePrompts: Record<string, string> = {
      'ugc': 'Casual, authentic user-generated content style.',
      'problem-solution': 'Hook with problem → Agitate → Solution → CTA.',
      'emotional-hook': 'Lead with strong emotions.',
      'storytelling': 'Compelling story with beginning, middle, end.',
      'testimonial': 'Satisfied customer sharing experience.',
      'fast-paced': 'Short punchy sentences. Quick energy. TikTok style.',
      'dramatic': 'Cinematic feel. Build tension.',
      'educational': 'Informative and helpful. Build trust.',
    };

    const styleGuidance = scriptTypePrompts[scriptType] || scriptTypePrompts['ugc'];
    const languageInstructions = language === 'ar' ? 'Write ENTIRELY in Arabic Gulf/Saudi dialect.' : `Write in ${language}.`;
    const audienceDescription = audienceGender === 'all' ? `${audienceAge} years old` : `${audienceGender}, ${audienceAge} years old`;

    const systemPrompt = `Expert video ad scriptwriter for ${scriptTypeName}.\n${styleGuidance}\n${languageInstructions}\nMarket: ${market.toUpperCase()}\nTarget: ${audienceDescription}\nScripts: 30-60 seconds, 40-80 words each.\n${customPrompt || ''}`;

    const userPrompt = `Generate ${count} unique ${scriptTypeName} video ad scripts for:\nProduct: ${productName}\nDescription: ${productDescription || 'A premium product'}\n\nReturn ONLY a JSON array of ${count} script strings.`;

    const aiResponse = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.9,
    });

    let generatedScripts: string[] = [];
    try {
      const jsonMatch = aiResponse.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        generatedScripts = JSON.parse(jsonMatch[0]);
      } else {
        generatedScripts = aiResponse.content.split(/\d+\.\s+/).filter((s: string) => s.trim().length > 20);
      }
    } catch {
      generatedScripts = [aiResponse.content];
    }

    generatedScripts = generatedScripts.slice(0, count).map((s: string) => s.trim());

    console.log(`[generate-scripts] Generated ${generatedScripts.length} scripts via ${aiResponse.provider}`);

    return new Response(JSON.stringify({ success: true, scripts: generatedScripts, count: generatedScripts.length, scriptType, provider: aiResponse.provider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in generate-scripts:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
