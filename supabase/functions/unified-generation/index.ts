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

  const startTime = Date.now();

  try {
    const { input, prompt, systemPrompt, mode } = await req.json();
    
    console.log(`[UnifiedGeneration] Mode: ${mode}, Product: ${input?.product?.title}`);

    if (!isAIAvailable()) {
      throw new Error('No AI provider configured. Please add Gemini or OpenAI API key.');
    }

    const aiResponse = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });

    console.log(`[UnifiedGeneration] Response from ${aiResponse.provider}, length: ${aiResponse.content.length}`);

    // Parse JSON from response
    let parsed;
    try {
      const content = aiResponse.content;
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        // Try direct JSON parse
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          parsed = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        }
      }
    } catch (parseError) {
      console.error('[UnifiedGeneration] Parse error:', parseError);
      // Return raw content for client-side parsing
      parsed = { raw: aiResponse.content };
    }

    const latencyMs = Date.now() - startTime;

    return new Response(JSON.stringify({
      ...parsed,
      meta: {
        engine: mode,
        provider: aiResponse.provider,
        latencyMs,
        promptVersion: 1,
        generatedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[UnifiedGeneration] Error:', error);
    
    // Handle rate limits
    if (error instanceof Error && error.message.includes('429')) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
