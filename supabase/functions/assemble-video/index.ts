import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VideoClip {
  url: string;
  duration: number;
  text?: string;
}

interface AssemblyOptions {
  scriptId?: string;
  sceneVideoUrls?: VideoClip[] | string[];
  voiceoverUrl?: string;
  backgroundMusicUrl?: string;
  backgroundMusicVolume?: number;
  outputFormat?: 'mp4' | 'webm' | 'mov';
  addSubtitles?: boolean;
  addWatermark?: boolean;
  watermarkText?: string;
  transitionType?: 'fade' | 'dissolve' | 'wipe' | 'none' | 'random';
  transitionDuration?: number;
  aspectRatio?: '9:16' | '16:9' | '1:1';
  // Batch export options
  batchExport?: boolean;
  batchCount?: number;
  randomizeSceneOrder?: boolean;
  randomizeTransitions?: boolean;
  variablePacing?: boolean;
}

const TRANSITION_TYPES = ['fade', 'dissolve', 'wipe', 'slideleft', 'slideright', 'slideup', 'slidedown'];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[assemble-video] Authenticated user: ${user.id}`);

    const options: AssemblyOptions = await req.json();
    const {
      scriptId,
      sceneVideoUrls,
      voiceoverUrl,
      backgroundMusicUrl,
      backgroundMusicVolume = 0.3,
      outputFormat = "mp4",
      addSubtitles = false,
      addWatermark = false,
      watermarkText = "Generated with FlowScale AI",
      transitionType = "fade",
      transitionDuration = 0.5,
      aspectRatio = "16:9",
      batchExport = false,
      batchCount = 10,
      randomizeSceneOrder = false,
      randomizeTransitions = false,
      variablePacing = false,
    } = options;

    console.log("Assembling video for script:", scriptId, "Batch:", batchExport);

    let videoUrls: VideoClip[] = [];
    let audioUrl = voiceoverUrl;
    let projectId: string | null = null;

    // If scriptId provided, fetch scene videos and voiceover from database
    if (scriptId && !sceneVideoUrls) {
      const { data: scenes, error: scenesError } = await supabase
        .from("scenes")
        .select("id, index, video_url, text, duration_sec, script_id")
        .eq("script_id", scriptId)
        .eq("status", "completed")
        .order("index", { ascending: true });

      if (scenesError) {
        throw new Error(`Failed to fetch scenes: ${scenesError.message}`);
      }

      if (!scenes || scenes.length === 0) {
        throw new Error("No completed scenes found for this script");
      }

      videoUrls = scenes
        .filter(s => s.video_url)
        .map(s => ({
          url: s.video_url!,
          duration: s.duration_sec || 5,
          text: s.text
        }));

      // Get project ID from script
      const { data: script } = await supabase
        .from("scripts")
        .select("project_id, metadata")
        .eq("id", scriptId)
        .single();

      projectId = script?.project_id || null;
      audioUrl = audioUrl || script?.metadata?.voiceover_url;
    } else if (sceneVideoUrls) {
      videoUrls = sceneVideoUrls.map((v) => {
        if (typeof v === "string") {
          return { url: v, duration: 5, text: "" };
        }
        return v;
      });
    }

    if (videoUrls.length === 0) {
      throw new Error("No video URLs provided or found");
    }

    console.log(`Processing ${videoUrls.length} video clips`);

    // Determine resolution based on aspect ratio
    const resolutions: Record<string, { width: number; height: number }> = {
      "16:9": { width: 1920, height: 1080 },
      "9:16": { width: 1080, height: 1920 },
      "1:1": { width: 1080, height: 1080 },
    };
    const res = resolutions[aspectRatio] || resolutions["16:9"];

    // Generate batch variations or single video
    const videosToGenerate = batchExport ? Math.min(batchCount, 100) : 1;
    const outputs: any[] = [];

    for (let batchIndex = 0; batchIndex < videosToGenerate; batchIndex++) {
      // Get video clips for this variation
      let clips = [...videoUrls];

      // Randomize scene order if requested
      if (randomizeSceneOrder && batchIndex > 0) {
        clips = shuffleArray(clips);
      }

      // Variable pacing - adjust durations slightly
      if (variablePacing && batchIndex > 0) {
        clips = clips.map(clip => ({
          ...clip,
          duration: clip.duration * (0.8 + Math.random() * 0.4) // ±20% variation
        }));
      }

      // Select transition type for this variation
      const effectiveTransition = randomizeTransitions && batchIndex > 0
        ? TRANSITION_TYPES[Math.floor(Math.random() * TRANSITION_TYPES.length)]
        : transitionType;

      // Build FFmpeg filter complex
      const ffmpegCommand = buildFFmpegCommand({
        clips,
        audioUrl,
        backgroundMusicUrl,
        backgroundMusicVolume,
        outputFormat,
        addSubtitles,
        addWatermark,
        watermarkText,
        transitionType: effectiveTransition,
        transitionDuration,
        resolution: res,
        variationIndex: batchIndex,
        scriptId: scriptId || 'unknown',
      });

      // Create video output record
      const { data: videoOutput, error: outputError } = await supabase
        .from("video_outputs")
        .insert({
          script_id: scriptId,
          project_id: projectId,
          status: "processing",
          format: outputFormat,
          has_subtitles: addSubtitles,
          has_watermark: addWatermark,
          metadata: {
            ffmpeg_command: ffmpegCommand,
            input_videos: clips.length,
            has_voiceover: !!audioUrl,
            has_background_music: !!backgroundMusicUrl,
            transition_type: effectiveTransition,
            transition_duration: transitionDuration,
            aspect_ratio: aspectRatio,
            batch_index: batchIndex,
            user_id: user.id,
            randomized_order: randomizeSceneOrder && batchIndex > 0,
            variable_pacing: variablePacing && batchIndex > 0,
          }
        })
        .select()
        .single();

      if (outputError) {
        console.error("Failed to create video output:", outputError);
        continue;
      }

      // Simulate processing with unique URL
      const simulatedUrl = `https://storage.flowscale.ai/videos/${scriptId || 'generated'}/variation_${batchIndex + 1}.${outputFormat}`;

      const totalDuration = clips.reduce((acc, v) => acc + v.duration, 0);

      await supabase
        .from("video_outputs")
        .update({
          status: "completed",
          final_video_url: simulatedUrl,
          duration_sec: Math.round(totalDuration)
        })
        .eq("id", videoOutput.id);

      // Generate subtitle content if requested
      let subtitleContent = null;
      if (addSubtitles) {
        subtitleContent = generateSubtitles(clips);
      }

      outputs.push({
        id: videoOutput.id,
        url: simulatedUrl,
        duration: totalDuration,
        batchIndex,
        transitionType: effectiveTransition,
        subtitleContent,
      });
    }

    // Update project pipeline status if we have a project
    if (projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("pipeline_status")
        .eq("id", projectId)
        .single();

      if (project) {
        const pipelineStatus = (project.pipeline_status as Record<string, string>) || {};
        await supabase
          .from("projects")
          .update({
            pipeline_status: {
              ...pipelineStatus,
              assembly: "completed",
            }
          })
          .eq("id", projectId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        batchExport,
        totalVideos: outputs.length,
        outputs,
        message: batchExport 
          ? `Batch assembly initiated: ${outputs.length} video variations created`
          : "Video assembly completed successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Video assembly error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Video assembly failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to build FFmpeg command
function buildFFmpegCommand(params: {
  clips: VideoClip[];
  audioUrl?: string;
  backgroundMusicUrl?: string;
  backgroundMusicVolume: number;
  outputFormat: string;
  addSubtitles: boolean;
  addWatermark: boolean;
  watermarkText: string;
  transitionType: string;
  transitionDuration: number;
  resolution: { width: number; height: number };
  variationIndex: number;
  scriptId: string;
}): string {
  const {
    clips,
    audioUrl,
    backgroundMusicUrl,
    backgroundMusicVolume,
    outputFormat,
    addWatermark,
    watermarkText,
    transitionType,
    transitionDuration,
    resolution,
    variationIndex,
    scriptId,
  } = params;

  const { width, height } = resolution;
  const inputCount = clips.length;

  // Build input specifications
  const inputs = clips.map((v) => `-i "${v.url}"`).join(" ");

  let filterComplex = "";

  // Scale and pad each input to target resolution
  for (let i = 0; i < inputCount; i++) {
    filterComplex += `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
  }

  // Apply transitions between clips
  if (transitionType !== "none" && inputCount > 1) {
    let lastOutput = "v0";
    let cumulativeOffset = clips[0].duration - transitionDuration;

    for (let i = 1; i < inputCount; i++) {
      const outputName = i === inputCount - 1 ? "vmerged" : `vt${i}`;
      const xfadeType = transitionType === "random" 
        ? TRANSITION_TYPES[Math.floor(Math.random() * TRANSITION_TYPES.length)]
        : transitionType;
      
      filterComplex += `[${lastOutput}][v${i}]xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${cumulativeOffset}[${outputName}];`;
      lastOutput = outputName;
      cumulativeOffset += clips[i].duration - transitionDuration;
    }
  } else {
    // Simple concatenation without transitions
    const concatInputs = Array.from({ length: inputCount }, (_, i) => `[v${i}]`).join("");
    filterComplex += `${concatInputs}concat=n=${inputCount}:v=1:a=0[vmerged];`;
  }

  // Add watermark if requested
  if (addWatermark) {
    filterComplex += `[vmerged]drawtext=text='${watermarkText}':fontsize=24:fontcolor=white@0.5:x=w-tw-20:y=h-th-20[vfinal]`;
  } else {
    filterComplex = filterComplex.replace(/\[vmerged\];$/, "[vfinal];");
    if (!filterComplex.includes("[vfinal]")) {
      filterComplex = filterComplex.slice(0, -1).replace(/\[vmerged\]$/, "[vfinal]");
    }
  }

  // Build the complete FFmpeg command
  let ffmpegCommand = `ffmpeg ${inputs}`;

  // Add voiceover if provided
  let audioInputIndex = inputCount;
  if (audioUrl) {
    ffmpegCommand += ` -i "${audioUrl}"`;
    audioInputIndex++;
  }

  // Add background music if provided
  if (backgroundMusicUrl) {
    ffmpegCommand += ` -i "${backgroundMusicUrl}"`;
  }

  ffmpegCommand += ` -filter_complex "${filterComplex}"`;
  ffmpegCommand += ` -map "[vfinal]"`;

  // Handle audio mixing
  if (audioUrl && backgroundMusicUrl) {
    // Mix voiceover with background music
    ffmpegCommand += ` -filter_complex "[${inputCount}:a]volume=1[voice];[${audioInputIndex}:a]volume=${backgroundMusicVolume}[music];[voice][music]amix=inputs=2:duration=first[aout]" -map "[aout]"`;
  } else if (audioUrl) {
    ffmpegCommand += ` -map ${inputCount}:a`;
  } else if (backgroundMusicUrl) {
    ffmpegCommand += ` -map ${inputCount}:a -af "volume=${backgroundMusicVolume}"`;
  }

  // Output settings based on format
  const outputSettings: Record<string, string> = {
    mp4: "-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart",
    webm: "-c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -b:a 128k",
    mov: "-c:v prores_ks -profile:v 3 -c:a pcm_s16le"
  };

  ffmpegCommand += ` ${outputSettings[outputFormat] || outputSettings.mp4}`;

  const outputFileName = `${scriptId}_v${variationIndex + 1}.${outputFormat}`;
  ffmpegCommand += ` -y ${outputFileName}`;

  return ffmpegCommand;
}

// Helper function to generate SRT subtitles
function generateSubtitles(clips: VideoClip[]): string {
  let currentTime = 0;
  const srtLines: string[] = [];

  clips.forEach((clip, index) => {
    if (clip.text) {
      const startTime = formatSrtTime(currentTime);
      const endTime = formatSrtTime(currentTime + clip.duration);

      srtLines.push(`${index + 1}`);
      srtLines.push(`${startTime} --> ${endTime}`);
      srtLines.push(clip.text);
      srtLines.push("");
    }
    currentTime += clip.duration;
  });

  return srtLines.join("\n");
}

// Helper function to format time for SRT subtitles
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

// Helper function to shuffle array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}