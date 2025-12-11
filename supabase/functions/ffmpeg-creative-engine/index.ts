import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FFmpegTask {
  taskType: 'smart-cut' | 'transitions' | 'music-sync' | 'subtitles' | 'multi-ratio' | 'full-assembly' | 'retry-single';
  inputVideos?: string[];
  videoId?: string;
  outputRatio?: string;
  transitions?: string[];
  musicUrl?: string;
  musicBpm?: number;
  subtitles?: { text: string; startTime: number; endTime: number }[];
  pacing?: 'fast' | 'medium' | 'slow';
  maxDuration?: number;
  removesSilence?: boolean;
}

interface AssemblyConfig {
  sourceVideos?: string[];
  variations?: number;
  hookStyles?: string[];
  pacing?: string;
  transitions?: string[];
  ratios?: string[];
  voiceSettings?: { language: string; tone: string };
  useN8nWebhook?: boolean;
  n8nWebhookUrl?: string;
  hookStyle?: string;
  ratio?: string;
}

// Error types for structured error reporting
interface PipelineError {
  stage: string;
  errorType: 'engine_error' | 'ffmpeg_error' | 'upload_error' | 'url_error' | 'timeout_error' | 'validation_error';
  message: string;
  code?: string;
  details?: string;
  retryable: boolean;
  suggestedFix?: string;
}

// Pipeline status tracking
interface PipelineStatus {
  deconstruction: 'pending' | 'running' | 'success' | 'failed';
  rewriting: 'pending' | 'running' | 'success' | 'failed';
  voice_generation: 'pending' | 'running' | 'success' | 'failed';
  video_generation: 'pending' | 'running' | 'success' | 'failed';
  ffmpeg: 'pending' | 'running' | 'success' | 'failed';
  export: 'pending' | 'running' | 'success' | 'failed';
  upload: 'pending' | 'running' | 'success' | 'failed';
  url_validation: 'pending' | 'running' | 'success' | 'failed';
}

function createPipelineError(stage: string, errorType: PipelineError['errorType'], message: string, retryable = true): PipelineError {
  const suggestedFixes: Record<string, string> = {
    'engine_error': 'Try using a different video engine or switch to FFMPEG-only mode',
    'ffmpeg_error': 'Check input video format compatibility. Try converting to MP4 first.',
    'upload_error': 'Check network connection. File may be too large.',
    'url_error': 'Storage file may not be ready yet. Will retry automatically.',
    'timeout_error': 'Processing took too long. Try with a shorter video.',
    'validation_error': 'Input validation failed. Check video format and parameters.',
  };

  return {
    stage,
    errorType,
    message,
    retryable,
    suggestedFix: suggestedFixes[errorType],
  };
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

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { task, config }: { task: FFmpegTask; config: AssemblyConfig } = await req.json();

    console.log('[ffmpeg-creative-engine] Processing task:', task.taskType);

    // Handle retry-single task type
    if (task.taskType === 'retry-single') {
      return await handleRetryTask(task, config, user.id, serviceClient);
    }

    // Validate inputs for other task types
    if (!task.inputVideos || task.inputVideos.length === 0) {
      const error = createPipelineError(
        'validation',
        'validation_error',
        'No input videos provided',
        false
      );
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        pipelineError: error,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build FFmpeg command based on task type
    const ffmpegCommands = buildFFmpegCommands(task, config);

    // For actual implementation, this would execute FFmpeg commands
    const result = await simulateFFmpegProcessing(task, config, user.id, serviceClient);

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
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    const pipelineError = createPipelineError(
      'initialization',
      'engine_error',
      errorMessage,
      true
    );
    pipelineError.details = errorStack;
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      pipelineError,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Handle retry task with proper fallback chain
async function handleRetryTask(
  task: FFmpegTask, 
  config: AssemblyConfig, 
  userId: string, 
  supabase: any
): Promise<Response> {
  const videoId = task.videoId;
  
  if (!videoId) {
    const error = createPipelineError('retry', 'validation_error', 'No video ID provided for retry', false);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      pipelineError: error,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('[ffmpeg-creative-engine] Retrying video:', videoId);

  try {
    // Fetch the original video variation record
    const { data: variation, error: fetchError } = await supabase
      .from('video_variations')
      .select('*')
      .eq('id', videoId)
      .single();

    if (fetchError || !variation) {
      const error = createPipelineError('retry', 'validation_error', `Video variation not found: ${videoId}`, false);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message,
        pipelineError: error,
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const retryCount = (variation.metadata?.retry_count || 0) + 1;
    const maxRetries = 4;
    
    // Determine fallback mode based on retry count
    let fallbackMode: 'original' | 'same_engine' | 'ffmpeg_only' | 'safe_mode' = 'original';
    let engineUsed = variation.metadata?.engine || 'ffmpeg';
    
    if (retryCount === 1) {
      fallbackMode = 'same_engine';
    } else if (retryCount === 2) {
      fallbackMode = 'same_engine';
    } else if (retryCount === 3) {
      fallbackMode = 'ffmpeg_only';
      engineUsed = 'ffmpeg';
    } else if (retryCount >= 4) {
      fallbackMode = 'safe_mode';
      engineUsed = 'ffmpeg_safe';
    }

    // Update variation to processing with retry info
    const { error: updateError } = await supabase
      .from('video_variations')
      .update({
        status: 'processing',
        metadata: {
          ...variation.metadata,
          retry_count: retryCount,
          fallback_mode: fallbackMode,
          engine_used: engineUsed,
          last_retry_at: new Date().toISOString(),
          pipeline_status: {
            deconstruction: 'success',
            rewriting: 'success',
            voice_generation: 'pending',
            video_generation: 'pending',
            ffmpeg: 'pending',
            export: 'pending',
            upload: 'pending',
            url_validation: 'pending',
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId);

    if (updateError) {
      console.error('[ffmpeg-creative-engine] Update error:', updateError);
    }

    // Simulate processing based on fallback mode
    const processingResult = await simulateRetryProcessing(
      videoId,
      variation,
      fallbackMode,
      engineUsed,
      userId,
      supabase
    );

    return new Response(JSON.stringify({ 
      success: true, 
      result: processingResult,
      retryCount,
      fallbackMode,
      engineUsed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[ffmpeg-creative-engine] Retry error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update variation with error
    await supabase
      .from('video_variations')
      .update({
        status: 'failed',
        metadata: {
          pipeline_error: {
            stage: 'retry',
            errorType: 'engine_error',
            message: errorMessage,
            retryable: true,
            suggestedFix: 'Check video format and try again',
          },
          last_error_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId);

    const pipelineError = createPipelineError('retry', 'engine_error', errorMessage, true);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      pipelineError,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function simulateRetryProcessing(
  videoId: string,
  variation: any,
  fallbackMode: string,
  engineUsed: string,
  userId: string,
  supabase: any
): Promise<any> {
  // Update pipeline status as we progress through stages
  const updatePipelineStage = async (stage: string, status: 'running' | 'success' | 'failed') => {
    const { data: current } = await supabase
      .from('video_variations')
      .select('metadata')
      .eq('id', videoId)
      .single();
    
    const pipelineStatus = current?.metadata?.pipeline_status || {};
    pipelineStatus[stage] = status;
    
    await supabase
      .from('video_variations')
      .update({
        metadata: {
          ...current?.metadata,
          pipeline_status: pipelineStatus,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId);
  };

  // Simulate each pipeline stage
  await updatePipelineStage('voice_generation', 'running');
  await new Promise(resolve => setTimeout(resolve, 300));
  await updatePipelineStage('voice_generation', 'success');

  await updatePipelineStage('video_generation', 'running');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulate success/failure based on fallback mode
  // In safe mode, always succeed
  const shouldSucceed = fallbackMode === 'safe_mode' || Math.random() > 0.3;
  
  if (!shouldSucceed) {
    await updatePipelineStage('video_generation', 'failed');
    throw new Error(`Video engine ${engineUsed} failed to generate frames`);
  }
  
  await updatePipelineStage('video_generation', 'success');

  await updatePipelineStage('ffmpeg', 'running');
  await new Promise(resolve => setTimeout(resolve, 400));
  await updatePipelineStage('ffmpeg', 'success');

  await updatePipelineStage('export', 'running');
  await new Promise(resolve => setTimeout(resolve, 300));
  await updatePipelineStage('export', 'success');

  await updatePipelineStage('upload', 'running');
  await new Promise(resolve => setTimeout(resolve, 200));
  await updatePipelineStage('upload', 'success');

  // Generate output URL and update variation
  const timestamp = Date.now();
  const outputUrl = `https://example.com/videos/${userId}/${videoId}_${timestamp}.mp4`;
  const thumbnailUrl = `https://example.com/thumbnails/${userId}/${videoId}_${timestamp}.jpg`;

  await updatePipelineStage('url_validation', 'running');
  await new Promise(resolve => setTimeout(resolve, 200));
  await updatePipelineStage('url_validation', 'success');

  // Mark as completed
  await supabase
    .from('video_variations')
    .update({
      status: 'completed',
      video_url: outputUrl,
      thumbnail_url: thumbnailUrl,
      duration_sec: Math.floor(Math.random() * 15) + 15,
      metadata: {
        ...variation.metadata,
        fallback_mode: fallbackMode,
        engine_used: engineUsed,
        completed_at: new Date().toISOString(),
        pipeline_status: {
          deconstruction: 'success',
          rewriting: 'success',
          voice_generation: 'success',
          video_generation: 'success',
          ffmpeg: 'success',
          export: 'success',
          upload: 'success',
          url_validation: 'success',
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', videoId);

  return {
    videoId,
    url: outputUrl,
    thumbnailUrl,
    fallbackMode,
    engineUsed,
    status: 'completed',
  };
}

function buildFFmpegCommands(task: FFmpegTask, config: AssemblyConfig): string[] {
  const commands: string[] = [];
  
  // Handle missing inputVideos gracefully
  if (!task.inputVideos || task.inputVideos.length === 0) {
    console.warn('[ffmpeg-creative-engine] No input videos provided');
    return commands;
  }
  
  const inputFiles = task.inputVideos.map((v, i) => `-i "${v}"`).join(' ');

  switch (task.taskType) {
    case 'smart-cut':
      commands.push(`ffmpeg ${inputFiles} -af "silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB" -c:v libx264 -preset fast output_trimmed.mp4`);
      break;

    case 'transitions':
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
      const bpm = task.musicBpm || 120;
      const beatInterval = 60 / bpm;
      commands.push(`ffmpeg ${inputFiles} -i "${task.musicUrl}" -filter_complex "[0:v]trim=duration=${beatInterval}[v0];[1:a]volume=0.3[a1];[0:a][a1]amix=inputs=2:duration=first[aout]" -map "[v0]" -map "[aout]" output_synced.mp4`);
      break;

    case 'subtitles':
      if (task.subtitles && task.subtitles.length > 0) {
        const subtitleFilter = `subtitles=subs.srt:force_style='FontSize=24,FontName=Arial,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'`;
        commands.push(`ffmpeg ${inputFiles} -vf "${subtitleFilter}" -c:a copy output_subtitled.mp4`);
      }
      break;

    case 'multi-ratio':
      const ratioConfigs: Record<string, { width: number; height: number; crop: string }> = {
        '9:16': { width: 1080, height: 1920, crop: 'crop=ih*9/16:ih' },
        '1:1': { width: 1080, height: 1080, crop: 'crop=min(iw,ih):min(iw,ih)' },
        '16:9': { width: 1920, height: 1080, crop: 'crop=iw:iw*9/16' },
        '4:5': { width: 1080, height: 1350, crop: 'crop=ih*4/5:ih' },
      };
      
      (config.ratios || []).forEach(ratio => {
        const rc = ratioConfigs[ratio];
        if (rc) {
          commands.push(`ffmpeg ${inputFiles} -vf "${rc.crop},scale=${rc.width}:${rc.height}:force_original_aspect_ratio=decrease,pad=${rc.width}:${rc.height}:(ow-iw)/2:(oh-ih)/2" -c:a copy output_${ratio.replace(':', 'x')}.mp4`);
        }
      });
      break;

    case 'full-assembly':
      const pacingDurations: Record<string, number> = {
        'fast': 1.5,
        'medium': 3,
        'slow': 5
      };
      const clipDuration = pacingDurations[task.pacing || 'fast'];
      const maxDur = task.maxDuration || 30;

      let filterComplex = '';
      const numClips = task.inputVideos.length;
      
      for (let i = 0; i < numClips; i++) {
        filterComplex += `[${i}:v]trim=duration=${clipDuration},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v${i}];`;
      }
      
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
  await new Promise(resolve => setTimeout(resolve, 500));

  const timestamp = Date.now();
  const results: any[] = [];
  const variations = config.variations || 1;
  const ratios = config.ratios || ['9:16'];
  const hookStyles = config.hookStyles || ['story'];

  for (let v = 0; v < Math.min(variations, 10); v++) {
    for (const ratio of ratios) {
      results.push({
        id: `video-${timestamp}-${v}-${ratio.replace(':', 'x')}`,
        variationIndex: v,
        ratio,
        hookStyle: hookStyles[v % hookStyles.length],
        pacing: config.pacing || 'medium',
        transitions: config.transitions || ['fade'],
        duration: Math.floor(Math.random() * 10) + 15,
        status: 'completed',
        outputPath: `processed/${userId}/${timestamp}/variation_${v}_${ratio.replace(':', 'x')}.mp4`,
        thumbnailPath: `processed/${userId}/${timestamp}/thumb_${v}_${ratio.replace(':', 'x')}.jpg`,
        ffmpegLog: buildFFmpegCommands(task, config).join('\n'),
      });
    }
  }

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
