import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EXPLICIT PIPELINE STATES - No ambiguity
type PipelineState = 
  | 'queued'
  | 'generating'
  | 'encoding'
  | 'uploading'
  | 'validating_url'
  | 'ready'
  | 'failed'
  | 'timed_out';

interface PipelineStage {
  id: string;
  status: "pending" | "running" | "completed" | "error" | "timed_out";
  startedAt?: string;
  completedAt?: string;
  error?: string;
  progress?: number;
}

interface PipelineError {
  stage: string;
  errorType: 'engine_error' | 'ffmpeg_error' | 'upload_error' | 'url_error' | 'timeout_error' | 'validation_error' | 'file_missing';
  message: string;
  code?: string;
  retryable: boolean;
  suggestedFix?: string;
}

interface VideoVariation {
  id: string;
  ratio: string;
  variationNumber: number;
  status: 'queued' | 'generating' | 'encoding' | 'uploading' | 'validating_url' | 'ready' | 'failed' | 'timed_out';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
  retryCount: number;
  stageStartTime?: number;
  engineUsed?: string;
}

const STAGES = [
  "deconstruct", "rewrite", "voice", "video", "ffmpeg", 
  "music", "subtitles", "export", "upload", "url", "complete"
];

// HARD LIMITS - No infinite waits
const MAX_RETRIES = 3;
const URL_VALIDATION_TIMEOUT_MS = 60000; // 60 seconds MAX
const URL_VALIDATION_ATTEMPTS = 5;
const VALIDATION_RETRY_DELAY = 2000;
const PIPELINE_TIMEOUT_MS = 600000; // 10 minutes MAX for entire pipeline

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { 
      sourceAds, 
      variationConfig, 
      projectId,
      count = 10,
      ratios = ['9:16'],
      engineTier = 'free',
      market = 'saudi',
      language = 'ar-sa'
    } = body;

    console.log('[creative-replicator-generate] Starting generation:', { count, engineTier, market });

    // Create pipeline job with detailed tracking
    const { data: jobData, error: jobError } = await supabaseAdmin
      .from('pipeline_jobs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        stage_name: 'creative-replicator',
        stage_number: 1,
        status: 'pending',
        progress: {
          currentStage: 'deconstruct',
          completedStages: [],
          stageProgress: 0,
          completedVideos: 0,
          totalVideos: count * ratios.length,
          validatedVideos: 0,
          errors: {},
          videoUrls: [],
          videoStatuses: {},
        },
        input_data: { sourceAds, variationConfig, count, ratios, engineTier, market, language },
      })
      .select()
      .single();

    if (jobError) throw jobError;
    const jobId = jobData.id;

    // Update stage helper with atomic updates
    const updateStage = async (stageId: string, status: PipelineStage["status"], extra: any = {}) => {
      const { data: currentJob } = await supabaseAdmin
        .from('pipeline_jobs')
        .select('progress')
        .eq('id', jobId)
        .single();

      const progress = currentJob?.progress as any || {};
      const completedStages = progress.completedStages || [];

      if (status === 'completed' && !completedStages.includes(stageId)) {
        completedStages.push(stageId);
      }

      const errors = { ...(progress.errors || {}), ...extra.errors };

      await supabaseAdmin
        .from('pipeline_jobs')
        .update({
          status: status === 'error' ? 'failed' : 'processing',
          progress: {
            ...progress,
            currentStage: stageId,
            completedStages,
            stageProgress: extra.stageProgress || 0,
            errors,
            ...(extra.videoUrls ? { videoUrls: extra.videoUrls } : {}),
            ...(extra.validatedVideos !== undefined ? { validatedVideos: extra.validatedVideos } : {}),
            ...(extra.completedVideos !== undefined ? { completedVideos: extra.completedVideos } : {}),
            ...(extra.videoStatuses ? { videoStatuses: extra.videoStatuses } : {}),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    };

    // Update individual video status
    const updateVideoStatus = async (
      videoId: string, 
      status: VideoVariation["status"], 
      data: Partial<VideoVariation> = {}
    ) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      
      if (data.videoUrl) updateData.video_url = data.videoUrl;
      if (data.thumbnailUrl) updateData.thumbnail_url = data.thumbnailUrl;
      if (data.duration) updateData.duration_sec = data.duration;
      if (data.error) {
        updateData.metadata = { error: data.error, retryCount: data.retryCount || 0 };
      }

      await supabaseAdmin
        .from('video_variations')
        .update(updateData)
        .eq('id', videoId);
    };

    // Validate URL is accessible with retries
    const validateUrl = async (url: string, attempts = URL_VALIDATION_ATTEMPTS): Promise<boolean> => {
      for (let i = 0; i < attempts; i++) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            // Ensure it's a video or acceptable content
            if (contentType && (contentType.includes('video') || contentType.includes('application/octet-stream'))) {
              return true;
            }
            // For storage URLs, accept if response is OK
            if (response.ok && url.includes('/storage/')) {
              return true;
            }
          }
        } catch (err) {
          console.log(`[URL Validation] Attempt ${i + 1}/${attempts} failed for ${url}`);
        }
        
        if (i < attempts - 1) {
          await new Promise(r => setTimeout(r, VALIDATION_RETRY_DELAY * (i + 1)));
        }
      }
      return false;
    };

    // Generate placeholder video file (in production, this would be actual video generation)
    const generateVideoFile = async (videoId: string, config: any): Promise<{ url: string; thumbnail: string; duration: number } | null> => {
      try {
        // In production, this would call the actual video generation engine
        // For now, we simulate with a placeholder
        const fileName = `${videoId}.mp4`;
        const thumbnailName = `${videoId}_thumb.jpg`;
        
        // Create a minimal valid MP4 file (in production, this comes from FFMPEG/AI engine)
        // This is a placeholder - real implementation would generate actual video
        const placeholderVideo = new Uint8Array([
          0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70,
          0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x00, 0x01,
          0x69, 0x73, 0x6F, 0x6D, 0x61, 0x76, 0x63, 0x31,
          0x6D, 0x70, 0x34, 0x31
        ]);

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from('videos')
          .upload(`${user.id}/${fileName}`, placeholderVideo, {
            contentType: 'video/mp4',
            upsert: true
          });

        if (uploadError) {
          console.error('[Video Upload Error]', uploadError);
          return null;
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin
          .storage
          .from('videos')
          .getPublicUrl(`${user.id}/${fileName}`);

        const { data: thumbUrlData } = supabaseAdmin
          .storage
          .from('videos')
          .getPublicUrl(`${user.id}/${thumbnailName}`);

        return {
          url: urlData.publicUrl,
          thumbnail: thumbUrlData.publicUrl,
          duration: Math.floor(Math.random() * 15) + 15,
        };
      } catch (err) {
        console.error('[Video Generation Error]', err);
        return null;
      }
    };

    // Start background processing
    const backgroundProcess = (async () => {
      const videoVariations: VideoVariation[] = [];
      const totalVideos = count * ratios.length;
      
      try {
        // Stage 1: AI Deconstruction
        await updateStage('deconstruct', 'running');
        console.log('[creative-replicator] Stage: deconstruct');
        await new Promise(r => setTimeout(r, 1000));
        await updateStage('deconstruct', 'completed');

        // Stage 2: Creative Rewrite
        await updateStage('rewrite', 'running');
        console.log('[creative-replicator] Stage: rewrite');
        await new Promise(r => setTimeout(r, 800));
        await updateStage('rewrite', 'completed');

        // Stage 3: Voice Generation
        await updateStage('voice', 'running');
        console.log('[creative-replicator] Stage: voice');
        await new Promise(r => setTimeout(r, 500));
        await updateStage('voice', 'completed');

        // Stage 4: Create video variation records (pending state)
        await updateStage('video', 'running');
        console.log('[creative-replicator] Stage: video - creating records');
        
        for (let v = 0; v < count; v++) {
          for (const ratio of ratios) {
            const videoId = crypto.randomUUID();
            
            const variation: VideoVariation = {
              id: videoId,
              ratio,
              variationNumber: v + 1,
              status: 'queued',
              retryCount: 0,
            };
            
            // Create video variation record with queued status
            await supabaseAdmin.from('video_variations').insert({
              id: videoId,
              user_id: user.id,
              project_id: projectId,
              variation_number: v + 1,
              status: 'processing',
              variation_config: {
                hookStyle: variationConfig?.hookStyles?.[v % (variationConfig?.hookStyles?.length || 1)] || 'ai-auto',
                pacing: variationConfig?.pacing || 'dynamic',
                engine: engineTier === 'free' ? 'FFMPEG-Motion' : 'AI-Engine',
                ratio,
                market,
                language,
              },
            });

            videoVariations.push(variation);
          }
        }

        // Update progress with video statuses
        const videoStatuses: Record<string, string> = {};
        videoVariations.forEach(v => { videoStatuses[v.id] = 'queued'; });
        await updateStage('video', 'running', { 
          stageProgress: 10,
          completedVideos: 0,
          videoStatuses,
        });

        // Stage 5: FFMPEG Editing / Video Generation
        await updateStage('ffmpeg', 'running');
        console.log('[creative-replicator] Stage: ffmpeg - processing videos');
        
        let processedCount = 0;
        for (const variation of videoVariations) {
          // Update to generating
          await updateVideoStatus(variation.id, 'generating');
          videoStatuses[variation.id] = 'generating';
          await updateStage('ffmpeg', 'running', { 
            stageProgress: Math.round((processedCount / totalVideos) * 50),
            videoStatuses,
          });
          
          // Simulate processing time
          await new Promise(r => setTimeout(r, 500));
          
          variation.status = 'generating';
          processedCount++;
        }
        
        await updateStage('ffmpeg', 'completed', { stageProgress: 100 });

        // Stage 6: Music Sync
        await updateStage('music', 'running');
        console.log('[creative-replicator] Stage: music');
        await new Promise(r => setTimeout(r, 500));
        await updateStage('music', 'completed');

        // Stage 7: Subtitles
        await updateStage('subtitles', 'running');
        console.log('[creative-replicator] Stage: subtitles');
        await new Promise(r => setTimeout(r, 500));
        await updateStage('subtitles', 'completed');

        // Stage 8: Export - Generate actual video files
        await updateStage('export', 'running');
        console.log('[creative-replicator] Stage: export - generating files');
        
        for (const variation of videoVariations) {
          videoStatuses[variation.id] = 'exporting';
          await updateStage('export', 'running', { videoStatuses });
          
          // Generate video file with retry logic
          let fileResult = null;
          for (let retry = 0; retry < MAX_RETRIES; retry++) {
            fileResult = await generateVideoFile(variation.id, variation);
            if (fileResult) break;
            variation.retryCount++;
            await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
          }
          
          if (fileResult) {
            variation.videoUrl = fileResult.url;
            variation.thumbnailUrl = fileResult.thumbnail;
            variation.duration = fileResult.duration;
            variation.status = 'uploading';
          } else {
            variation.status = 'failed';
            variation.error = 'Failed to generate video file after retries';
            videoStatuses[variation.id] = 'failed';
            await updateVideoStatus(variation.id, 'failed', { error: variation.error, retryCount: variation.retryCount });
          }
        }
        
        await updateStage('export', 'completed');

        // Stage 9: Upload to Storage (already done in generateVideoFile, but track separately)
        await updateStage('upload', 'running');
        console.log('[creative-replicator] Stage: upload');
        
        const successfulUploads = videoVariations.filter(v => v.videoUrl);
        for (const variation of successfulUploads) {
          variation.status = 'uploading';
          videoStatuses[variation.id] = 'uploading';
        }
        
        await updateStage('upload', 'running', { 
          completedVideos: successfulUploads.length,
          videoStatuses,
        });
        await new Promise(r => setTimeout(r, 500));
        await updateStage('upload', 'completed');

        // Stage 10: URL Validation - Critical step
        await updateStage('url', 'running');
        console.log('[creative-replicator] Stage: url validation');
        
        const validatedUrls: string[] = [];
        let validatedCount = 0;

        for (const variation of videoVariations) {
          if (!variation.videoUrl) continue;
          
          variation.status = 'validating_url';
          videoStatuses[variation.id] = 'validating_url';
          await updateStage('url', 'running', { 
            stageProgress: Math.round((validatedCount / successfulUploads.length) * 100),
            videoStatuses,
            validatedVideos: validatedCount,
          });

          // Validate the URL is actually accessible
          const isValid = await validateUrl(variation.videoUrl);
          
          if (isValid) {
            variation.status = 'ready';
            videoStatuses[variation.id] = 'ready';
            validatedUrls.push(variation.videoUrl);
            
            // Update database with validated URL
            await updateVideoStatus(variation.id, 'ready', {
              videoUrl: variation.videoUrl,
              thumbnailUrl: variation.thumbnailUrl,
              duration: variation.duration,
            });
            
            validatedCount++;
          } else {
            variation.status = 'failed';
            variation.error = 'URL validation failed - file not accessible';
            videoStatuses[variation.id] = 'failed';
            
            await updateVideoStatus(variation.id, 'failed', { 
              error: variation.error,
              retryCount: variation.retryCount,
            });
          }
        }

        await updateStage('url', 'completed', { 
          videoUrls: validatedUrls,
          validatedVideos: validatedCount,
          videoStatuses,
        });

        // Stage 11: Mark Complete - ONLY if we have validated URLs
        const completedVariations = videoVariations.filter(v => v.status === 'ready');
        const failedVariations = videoVariations.filter(v => v.status === 'failed');

        console.log(`[creative-replicator] Final status: ${completedVariations.length} ready, ${failedVariations.length} failed`);

        if (completedVariations.length > 0) {
          // Job is successful if at least some videos completed
          await supabaseAdmin
            .from('pipeline_jobs')
            .update({
              status: failedVariations.length > 0 ? 'partial' : 'completed',
              completed_at: new Date().toISOString(),
              progress: {
                currentStage: 'complete',
                completedStages: STAGES,
                stageProgress: 100,
                completedVideos: completedVariations.length,
                totalVideos,
                validatedVideos: completedVariations.length,
                errors: failedVariations.reduce((acc, v) => ({ ...acc, [v.id]: v.error }), {}),
                videoUrls: validatedUrls,
                videoStatuses,
              },
            })
            .eq('id', jobId);

          console.log('[creative-replicator] Job completed:', jobId);
        } else {
          throw new Error('No videos were successfully generated and validated');
        }

      } catch (error) {
        console.error('[creative-replicator] Pipeline error:', error);
        
        await supabaseAdmin
          .from('pipeline_jobs')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            progress: {
              currentStage: 'error',
              completedStages: [],
              stageProgress: 0,
              completedVideos: 0,
              totalVideos,
              validatedVideos: 0,
              errors: { pipeline: error instanceof Error ? error.message : 'Unknown error' },
              videoUrls: [],
              videoStatuses: {},
            },
          })
          .eq('id', jobId);
      }
    })();

    // Don't await - let it run in background
    backgroundProcess.catch(console.error);

    return new Response(JSON.stringify({
      success: true, 
      jobId,
      message: 'Generation started',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[creative-replicator-generate] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
