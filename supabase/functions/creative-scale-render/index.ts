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

// Download file from URL
async function downloadFile(url: string, outputPath: string): Promise<void> {
  console.log(`[render] Downloading: ${url.substring(0, 80)}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  await Deno.writeFile(outputPath, data);
  console.log(`[render] Downloaded ${data.length} bytes to: ${outputPath}`);
}

// Execute FFmpeg command
async function executeFFmpeg(args: string[], timeoutMs = 120000): Promise<{ success: boolean; stderr?: string; error?: string }> {
  console.log('[render] FFmpeg command:', ['ffmpeg', ...args.slice(0, 10), '...'].join(' '));
  
  try {
    const command = new Deno.Command('ffmpeg', {
      args: args,
      stdout: 'piped',
      stderr: 'piped',
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('FFmpeg timeout')), timeoutMs);
    });

    const process = command.spawn();
    
    const [stderr] = await Promise.race([
      Promise.all([
        new Response(process.stderr).text(),
      ]),
      timeoutPromise,
    ]) as [string];

    const status = await process.status;
    console.log('[render] FFmpeg exit code:', status.code);

    if (!status.success) {
      return {
        success: false,
        error: `FFmpeg exited with code ${status.code}`,
        stderr: stderr.substring(0, 500),
      };
    }

    return { success: true, stderr };
  } catch (err: any) {
    console.error('[render] FFmpeg error:', err);
    
    if (err.message?.includes('NotFound') || err.message?.includes('not found')) {
      return {
        success: false,
        error: 'FFmpeg not available in cloud environment',
      };
    }
    
    return {
      success: false,
      error: err.message || 'Unknown FFmpeg error',
    };
  }
}

// Simple video assembly from execution plan
async function assembleFromPlan(
  plan: ExecutionPlan,
  workDir: string,
  outputPath: string
): Promise<{ success: boolean; error?: string; stderr?: string }> {
  // Download source video from timeline segments (accept 'main' or 'video' track)
  const mainSegments = plan.timeline.filter(s => s.track === 'main' || s.track === 'video');
  if (mainSegments.length === 0) {
    return { success: false, error: `No video track segments in plan. Found tracks: ${plan.timeline.map(s => s.track).join(', ')}` };
  }

  const inputPaths: string[] = [];
  for (let i = 0; i < mainSegments.length; i++) {
    const segment = mainSegments[i];
    if (!segment.asset_url) {
      console.warn(`[render] Segment ${i} missing asset_url`);
      continue;
    }
    
    const inputPath = `${workDir}/input_${i}.mp4`;
    try {
      await downloadFile(segment.asset_url, inputPath);
      inputPaths.push(inputPath);
    } catch (err: any) {
      console.error(`[render] Failed to download segment ${i}:`, err.message);
    }
  }

  if (inputPaths.length === 0) {
    return { success: false, error: 'Failed to download any source videos' };
  }

  // Build FFmpeg command
  const inputArgs: string[] = [];
  inputPaths.forEach(path => {
    inputArgs.push('-i', path);
  });

  // Simple concat if multiple inputs, or just process single input
  let filterComplex = '';
  const totalDuration = plan.validation.total_duration_ms / 1000;
  
  if (inputPaths.length > 1) {
    // Build concat filter
    for (let i = 0; i < inputPaths.length; i++) {
      const segment = mainSegments[i];
      const duration = segment.output_duration_ms / 1000;
      const speed = segment.speed_multiplier || 1.0;
      
      filterComplex += `[${i}:v]trim=duration=${duration},setpts=PTS/${speed}/STARTPTS,scale=${plan.output_format.width}:${plan.output_format.height}:force_original_aspect_ratio=decrease,pad=${plan.output_format.width}:${plan.output_format.height}:(ow-iw)/2:(oh-ih)/2[v${i}];`;
    }
    filterComplex += inputPaths.map((_, i) => `[v${i}]`).join('') + `concat=n=${inputPaths.length}:v=1:a=0[vout]`;
  } else {
    // Single input with speed adjustment
    const segment = mainSegments[0];
    const speed = segment.speed_multiplier || 1.0;
    filterComplex = `[0:v]setpts=PTS/${speed},scale=${plan.output_format.width}:${plan.output_format.height}:force_original_aspect_ratio=decrease,pad=${plan.output_format.width}:${plan.output_format.height}:(ow-iw)/2:(oh-ih)/2[vout]`;
  }

  const args = [
    '-y',
    ...inputArgs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-t', String(Math.min(totalDuration, 60)), // Max 60 seconds
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    outputPath,
  ];

  const result = await executeFFmpeg(args);
  
  // Cleanup input files
  for (const path of inputPaths) {
    try { await Deno.remove(path); } catch {}
  }

  return result;
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create temp working directory
    const workDir = await Deno.makeTempDir({ prefix: 'creative_scale_' });
    const outputPath = `${workDir}/output.mp4`;

    console.log('[render] Work directory:', workDir);

    // Execute assembly
    const result = await assembleFromPlan(execution_plan, workDir, outputPath);

    if (!result.success) {
      // Cleanup
      try { await Deno.remove(workDir, { recursive: true }); } catch {}
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error,
          ffmpeg_stderr: result.stderr,
          fallback_available: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read output file
    const videoData = await Deno.readFile(outputPath);
    console.log('[render] Output size:', videoData.length, 'bytes');

    if (videoData.length < 1000) {
      try { await Deno.remove(workDir, { recursive: true }); } catch {}
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Output video too small',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to storage
    const storagePath = `${user_id || 'anonymous'}/creative_scale_${Date.now()}_v${variation_index || 0}.mp4`;
    
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(storagePath, videoData, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('[render] Upload error:', uploadError);
      try { await Deno.remove(workDir, { recursive: true }); } catch {}
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Upload failed: ${uploadError.message}`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(storagePath);

    // Cleanup
    try { await Deno.remove(workDir, { recursive: true }); } catch {}

    console.log('[render] Success! Video URL:', urlData.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        video_url: urlData.publicUrl,
        storage_path: storagePath,
        size_bytes: videoData.length,
        duration_ms: execution_plan.validation?.total_duration_ms,
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
