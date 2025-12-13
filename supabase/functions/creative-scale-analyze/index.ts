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
    const { video_url, video_id, language, market } = await req.json();

    if (!video_url || !video_id) {
      return new Response(
        JSON.stringify({ error: 'video_url and video_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[creative-scale-analyze] AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No content in AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let analysis;
    try {
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0].trim();
      }
      analysis = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[creative-scale-analyze] JSON parse error:', parseErr);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response as JSON', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[creative-scale-analyze] Success: ${analysis.segments?.length || 0} segments identified`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        meta: {
          video_id,
          segments_count: analysis.segments?.length || 0,
          processed_at: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[creative-scale-analyze] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
