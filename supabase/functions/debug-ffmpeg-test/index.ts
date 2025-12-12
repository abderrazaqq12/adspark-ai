import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DebugResult {
  success: boolean;
  step: string;
  error?: string;
  videoUrl?: string;
  ffmpegAvailable: boolean;
  executionTimeMs: number;
  logs: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => {
    const ts = Date.now() - startTime;
    logs.push(`[${ts}ms] ${msg}`);
    console.log(`[debug-ffmpeg-test] ${msg}`);
  };

  try {
    log("Starting debug FFMPEG test");

    const { videoUrl } = await req.json();
    if (!videoUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "input_validation",
          error: "No videoUrl provided",
          ffmpegAvailable: false,
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    log(`Input video: ${videoUrl}`);

    // Step 1: Check if FFMPEG subprocess is allowed
    log("Testing subprocess availability...");
    let ffmpegAvailable = false;
    let subprocessError: string | null = null;

    try {
      const testCmd = new Deno.Command("ffmpeg", {
        args: ["-version"],
        stdout: "piped",
        stderr: "piped",
      });
      const testResult = await testCmd.output();
      ffmpegAvailable = testResult.success;
      log(`FFMPEG version check: ${ffmpegAvailable ? "SUCCESS" : "FAILED"}`);
    } catch (err) {
      subprocessError = err instanceof Error ? err.message : String(err);
      log(`FFMPEG subprocess blocked: ${subprocessError}`);
    }

    if (!ffmpegAvailable) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "ffmpeg_availability",
          error: subprocessError || "FFMPEG not available - Supabase Edge Runtime blocks subprocesses",
          ffmpegAvailable: false,
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Step 2: Download input video
    log("Downloading input video...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "download_input",
          error: `Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`,
          ffmpegAvailable,
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const videoBytes = await videoResponse.arrayBuffer();
    log(`Downloaded ${videoBytes.byteLength} bytes`);

    // Step 3: Write to temp file
    const workDir = `/tmp/debug_${Date.now()}`;
    await Deno.mkdir(workDir, { recursive: true });
    const inputPath = `${workDir}/input.mp4`;
    const outputPath = `${workDir}/output.mp4`;

    await Deno.writeFile(inputPath, new Uint8Array(videoBytes));
    log(`Wrote input to ${inputPath}`);

    // Step 4: Run FFMPEG - Cut first 15s + simple zoom
    log("Executing FFMPEG: cut 15s + zoom effect...");
    const ffmpegCmd = new Deno.Command("ffmpeg", {
      args: [
        "-i", inputPath,
        "-t", "15",                           // First 15 seconds
        "-vf", "scale=2*iw:-1,zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=375:s=1080x1920:fps=25", // Zoom effect
        "-c:v", "libx264",                    // H.264 codec
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-y",
        outputPath,
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const ffmpegResult = await ffmpegCmd.output();
    const stderr = new TextDecoder().decode(ffmpegResult.stderr);

    if (!ffmpegResult.success) {
      log(`FFMPEG failed: ${stderr.slice(-500)}`);
      return new Response(
        JSON.stringify({
          success: false,
          step: "ffmpeg_execution",
          error: `FFMPEG failed: ${stderr.slice(-300)}`,
          ffmpegAvailable,
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    log("FFMPEG completed successfully");

    // Step 5: Read output file
    const outputBytes = await Deno.readFile(outputPath);
    log(`Output file size: ${outputBytes.byteLength} bytes`);

    if (outputBytes.byteLength < 1000) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "output_validation",
          error: `Output file too small: ${outputBytes.byteLength} bytes`,
          ffmpegAvailable,
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Step 6: Upload to Supabase Storage
    log("Uploading to storage...");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    const fileName = `debug/test_${Date.now()}.mp4`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, outputBytes, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      log(`Upload failed: ${uploadError.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          step: "upload",
          error: `Upload failed: ${uploadError.message}`,
          ffmpegAvailable,
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    log(`Uploaded to ${uploadData.path}`);

    // Step 7: Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("videos")
      .getPublicUrl(fileName);

    const finalUrl = publicUrlData.publicUrl;
    log(`Public URL: ${finalUrl}`);

    // Step 8: Validate URL is accessible
    log("Validating URL accessibility...");
    const headCheck = await fetch(finalUrl, { method: "HEAD" });
    if (!headCheck.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "url_validation",
          error: `URL not accessible: ${headCheck.status}`,
          ffmpegAvailable,
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    log("URL validated - SUCCESS");

    // Cleanup
    try {
      await Deno.remove(workDir, { recursive: true });
    } catch {}

    return new Response(
      JSON.stringify({
        success: true,
        step: "complete",
        videoUrl: finalUrl,
        ffmpegAvailable: true,
        executionTimeMs: Date.now() - startTime,
        logs,
      } as DebugResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logs.push(`[FATAL] ${errorMessage}`);
    console.error(`[debug-ffmpeg-test] Fatal error:`, err);

    return new Response(
      JSON.stringify({
        success: false,
        step: "unknown",
        error: errorMessage,
        ffmpegAvailable: false,
        executionTimeMs: Date.now() - startTime,
        logs,
      } as DebugResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
