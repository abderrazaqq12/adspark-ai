import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimelineSegment {
  segment_id: string;
  track: 'main' | 'overlay' | 'video';
  asset_url: string;
  source_start_ms: number;
  source_duration_ms: number;
  timeline_start_ms: number;
  timeline_end_ms: number;
  output_duration_ms: number;
  speed_multiplier: number;
}

interface ExecutionPlan {
  plan_id: string;
  status: 'compilable' | 'uncompilable';
  output_format: {
    container: string;
    width: number;
    height: number;
    bitrate_kbps: number;
  };
  timeline: TimelineSegment[];
  audio_tracks: any[];
  validation: {
    total_duration_ms: number;
    segment_count: number;
    has_gaps: boolean;
    has_overlaps: boolean;
    warnings: string[];
  };
}

// Generate FFmpeg arguments for fal.ai
function generateFFmpegArgs(plan: ExecutionPlan, inputUrl: string): string[] {
  const mainSegments = plan.timeline.filter(s => s.track === 'main' || s.track === 'video');
  if (mainSegments.length === 0) {
    throw new Error('No video segments in plan');
  }

  const segment = mainSegments[0];
  const speed = segment.speed_multiplier || 1.0;
  const duration = Math.min(plan.validation.total_duration_ms / 1000, 60);
  const { width, height } = plan.output_format;

  // Build filter for speed and scaling
  let filter = `setpts=PTS/${speed},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

  return [
    '-y',
    '-i', inputUrl,
    '-vf', filter,
    '-t', String(duration),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-an', // No audio for now
    'output.mp4',
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const FAL_API_KEY = Deno.env.get('fal_ai');
  if (!FAL_API_KEY) {
    console.error('[cloud-ffmpeg] fal_ai API key not configured');
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'fal_ai API key not configured',
        engine: 'fal-ffmpeg',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { execution_plan, user_id, variation_index } = await req.json();

    if (!execution_plan) {
      return new Response(
        JSON.stringify({ error: 'execution_plan is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cloud-ffmpeg] Received plan:', execution_plan.plan_id);
    console.log('[cloud-ffmpeg] Timeline segments:', execution_plan.timeline?.length);

    // Get source video URL from first segment
    const mainSegments = execution_plan.timeline.filter(
      (s: TimelineSegment) => s.track === 'main' || s.track === 'video'
    );
    
    if (mainSegments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No video segments in plan',
          engine: 'fal-ffmpeg',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourceVideoUrl = mainSegments[0].asset_url;
    if (!sourceVideoUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Source video URL missing',
          engine: 'fal-ffmpeg',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cloud-ffmpeg] Source video:', sourceVideoUrl.substring(0, 80) + '...');

    // Generate FFmpeg arguments
    const ffmpegArgs = generateFFmpegArgs(execution_plan, sourceVideoUrl);
    console.log('[cloud-ffmpeg] FFmpeg args:', ffmpegArgs.join(' '));

    // Call fal.ai FFmpeg API
    // Using fal.ai's video transformation endpoint
    const falResponse = await fetch('https://queue.fal.run/fal-ai/ffmpeg', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: sourceVideoUrl,
        arguments: ffmpegArgs.join(' '),
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error('[cloud-ffmpeg] fal.ai error:', falResponse.status, errorText);
      
      // Check if it's a queue response (async processing)
      if (falResponse.status === 202) {
        const queueData = JSON.parse(errorText);
        console.log('[cloud-ffmpeg] Job queued:', queueData);
        
        // Poll for result (with timeout)
        const requestId = queueData.request_id;
        const statusUrl = `https://queue.fal.run/fal-ai/ffmpeg/requests/${requestId}/status`;
        
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds max
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
          
          const statusResponse = await fetch(statusUrl, {
            headers: { 'Authorization': `Key ${FAL_API_KEY}` },
          });
          
          const statusData = await statusResponse.json();
          console.log('[cloud-ffmpeg] Status:', statusData.status);
          
          if (statusData.status === 'COMPLETED') {
            // Get result
            const resultUrl = `https://queue.fal.run/fal-ai/ffmpeg/requests/${requestId}`;
            const resultResponse = await fetch(resultUrl, {
              headers: { 'Authorization': `Key ${FAL_API_KEY}` },
            });
            const resultData = await resultResponse.json();
            
            if (resultData.video?.url) {
              return new Response(
                JSON.stringify({
                  success: true,
                  video_url: resultData.video.url,
                  engine: 'fal-ffmpeg',
                  processing_time_ms: attempts * 1000,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else if (statusData.status === 'FAILED') {
            throw new Error(`fal.ai job failed: ${statusData.error || 'Unknown error'}`);
          }
        }
        
        throw new Error('fal.ai job timed out after 60 seconds');
      }
      
      throw new Error(`fal.ai API error: ${falResponse.status} ${errorText}`);
    }

    const falData = await falResponse.json();
    console.log('[cloud-ffmpeg] fal.ai response:', JSON.stringify(falData).substring(0, 200));

    // Check for video URL in response
    if (falData.video?.url || falData.output?.url || falData.url) {
      const videoUrl = falData.video?.url || falData.output?.url || falData.url;
      console.log('[cloud-ffmpeg] Success! Video URL:', videoUrl);

      return new Response(
        JSON.stringify({
          success: true,
          video_url: videoUrl,
          engine: 'fal-ffmpeg',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'No video URL in fal.ai response',
        engine: 'fal-ffmpeg',
        debug: JSON.stringify(falData).substring(0, 500),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[cloud-ffmpeg] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error',
        engine: 'fal-ffmpeg',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
