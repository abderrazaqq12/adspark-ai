// Unified Video Processing Executor

import { 
  VideoCreationInput, 
  VideoCreationOutput, 
  ProcessingBackend,
  AISceneDefinition,
  VideoProcessingError
} from './types';
import { selectBestEngine, getEngineById } from './engine-registry';
import { generateSceneStructure } from './ai-scene-intelligence';
import { createVideoFromImages, detectCapabilities } from './browser-processor';
import { supabase } from '@/integrations/supabase/client';

// Main execution function
export async function executeVideoCreation(
  input: VideoCreationInput,
  onProgress?: (progress: number, message: string) => void
): Promise<VideoCreationOutput[]> {
  const outputs: VideoCreationOutput[] = [];
  
  // Generate scene structure
  onProgress?.(0.05, 'Generating scene structure...');
  
  const sceneStructure = await generateSceneStructure({
    script: input.script,
    voiceoverDuration: 30, // Default, would be calculated from voiceover
    sourceImages: input.sourceImages,
    videoType: input.videoType,
    market: input.market,
    language: input.language,
    maxDuration: input.maxDuration,
    aiAutoMode: input.aiAutoMode,
  });

  // Determine best backend
  const backend = determineBackend(input);
  onProgress?.(0.1, `Using ${backend} backend...`);

  // Select engine
  const engine = selectBestEngine(
    input.tier,
    backend,
    input.sourceImages?.length ? ['image-to-video'] : ['video-processing'],
    input.maxDuration
  );

  if (!engine) {
    throw new Error('No suitable engine found for the given requirements');
  }

  // Generate variations
  for (let i = 0; i < input.variationCount; i++) {
    const progress = 0.1 + (i / input.variationCount) * 0.8;
    onProgress?.(progress, `Generating variation ${i + 1}/${input.variationCount}...`);

    try {
      const output = await generateSingleVariation(
        input,
        sceneStructure.scenes,
        engine.id,
        backend,
        i,
        (p) => onProgress?.(progress + p * (0.8 / input.variationCount), `Processing variation ${i + 1}...`)
      );
      outputs.push(output);
    } catch (err) {
      console.error(`[unified-executor] Variation ${i + 1} failed:`, err);
      outputs.push({
        id: `error-${Date.now()}-${i}`,
        status: 'failed',
        aspectRatio: input.aspectRatios[0] || '9:16',
        engine: engine.id,
        backend,
        estimatedCost: 0,
        error: {
          code: 'GENERATION_FAILED',
          message: err instanceof Error ? err.message : 'Unknown error',
          stage: 'generation',
          retryable: true,
        },
      });
    }
  }

  onProgress?.(1, 'Complete!');
  return outputs;
}

// Determine the best backend based on input and capabilities
function determineBackend(input: VideoCreationInput): ProcessingBackend {
  // If user specified, respect their choice
  if (input.backend !== 'auto') {
    return input.backend;
  }

  // Check browser capabilities
  const capabilities = detectCapabilities();

  // Free tier always uses browser
  const freeTiers: string[] = ['free'];
  if (freeTiers.includes(input.tier)) {
    return 'browser';
  }

  // If only images and free/low tier, use browser
  if (input.sourceImages?.length && !input.sourceVideos?.length) {
    const browserTiers: string[] = ['free', 'low'];
    if (browserTiers.includes(input.tier)) {
      return 'browser';
    }
  }

  // For higher tiers or complex processing, use cloud
  if (input.tier === 'medium' || input.tier === 'premium') {
    return 'cloud-api';
  }

  // Default to browser if supported
  return capabilities.supportsWasm ? 'browser' : 'cloud-api';
}

// Generate a single variation
async function generateSingleVariation(
  input: VideoCreationInput,
  scenes: AISceneDefinition[],
  engineId: string,
  backend: ProcessingBackend,
  variationIndex: number,
  onProgress?: (progress: number) => void
): Promise<VideoCreationOutput> {
  const aspectRatio = input.aspectRatios[variationIndex % input.aspectRatios.length] || '9:16';
  const dimensions = getAspectRatioDimensions(aspectRatio);

  // Randomize scenes slightly for variation
  const variedScenes = randomizeScenes(scenes, variationIndex);

  switch (backend) {
    case 'browser':
      return await generateWithBrowser(input, variedScenes, dimensions, aspectRatio, engineId, onProgress);
    
    case 'cloud-api':
      return await generateWithCloudAPI(input, variedScenes, dimensions, aspectRatio, engineId, onProgress);
    
    case 'remotion':
      return await generateWithRemotion(input, variedScenes, dimensions, aspectRatio, engineId, onProgress);
    
    default:
      throw new Error(`Unknown backend: ${backend}`);
  }
}

// Get dimensions for aspect ratio
function getAspectRatioDimensions(ratio: string): { width: number; height: number } {
  const dims: Record<string, { width: number; height: number }> = {
    '9:16': { width: 1080, height: 1920 },
    '16:9': { width: 1920, height: 1080 },
    '1:1': { width: 1080, height: 1080 },
    '4:5': { width: 1080, height: 1350 },
  };
  return dims[ratio] || dims['9:16'];
}

// Randomize scenes for variation
function randomizeScenes(scenes: AISceneDefinition[], seed: number): AISceneDefinition[] {
  return scenes.map((scene, i) => {
    // Slightly vary duration
    const durationVariation = 1 + ((seed * (i + 1)) % 10 - 5) / 100;
    
    // Possibly change motion style
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

// Browser-based generation
async function generateWithBrowser(
  input: VideoCreationInput,
  scenes: AISceneDefinition[],
  dimensions: { width: number; height: number },
  aspectRatio: string,
  engineId: string,
  onProgress?: (progress: number) => void
): Promise<VideoCreationOutput> {
  const images = input.sourceImages || [];
  
  if (images.length === 0) {
    throw new Error('Browser backend requires source images');
  }

  const videoBlob = await createVideoFromImages(images, scenes, {
    width: dimensions.width,
    height: dimensions.height,
    fps: 30,
    onProgress,
  });

  if (!videoBlob) {
    throw new Error('Failed to create video');
  }

  // Upload to storage
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id || 'anonymous';
  const fileName = `browser-${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
  const storagePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(storagePath, videoBlob, {
      contentType: 'video/webm',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('videos')
    .getPublicUrl(storagePath);

  return {
    id: `browser-${Date.now()}`,
    status: 'completed',
    videoUrl: urlData.publicUrl,
    aspectRatio,
    engine: engineId,
    backend: 'browser',
    scenes,
    duration: scenes.reduce((sum, s) => sum + s.duration, 0),
    estimatedCost: 0,
    actualCost: 0,
  };
}

// Cloud API generation
async function generateWithCloudAPI(
  input: VideoCreationInput,
  scenes: AISceneDefinition[],
  dimensions: { width: number; height: number },
  aspectRatio: string,
  engineId: string,
  onProgress?: (progress: number) => void
): Promise<VideoCreationOutput> {
  onProgress?.(0.1);

  // Call the video generation edge function
  const { data, error } = await supabase.functions.invoke('ffmpeg-creative-engine', {
    body: {
      task: {
        taskType: 'full-assembly',
        inputVideos: input.sourceVideos,
        inputImages: input.sourceImages,
        outputRatio: aspectRatio,
        transitions: input.transitions || ['cut', 'fade'],
        pacing: input.pacing || 'medium',
        maxDuration: input.maxDuration,
        removesSilence: true,
        motionEffects: ['ken-burns', 'parallax', 'zoom-pan'],
      },
      config: {
        sourceVideos: input.sourceVideos,
        variations: 1,
        hookStyles: input.hookStyles || ['story'],
        pacing: input.pacing || 'medium',
        transitions: input.transitions || ['cut'],
        ratios: [aspectRatio],
        voiceSettings: { language: input.language, tone: 'emotional' },
        market: input.market,
        language: input.language,
      },
      engineId,
    },
  });

  onProgress?.(0.9);

  if (error) {
    // Check for FFmpeg blocked error
    if (error.message?.includes('not available') || error.message?.includes('blocked')) {
      // Fallback to browser processing
      console.warn('[unified-executor] Cloud FFmpeg blocked, falling back to browser');
      return await generateWithBrowser(input, scenes, dimensions, aspectRatio, 'ffmpeg-wasm', onProgress);
    }
    throw error;
  }

  const engine = getEngineById(engineId);

  return {
    id: data?.jobId || `cloud-${Date.now()}`,
    status: data?.success ? 'completed' : 'processing',
    videoUrl: data?.videos?.[0]?.url,
    aspectRatio,
    engine: engineId,
    backend: 'cloud-api',
    scenes,
    duration: data?.videos?.[0]?.duration || scenes.reduce((sum, s) => sum + s.duration, 0),
    estimatedCost: (engine?.costPerSecond || 0) * input.maxDuration,
    processingLog: data?.ffmpegAvailable === false ? ['FFmpeg not available, used simulation'] : undefined,
  };
}

// Remotion-based generation (placeholder for future implementation)
async function generateWithRemotion(
  input: VideoCreationInput,
  scenes: AISceneDefinition[],
  dimensions: { width: number; height: number },
  aspectRatio: string,
  engineId: string,
  onProgress?: (progress: number) => void
): Promise<VideoCreationOutput> {
  // Remotion integration would go here
  // For now, fall back to browser processing
  console.warn('[unified-executor] Remotion not yet implemented, falling back to browser');
  return await generateWithBrowser(input, scenes, dimensions, aspectRatio, 'ffmpeg-wasm', onProgress);
}

// Retry a failed video
export async function retryVideoGeneration(
  output: VideoCreationOutput,
  input: VideoCreationInput
): Promise<VideoCreationOutput> {
  // Determine fallback backend
  let fallbackBackend: ProcessingBackend = output.backend;
  
  if (output.error?.code === 'FFMPEG_BLOCKED' || output.backend === 'cloud-api') {
    fallbackBackend = 'browser';
  }

  // Regenerate with fallback
  const results = await executeVideoCreation({
    ...input,
    backend: fallbackBackend,
    variationCount: 1,
  });

  return results[0];
}
