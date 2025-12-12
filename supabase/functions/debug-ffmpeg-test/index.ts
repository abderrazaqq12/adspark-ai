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
  method: "fal.ai" | "ffmpeg-blocked";
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
    log("Starting video processing test");

    const { videoUrl } = await req.json();
    if (!videoUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          step: "input_validation",
          error: "No videoUrl provided",
          method: "ffmpeg-blocked",
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    log(`Input video: ${videoUrl}`);

    // Check for fal.ai API key
    const FAL_API_KEY = Deno.env.get("fal_ai");
    if (!FAL_API_KEY) {
      log("fal_ai API key not found - cannot process video");
      return new Response(
        JSON.stringify({
          success: false,
          step: "api_key_check",
          error: "fal_ai API key not configured. Add it in Settings > Secrets.",
          method: "ffmpeg-blocked",
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    log("fal.ai API key found - using cloud video processing");

    // Use fal.ai video-to-video transformation
    // This uses their fast-svd model for video enhancement/transformation
    log("Calling fal.ai video processing API...");
    
    const falResponse = await fetch("https://queue.fal.run/fal-ai/fast-svd-lcm", {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_url: videoUrl,
        motion_bucket_id: 100,
        cond_aug: 0.02,
        fps: 7,
        num_frames: 25, // ~3.5 seconds at 7fps
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      log(`fal.ai API error: ${falResponse.status} - ${errorText}`);
      
      // Try alternative: video upscaling model
      log("Trying alternative: video upscaling...");
      
      const upscaleResponse = await fetch("https://queue.fal.run/fal-ai/video-upscaler", {
        method: "POST",
        headers: {
          "Authorization": `Key ${FAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_url: videoUrl,
          scale: 2,
        }),
      });

      if (!upscaleResponse.ok) {
        const upscaleError = await upscaleResponse.text();
        log(`fal.ai upscaler error: ${upscaleResponse.status} - ${upscaleError}`);
        
        return new Response(
          JSON.stringify({
            success: false,
            step: "fal_api_call",
            error: `fal.ai API failed: ${upscaleError}`,
            method: "fal.ai",
            executionTimeMs: Date.now() - startTime,
            logs,
          } as DebugResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      const upscaleData = await upscaleResponse.json();
      log(`Upscale request queued: ${JSON.stringify(upscaleData)}`);
      
      // Poll for result
      if (upscaleData.request_id) {
        const resultUrl = await pollForResult(FAL_API_KEY, upscaleData.request_id, log, "fal-ai/video-upscaler");
        if (resultUrl) {
          return new Response(
            JSON.stringify({
              success: true,
              step: "complete",
              videoUrl: resultUrl,
              method: "fal.ai",
              executionTimeMs: Date.now() - startTime,
              logs,
            } as DebugResult),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          step: "polling",
          error: "Could not get result from fal.ai",
          method: "fal.ai",
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const falData = await falResponse.json();
    log(`fal.ai response: ${JSON.stringify(falData).slice(0, 200)}`);

    // If queued, poll for result
    if (falData.request_id) {
      log(`Request queued with ID: ${falData.request_id}`);
      const resultUrl = await pollForResult(FAL_API_KEY, falData.request_id, log, "fal-ai/fast-svd-lcm");
      
      if (resultUrl) {
        log(`Video ready: ${resultUrl}`);
        return new Response(
          JSON.stringify({
            success: true,
            step: "complete",
            videoUrl: resultUrl,
            method: "fal.ai",
            executionTimeMs: Date.now() - startTime,
            logs,
          } as DebugResult),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Direct result
    if (falData.video?.url) {
      log(`Video ready: ${falData.video.url}`);
      return new Response(
        JSON.stringify({
          success: true,
          step: "complete",
          videoUrl: falData.video.url,
          method: "fal.ai",
          executionTimeMs: Date.now() - startTime,
          logs,
        } as DebugResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        step: "result_extraction",
        error: `Unexpected response format: ${JSON.stringify(falData).slice(0, 200)}`,
        method: "fal.ai",
        executionTimeMs: Date.now() - startTime,
        logs,
      } as DebugResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
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
        method: "ffmpeg-blocked",
        executionTimeMs: Date.now() - startTime,
        logs,
      } as DebugResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function pollForResult(
  apiKey: string, 
  requestId: string, 
  log: (msg: string) => void,
  model: string
): Promise<string | null> {
  const maxAttempts = 30; // 30 seconds max
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 1000));
    log(`Polling attempt ${i + 1}/${maxAttempts}...`);
    
    const statusResponse = await fetch(`https://queue.fal.run/${model}/requests/${requestId}/status`, {
      headers: { "Authorization": `Key ${apiKey}` },
    });
    
    if (!statusResponse.ok) {
      log(`Status check failed: ${statusResponse.status}`);
      continue;
    }
    
    const status = await statusResponse.json();
    log(`Status: ${status.status}`);
    
    if (status.status === "COMPLETED") {
      // Get the result
      const resultResponse = await fetch(`https://queue.fal.run/${model}/requests/${requestId}`, {
        headers: { "Authorization": `Key ${apiKey}` },
      });
      
      if (resultResponse.ok) {
        const result = await resultResponse.json();
        return result.video?.url || result.output?.url || null;
      }
    } else if (status.status === "FAILED") {
      log(`Request failed: ${JSON.stringify(status)}`);
      return null;
    }
  }
  
  log("Polling timeout - result not ready");
  return null;
}
