import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FFmpegScene {
  type: string;
  start?: number;
  end?: number;
  start_ms?: number;
  end_ms?: number;
  description?: string;
}

interface AnalysisData {
  source_video_id?: string;
  scenes?: FFmpegScene[];
  duration_sec?: number;
  duration_ms?: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: AnalysisData;
}

function validateAnalysisData(data: AnalysisData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check source_video_id
  if (!data.source_video_id) {
    errors.push("Missing source_video_id - RenderFlow won't know which file to process");
  }

  // Check scenes array
  if (!data.scenes || !Array.isArray(data.scenes)) {
    errors.push("Missing or invalid scenes array");
    return { valid: false, errors, warnings };
  }

  if (data.scenes.length === 0) {
    errors.push("Scenes array is empty - at least one scene required");
  }

  // Validate each scene
  let lastEndMs = 0;
  data.scenes.forEach((scene, index) => {
    const sceneId = `Scene ${index + 1} (${scene.type || 'unknown'})`;

    // Check for millisecond timestamps (preferred for FFmpeg)
    if (scene.start_ms === undefined || scene.end_ms === undefined) {
      if (scene.start !== undefined && scene.end !== undefined) {
        warnings.push(`${sceneId}: Using seconds instead of milliseconds - consider adding start_ms/end_ms for frame accuracy`);
      } else {
        errors.push(`${sceneId}: Missing timestamps (need start_ms/end_ms or start/end)`);
      }
    }

    // Check for contiguity
    const startMs = scene.start_ms ?? (scene.start ? scene.start * 1000 : 0);
    const endMs = scene.end_ms ?? (scene.end ? scene.end * 1000 : 0);

    if (index > 0 && Math.abs(startMs - lastEndMs) > 50) { // Allow 50ms tolerance
      warnings.push(`${sceneId}: Gap detected - starts at ${startMs}ms but previous scene ended at ${lastEndMs}ms`);
    }

    if (endMs <= startMs) {
      errors.push(`${sceneId}: Invalid duration - end (${endMs}ms) must be greater than start (${startMs}ms)`);
    }

    lastEndMs = endMs;
  });

  // Check duration consistency
  if (data.duration_ms && data.scenes.length > 0) {
    const lastScene = data.scenes[data.scenes.length - 1];
    const lastEndMs = lastScene.end_ms ?? (lastScene.end ? lastScene.end * 1000 : 0);
    
    if (Math.abs(lastEndMs - data.duration_ms) > 100) {
      warnings.push(`Duration mismatch: scenes end at ${lastEndMs}ms but total duration is ${data.duration_ms}ms`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Health check with optional data validation
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'renderflow-health',
        timestamp: new Date().toISOString(),
        capabilities: {
          validation: true,
          format: 'FFmpeg-compatible',
          required_fields: ['source_video_id', 'scenes'],
          scene_fields: ['type', 'start_ms', 'end_ms', 'description'],
          optional_fields: ['duration_sec', 'duration_ms', 'market', 'language']
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: Either ping check or validate analysis data
    if (req.method === 'POST') {
      const body = await req.json();
      
      // Simple ping check - just confirm the function is running
      if (body.ping === true && Object.keys(body).length === 1) {
        return new Response(JSON.stringify({
          success: true,
          status: 'healthy',
          service: 'renderflow-health',
          timestamp: new Date().toISOString(),
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Full validation of analysis data
      const analysisData: AnalysisData = body.analysis || body;
      
      console.log('[RenderFlow-Health] Validating analysis data:', JSON.stringify(analysisData, null, 2));
      
      const result = validateAnalysisData(analysisData);
      
      console.log(`[RenderFlow-Health] Validation result: ${result.valid ? 'VALID' : 'INVALID'}, ${result.errors.length} errors, ${result.warnings.length} warnings`);

      return new Response(JSON.stringify({
        success: true,
        validation: result,
        timestamp: new Date().toISOString(),
      }), {
        status: result.valid ? 200 : 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[RenderFlow-Health] Error:', error);
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
