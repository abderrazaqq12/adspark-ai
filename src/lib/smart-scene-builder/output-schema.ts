// Smart Scene Builder - Output Schema & Validation
// Final output contract for assembly and rendering

import {
  SmartScenePlan,
  ScenePlanOutput,
  VideoConfig,
} from './types';
import { calculateTotalCost, getUniqueEnginesUsed } from './engine-selector';
import { calculateTotalDuration } from './scene-generator';

// Generate the final Scene Plan JSON output
export function generateScenePlanOutput(
  projectId: string,
  config: VideoConfig,
  scenes: SmartScenePlan[]
): ScenePlanOutput {
  const totalDuration = calculateTotalDuration(scenes);
  const totalEstimatedCost = calculateTotalCost(scenes);
  const enginesUsed = getUniqueEnginesUsed(scenes);
  const completedCount = scenes.filter(s => s.status === 'completed').length;
  
  return {
    version: '1.0',
    projectId,
    createdAt: new Date().toISOString(),
    config,
    scenes,
    metadata: {
      totalDuration,
      totalEstimatedCost,
      enginesUsed,
      scenesCount: scenes.length,
      completedCount,
    },
  };
}

// Validate scene plan for assembly
export function validateScenePlan(
  plan: ScenePlanOutput
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  if (!plan.projectId) {
    errors.push('Missing project ID');
  }
  
  if (!plan.scenes || plan.scenes.length === 0) {
    errors.push('No scenes defined');
  }
  
  // Check each scene
  plan.scenes.forEach((scene, index) => {
    if (!scene.selectedEngine) {
      errors.push(`Scene ${index + 1}: No engine selected`);
    }
    
    if (!scene.visualIntent && !scene.productImageUrl && !scene.sourceAsset) {
      warnings.push(`Scene ${index + 1}: No visual content defined`);
    }
    
    if (scene.status === 'failed') {
      warnings.push(`Scene ${index + 1}: Generation failed - ${scene.error || 'Unknown error'}`);
    }
    
    if (scene.status !== 'completed' && !scene.sourceAsset?.url) {
      warnings.push(`Scene ${index + 1}: Not yet generated`);
    }
  });
  
  // Check total duration
  if (plan.metadata.totalDuration > 120) {
    warnings.push('Total duration exceeds 2 minutes - consider reducing for ads');
  }
  
  if (plan.metadata.totalDuration < 5) {
    warnings.push('Total duration very short - consider adding more scenes');
  }
  
  // Check completion status
  if (plan.metadata.completedCount < plan.metadata.scenesCount) {
    warnings.push(`Only ${plan.metadata.completedCount}/${plan.metadata.scenesCount} scenes completed`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Convert scene plan to simplified format for rendering
export function toRenderableFormat(plan: ScenePlanOutput): {
  scenes: Array<{
    id: string;
    videoUrl?: string;
    imageUrl?: string;
    duration: number;
    engine: string;
    order: number;
  }>;
  config: {
    aspectRatio: string;
    resolution: string;
    totalDuration: number;
  };
} {
  return {
    scenes: plan.scenes
      .filter(s => s.status === 'completed' || s.sourceAsset?.url)
      .map(scene => ({
        id: scene.id,
        videoUrl: scene.videoUrl || scene.sourceAsset?.url,
        imageUrl: scene.productImageUrl,
        duration: scene.duration,
        engine: scene.selectedEngine.engineName,
        order: scene.index,
      })),
    config: {
      aspectRatio: plan.config.aspectRatio,
      resolution: plan.config.resolution,
      totalDuration: plan.metadata.totalDuration,
    },
  };
}

// Export scene plan as JSON string
export function exportScenePlanJSON(plan: ScenePlanOutput): string {
  return JSON.stringify(plan, null, 2);
}

// Parse scene plan from JSON string
export function parseScenePlanJSON(json: string): ScenePlanOutput | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed.version && parsed.scenes && parsed.config) {
      return parsed as ScenePlanOutput;
    }
    return null;
  } catch {
    return null;
  }
}
