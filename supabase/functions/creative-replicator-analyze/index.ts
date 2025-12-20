import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, isAIAvailable } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  videoUrl: string;
  fileName: string;
  duration: number;
  market?: string;
  language?: string;
  sourceVideoId?: string; // Optional: explicit ID for RenderFlow
}

interface FFmpegScene {
  type: string;
  start: number;      // seconds (legacy)
  end: number;        // seconds (legacy)
  start_ms: number;   // milliseconds for frame-accuracy
  end_ms: number;     // milliseconds for frame-accuracy
  style?: string;
  description: string;
}

// Extract source video ID from filename for RenderFlow compatibility
function extractSourceVideoId(fileName?: string): string {
  if (!fileName) {
    return `video_${Date.now()}`;
  }
  // Remove extension and path, keep just the ID/name
  const baseName = fileName.split('/').pop() || fileName;
  const withoutExt = baseName.replace(/\.[^/.]+$/, '');
  return withoutExt || `video_${Date.now()}`;
}

// Convert seconds to milliseconds with frame alignment (assuming 30fps)
function toFrameAlignedMs(seconds: number, fps = 30): number {
  const frameDurationMs = 1000 / fps;
  const frames = Math.round(seconds * fps);
  return Math.round(frames * frameDurationMs);
}

// Ensure scenes are contiguous and don't exceed duration
function normalizeScenes(scenes: any[], durationSec: number): FFmpegScene[] {
  if (!scenes || scenes.length === 0) {
    // Fallback: single scene covering entire video
    const durationMs = toFrameAlignedMs(durationSec);
    return [{
      type: "full",
      start: 0,
      end: durationSec,
      start_ms: 0,
      end_ms: durationMs,
      description: "Full video"
    }];
  }

  const normalized: FFmpegScene[] = [];
  let currentMs = 0;
  const maxDurationMs = toFrameAlignedMs(durationSec);

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const startSec = scene.start ?? 0;
    const endSec = scene.end ?? durationSec;
    
    // Calculate frame-aligned milliseconds
    let startMs = toFrameAlignedMs(startSec);
    let endMs = toFrameAlignedMs(endSec);
    
    // Ensure contiguity: this scene starts where the last one ended
    if (i > 0) {
      startMs = currentMs;
    }
    
    // Ensure we don't exceed total duration
    if (endMs > maxDurationMs) {
      endMs = maxDurationMs;
    }
    
    // Skip invalid scenes (start >= end)
    if (startMs >= endMs) {
      continue;
    }
    
    normalized.push({
      type: scene.type || "segment",
      start: startMs / 1000,
      end: endMs / 1000,
      start_ms: startMs,
      end_ms: endMs,
      style: scene.style,
      description: scene.description || `Segment ${i + 1}`
    });
    
    currentMs = endMs;
  }
  
  // If we have a gap at the end, extend the last scene
  if (normalized.length > 0 && currentMs < maxDurationMs) {
    const lastScene = normalized[normalized.length - 1];
    lastScene.end_ms = maxDurationMs;
    lastScene.end = maxDurationMs / 1000;
  }
  
  return normalized;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase (for future DB storage if needed)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const requestBody = await req.json();
    const { fileName, market = "Saudi Arabia", language = "Arabic", sourceVideoId } = requestBody;
    
    // Parse duration robustly - handle string, number, undefined
    let duration = requestBody.duration;
    if (typeof duration === 'string') {
      duration = parseFloat(duration);
    }
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
      console.log(`[AI-Brain] Invalid duration received: ${JSON.stringify(requestBody.duration)}, defaulting to 30s`);
      duration = 30; // Default to 30 seconds if invalid
    }
    
    // Extract source video ID for RenderFlow compatibility
    const videoId = sourceVideoId || extractSourceVideoId(fileName);
    const durationMs = toFrameAlignedMs(duration);

    console.log(`[AI-Brain] Analyzing ${fileName} (${duration}s / ${durationMs}ms) for ${market}/${language}`);
    console.log(`[AI-Brain] Source Video ID for RenderFlow: ${videoId}`);

    if (!isAIAvailable()) {
      throw new Error('No AI provider configured. Please add Gemini or OpenAI API key.');
    }

    // 1. AI BRAIN: PLANNER ONLY
    // We strictly separate planning from execution.
    // This prompt generates a Scene Plan JSON.
    const analysisPrompt = `
      You are a Senior Video Ad Strategist. 
      Analyze the video context based on filename "${fileName}" (Duration: ${duration}s).
      Target Market: ${market}
      Language: ${language}

      OBJECTIVE:
      Break this video down into a high-converting Direct Response structure.
      You must identify where to cut the video to create a perfect ad flow.

      REQUIRED JSON STRUCTURE (Return ONLY this JSON):
      {
        "scenes": [
          { "type": "hook", "start": 0, "end": 3, "style": "fast", "description": "Visual hook to stop scroll" },
          { "type": "problem", "start": 3, "end": 7, "description": "Agitate the user pain point" },
          { "type": "solution", "start": 7, "end": 12, "description": "Introduce product as solution" },
          { "type": "benefits", "start": 12, "end": 18, "description": "Key features and social proof" },
          { "type": "cta", "start": 18, "end": ${duration}, "description": "Strong call to action" }
        ],
        "variants": 5,
        "market": "${market}",
        "language": "${language}",
        "hook": "shock", // Main hook angle
        "pacing": "fast", // fast, medium, slow
        "style": "UGC", // UGC, Cinematic, etc.
        "transcript": "Brief summary of the ad content",
        "strategy": {
          "pacing": "fast",
          "tone": "energetic",
          "hook_angle": "shock"
        }
      }

      RULES:
      1. 'scenes' must cover the entire duration if possible, or key parts.
      2. 'start' and 'end' are in seconds.
      3. Ensure 'end' > 'start'.
      4. Do not exceed ${duration} seconds.
      5. Adjust scene lengths based on the requested 'fast' or 'medium' pacing associated with the market.
      6. Return ONLY valid JSON. No markdown.
    `;

    // Using the new AI Gateway (Gemini primary, OpenAI fallback)
    console.log(`[AI-Brain] Calling AI provider...`);
    
    const aiResponse = await callAI({
      messages: [
        { role: 'system', content: "You are a JSON-only API. You must output minified JSON with no markdown formatting." },
        { role: 'user', content: analysisPrompt }
      ],
      temperature: 0.2, // Low temperature for deterministic output
    });

    const content = aiResponse.content;

    // Enhanced logging for debugging
    console.log(`[AI-Brain] AI Provider: ${aiResponse.provider}`);
    console.log(`[AI-Brain] Response length: ${content?.length || 0} chars`);
    console.log(`[AI-Brain] Response type: ${typeof content}`);
    console.log(`[AI-Brain] Response preview (first 300 chars): ${content?.substring(0, 300) || 'EMPTY'}`);
    console.log(`[AI-Brain] Response preview (last 200 chars): ${content?.substring((content?.length || 0) - 200) || 'EMPTY'}`);

    if (!content) {
      console.error('[AI-Brain] Empty response from AI');
      console.error('[AI-Brain] Full AI response object:', JSON.stringify(aiResponse, null, 2));
      throw new Error('AI returned empty response');
    }

    // Robust JSON Parsing
    let analysis;
    try {
      console.log(`[AI-Brain] Parsing JSON response...`);
      let cleanContent = content.trim();
      
      // Check for markdown blocks
      if (cleanContent.includes('```json')) {
        console.log(`[AI-Brain] Detected markdown json block`);
        cleanContent = cleanContent.replace(/```json\n?|\n?```/g, '').trim();
      } else if (cleanContent.includes('```')) {
        console.log(`[AI-Brain] Detected plain markdown block`);
        cleanContent = cleanContent.replace(/```\n?|\n?```/g, '').trim();
      }
      
      // Try to find JSON object if not starting with {
      if (!cleanContent.startsWith('{')) {
        console.log(`[AI-Brain] Content doesn't start with {, searching for JSON object`);
        const jsonStart = cleanContent.indexOf('{');
        const jsonEnd = cleanContent.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
          console.log(`[AI-Brain] Extracted JSON from position ${jsonStart} to ${jsonEnd}`);
        }
      }
      
      console.log(`[AI-Brain] Final content length: ${cleanContent.length}`);
      console.log(`[AI-Brain] Final content preview: ${cleanContent.substring(0, 200)}...`);
      
      const rawAnalysis = JSON.parse(cleanContent);
      console.log(`[AI-Brain] JSON parsed successfully, keys: ${Object.keys(rawAnalysis).join(', ')}`);
      
      // Normalize scenes for FFmpeg compatibility
      const normalizedScenes = normalizeScenes(rawAnalysis.scenes, duration);
      
      analysis = {
        ...rawAnalysis,
        scenes: normalizedScenes,
        source_video_id: videoId,
        duration_sec: duration,
        duration_ms: durationMs,
        market,
        language
      };
      
      console.log(`[AI-Brain] Normalized ${normalizedScenes.length} scenes, total coverage: ${normalizedScenes[normalizedScenes.length - 1]?.end_ms || 0}ms`);
      
    } catch (parseError) {
      console.error('[AI-Brain] JSON Parse Error:', parseError);
      console.error('[AI-Brain] Parse error message:', parseError instanceof Error ? parseError.message : String(parseError));
      console.error('[AI-Brain] Raw content (full):', content);
      console.error('[AI-Brain] Content type:', typeof content);
      console.error('[AI-Brain] Content JSON stringified:', JSON.stringify(content));

      // Fallback Plan with frame-accurate timestamps
      console.log(`[AI-Brain] Using fallback scene plan`);
      const hookEndMs = toFrameAlignedMs(3);
      const ctaStartMs = toFrameAlignedMs(duration - 3);
      const fallbackDurationMs = toFrameAlignedMs(duration);
      
      analysis = {
        scenes: [
          { type: "hook", start: 0, end: 3, start_ms: 0, end_ms: hookEndMs, style: "fast", description: "Hook" },
          { type: "body", start: 3, end: duration - 3, start_ms: hookEndMs, end_ms: ctaStartMs, description: "Main Content" },
          { type: "cta", start: duration - 3, end: duration, start_ms: ctaStartMs, end_ms: fallbackDurationMs, description: "Call to Action" }
        ],
        source_video_id: videoId,
        duration_sec: duration,
        duration_ms: fallbackDurationMs,
        market,
        language,
        fallback: true,
        parseError: parseError instanceof Error ? parseError.message : String(parseError)
      };
    }

    console.log(`[AI-Brain] Plan generated successfully via ${aiResponse.provider}`);
    console.log(`[AI-Brain] Output for RenderFlow: source_video_id=${analysis.source_video_id}, scenes=${analysis.scenes.length}`);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      provider: aiResponse.provider
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[AI-Brain] Critical Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
