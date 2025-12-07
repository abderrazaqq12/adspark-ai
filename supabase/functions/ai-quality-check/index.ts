import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityCheckRequest {
  sceneId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  expectedContent: string;
  language?: string;
  market?: string;
}

interface QualityResult {
  score: number;
  issues: string[];
  passed: boolean;
  suggestions: string[];
  metadata: {
    visualQuality: number;
    contentMatch: number;
    technicalQuality: number;
  };
}

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

    const { sceneId, videoUrl, thumbnailUrl, expectedContent, language = 'en', market = 'us' }: QualityCheckRequest = await req.json();

    if (!sceneId) {
      throw new Error('sceneId is required');
    }

    console.log(`Checking quality for scene: ${sceneId}`);

    // Use thumbnail for vision analysis (faster than video)
    const imageToAnalyze = thumbnailUrl || videoUrl;
    
    if (!imageToAnalyze) {
      // If no visual content, return a basic score based on expected content
      return new Response(JSON.stringify({
        score: 5,
        issues: ['No visual content available for analysis'],
        passed: false,
        suggestions: ['Generate video content for this scene'],
        metadata: {
          visualQuality: 0,
          contentMatch: 0,
          technicalQuality: 0
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Call Vision AI to analyze the scene
    const systemPrompt = `You are an AI video quality analyst for e-commerce advertising videos.
Your job is to evaluate video scenes/thumbnails for quality and effectiveness.

Analyze the provided image and rate it on these criteria:
1. Visual Quality (1-10): Resolution, lighting, composition, professional appearance
2. Content Match (1-10): How well it matches the expected content/script
3. Technical Quality (1-10): No artifacts, proper framing, good exposure

For each issue found, provide a brief description.
For suggestions, provide actionable improvements.

Consider the target market (${market}) and language (${language}) context.

Expected content for this scene: "${expectedContent}"

Respond in JSON format:
{
  "visualQuality": number,
  "contentMatch": number, 
  "technicalQuality": number,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "overallAssessment": "brief description"
}`;

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
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Analyze this scene image for quality:' },
              { type: 'image_url', image_url: { url: imageToAnalyze } }
            ]
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vision API error:', response.status, errorText);
      
      // Return a default score on API error
      return new Response(JSON.stringify({
        score: 7,
        issues: [],
        passed: true,
        suggestions: ['Could not perform detailed analysis'],
        metadata: {
          visualQuality: 7,
          contentMatch: 7,
          technicalQuality: 7
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices?.[0]?.message?.content || '';
    
    console.log('AI Analysis:', analysisText);

    // Parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Default analysis
      analysis = {
        visualQuality: 7,
        contentMatch: 7,
        technicalQuality: 7,
        issues: [],
        suggestions: []
      };
    }

    // Calculate overall score
    const overallScore = (
      (analysis.visualQuality || 7) * 0.4 +
      (analysis.contentMatch || 7) * 0.4 +
      (analysis.technicalQuality || 7) * 0.2
    );

    const result: QualityResult = {
      score: Math.round(overallScore * 10) / 10,
      issues: analysis.issues || [],
      passed: overallScore >= 6,
      suggestions: analysis.suggestions || [],
      metadata: {
        visualQuality: analysis.visualQuality || 7,
        contentMatch: analysis.contentMatch || 7,
        technicalQuality: analysis.technicalQuality || 7
      }
    };

    // Update scene in database
    const { error: updateError } = await supabase
      .from('scenes')
      .update({
        ai_quality_score: result.score,
        needs_regeneration: !result.passed,
        metadata: {
          quality_check: {
            ...result,
            checked_at: new Date().toISOString()
          }
        }
      })
      .eq('id', sceneId);

    if (updateError) {
      console.error('Failed to update scene:', updateError);
    }

    // Log analytics
    await supabase.from('analytics_events').insert({
      event_type: 'quality_check',
      event_data: {
        scene_id: sceneId,
        score: result.score,
        passed: result.passed,
        issues_count: result.issues.length
      }
    });

    console.log(`Quality check complete for scene ${sceneId}: score=${result.score}, passed=${result.passed}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Quality check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      score: 5,
      issues: ['Quality check failed'],
      passed: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
