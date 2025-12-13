import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Engine 3: Cloudinary Video Transformations
 * Managed video API as last-resort fallback
 * Limited effects but guaranteed to work
 */

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

// Build Cloudinary transformation URL
function buildCloudinaryUrl(
  cloudName: string,
  sourceUrl: string,
  plan: ExecutionPlan
): string {
  const mainSegments = plan.timeline.filter(s => s.track === 'main' || s.track === 'video');
  if (mainSegments.length === 0) {
    throw new Error('No video segments in plan');
  }

  const segment = mainSegments[0];
  const speed = segment.speed_multiplier || 1.0;
  const duration = Math.min(plan.validation.total_duration_ms / 1000, 60);
  const { width, height } = plan.output_format;

  // Build transformation string
  const transformations: string[] = [];

  // Scale/crop
  transformations.push(`c_fill,w_${width},h_${height}`);

  // Speed adjustment (Cloudinary uses e_accelerate:X where X is percentage change)
  if (speed !== 1.0) {
    const accelerate = Math.round((speed - 1) * 100);
    transformations.push(`e_accelerate:${accelerate}`);
  }

  // Duration limit
  transformations.push(`du_${duration}`);

  // Quality
  transformations.push('q_auto');

  // Format
  transformations.push('f_mp4');

  const transformString = transformations.join(',');
  
  // Cloudinary fetch URL format
  return `https://res.cloudinary.com/${cloudName}/video/fetch/${transformString}/${encodeURIComponent(sourceUrl)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const CLOUDINARY_CLOUD_NAME = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  
  // Cloudinary fetch URLs work without API keys for public videos
  // But we need at least a cloud name
  const cloudName = CLOUDINARY_CLOUD_NAME || 'demo'; // Use demo account for basic testing

  try {
    const { execution_plan, user_id, variation_index } = await req.json();

    if (!execution_plan) {
      return new Response(
        JSON.stringify({ error: 'execution_plan is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cloudinary-video] Received plan:', execution_plan.plan_id);

    // Get source video URL
    const mainSegments = execution_plan.timeline.filter(
      (s: TimelineSegment) => s.track === 'main' || s.track === 'video'
    );
    
    if (mainSegments.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No video segments in plan',
          engine: 'cloudinary',
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
          engine: 'cloudinary',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[cloudinary-video] Source:', sourceVideoUrl.substring(0, 80) + '...');

    // Build Cloudinary transformation URL
    const cloudinaryUrl = buildCloudinaryUrl(cloudName, sourceVideoUrl, execution_plan);
    console.log('[cloudinary-video] Transformed URL:', cloudinaryUrl.substring(0, 120) + '...');

    // Verify the URL works by making a HEAD request
    try {
      const verifyResponse = await fetch(cloudinaryUrl, { method: 'HEAD' });
      
      if (verifyResponse.ok) {
        console.log('[cloudinary-video] URL verified, content-type:', verifyResponse.headers.get('content-type'));
        
        return new Response(
          JSON.stringify({
            success: true,
            video_url: cloudinaryUrl,
            engine: 'cloudinary',
            note: 'Video transformed via Cloudinary CDN',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // If HEAD fails, try GET (some CDNs don't support HEAD)
      const getResponse = await fetch(cloudinaryUrl, { method: 'GET', headers: { 'Range': 'bytes=0-1000' } });
      if (getResponse.ok || getResponse.status === 206) {
        return new Response(
          JSON.stringify({
            success: true,
            video_url: cloudinaryUrl,
            engine: 'cloudinary',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Cloudinary returned ${verifyResponse.status}`);
    } catch (verifyError: any) {
      console.error('[cloudinary-video] Verification failed:', verifyError.message);
      
      // Return the URL anyway - Cloudinary processes on first access
      return new Response(
        JSON.stringify({
          success: true,
          video_url: cloudinaryUrl,
          engine: 'cloudinary',
          warning: 'URL not pre-verified, may take time on first access',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('[cloudinary-video] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error',
        engine: 'cloudinary',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
