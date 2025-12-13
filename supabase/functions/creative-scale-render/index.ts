import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface AudioTrack {
  track_id: string;
  source_url: string;
  start_ms: number;
  end_ms: number;
  volume: number;
  fade_in_ms: number;
  fade_out_ms: number;
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
  audio_tracks: AudioTrack[];
  validation: {
    total_duration_ms: number;
    segment_count: number;
    has_gaps: boolean;
    has_overlaps: boolean;
    warnings: string[];
  };
}

// Generate FFmpeg command for external execution
function generateFFmpegCommand(plan: ExecutionPlan): string {
  const mainSegments = plan.timeline.filter(s => s.track === 'main' || s.track === 'video');
  if (mainSegments.length === 0) {
    return '# No video segments found in plan';
  }

  const inputArgs: string[] = [];
  mainSegments.forEach((segment, i) => {
    inputArgs.push(`-i "${segment.asset_url}"`);
  });

  let filterComplex = '';
  if (mainSegments.length > 1) {
    for (let i = 0; i < mainSegments.length; i++) {
      const segment = mainSegments[i];
      const duration = segment.output_duration_ms / 1000;
      const speed = segment.speed_multiplier || 1.0;
      filterComplex += `[${i}:v]trim=duration=${duration},setpts=PTS/${speed}/STARTPTS,scale=${plan.output_format.width}:${plan.output_format.height}:force_original_aspect_ratio=decrease,pad=${plan.output_format.width}:${plan.output_format.height}:(ow-iw)/2:(oh-ih)/2[v${i}];`;
    }
    filterComplex += mainSegments.map((_, i) => `[v${i}]`).join('') + `concat=n=${mainSegments.length}:v=1:a=0[vout]`;
  } else {
    const speed = mainSegments[0].speed_multiplier || 1.0;
    filterComplex = `[0:v]setpts=PTS/${speed},scale=${plan.output_format.width}:${plan.output_format.height}:force_original_aspect_ratio=decrease,pad=${plan.output_format.width}:${plan.output_format.height}:(ow-iw)/2:(oh-ih)/2[vout]`;
  }

  const totalDuration = plan.validation.total_duration_ms / 1000;
  
  return `ffmpeg -y ${inputArgs.join(' ')} -filter_complex "${filterComplex}" -map "[vout]" -t ${Math.min(totalDuration, 60)} -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p output.mp4`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { execution_plan, user_id, variation_index } = await req.json();

    if (!execution_plan) {
      return new Response(
        JSON.stringify({ error: 'execution_plan is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[render] Received plan:', execution_plan.plan_id);
    console.log('[render] Timeline segments:', execution_plan.timeline?.length);
    console.log('[render] User:', user_id);

    // Supabase Edge Runtime does not support spawning subprocesses (FFmpeg)
    // Return the execution plan with FFmpeg command for external processing
    const ffmpegCommand = generateFFmpegCommand(execution_plan);
    
    console.log('[render] Generated FFmpeg command for external processing');

    // Return partial success with artifacts
    return new Response(
      JSON.stringify({
        success: false,
        partial_success: true,
        reason: 'cloud_ffmpeg_unavailable',
        message: 'Video rendering requires FFmpeg which is not available in Supabase Edge Runtime. The execution plan and FFmpeg command are provided for local processing.',
        execution_plan: execution_plan,
        ffmpeg_command: ffmpegCommand,
        artifacts: {
          plan_id: execution_plan.plan_id,
          timeline_segments: execution_plan.timeline?.length || 0,
          total_duration_ms: execution_plan.validation?.total_duration_ms,
          output_format: execution_plan.output_format,
        },
        download_available: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[render] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
