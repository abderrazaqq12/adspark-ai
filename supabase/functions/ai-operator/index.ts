import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI Operator Agent - Autonomous background process for video generation optimization
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============ AUTHENTICATION CHECK ============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[ai-operator] Missing or invalid Authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized - missing auth token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('[ai-operator] Invalid auth token:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized - invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authenticatedUserId = user.id;
    // ============ END AUTHENTICATION ============

    const { action, projectId, sceneId } = await req.json();

    console.log(`[ai-operator] Action: ${action}, Project: ${projectId}, User: ${authenticatedUserId}`);

    // For project-based actions, verify ownership
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return new Response(JSON.stringify({ error: 'Project not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (project.user_id !== authenticatedUserId) {
        console.error(`[ai-operator] Unauthorized access attempt: User ${authenticatedUserId} tried to access project ${projectId} owned by ${project.user_id}`);
        return new Response(JSON.stringify({ error: 'Forbidden - not your project' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // For scene-based actions, verify ownership through project chain
    if (sceneId && !projectId) {
      const { data: scene, error: sceneError } = await supabase
        .from('scenes')
        .select('script_id, scripts(project_id, projects(user_id))')
        .eq('id', sceneId)
        .single();

      if (sceneError || !scene) {
        return new Response(JSON.stringify({ error: 'Scene not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sceneOwnerId = (scene as any).scripts?.projects?.user_id;
      if (sceneOwnerId !== authenticatedUserId) {
        console.error(`[ai-operator] Unauthorized access attempt: User ${authenticatedUserId} tried to access scene ${sceneId}`);
        return new Response(JSON.stringify({ error: 'Forbidden - not your scene' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    switch (action) {
      case 'monitor_pipeline':
        return await monitorPipeline(supabase, projectId, authenticatedUserId);
      
      case 'retry_failed_jobs':
        return await retryFailedJobs(supabase, projectId, authenticatedUserId);
      
      case 'switch_engine':
        return await switchEngineForScene(supabase, sceneId, authenticatedUserId);
      
      case 'quality_check':
        return await qualityCheckScene(supabase, sceneId, lovableApiKey);
      
      case 'optimize_cost':
        return await optimizeCostTier(supabase, projectId, authenticatedUserId);
      
      case 'generate_variations':
        return await generateVariations(supabase, projectId, authenticatedUserId);
      
      case 'auto_generate_prompts':
        return await autoGenerateVisualPrompts(supabase, projectId, lovableApiKey);
      
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: unknown) {
    console.error('Error in ai-operator:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function monitorPipeline(supabase: any, projectId: string, userId: string) {
  // Get project and all related data
  const { data: project } = await supabase
    .from('projects')
    .select('*, scripts(*)')
    .eq('id', projectId)
    .single();

  if (!project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get scenes for all scripts
  const scriptIds = project.scripts?.map((s: any) => s.id) || [];
  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .in('script_id', scriptIds);

  // Analyze pipeline status
  const failedScenes = scenes?.filter((s: any) => s.status === 'failed') || [];
  const pendingScenes = scenes?.filter((s: any) => s.status === 'pending') || [];
  const generatingScenes = scenes?.filter((s: any) => s.status === 'generating') || [];
  const completedScenes = scenes?.filter((s: any) => s.status === 'completed') || [];

  // Create operator jobs for failed scenes
  for (const scene of failedScenes) {
    if (scene.retry_count < 3) {
      await supabase.from('operator_jobs').insert({
        user_id: userId,
        project_id: projectId,
        scene_id: scene.id,
        job_type: 'retry_scene',
        status: 'pending',
        input_data: { reason: 'auto_retry_failed', attempt: scene.retry_count + 1 }
      });
    } else {
      // Too many retries, suggest engine switch
      await supabase.from('operator_jobs').insert({
        user_id: userId,
        project_id: projectId,
        scene_id: scene.id,
        job_type: 'switch_engine',
        status: 'pending',
        input_data: { reason: 'max_retries_reached', current_engine: scene.engine_name }
      });
    }
  }

  // Check for stuck generating scenes (>10 min)
  const stuckThreshold = new Date(Date.now() - 10 * 60 * 1000);
  const stuckScenes = generatingScenes.filter((s: any) => 
    new Date(s.updated_at) < stuckThreshold
  );

  for (const scene of stuckScenes) {
    await supabase.from('operator_jobs').insert({
      user_id: userId,
      project_id: projectId,
      scene_id: scene.id,
      job_type: 'retry_scene',
      status: 'pending',
      input_data: { reason: 'stuck_generating' }
    });

    // Reset scene status
    await supabase.from('scenes')
      .update({ status: 'pending', retry_count: (scene.retry_count || 0) + 1 })
      .eq('id', scene.id);
  }

  // Update pipeline status
  const pipelineStatus = {
    product_info: project.product_name ? 'completed' : 'pending',
    scripts: project.scripts?.length > 0 ? 'completed' : 'pending',
    scenes: scenes?.length > 0 ? (pendingScenes.length > 0 ? 'in_progress' : 'completed') : 'pending',
    video_generation: completedScenes.length === scenes?.length ? 'completed' : 
                      generatingScenes.length > 0 ? 'in_progress' : 
                      failedScenes.length > 0 ? 'error' : 'pending',
    assembly: 'pending',
    export: 'pending'
  };

  await supabase.from('projects')
    .update({ pipeline_status: pipelineStatus })
    .eq('id', projectId);

  return new Response(JSON.stringify({ 
    success: true,
    stats: {
      total_scenes: scenes?.length || 0,
      completed: completedScenes.length,
      generating: generatingScenes.length,
      pending: pendingScenes.length,
      failed: failedScenes.length,
      stuck: stuckScenes.length
    },
    pipeline_status: pipelineStatus,
    jobs_created: failedScenes.length + stuckScenes.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function retryFailedJobs(supabase: any, projectId: string, userId: string) {
  // Get all pending operator jobs for retry
  const { data: jobs } = await supabase
    .from('operator_jobs')
    .select('*, scenes(*)')
    .eq('project_id', projectId)
    .eq('job_type', 'retry_scene')
    .eq('status', 'pending')
    .limit(5);

  const results = [];

  for (const job of jobs || []) {
    // Update job status
    await supabase.from('operator_jobs')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', job.id);

    try {
      // Trigger scene regeneration
      const { error } = await supabase.functions.invoke('generate-scene-video', {
        body: {
          sceneId: job.scene_id,
          engineName: job.scenes?.engine_name,
          prompt: job.scenes?.visual_prompt || job.scenes?.text,
        }
      });

      if (error) throw error;

      await supabase.from('operator_jobs')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          output_data: { success: true }
        })
        .eq('id', job.id);

      results.push({ job_id: job.id, status: 'completed' });
    } catch (error: any) {
      await supabase.from('operator_jobs')
        .update({ 
          status: 'failed', 
          error_message: error.message,
          attempts: job.attempts + 1
        })
        .eq('id', job.id);

      results.push({ job_id: job.id, status: 'failed', error: error.message });
    }
  }

  return new Response(JSON.stringify({ 
    success: true,
    jobs_processed: results.length,
    results
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function switchEngineForScene(supabase: any, sceneId: string, userId: string) {
  // Get scene and current engine
  const { data: scene } = await supabase
    .from('scenes')
    .select('*, scripts(project_id)')
    .eq('id', sceneId)
    .single();

  if (!scene) {
    return new Response(JSON.stringify({ error: 'Scene not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get user's pricing tier
  const { data: settings } = await supabase
    .from('user_settings')
    .select('pricing_tier')
    .eq('user_id', userId)
    .single();

  const pricingTier = settings?.pricing_tier || 'normal';

  // Get alternative engines
  const tierMap: Record<string, string[]> = {
    free: ['free'],
    cheap: ['free', 'cheap'],
    normal: ['free', 'cheap', 'normal'],
    expensive: ['free', 'cheap', 'normal', 'expensive']
  };

  const { data: engines } = await supabase
    .from('ai_engines')
    .select('*')
    .eq('status', 'active')
    .neq('name', scene.engine_name)
    .in('cost_tier', tierMap[pricingTier] || tierMap.normal)
    .order('priority_score', { ascending: false });

  if (!engines || engines.length === 0) {
    return new Response(JSON.stringify({ error: 'No alternative engines available' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Select best alternative based on scene type
  const sceneType = scene.scene_type || 'broll';
  let selectedEngine = engines[0];

  // Smart routing based on scene type
  const typeEngineMap: Record<string, string[]> = {
    'avatar': ['HeyGen', 'Synthesia', 'D-ID'],
    'testimonial': ['HeyGen', 'Opus UGC'],
    'talking_head': ['HeyGen', 'Synthesia'],
    'product': ['Runway Gen-3', 'Veo 3.1', 'Pika'],
    'cinematic': ['Sora', 'Veo 3.1', 'Runway Gen-3'],
    'broll': ['Luma Dream Machine', 'Pika', 'Hailuo'],
    'hook': ['Runway Gen-3', 'Pika'],
  };

  const preferredEngines = typeEngineMap[sceneType] || [];
  for (const engineName of preferredEngines) {
    const match = engines.find((e: any) => e.name.includes(engineName));
    if (match) {
      selectedEngine = match;
      break;
    }
  }

  // Update scene with new engine
  await supabase.from('scenes')
    .update({ 
      engine_id: selectedEngine.id,
      engine_name: selectedEngine.name,
      status: 'pending',
      retry_count: 0
    })
    .eq('id', sceneId);

  return new Response(JSON.stringify({ 
    success: true,
    old_engine: scene.engine_name,
    new_engine: selectedEngine.name,
    scene_id: sceneId
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function qualityCheckScene(supabase: any, sceneId: string, apiKey: string) {
  const { data: scene } = await supabase
    .from('scenes')
    .select('*')
    .eq('id', sceneId)
    .single();

  if (!scene || !scene.video_url) {
    return new Response(JSON.stringify({ error: 'Scene or video not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use vision model to analyze video quality
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyze this video thumbnail/frame for quality. Rate from 1-10 on: visual clarity, motion smoothness, relevance to prompt "${scene.visual_prompt || scene.text}". Return JSON: { "score": number, "clarity": number, "motion": number, "relevance": number, "issues": string[], "suggestions": string[] }` },
            { type: 'image_url', image_url: { url: scene.video_url } }
          ]
        }
      ],
    }),
  });

  let qualityScore = 7; // Default
  let analysis = {};

  if (response.ok) {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        qualityScore = (analysis as any).score || 7;
      }
    } catch (e) {
      console.error('Failed to parse quality analysis:', e);
    }
  }

  // Update scene with quality score
  await supabase.from('scenes')
    .update({ 
      quality_score: qualityScore,
      metadata: { ...scene.metadata, quality_analysis: analysis }
    })
    .eq('id', sceneId);

  return new Response(JSON.stringify({ 
    success: true,
    scene_id: sceneId,
    quality_score: qualityScore,
    analysis
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function optimizeCostTier(supabase: any, projectId: string, userId: string) {
  // Get all scenes and their engines
  const { data: project } = await supabase
    .from('projects')
    .select('*, scripts(id)')
    .eq('id', projectId)
    .single();

  const scriptIds = project?.scripts?.map((s: any) => s.id) || [];
  
  const { data: scenes } = await supabase
    .from('scenes')
    .select('*, ai_engines(*)')
    .in('script_id', scriptIds);

  // Calculate current cost estimate
  let currentCost = 0;
  let optimizedCost = 0;

  const { data: freeEngines } = await supabase
    .from('ai_engines')
    .select('*')
    .eq('status', 'active')
    .eq('cost_tier', 'free');

  const updates = [];

  for (const scene of scenes || []) {
    const currentTier = scene.ai_engines?.cost_tier || 'normal';
    const tierCosts: Record<string, number> = { free: 0, cheap: 0.05, normal: 0.15, expensive: 0.50 };
    currentCost += tierCosts[currentTier] || 0.15;

    // Check if we can use a free engine for this scene type
    const sceneType = scene.scene_type || 'broll';
    const canUseFree = ['broll', 'transition', 'product'].includes(sceneType);

    if (canUseFree && freeEngines?.length > 0 && currentTier !== 'free') {
      const freeEngine = freeEngines[0];
      updates.push({
        scene_id: scene.id,
        old_engine: scene.engine_name,
        new_engine: freeEngine.name,
        new_engine_id: freeEngine.id
      });
      optimizedCost += 0;
    } else {
      optimizedCost += tierCosts[currentTier] || 0.15;
    }
  }

  // Apply optimizations
  for (const update of updates) {
    await supabase.from('scenes')
      .update({ engine_id: update.new_engine_id, engine_name: update.new_engine })
      .eq('id', update.scene_id);
  }

  return new Response(JSON.stringify({ 
    success: true,
    original_cost_estimate: currentCost.toFixed(2),
    optimized_cost_estimate: optimizedCost.toFixed(2),
    savings: (currentCost - optimizedCost).toFixed(2),
    changes: updates.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateVariations(supabase: any, projectId: string, userId: string) {
  // Get project scenes
  const { data: project } = await supabase
    .from('projects')
    .select('*, scripts(id)')
    .eq('id', projectId)
    .single();

  const scriptIds = project?.scripts?.map((s: any) => s.id) || [];
  
  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .in('script_id', scriptIds)
    .eq('status', 'completed');

  if (!scenes || scenes.length === 0) {
    return new Response(JSON.stringify({ error: 'No completed scenes to create variations' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Queue variation generation jobs
  const variationJobs = [];
  for (const scene of scenes) {
    variationJobs.push({
      user_id: userId,
      project_id: projectId,
      scene_id: scene.id,
      job_type: 'generate_variations',
      status: 'pending',
      input_data: { 
        variations_count: 3,
        original_prompt: scene.visual_prompt || scene.text
      }
    });
  }

  await supabase.from('operator_jobs').insert(variationJobs);

  return new Response(JSON.stringify({ 
    success: true,
    variations_queued: variationJobs.length,
    scenes_processed: scenes.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function autoGenerateVisualPrompts(supabase: any, projectId: string, apiKey: string) {
  // Get scenes without visual prompts
  const { data: project } = await supabase
    .from('projects')
    .select('*, scripts(id)')
    .eq('id', projectId)
    .single();

  const scriptIds = project?.scripts?.map((s: any) => s.id) || [];
  
  const { data: scenes } = await supabase
    .from('scenes')
    .select('*')
    .in('script_id', scriptIds)
    .is('visual_prompt', null);

  if (!scenes || scenes.length === 0) {
    return new Response(JSON.stringify({ message: 'All scenes have visual prompts' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const updates = [];

  for (const scene of scenes) {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a video production expert. Generate concise, vivid visual prompts for AI video generation. Focus on: camera angle, lighting, motion, mood, and key visual elements. Keep prompts under 100 words.'
          },
          {
            role: 'user',
            content: `Generate a visual prompt for a ${scene.scene_type || 'general'} scene with this voice-over text: "${scene.text}"`
          }
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const visualPrompt = data.choices?.[0]?.message?.content || '';
      
      await supabase.from('scenes')
        .update({ visual_prompt: visualPrompt.slice(0, 500) })
        .eq('id', scene.id);

      updates.push({ scene_id: scene.id, prompt_generated: true });
    }
  }

  return new Response(JSON.stringify({ 
    success: true,
    prompts_generated: updates.length,
    total_scenes: scenes.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
