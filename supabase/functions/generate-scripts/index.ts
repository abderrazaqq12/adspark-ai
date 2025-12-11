import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const { 
      productName, 
      productDescription, 
      scriptType = 'ugc',
      scriptTypeName = 'UGC Product Ad',
      count = 5, 
      language = 'ar',
      market = 'gcc',
      customPrompt = null,
      audienceAge = '25-34',
      audienceGender = 'all',
    } = await req.json();

    if (!productName) {
      return new Response(JSON.stringify({ error: 'Product name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[generate-scripts] Generating ${count} ${scriptType} scripts for: ${productName}`);

    // Build the system prompt based on script type
    const scriptTypePrompts: Record<string, string> = {
      'ugc': 'Write in a casual, authentic user-generated content style. Sound like a real customer sharing their experience.',
      'problem-solution': 'Structure as: Hook with problem → Agitate the pain → Present the solution → Call to action.',
      'emotional-hook': 'Lead with strong emotions. Connect with feelings of frustration, desire, hope, or fear. Make it personal.',
      'storytelling': 'Tell a compelling story with a beginning, middle, and end. Use narrative techniques.',
      'testimonial': 'Write as if a satisfied customer is sharing their experience. Include specific details and results.',
      'fast-paced': 'Short punchy sentences. Quick energy. Perfect for TikTok. Multiple hooks. Fast transitions.',
      'dramatic': 'Cinematic feel. Build tension. Create impact. Use powerful language.',
      'educational': 'Informative and helpful. Teach something valuable. Build trust through knowledge.',
    };

    const styleGuidance = scriptTypePrompts[scriptType] || scriptTypePrompts['ugc'];
    
    const languageInstructions = language === 'ar' 
      ? 'Write ENTIRELY in Arabic. Use Gulf/Saudi dialect for authenticity. Include culturally relevant expressions.'
      : `Write in ${language}. Adapt cultural references appropriately.`;

    const audienceDescription = audienceGender === 'all' 
      ? `${audienceAge} years old (both genders)`
      : `${audienceGender} audience, ${audienceAge} years old`;

    const systemPrompt = `You are an expert video ad scriptwriter specializing in ${scriptTypeName} format.

${styleGuidance}

${languageInstructions}

Market context: ${market.toUpperCase()} region
Target audience: ${audienceDescription}
Target: Short-form video ads (30-60 seconds, 40-80 words each)

Each script must include:
1. Strong opening hook (first 3 seconds) - tailored to ${audienceAge} age group
2. Problem/benefit statement - relevant to ${audienceGender === 'all' ? 'general' : audienceGender} audience
3. Product presentation
4. Clear call-to-action

${customPrompt ? `Additional instructions: ${customPrompt}` : ''}

Output format: Return a JSON array of ${count} unique script strings. Each script should be different in approach while maintaining the ${scriptTypeName} style and speaking directly to the ${audienceDescription} target audience.`;

    const userPrompt = `Generate ${count} unique ${scriptTypeName} video ad scripts for this product:

Product Name: ${productName}
Product Description: ${productDescription || 'A premium product'}

Create ${count} different script variations. Each should:
- Be 40-80 words
- Have a unique hook/angle
- Follow the ${scriptTypeName} format
- Be optimized for voice-over delivery

Return ONLY a JSON array of ${count} script strings, no other text.`;

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
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to generate scripts');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse AI response - handle both JSON and text formats
    let generatedScripts: string[] = [];
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        generatedScripts = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: split by numbered items
        generatedScripts = content.split(/\d+\.\s+/).filter((s: string) => s.trim().length > 20);
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
      generatedScripts = [content]; // Use raw content as single script
    }

    // Ensure we have the requested count
    generatedScripts = generatedScripts.slice(0, count).map((s: string) => s.trim());

    console.log(`[generate-scripts] Generated ${generatedScripts.length} scripts successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      scripts: generatedScripts,
      count: generatedScripts.length,
      scriptType,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in generate-scripts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
