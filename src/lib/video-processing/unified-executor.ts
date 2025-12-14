/**
 * Unified Video Processing Executor
 * SERVER-ONLY ARCHITECTURE
 * 
 * All video processing routes through VPS API.
 * No browser-side processing. No fallbacks to client-side.
 * If VPS is unreachable, FAIL LOUDLY.
 */

import { 
  VideoCreationInput, 
  VideoCreationOutput, 
  VideoProcessingError,
  AISceneDefinition,
  ExecutionPlan
} from './types';
import { selectBestEngine, getDefaultServerEngine } from './engine-registry';
import { generateSceneStructure } from './ai-scene-intelligence';
import { checkServerHealth } from '@/lib/vps-render-service';

/**
 * Main execution function - SERVER ONLY
 * No browser processing, no fallbacks
 */
export async function executeVideoCreation(
  input: VideoCreationInput,
  onProgress?: (progress: number, message: string) => void
): Promise<VideoCreationOutput[]> {
  
  // Step 1: Verify VPS is available FIRST - fail fast if not
  onProgress?.(0.02, 'Checking VPS server status...');
  const healthCheck = await checkServerHealth();
  
  if (!healthCheck.healthy) {
    throw createError(
      'VPS_UNREACHABLE',
      `VPS server is not available: ${healthCheck.error || 'Connection failed'}`,
      'validation',
      true
    );
  }
  
  if (healthCheck.ffmpeg !== 'available') {
    throw createError(
      'FFMPEG_UNAVAILABLE',
      `FFmpeg is not available on VPS: ${healthCheck.ffmpeg}`,
      'validation',
      false
    );
  }

  // Step 2: Generate scene structure
  onProgress?.(0.05, 'Generating scene structure...');
  
  const sceneStructure = await generateSceneStructure({
    script: input.script,
    voiceoverDuration: 30,
    sourceImages: input.sourceImages,
    videoType: input.videoType,
    market: input.market,
    language: input.language,
    maxDuration: input.maxDuration,
    aiAutoMode: input.aiAutoMode,
  });

  // Step 3: Select engine (always server-side)
  const engine = input.backend === 'vps' 
    ? getDefaultServerEngine()
    : selectBestEngine(
        input.tier,
        input.backend,
        input.sourceImages?.length ? ['image-to-video'] : ['video-processing'],
        input.maxDuration
      );

  if (!engine) {
    throw createError(
      'INVALID_INPUT',
      'No suitable engine found for the given requirements',
      'validation',
      false
    );
  }

  onProgress?.(0.1, `Using ${engine.name}...`);

  // Step 4: Generate variations
  const outputs: VideoCreationOutput[] = [];
  
  for (let i = 0; i < input.variationCount; i++) {
    const progress = 0.1 + (i / input.variationCount) * 0.8;
    onProgress?.(progress, `Generating variation ${i + 1}/${input.variationCount}...`);

    try {
      const output = await generateVariationOnServer(
        input,
        sceneStructure.scenes,
        engine.id,
        i,
        (p) => onProgress?.(progress + p * (0.8 / input.variationCount), `Processing variation ${i + 1}...`)
      );
      outputs.push(output);
    } catch (err) {
      console.error(`[unified-executor] Variation ${i + 1} failed:`, err);
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      outputs.push({
        id: `error-${Date.now()}-${i}`,
        status: 'failed',
        aspectRatio: input.aspectRatios[0] || '9:16',
        engine: engine.id,
        backend: 'vps',
        estimatedCost: 0,
        error: createError(
          'EXECUTION_FAILED',
          error.message,
          'execution',
          true
        ),
      });
    }
  }

  onProgress?.(1, 'Complete!');
  return outputs;
}

/**
 * Generate a single variation on VPS
 */
async function generateVariationOnServer(
  input: VideoCreationInput,
  scenes: AISceneDefinition[],
  engineId: string,
  variationIndex: number,
  onProgress?: (progress: number) => void
): Promise<VideoCreationOutput> {
  const aspectRatio = input.aspectRatios[variationIndex % input.aspectRatios.length] || '9:16';
  const dimensions = getAspectRatioDimensions(aspectRatio);
  const variedScenes = randomizeScenes(scenes, variationIndex);

  // Validate we have source content
  if (!input.sourceVideos?.length && !input.sourceImages?.length) {
    throw createError(
      'INVALID_INPUT',
      'No source videos or images provided',
      'validation',
      false
    );
  }

  onProgress?.(0.2);
  
  // Execute on VPS
  const result = await executeOnVPS(
    input.sourceVideos?.[0] || '',
    {
      sourcePath: input.sourceVideos?.[0] || '',
      resize: dimensions,
      aspectRatio,
    },
    onProgress
  );

  onProgress?.(1);

  return {
    id: result.jobId || `vps-${Date.now()}`,
    status: result.success ? 'completed' : 'failed',
    videoUrl: result.outputUrl,
    aspectRatio,
    engine: engineId,
    backend: 'vps',
    scenes: variedScenes,
    duration: variedScenes.reduce((sum, s) => sum + s.duration, 0),
    estimatedCost: 0,
    actualCost: 0,
    error: result.success ? undefined : createError(
      'EXECUTION_FAILED',
      result.error || 'VPS execution failed',
      'execution',
      true
    ),
  };
}

interface VPSExecuteResult {
  success: boolean;
  jobId?: string;
  outputUrl?: string;
  error?: string;
}

/**
 * Execute plan on VPS server
 */
async function executeOnVPS(
  sourceUrl: string,
  plan: ExecutionPlan,
  onProgress?: (progress: number) => void
): Promise<VPSExecuteResult> {
  try {
    const baseUrl = localStorage.getItem('vps_api_url') || '';
    
    const response = await fetch(`${baseUrl}/api/execute-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceVideoUrl: sourceUrl,
        plan: {
          trim: plan.trim,
          speed: plan.speed,
          resize: plan.resize,
        },
        outputName: plan.outputName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    
    if (!data.ok) {
      return {
        success: false,
        error: data.message || 'Execution failed',
      };
    }

    return {
      success: true,
      outputUrl: data.outputUrl,
      jobId: data.jobId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get dimensions for aspect ratio
 */
function getAspectRatioDimensions(ratio: string): { width: number; height: number } {
  const dims: Record<string, { width: number; height: number }> = {
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
  };
  return dims[ratio] || dims['9:16'];
}

/**
 * Randomize scenes for variation
 */
function randomizeScenes(scenes: AISceneDefinition[], seed: number): AISceneDefinition[] {
  return scenes.map((scene, i) => {
    const durationVariation = 1 + ((seed * (i + 1)) % 10 - 5) / 100;
    const motionStyles: AISceneDefinition['motionStyle'][] = ['ken-burns', 'parallax', 'zoom-in', 'pan'];
    const motionIndex = (seed + i) % motionStyles.length;
    
    return {
      ...scene,
      duration: scene.duration * durationVariation,
      motionStyle: scene.type === 'hook' || scene.type === 'cta' 
        ? scene.motionStyle 
        : motionStyles[motionIndex],
    };
  });
}

/**
 * Create structured error - always JSON, never HTML
 */
function createError(
  code: VideoProcessingError['code'],
  message: string,
  stage: VideoProcessingError['stage'],
  retryable: boolean
): VideoProcessingError {
  return {
    ok: false,
    code,
    message,
    stage,
    retryable,
  };
}

/**
 * Retry a failed video - only retries on server
 */
export async function retryVideoGeneration(
  output: VideoCreationOutput,
  input: VideoCreationInput
): Promise<VideoCreationOutput> {
  // Always retry on server - no browser fallback
  const results = await executeVideoCreation({
    ...input,
    backend: 'vps',
    variationCount: 1,
  });

  return results[0];
}
