import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIAvailable, AIError } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cost tracking helper
async function trackCost(userId: string, pipelineStage: string, engineName: string, operationType: string, costUsd: number) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from('cost_transactions').insert({
      user_id: userId,
      pipeline_stage: pipelineStage,
      engine_name: engineName,
      operation_type: operationType,
      cost_usd: costUsd,
      metadata: { source: 'creative-scale' }
    });
  } catch (e) {
    console.warn('[cost-tracking] Failed to track cost:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, video_id, language, market } = await req.json();

    // Get user ID from auth header for cost tracking
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.warn('[auth] Failed to get user:', e);
      }
    }

    if (!video_url || !video_id) {
      return new Response(
        JSON.stringify({ error: 'video_url and video_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user-provided API keys from database
    const apiKeys: Record<string, string> = {};
    if (userId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Define keys to fetch
        const providers = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY'];

        await Promise.all(providers.map(async (provider) => {
          const { data, error } = await supabase.rpc('get_user_api_key', {
            p_user_id: userId,
            p_provider: provider
          });

          if (!error && data) {
            apiKeys[provider] = data;
            console.log(`[creative-scale-analyze] Loaded user key for ${provider}`);
          }
        }));
      } catch (e) {
        console.warn('[creative-scale-analyze] Failed to fetch user API keys:', e);
      }
    }

    if (!isAIAvailable(apiKeys)) {
      return new Response(
        JSON.stringify({ error: 'No AI provider configured. Please add Gemini or OpenAI API key in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[creative-scale-analyze] Analyzing video: ${video_id}`);

    const systemPrompt = `You are a video ad analyst. Your ONLY job is to segment and score existing video ads.

OUTPUT RULES:
- Return ONLY valid JSON matching the schema exactly
- NO suggestions, NO improvements, NO creative decisions
- ONLY describe what EXISTS in the video
- Every segment must have all required fields

SEGMENT TYPES:
- hook: Opening attention-grabber (first 1-5 seconds typically)
- problem: Pain point or challenge being addressed
- solution: Product/service being presented as answer
- benefit: Specific advantage or outcome
- proof: Social proof, testimonials, results
- cta: Call to action
- filler: Non-essential content (transitions, logos, padding)

SCORING (0-1 scale):
- pacing_score: 0=very slow, 1=very fast
- clarity_score: 0=confusing/unclear, 1=crystal clear
- attention_score: 0=boring/weak, 1=highly engaging`;

    const userPrompt = `Analyze this video ad and return VideoAnalysis JSON.

Video URL: ${video_url}
Video ID: ${video_id}
${language ? `Language: ${language}` : ''}
${market ? `Market: ${market}` : ''}

You must analyze the video content and return this exact JSON structure:
{
  "id": "analysis_${crypto.randomUUID()}",
  "source_video_id": "${video_id}",
  "analyzed_at": "${new Date().toISOString()}",
  "metadata": {
    "duration_ms": <estimate based on typical ad length>,
    "aspect_ratio": "<9:16|1:1|16:9|4:5>",
    "resolution": "<e.g. 1080x1920>",
    "fps": 30
  },
  "segments": [
    {
      "id": "seg_0",
      "type": "<hook|problem|solution|benefit|proof|cta|filler>",
      "start_ms": <number>,
      "end_ms": <number>,
      "transcript": "<text or null>",
      "visual_tags": ["<face|product|screen|hands|text|lifestyle|before_after|demo|testimonial|environment|graphic|logo>"],
      "pacing_score": <0-1>,
      "clarity_score": <0-1>,
      "attention_score": <0-1>
    }
  ],
  "audio": {
    "has_voiceover": <boolean>,
    "has_music": <boolean>,
    "music_energy": "<low|medium|high|null>",
    "voice_tone": "<casual|professional|urgent|friendly|null>",
    "silence_ratio": <0-1>
  },
  "overall_scores": {
    "hook_strength": <0-1>,
    "message_clarity": <0-1>,
    "pacing_consistency": <0-1>,
    "cta_effectiveness": <0-1>
  },
  "detected_style": "<ugc|professional|animated|mixed>",
  "detected_language": "${language || 'en'}"
}

Return ONLY the JSON, no markdown, no explanation.`;

    console.log(`[creative-scale-analyze] Calling AI provider...`);

    const aiResponse = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      apiKeys,
    });

    const content = aiResponse.content || '';

    // Enhanced logging for debugging
    console.log(`[creative-scale-analyze] AI Provider: ${aiResponse.provider}`);
    console.log(`[creative-scale-analyze] Response length: ${content.length} chars`);
    console.log(`[creative-scale-analyze] Response preview (first 300 chars): ${content.substring(0, 300)}`);
    console.log(`[creative-scale-analyze] Response preview (last 200 chars): ${content.substring(content.length - 200)}`);

    if (!content) {
      console.error('[creative-scale-analyze] Empty response from AI');
      console.error('[creative-scale-analyze] Full AI response object:', JSON.stringify(aiResponse, null, 2));
      return new Response(
        JSON.stringify({ error: 'AI returned empty response', debug: { provider: aiResponse.provider } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle markdown code blocks safely)
    let analysis;
    try {
      let jsonStr = content.trim();
      console.log(`[creative-scale-analyze] Parsing JSON, initial length: ${jsonStr.length}`);

      // Handle ```json blocks
      if (jsonStr.includes('```json')) {
        console.log(`[creative-scale-analyze] Detected markdown json block`);
        const parts = jsonStr.split('```json');
        if (parts.length > 1 && parts[1]) {
          const innerParts = parts[1].split('```');
          jsonStr = innerParts[0]?.trim() || jsonStr;
        }
      }
      // Handle plain ``` blocks
      else if (jsonStr.includes('```')) {
        console.log(`[creative-scale-analyze] Detected plain markdown block`);
        const parts = jsonStr.split('```');
        if (parts.length > 1 && parts[1]) {
          jsonStr = parts[1].trim();
        }
      }

      // Try to find JSON object if still wrapped
      if (!jsonStr.startsWith('{')) {
        console.log(`[creative-scale-analyze] JSON doesn't start with {, searching for JSON object`);
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
          console.log(`[creative-scale-analyze] Extracted JSON from position ${jsonStart} to ${jsonEnd}`);
        }
      }

      console.log(`[creative-scale-analyze] Final JSON length before parse: ${jsonStr.length}`);
      console.log(`[creative-scale-analyze] Final JSON preview: ${jsonStr.substring(0, 200)}...`);

      analysis = JSON.parse(jsonStr);
      console.log(`[creative-scale-analyze] JSON parsed successfully, keys: ${Object.keys(analysis).join(', ')}`);
    } catch (parseErr) {
      console.error('[creative-scale-analyze] JSON parse error:', parseErr);
      console.error('[creative-scale-analyze] Raw content (full):', content);
      console.error('[creative-scale-analyze] Content type:', typeof content);
      console.error('[creative-scale-analyze] Content JSON stringified:', JSON.stringify(content));
      return new Response(
        JSON.stringify({
          error: 'Failed to parse AI response as JSON',
          raw: content.substring(0, 1000),
          parseError: parseErr instanceof Error ? parseErr.message : String(parseErr),
          provider: aiResponse.provider
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[creative-scale-analyze] Success: ${analysis.segments?.length || 0} segments identified (provider: ${aiResponse.provider})`);

    // Track cost for successful analysis
    if (userId) {
      await trackCost(userId, 'creative_scale_analyze', aiResponse.provider, 'video_analysis', 0.002);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        meta: {
          video_id,
          segments_count: analysis.segments?.length || 0,
          provider: aiResponse.provider,
          processed_at: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[creative-scale-analyze] Error:', err);

    // Handle AIError with specific status codes and user-friendly messages
    if (err instanceof AIError) {
      const statusCode = err.type === 'QUOTA_EXCEEDED' || err.type === 'RATE_LIMIT' ? 429 :
        err.type === 'AUTH_ERROR' ? 401 : 500;

      return new Response(
        JSON.stringify({
          error: err.message,
          errorType: err.type,
          provider: err.provider,
          retryAfterSeconds: err.retryAfterSeconds,
          userMessage: getUserFriendlyMessage(err)
        }),
        { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper to generate user-friendly error messages
function getUserFriendlyMessage(err: AIError): string {
  switch (err.type) {
    case 'QUOTA_EXCEEDED':
      return 'AI service quota exceeded. Your daily/monthly limit has been reached. Please try again later or upgrade your plan.';
    case 'RATE_LIMIT':
      return `Too many requests. Please wait ${err.retryAfterSeconds || 'a few'} seconds and try again.`;
    case 'AUTH_ERROR':
      return 'AI service authentication failed. Please check your API key configuration in Settings.';
    default:
      return 'AI service temporarily unavailable. Please try again in a moment.';
  }
}
