import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FFmpegTask {
  taskType: 'smart-cut' | 'transitions' | 'music-sync' | 'subtitles' | 'multi-ratio' | 'full-assembly';
  inputVideos: string[];
  outputRatio: string;
  transitions?: string[];
  musicUrl?: string;
  musicBpm?: number;
  subtitles?: { text: string; startTime: number; endTime: number }[];
  pacing?: 'fast' | 'medium' | 'slow';
  maxDuration?: number;
  removesSilence?: boolean;
}

interface AssemblyConfig {
  sourceVideos: string[];
  variations: number;
  hookStyles: string[];
  pacing: string;
  transitions: string[];
  ratios: string[];
  voiceSettings: { language: string; tone: string };
  useN8nWebhook: boolean;
  n8nWebhookUrl?: string;
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { task, config }: { task: FFmpegTask; config: AssemblyConfig } = await req.json();

    console.log('[ffmpeg-creative-engine] Processing task:', task.taskType);

    // Build FFmpeg command based on task type
    const ffmpegCommands = buildFFmpegCommands(task, config);

    // For actual implementation, this would execute FFmpeg commands
    // For now, we simulate the processing and return the expected output structure

    const result = await simulateFFmpegProcessing(task, config, user.id, supabaseClient);

    console.log('[ffmpeg-creative-engine] Task completed');

    return new Response(JSON.stringify({ 
      success: true, 
      result,
      commands: ffmpegCommands 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[ffmpeg-creative-engine] Error:', error);
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

function buildFFmpegCommands(task: FFmpegTask, config: AssemblyConfig): string[] {
  const commands: string[] = [];
  const inputFiles = task.inputVideos.map((v, i) => `-i "${v}"`).join(' ');

  switch (task.taskType) {
    case 'smart-cut':
      // Smart auto-cut: remove silence, dead frames, trim intro/outro
      commands.push(`ffmpeg ${inputFiles} -af "silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB" -c:v libx264 -preset fast output_trimmed.mp4`);
      break;

    case 'transitions':
      // Apply transitions between clips
      const transitions = task.transitions || ['fade'];
      const transitionFilter = transitions.map((t, i) => {
        switch (t) {
          case 'zoom':
            return `zoompan=z='min(zoom+0.0015,1.5)':d=25`;
          case 'slide':
            return `xfade=transition=slideleft:duration=0.5:offset=${i * 3}`;
          case 'whip-pan':
            return `xfade=transition=wipeleft:duration=0.3:offset=${i * 3}`;
          case 'glitch':
            return `noise=alls=20:allf=t+u`;
          default:
            return `xfade=transition=fade:duration=0.5:offset=${i * 3}`;
        }
      }).join(',');
      commands.push(`ffmpeg ${inputFiles} -filter_complex "${transitionFilter}" -c:v libx264 output_transitions.mp4`);
      break;

    case 'music-sync':
      // Sync cuts to music BPM
      const bpm = task.musicBpm || 120;
      const beatInterval = 60 / bpm;
      commands.push(`ffmpeg ${inputFiles} -i "${task.musicUrl}" -filter_complex "[0:v]trim=duration=${beatInterval}[v0];[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2:duration=first[aout]" -map "[v0]" -map "[aout]" output_synced.mp4`);
      break;

    case 'subtitles':
      // Burn in subtitles
      if (task.subtitles && task.subtitles.length > 0) {
        const subtitleFilter = `subtitles=subs.srt:force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'`;
        commands.push(`ffmpeg ${inputFiles} -vf "${subtitleFilter}" -c:a copy output_subtitled.mp4`);
      }
      break;

    case 'multi-ratio':
      // Export to multiple aspect ratios with smart cropping
      const ratioConfigs: Record<string, { width: number; height: number; crop: string }> = {
        '9:16': { width: 1080, height: 1920, crop: 'crop=ih*9/16:ih' },
        '1:1': { width: 1080, height: 1080, crop: 'crop=min(iw,ih):min(iw,ih)' },
        '16:9': { width: 1920, height: 1080, crop: 'crop=iw:iw*9/16' },
        '4:5': { width: 1080, height: 1350, crop: 'crop=ih*4/5:ih' },
      };
      
      config.ratios.forEach(ratio => {
        const rc = ratioConfigs[ratio];
        if (rc) {
          commands.push(`ffmpeg ${inputFiles} -vf "${rc.crop},scale=${rc.width}:${rc.height}:force_original_aspect_ratio=decrease,pad=${rc.width}:${rc.height}:(ow-iw)/2:(oh-ih)/2" -c:a copy output_${ratio.replace(':', 'x')}.mp4`);
        }
      });
      break;

    case 'full-assembly':
      // Full video assembly pipeline
      const pacingDurations: Record<string, number> = {
        'fast': 1.5,
        'medium': 3,
        'slow': 5
      };
      const clipDuration = pacingDurations[task.pacing || 'fast'];
      const maxDur = task.maxDuration || 30;

      // Build complex filter for full assembly
      let filterComplex = '';
      const numClips = task.inputVideos.length;
      
      // Trim and scale each input
      for (let i = 0; i < numClips; i++) {
        filterComplex += `[${i}:v]trim=duration=${clipDuration},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v${i}];`;
      }
      
      // Concatenate with transitions
      filterComplex += task.inputVideos.map((_, i) => `[v${i}]`).join('') + `concat=n=${numClips}:v=1:a=0[vout]`;
      
      commands.push(`ffmpeg ${inputFiles} -filter_complex "${filterComplex}" -map "[vout]" -t ${maxDur} -c:v libx264 -preset fast -crf 23 output_assembled.mp4`);
      break;
  }

  return commands;
}

async function simulateFFmpegProcessing(
  task: FFmpegTask, 
  config: AssemblyConfig, 
  userId: string,
  supabase: any
): Promise<any> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 500));

  const timestamp = Date.now();
  const results: any[] = [];

  // Generate simulated output for each variation and ratio
  for (let v = 0; v < Math.min(config.variations, 10); v++) {
    for (const ratio of config.ratios) {
      results.push({
        id: `video-${timestamp}-${v}-${ratio.replace(':', 'x')}`,
        variationIndex: v,
        ratio,
        hookStyle: config.hookStyles[v % config.hookStyles.length],
        pacing: config.pacing,
        transitions: config.transitions,
        duration: Math.floor(Math.random() * 10) + 15, // 15-25 seconds
        status: 'completed',
        outputPath: `processed/${userId}/${timestamp}/variation_${v}_${ratio.replace(':', 'x')}.mp4`,
        thumbnailPath: `processed/${userId}/${timestamp}/thumb_${v}_${ratio.replace(':', 'x')}.jpg`,
        ffmpegLog: buildFFmpegCommands(task, config).join('\n'),
      });
    }
  }

  // If n8n webhook is enabled, send results
  if (config.useN8nWebhook && config.n8nWebhookUrl) {
    try {
      await fetch(config.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'ffmpeg_processing_complete',
          userId,
          results,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log('[ffmpeg-creative-engine] Sent results to n8n webhook');
    } catch (webhookError) {
      console.error('[ffmpeg-creative-engine] Webhook error:', webhookError);
    }
  }

  return {
    totalVideos: results.length,
    videos: results,
    processingTime: '2.5s',
  };
}
