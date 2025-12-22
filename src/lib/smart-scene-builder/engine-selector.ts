// Smart Scene Builder - AI Engine Selector
// Intelligent engine selection based on scene complexity, cost, and quality

import {
  SmartScenePlan,
  SceneComplexity,
  EngineDecision,
  AlternativeEngine,
  BudgetPreference,
  EngineSelectionContext,
  VideoEngineSpec,
  SceneStructure,
  MotionIntensity,
} from './types';
import {
  getAllEngines,
  getEngineById,
  getEnginesByTier,
  getEnginesWithinBudget,
  getTierBudgetLimit,
} from './engine-registry';

// Scene structure to complexity mapping
const STRUCTURE_COMPLEXITY: Record<SceneStructure, Partial<SceneComplexity>> = {
  product_closeup: { motionRequirement: 'simple', visualRealism: 'realistic' },
  problem_visualization: { motionRequirement: 'complex', visualRealism: 'stylized' },
  lifestyle_usage: { motionRequirement: 'dynamic', visualRealism: 'realistic' },
  social_proof: { motionRequirement: 'static', visualRealism: 'realistic' },
  cta_background: { motionRequirement: 'simple', visualRealism: 'stylized' },
  before_after: { motionRequirement: 'complex', visualRealism: 'realistic' },
  unboxing: { motionRequirement: 'dynamic', visualRealism: 'realistic' },
  testimonial: { motionRequirement: 'static', visualRealism: 'hyperreal' },
  feature_highlight: { motionRequirement: 'complex', visualRealism: 'realistic' },
  comparison: { motionRequirement: 'simple', visualRealism: 'realistic' },
};

// Motion intensity to requirement mapping
const MOTION_TO_REQUIREMENT: Record<MotionIntensity, SceneComplexity['motionRequirement']> = {
  low: 'static',
  medium: 'simple',
  high: 'dynamic',
};

// Analyze scene complexity
export function analyzeSceneComplexity(scene: Partial<SmartScenePlan>): SceneComplexity {
  const structureComplexity = scene.structure 
    ? STRUCTURE_COMPLEXITY[scene.structure] 
    : {};
  
  const motionRequirement = scene.motionIntensity 
    ? MOTION_TO_REQUIREMENT[scene.motionIntensity]
    : structureComplexity.motionRequirement || 'simple';
  
  const hasImage = !!scene.productImageUrl || !!scene.sourceAsset;
  const requiresImageInput = hasImage;
  
  // Calculate difficulty score
  let difficulty = 30; // Base
  
  if (motionRequirement === 'dynamic') difficulty += 30;
  else if (motionRequirement === 'complex') difficulty += 20;
  
  if (structureComplexity.visualRealism === 'hyperreal') difficulty += 25;
  else if (structureComplexity.visualRealism === 'realistic') difficulty += 15;
  
  if ((scene.duration || 5) > 7) difficulty += 10;
  
  return {
    motionRequirement,
    visualRealism: structureComplexity.visualRealism || 'realistic',
    hasAvatar: false,
    requiresImageInput,
    estimatedDifficulty: Math.min(100, difficulty),
  };
}

// Score an engine for a given context
function scoreEngine(
  engine: VideoEngineSpec,
  context: EngineSelectionContext
): number {
  const { complexity, budgetPreference } = context;
  let score = engine.priority;
  
  // Capability matching
  const requiredCapability = complexity.requiresImageInput 
    ? 'image-to-video' 
    : 'text-to-video';
  
  if (!engine.capabilities.includes(requiredCapability)) {
    return -1; // Cannot use this engine
  }
  
  // Quality matching based on complexity
  if (complexity.estimatedDifficulty > 70) {
    if (engine.quality === 'cinematic') score += 30;
    else if (engine.quality === 'balanced') score += 10;
    else score -= 20;
  } else if (complexity.estimatedDifficulty > 40) {
    if (engine.quality === 'balanced') score += 20;
    else if (engine.quality === 'cinematic') score += 10;
  } else {
    if (engine.quality === 'fast') score += 15;
    else if (engine.quality === 'balanced') score += 10;
  }
  
  // Motion requirement matching
  if (complexity.motionRequirement === 'dynamic' || complexity.motionRequirement === 'complex') {
    if (engine.tier === 'premium') score += 15;
    if (engine.quality === 'cinematic') score += 10;
  }
  
  // Duration support
  const sceneDuration = context.scene.duration || 5;
  if (engine.maxDurationSec < sceneDuration) {
    return -1; // Cannot handle duration
  }
  if (engine.maxDurationSec >= sceneDuration * 2) {
    score += 5; // Bonus for comfortable duration support
  }
  
  // Budget preference weighting
  if (budgetPreference === 'free') {
    if (engine.tier === 'free') score += 50;
    else return -1;
  } else if (budgetPreference === 'low') {
    if (engine.tier === 'free') score += 40;
    else if (engine.tier === 'budget') score += 30;
    else return -1;
  } else if (budgetPreference === 'balanced') {
    if (engine.tier === 'budget') score += 25;
    else if (engine.tier === 'free') score += 20;
    else if (engine.tier === 'premium') score += 10;
  } else if (budgetPreference === 'premium') {
    if (engine.tier === 'premium') score += 30;
    else if (engine.tier === 'budget') score += 15;
  }
  // 'auto' - no budget preference adjustment, pure quality match
  
  // Cost efficiency bonus (prefer cheaper when quality is similar)
  if (budgetPreference === 'auto' || budgetPreference === 'balanced') {
    const costFactor = 100 - (engine.costPerSecond * 200);
    score += Math.max(0, costFactor * 0.2);
  }
  
  return score;
}

// Select optimal engine for a scene
export function selectEngineForScene(
  scene: Partial<SmartScenePlan>,
  budgetPreference: BudgetPreference
): EngineDecision {
  const complexity = analyzeSceneComplexity(scene);
  
  const context: EngineSelectionContext = {
    scene,
    complexity,
    budgetPreference,
  };
  
  const allEngines = getAllEngines();
  
  // Score all engines
  const scoredEngines = allEngines
    .map(engine => ({
      engine,
      score: scoreEngine(engine, context),
    }))
    .filter(e => e.score >= 0)
    .sort((a, b) => b.score - a.score);
  
  if (scoredEngines.length === 0) {
    // Fallback to free tier
    const fallback = getEngineById('ffmpeg_creative') || getEngineById('nanobanana');
    if (!fallback) {
      throw new Error('No available engines');
    }
    
    return {
      engineId: fallback.engineId,
      engineName: fallback.name,
      tier: fallback.tier,
      costPerSecond: fallback.costPerSecond,
      estimatedCost: fallback.costPerSecond * (scene.duration || 5),
      qualityScore: 50, // Fallback quality score
      reason: 'Fallback to free tier - no engines matched requirements',
      alternatives: [],
    };
  }
  
  const selected = scoredEngines[0].engine;
  const sceneDuration = scene.duration || 5;
  
  // Build alternatives list (top 3 rejected)
  const alternatives: AlternativeEngine[] = scoredEngines
    .slice(1, 4)
    .map(({ engine, score }) => ({
      engineId: engine.engineId,
      engineName: engine.name,
      tier: engine.tier,
      costPerSecond: engine.costPerSecond,
      rejectionReason: buildRejectionReason(engine, selected, context),
    }));
  
  // Build selection reason
  const reason = buildSelectionReason(selected, complexity, budgetPreference);
  
  // Calculate quality score based on engine tier and complexity match
  const qualityScore = calculateQualityScore(selected, complexity, scoredEngines[0].score);
  
  return {
    engineId: selected.engineId,
    engineName: selected.name,
    tier: selected.tier,
    costPerSecond: selected.costPerSecond,
    estimatedCost: selected.costPerSecond * sceneDuration,
    qualityScore,
    reason,
    alternatives,
  };
}

// Calculate quality score based on engine capabilities and scene match
function calculateQualityScore(
  engine: VideoEngineSpec, 
  complexity: SceneComplexity, 
  engineScore: number
): number {
  let quality = 50; // Base score
  
  // Tier bonus
  if (engine.tier === 'premium') quality += 30;
  else if (engine.tier === 'budget') quality += 15;
  else quality += 5;
  
  // Quality setting bonus
  if (engine.quality === 'cinematic') quality += 15;
  else if (engine.quality === 'balanced') quality += 10;
  else quality += 5;
  
  // Complexity match bonus (how well engine score matched)
  quality += Math.min(10, engineScore / 10);
  
  // Cap at 100
  return Math.min(100, Math.max(0, Math.round(quality)));
}

// Build selection reason string
function buildSelectionReason(
  engine: VideoEngineSpec,
  complexity: SceneComplexity,
  budget: BudgetPreference
): string {
  const parts: string[] = [];
  
  if (budget === 'free') {
    parts.push('Selected free tier engine');
  } else if (budget === 'auto') {
    parts.push('AI selected optimal engine');
  } else {
    parts.push(`Selected from ${budget} budget tier`);
  }
  
  if (complexity.estimatedDifficulty > 70) {
    parts.push('for complex scene requirements');
  } else if (complexity.estimatedDifficulty > 40) {
    parts.push('for balanced quality/cost');
  } else {
    parts.push('for efficient processing');
  }
  
  if (engine.quality === 'cinematic') {
    parts.push('with cinematic quality');
  }
  
  parts.push(`(${engine.name})`);
  
  return parts.join(' ');
}

// Build rejection reason string
function buildRejectionReason(
  rejected: VideoEngineSpec,
  selected: VideoEngineSpec,
  context: EngineSelectionContext
): string {
  if (rejected.costPerSecond > selected.costPerSecond * 1.5) {
    return 'Higher cost without proportional quality improvement';
  }
  
  if (rejected.tier === 'premium' && context.budgetPreference === 'low') {
    return 'Exceeds budget preference';
  }
  
  if (rejected.quality === 'fast' && context.complexity.estimatedDifficulty > 60) {
    return 'Quality may be insufficient for scene complexity';
  }
  
  if (rejected.priority < selected.priority) {
    return 'Lower overall priority score';
  }
  
  return 'Selected engine has better overall match';
}

// Batch select engines for all scenes
export function selectEnginesForScenes(
  scenes: Partial<SmartScenePlan>[],
  budgetPreference: BudgetPreference
): EngineDecision[] {
  return scenes.map(scene => selectEngineForScene(scene, budgetPreference));
}

// Calculate total estimated cost
export function calculateTotalCost(scenes: SmartScenePlan[]): number {
  return scenes.reduce((total, scene) => {
    return total + (scene.selectedEngine?.estimatedCost || 0);
  }, 0);
}

// Get unique engines used
export function getUniqueEnginesUsed(scenes: SmartScenePlan[]): string[] {
  const engines = new Set<string>();
  scenes.forEach(scene => {
    if (scene.selectedEngine?.engineName) {
      engines.add(scene.selectedEngine.engineName);
    }
  });
  return Array.from(engines);
}
