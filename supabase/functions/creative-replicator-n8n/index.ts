import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReplicatorBlueprint {
  sourceAds: {
    id: string;
    fileName: string;
    duration: number;
    analysis: {
      transcript: string;
      scenes: any[];
      hook: string;
      pacing: string;
      style: string;
      transitions: string[];
      voiceTone: string;
      musicType: string;
      aspectRatio: string;
    };
  }[];
  variationConfig: {
    count: number;
    hookStyles: string[];
    pacing: string;
    transitions: string[];
    actors: string[];
    voiceSettings: { language: string; tone: string };
    ratios: string[];
    engineTier: string;
    randomizeEngines: boolean;
  };
  userId: string;
  projectId?: string;
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

    const { action, webhookUrl, blueprint } = await req.json();

    console.log('[creative-replicator-n8n] Action:', action);

    // Get user's n8n webhook URL from settings if not provided
    let targetWebhookUrl = webhookUrl;
    if (!targetWebhookUrl) {
      const { data: settings } = await supabaseClient
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      targetWebhookUrl = settings?.preferences?.n8n_creative_replicator_webhook;
    }

    if (!targetWebhookUrl) {
      throw new Error('No n8n webhook URL configured. Please set it in Settings.');
    }

    switch (action) {
      case 'send_blueprint':
        return await sendBlueprintToN8n(targetWebhookUrl, blueprint, user.id);

      case 'send_for_generation':
        return await sendForGeneration(targetWebhookUrl, blueprint, user.id);

      case 'test_connection':
        return await testN8nConnection(targetWebhookUrl);

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: unknown) {
    console.error('[creative-replicator-n8n] Error:', error);
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

async function sendBlueprintToN8n(webhookUrl: string, blueprint: ReplicatorBlueprint, userId: string) {
  console.log('[creative-replicator-n8n] Sending blueprint to n8n');

  const payload = {
    event: 'creative_replicator_blueprint',
    timestamp: new Date().toISOString(),
    userId,
    blueprint: {
      sourceAdsCount: blueprint.sourceAds.length,
      sourceAds: blueprint.sourceAds.map(ad => ({
        id: ad.id,
        fileName: ad.fileName,
        duration: ad.duration,
        analysis: ad.analysis,
      })),
      variationConfig: blueprint.variationConfig,
      expectedOutputs: blueprint.variationConfig.count * blueprint.variationConfig.ratios.length,
    },
    // Scene-by-scene breakdown for n8n workflow
    scenes: blueprint.sourceAds.flatMap(ad => 
      ad.analysis.scenes.map((scene, idx) => ({
        sourceAdId: ad.id,
        sceneIndex: idx,
        ...scene,
        suggestedHooks: blueprint.variationConfig.hookStyles,
        suggestedTransitions: blueprint.variationConfig.transitions,
      }))
    ),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      mode: 'no-cors',
      body: JSON.stringify(payload),
    });

    console.log('[creative-replicator-n8n] Blueprint sent successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Blueprint sent to n8n',
      payload,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (fetchError: unknown) {
    console.error('[creative-replicator-n8n] Fetch error:', fetchError);
    const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
    throw new Error(`Failed to send to n8n: ${errorMessage}`);
  }
}

async function sendForGeneration(webhookUrl: string, blueprint: ReplicatorBlueprint, userId: string) {
  console.log('[creative-replicator-n8n] Sending for video generation');

  // Build generation tasks for n8n
  const generationTasks = [];
  
  for (let v = 0; v < blueprint.variationConfig.count; v++) {
    for (const ratio of blueprint.variationConfig.ratios) {
      const sourceAd = blueprint.sourceAds[v % blueprint.sourceAds.length];
      
      generationTasks.push({
        taskId: `gen-${Date.now()}-${v}-${ratio.replace(':', 'x')}`,
        variationIndex: v,
        targetRatio: ratio,
        sourceAdId: sourceAd.id,
        hookStyle: blueprint.variationConfig.hookStyles[v % blueprint.variationConfig.hookStyles.length],
        pacing: blueprint.variationConfig.pacing,
        transitions: blueprint.variationConfig.transitions,
        voiceSettings: blueprint.variationConfig.voiceSettings,
        engineTier: blueprint.variationConfig.engineTier,
        actors: blueprint.variationConfig.actors,
        sceneBlueprint: sourceAd.analysis.scenes,
        originalScript: sourceAd.analysis.transcript,
        originalStyle: sourceAd.analysis.style,
      });
    }
  }

  const payload = {
    event: 'creative_replicator_generate',
    timestamp: new Date().toISOString(),
    userId,
    totalTasks: generationTasks.length,
    tasks: generationTasks,
    callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/creative-replicator-callback`,
  };

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors',
      body: JSON.stringify(payload),
    });

    console.log('[creative-replicator-n8n] Generation request sent');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Generation request sent to n8n',
      tasksCount: generationTasks.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (fetchError: unknown) {
    const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
    throw new Error(`Failed to send generation request: ${errorMessage}`);
  }
}

async function testN8nConnection(webhookUrl: string) {
  console.log('[creative-replicator-n8n] Testing connection');

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors',
      body: JSON.stringify({
        event: 'test_connection',
        timestamp: new Date().toISOString(),
        source: 'creative-replicator',
      }),
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Connection test sent. Check your n8n workflow execution history.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (fetchError: unknown) {
    const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Connection test failed: ${errorMessage}`,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
