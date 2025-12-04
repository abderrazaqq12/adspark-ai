import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { 
      scriptId, 
      sceneVideoUrls, 
      voiceoverUrl, 
      outputFormat = "mp4",
      addSubtitles = false,
      addWatermark = false,
      transitionType = "fade",
      transitionDuration = 0.5
    } = await req.json();

    console.log("Assembling video for script:", scriptId);

    let videoUrls = sceneVideoUrls;
    let audioUrl = voiceoverUrl;

    // If scriptId provided, fetch scene videos and voiceover from database
    if (scriptId && !sceneVideoUrls) {
      const { data: scenes, error: scenesError } = await supabase
        .from("scenes")
        .select("id, index, video_url, text, duration_sec")
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
          url: s.video_url,
          duration: s.duration_sec || 5,
          text: s.text
        }));

      // Fetch voiceover URL from script metadata if not provided
      if (!voiceoverUrl) {
        const { data: script } = await supabase
          .from("scripts")
          .select("metadata")
          .eq("id", scriptId)
          .single();

        audioUrl = script?.metadata?.voiceover_url;
      }
    }

    if (!videoUrls || videoUrls.length === 0) {
      throw new Error("No video URLs provided or found");
    }

    console.log(`Processing ${videoUrls.length} video clips`);

    // Build FFmpeg filter complex for concatenation with transitions
    const inputCount = videoUrls.length;
    
    // Create input specifications
    const inputs = videoUrls.map((v: any) => {
      const url = typeof v === "string" ? v : v.url;
      return `-i "${url}"`;
    }).join(" ");

    // Build filter for video concatenation with transitions
    let filterComplex = "";
    
    if (transitionType === "fade" && inputCount > 1) {
      // Fade transition between clips
      for (let i = 0; i < inputCount; i++) {
        filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
      }
      
      // Chain videos with xfade
      let lastOutput = "v0";
      for (let i = 1; i < inputCount; i++) {
        const offset = i * 4.5; // Approximate offset based on clip duration
        const outputName = i === inputCount - 1 ? "vout" : `vf${i}`;
        filterComplex += `[${lastOutput}][v${i}]xfade=transition=fade:duration=${transitionDuration}:offset=${offset}[${outputName}];`;
        lastOutput = outputName;
      }
    } else {
      // Simple concatenation
      for (let i = 0; i < inputCount; i++) {
        filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`;
      }
      const concatInputs = Array.from({ length: inputCount }, (_, i) => `[v${i}]`).join("");
      filterComplex += `${concatInputs}concat=n=${inputCount}:v=1:a=0[vout];`;
    }

    // Add watermark if requested
    if (addWatermark) {
      filterComplex += `[vout]drawtext=text='Generated with AI':fontsize=24:fontcolor=white@0.5:x=w-tw-20:y=h-th-20[vfinal]`;
    } else {
      filterComplex = filterComplex.replace("[vout];", "[vfinal];");
      if (!filterComplex.includes("[vfinal]")) {
        filterComplex = filterComplex.slice(0, -1).replace(/\[vout\]$/, "[vfinal]");
      }
    }

    // Build the complete FFmpeg command
    let ffmpegCommand = `ffmpeg ${inputs}`;
    
    if (audioUrl) {
      ffmpegCommand += ` -i "${audioUrl}"`;
    }

    ffmpegCommand += ` -filter_complex "${filterComplex}"`;
    ffmpegCommand += ` -map "[vfinal]"`;
    
    if (audioUrl) {
      ffmpegCommand += ` -map ${inputCount}:a`;
    }

    // Output settings based on format
    const outputSettings: Record<string, string> = {
      mp4: "-c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k",
      webm: "-c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus",
      mov: "-c:v prores_ks -profile:v 3 -c:a pcm_s16le"
    };

    ffmpegCommand += ` ${outputSettings[outputFormat] || outputSettings.mp4}`;
    
    const outputFileName = `assembled_${scriptId || Date.now()}.${outputFormat}`;
    ffmpegCommand += ` -y ${outputFileName}`;

    console.log("FFmpeg command:", ffmpegCommand);

    // In a real implementation, this would execute FFmpeg
    // For now, we'll simulate the assembly process and create a video_output record

    // Create video output record
    const { data: videoOutput, error: outputError } = await supabase
      .from("video_outputs")
      .insert({
        script_id: scriptId,
        project_id: null, // Will be populated if needed
        status: "processing",
        format: outputFormat,
        has_subtitles: addSubtitles,
        has_watermark: addWatermark,
        metadata: {
          ffmpeg_command: ffmpegCommand,
          input_videos: videoUrls.length,
          has_voiceover: !!audioUrl,
          transition_type: transitionType,
          transition_duration: transitionDuration,
          user_id: user.id
        }
      })
      .select()
      .single();

    if (outputError) {
      console.error("Failed to create video output:", outputError);
      throw new Error("Failed to create video output record");
    }

    // Simulate processing (in production, this would be async with webhooks)
    // For demo purposes, we'll mark it as completed with a placeholder URL
    const simulatedUrl = `https://storage.example.com/videos/${outputFileName}`;

    await supabase
      .from("video_outputs")
      .update({
        status: "completed",
        final_video_url: simulatedUrl,
        duration_sec: videoUrls.reduce((acc: number, v: any) => {
          const duration = typeof v === "string" ? 5 : (v.duration || 5);
          return acc + duration;
        }, 0)
      })
      .eq("id", videoOutput.id);

    // Generate subtitle file content if requested
    let subtitleContent = null;
    if (addSubtitles && Array.isArray(videoUrls)) {
      let currentTime = 0;
      const srtLines: string[] = [];
      
      videoUrls.forEach((v: any, index: number) => {
        const text = typeof v === "string" ? "" : (v.text || "");
        const duration = typeof v === "string" ? 5 : (v.duration || 5);
        
        if (text) {
          const startTime = formatSrtTime(currentTime);
          const endTime = formatSrtTime(currentTime + duration);
          
          srtLines.push(`${index + 1}`);
          srtLines.push(`${startTime} --> ${endTime}`);
          srtLines.push(text);
          srtLines.push("");
        }
        
        currentTime += duration;
      });

      subtitleContent = srtLines.join("\n");
    }

    return new Response(
      JSON.stringify({
        success: true,
        videoOutputId: videoOutput.id,
        finalVideoUrl: simulatedUrl,
        ffmpegCommand,
        subtitleContent,
        message: "Video assembly initiated successfully"
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

// Helper function to format time for SRT subtitles
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}
