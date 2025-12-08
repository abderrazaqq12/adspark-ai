import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StageRequest {
  project_id: string;
  stage: number;
  stage_name: string;
  input_data: any;
  use_n8n?: boolean;
  n8n_webhook_url?: string;
}

const STAGE_NAMES: Record<number, string> = {
  0: 'product_input',
  1: 'product_content',
  2: 'image_generation',
  3: 'landing_page',
  4: 'video_script',
  5: 'scene_builder',
  6: 'video_generation',
  7: 'assembly',
  8: 'export',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { project_id, stage, stage_name, input_data, use_n8n, n8n_webhook_url }: StageRequest = await req.json();

    // Create pipeline job
    const { data: job, error: jobError } = await supabase
      .from('pipeline_jobs')
      .insert({
        user_id: user.id,
        project_id,
        stage_number: stage,
        stage_name: stage_name || STAGE_NAMES[stage],
        status: 'processing',
        input_data,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Check if user wants n8n backend
    let result: any;
    
    if (use_n8n && n8n_webhook_url) {
      // Trigger n8n workflow
      result = await triggerN8nWorkflow(n8n_webhook_url, {
        job_id: job.id,
        user_id: user.id,
        project_id,
        stage,
        stage_name: stage_name || STAGE_NAMES[stage],
        input_data,
      });

      // Update job with n8n execution ID
      await supabase
        .from('pipeline_jobs')
        .update({
          n8n_execution_id: result.execution_id,
          status: 'processing',
        })
        .eq('id', job.id);

      return new Response(JSON.stringify({
        success: true,
        job_id: job.id,
        n8n_execution_id: result.execution_id,
        status: 'processing',
        message: 'Job sent to n8n workflow',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process internally based on stage
    try {
      switch (stage) {
        case 0:
          result = await processProductInput(supabase, user.id, project_id, input_data);
          break;
        case 1:
          result = await processProductContent(supabase, user.id, project_id, input_data);
          break;
        case 2:
          result = await processImageGeneration(supabase, user.id, project_id, input_data);
          break;
        case 3:
          result = await processLandingPage(supabase, user.id, project_id, input_data);
          break;
        case 4:
          result = await processVideoScript(supabase, user.id, project_id, input_data);
          break;
        case 5:
          result = await processSceneBuilder(supabase, user.id, project_id, input_data);
          break;
        case 6:
          result = await processVideoGeneration(supabase, user.id, project_id, input_data);
          break;
        case 7:
          result = await processAssembly(supabase, user.id, project_id, input_data);
          break;
        case 8:
          result = await processExport(supabase, user.id, project_id, input_data);
          break;
        default:
          throw new Error(`Unknown stage: ${stage}`);
      }

      // Update job as completed
      await supabase
        .from('pipeline_jobs')
        .update({
          status: 'completed',
          progress: 100,
          output_data: result,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Record cost transaction
      if (result.cost) {
        await supabase
          .from('cost_transactions')
          .insert({
            user_id: user.id,
            project_id,
            pipeline_stage: stage_name || STAGE_NAMES[stage],
            engine_name: result.engine || 'internal',
            operation_type: getOperationType(stage),
            cost_usd: result.cost,
            tokens_used: result.tokens_used,
            duration_sec: result.duration_sec,
          });
      }

    } catch (stageError: any) {
      // Update job as failed
      await supabase
        .from('pipeline_jobs')
        .update({
          status: 'failed',
          error_message: stageError.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      throw stageError;
    }

    return new Response(JSON.stringify({
      success: true,
      job_id: job.id,
      status: 'completed',
      result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Pipeline stage error:', error);
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function triggerN8nWorkflow(webhookUrl: string, payload: any): Promise<any> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('n8n webhook error:', error);
    throw error;
  }
}

function getOperationType(stage: number): string {
  switch (stage) {
    case 1:
    case 3:
    case 4:
      return 'text_generation';
    case 2:
      return 'image_generation';
    case 6:
      return 'video_generation';
    case 5:
      return 'audio_generation';
    default:
      return 'processing';
  }
}

// Stage processors
async function processProductInput(supabase: any, userId: string, projectId: string, input: any) {
  const { product_name, product_description, product_url, product_image, language, market } = input;

  await supabase
    .from('projects')
    .update({
      product_name,
      settings: {
        product_description,
        product_url,
        product_image,
      },
      language,
      market,
      pipeline_status: {
        product_info: 'completed',
      },
    })
    .eq('id', projectId);

  return { success: true, product_name };
}

async function processProductContent(supabase: any, userId: string, projectId: string, input: any) {
  // This would call the AI to generate marketing content
  // For now, return the input as stored
  return { success: true, content: input.content, cost: 0.01, engine: 'gemini' };
}

async function processImageGeneration(supabase: any, userId: string, projectId: string, input: any) {
  // This would trigger image generation
  return { success: true, images: input.images || [], cost: 0.05, engine: input.engine || 'nanobanana' };
}

async function processLandingPage(supabase: any, userId: string, projectId: string, input: any) {
  return { success: true, landing_page: input.content, cost: 0.01, engine: 'gemini' };
}

async function processVideoScript(supabase: any, userId: string, projectId: string, input: any) {
  const { scripts } = input;
  
  // Insert scripts
  if (scripts?.length > 0) {
    for (const script of scripts) {
      await supabase
        .from('scripts')
        .insert({
          project_id: projectId,
          raw_text: script.text,
          language: script.language || 'en',
          tone: script.tone,
          status: 'draft',
        });
    }
  }

  return { success: true, scripts_count: scripts?.length || 0, cost: 0.02, engine: 'elevenlabs' };
}

async function processSceneBuilder(supabase: any, userId: string, projectId: string, input: any) {
  const { script_id, scenes } = input;

  if (scenes?.length > 0) {
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      await supabase
        .from('scenes')
        .insert({
          script_id,
          index: i,
          text: scene.text,
          scene_type: scene.type,
          visual_prompt: scene.visual_prompt,
          duration_sec: scene.duration || 5,
          status: 'pending',
        });
    }
  }

  return { success: true, scenes_count: scenes?.length || 0 };
}

async function processVideoGeneration(supabase: any, userId: string, projectId: string, input: any) {
  const { scene_ids, engine } = input;
  
  // Queue scenes for generation
  for (const sceneId of scene_ids || []) {
    await supabase
      .from('generation_queue')
      .insert({
        user_id: userId,
        scene_id: sceneId,
        engine_id: engine,
        status: 'queued',
        priority: 50,
      });
  }

  return { success: true, queued: scene_ids?.length || 0, cost: 0.10, engine };
}

async function processAssembly(supabase: any, userId: string, projectId: string, input: any) {
  const { script_id, format, include_subtitles, include_music } = input;

  // Create video output record
  const { data: output } = await supabase
    .from('video_outputs')
    .insert({
      project_id: projectId,
      script_id,
      format: format || 'mp4',
      has_subtitles: include_subtitles,
      status: 'pending',
    })
    .select()
    .single();

  return { success: true, output_id: output?.id, cost: 0.05, engine: 'ffmpeg' };
}

async function processExport(supabase: any, userId: string, projectId: string, input: any) {
  const { output_ids, formats } = input;

  return { 
    success: true, 
    exports: output_ids?.length || 0, 
    formats: formats || ['mp4'],
  };
}
