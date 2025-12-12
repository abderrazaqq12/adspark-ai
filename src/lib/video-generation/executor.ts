// Video Generation Executor - Routes to Agent/n8n/Edge

import { supabase } from '@/integrations/supabase/client';
import { 
  VideoGenerationInput, 
  VideoGenerationOutput,
  EngineSelection 
} from './types';
import { selectEngine } from './engine-selector';

// Main execution function
export async function executeVideoGeneration(
  input: VideoGenerationInput
): Promise<VideoGenerationOutput> {
  const startTime = Date.now();
  
  // Step 1: Select optimal engine based on constraints
  const selection = selectEngine(input);
  
  console.log('[VideoGeneration] Engine selected:', {
    engine: selection.engine.engine_id,
    reason: selection.reason,
    estimatedCost: selection.estimatedCost,
  });

  // Step 2: Route to appropriate execution mode
  try {
    let result: VideoGenerationOutput;

    switch (input.executionMode) {
      case 'agent':
        result = await executeViaAgent(input, selection);
        break;
      case 'n8n':
        result = await executeViaN8n(input, selection);
        break;
      case 'edge':
        result = await executeViaEdge(input, selection);
        break;
      default:
        result = await executeViaAgent(input, selection);
    }

    // Add timing
    result.meta.latencyMs = Date.now() - startTime;
    
    return result;
  } catch (error) {
    console.error('[VideoGeneration] Execution failed:', error);
    
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      meta: {
        engine: selection.engine.engine_id,
        engineName: selection.engine.name,
        executionMode: input.executionMode,
        selectionReason: selection.reason,
        estimatedCost: selection.estimatedCost,
        latencyMs: Date.now() - startTime,
      },
      debug: {
        availableEngines: [selection.engine.engine_id, ...selection.alternativeEngines.map(e => e.engine_id)],
        filteredBy: [],
        selectionScore: selection.engine.priority,
      },
    };
  }
}

// Agent Mode - AI orchestrated execution
async function executeViaAgent(
  input: VideoGenerationInput,
  selection: EngineSelection
): Promise<VideoGenerationOutput> {
  console.log('[VideoGeneration] Executing via Agent mode');

  // Call the generate-scene-video edge function
  const { data, error } = await supabase.functions.invoke('generate-scene-video', {
    body: {
      engineName: selection.engine.engine_id,
      prompt: input.script || input.scenes?.[0]?.visualPrompt || 'Generate video',
      imageUrl: input.images?.[0] || input.scenes?.[0]?.imageUrl,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
    },
  });

  if (error) {
    throw new Error(`Agent execution failed: ${error.message}`);
  }

  return {
    status: data?.videoUrl ? 'success' : 'processing',
    videoUrl: data?.videoUrl,
    meta: {
      engine: selection.engine.engine_id,
      engineName: selection.engine.name,
      executionMode: 'agent',
      selectionReason: selection.reason,
      estimatedCost: selection.estimatedCost,
      actualCost: data?.actualCost,
    },
    debug: {
      availableEngines: [selection.engine.engine_id],
      filteredBy: [],
      selectionScore: selection.engine.priority,
    },
  };
}

// n8n Mode - Workflow orchestrated execution
async function executeViaN8n(
  input: VideoGenerationInput,
  selection: EngineSelection
): Promise<VideoGenerationOutput> {
  console.log('[VideoGeneration] Executing via n8n mode');

  // Get n8n webhook URL from settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('preferences')
    .single();

  const webhookUrl = (settings?.preferences as any)?.n8n_video_webhook;

  if (!webhookUrl) {
    throw new Error('n8n webhook URL not configured. Please set up in Settings.');
  }

  // Call n8n via proxy to avoid CORS
  const { data, error } = await supabase.functions.invoke('n8n-proxy', {
    body: {
      webhookUrl,
      payload: {
        action: 'generate_video',
        engine: selection.engine.engine_id,
        input: {
          script: input.script,
          voiceoverUrl: input.voiceoverUrl,
          scenes: input.scenes,
          images: input.images,
          aspectRatio: input.aspectRatio,
          duration: input.duration,
        },
        selection: {
          engineId: selection.engine.engine_id,
          engineName: selection.engine.name,
          estimatedCost: selection.estimatedCost,
        },
      },
    },
  });

  if (error) {
    throw new Error(`n8n execution failed: ${error.message}`);
  }

  return {
    status: data?.status === 'success' ? 'success' : 'processing',
    videoUrl: data?.videoUrl,
    meta: {
      engine: selection.engine.engine_id,
      engineName: selection.engine.name,
      executionMode: 'n8n',
      selectionReason: selection.reason,
      estimatedCost: selection.estimatedCost,
      actualCost: data?.actualCost,
    },
  };
}

// Edge Mode - Direct serverless execution
async function executeViaEdge(
  input: VideoGenerationInput,
  selection: EngineSelection
): Promise<VideoGenerationOutput> {
  console.log('[VideoGeneration] Executing via Edge mode');

  // Direct edge function call for fast execution
  const { data, error } = await supabase.functions.invoke('generate-scene-video', {
    body: {
      engineName: selection.engine.engine_id,
      prompt: input.script || input.scenes?.[0]?.visualPrompt || 'Generate video',
      imageUrl: input.images?.[0] || input.scenes?.[0]?.imageUrl,
      duration: input.duration,
      aspectRatio: input.aspectRatio,
      directExecution: true, // Flag for synchronous execution
    },
  });

  if (error) {
    throw new Error(`Edge execution failed: ${error.message}`);
  }

  return {
    status: data?.videoUrl ? 'success' : 'processing',
    videoUrl: data?.videoUrl,
    meta: {
      engine: selection.engine.engine_id,
      engineName: selection.engine.name,
      executionMode: 'edge',
      selectionReason: selection.reason,
      estimatedCost: selection.estimatedCost,
      actualCost: data?.actualCost,
    },
  };
}

// Check job status (for async operations)
export async function checkVideoJobStatus(jobId: string): Promise<VideoGenerationOutput | null> {
  const { data, error } = await supabase
    .from('generation_queue')
    .select('*, scenes(*)')
    .eq('id', jobId)
    .single();

  if (error || !data) return null;

  const scene = data.scenes as any;
  
  return {
    status: data.status === 'completed' ? 'success' : 
            data.status === 'failed' ? 'error' : 'processing',
    videoUrl: scene?.video_url,
    error: data.error_message || undefined,
    meta: {
      engine: scene?.engine_name || 'unknown',
      engineName: scene?.engine_name || 'Unknown',
      executionMode: 'agent',
      selectionReason: 'Job retrieved from queue',
      estimatedCost: 0,
    },
  };
}
