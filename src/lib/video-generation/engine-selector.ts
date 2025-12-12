// Intelligent Engine Selection Logic

import { 
  VideoEngine, 
  VideoGenerationInput, 
  EngineSelection,
  CostMode,
  QualityPreference,
  ExecutionMode,
  EngineCapability
} from './types';
import { VIDEO_ENGINE_REGISTRY, getAllEngines } from './engine-registry';

interface SelectionContext {
  input: VideoGenerationInput;
  availableEngines: VideoEngine[];
  filteredBy: string[];
}

// Main selection function - AI-driven engine choice
export function selectEngine(input: VideoGenerationInput): EngineSelection {
  const context: SelectionContext = {
    input,
    availableEngines: getAllEngines(),
    filteredBy: [],
  };

  // Step 1: Filter by execution mode
  filterByExecutionMode(context);

  // Step 2: Filter by cost mode (tier)
  filterByCostMode(context);

  // Step 3: Filter by quality preference
  filterByQualityPreference(context);

  // Step 4: Filter by required capabilities
  filterByCapabilities(context);

  // Step 5: Filter by duration support
  filterByDuration(context);

  // Step 6: Score and rank remaining engines
  const rankedEngines = scoreEngines(context);

  // Step 7: Select best engine
  const selectedEngine = rankedEngines[0];
  
  if (!selectedEngine) {
    // Fallback to free tier engine
    const fallback = VIDEO_ENGINE_REGISTRY.find(e => e.tier === 'free' && e.available);
    if (!fallback) {
      throw new Error('No available video engines');
    }
    return {
      engine: fallback,
      reason: 'Fallback to free tier - no engines matched constraints',
      alternativeEngines: [],
      estimatedCost: 0,
      estimatedDuration: input.duration,
    };
  }

  const estimatedCost = selectedEngine.cost_per_second * input.duration;

  return {
    engine: selectedEngine,
    reason: buildSelectionReason(selectedEngine, context),
    alternativeEngines: rankedEngines.slice(1, 4),
    estimatedCost,
    estimatedDuration: Math.min(input.duration, selectedEngine.max_duration_sec),
  };
}

function filterByExecutionMode(context: SelectionContext): void {
  const { executionMode } = context.input;
  context.availableEngines = context.availableEngines.filter(
    e => e.execution.includes(executionMode)
  );
  context.filteredBy.push(`execution:${executionMode}`);
}

function filterByCostMode(context: SelectionContext): void {
  const { costMode } = context.input;
  
  if (costMode === 'ai-chooses') {
    // AI can use any tier, but prefers cost-effective options
    return;
  }

  const tierMap: Record<CostMode, VideoEngine['tier'][]> = {
    'free': ['free'],
    'budget': ['free', 'budget'],
    'premium': ['free', 'budget', 'premium'],
    'ai-chooses': ['free', 'budget', 'premium'],
  };

  const allowedTiers = tierMap[costMode];
  context.availableEngines = context.availableEngines.filter(
    e => allowedTiers.includes(e.tier)
  );
  context.filteredBy.push(`cost:${costMode}`);
}

function filterByQualityPreference(context: SelectionContext): void {
  const { qualityPreference } = context.input;
  
  // Don't strictly filter, but this affects scoring
  // Fast can use any, balanced prefers balanced+, cinematic requires cinematic
  if (qualityPreference === 'cinematic') {
    // Prefer cinematic engines but allow balanced as fallback
    const cinematicEngines = context.availableEngines.filter(
      e => e.quality === 'cinematic'
    );
    if (cinematicEngines.length > 0) {
      context.availableEngines = cinematicEngines;
      context.filteredBy.push('quality:cinematic');
    }
  }
}

function filterByCapabilities(context: SelectionContext): void {
  const { images, scenes } = context.input;
  
  let requiredCapability: EngineCapability = 'text-to-video';
  
  // If we have images, prefer image-to-video
  if (images && images.length > 0) {
    requiredCapability = 'image-to-video';
  }
  
  // If scenes have videos, we need video-to-video
  if (scenes?.some(s => s.videoUrl)) {
    requiredCapability = 'video-to-video';
  }

  context.availableEngines = context.availableEngines.filter(
    e => e.supports.includes(requiredCapability)
  );
  context.filteredBy.push(`capability:${requiredCapability}`);
}

function filterByDuration(context: SelectionContext): void {
  const { duration } = context.input;
  
  // Filter engines that can handle the requested duration
  // But don't be too strict - we can split into segments
  context.availableEngines = context.availableEngines.filter(
    e => e.max_duration_sec >= Math.min(duration, 10) // At least handle 10s or requested
  );
  context.filteredBy.push(`duration:${duration}s`);
}

function scoreEngines(context: SelectionContext): VideoEngine[] {
  const { costMode, qualityPreference } = context.input;

  return context.availableEngines
    .map(engine => ({
      engine,
      score: calculateEngineScore(engine, costMode, qualityPreference),
    }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.engine);
}

function calculateEngineScore(
  engine: VideoEngine,
  costMode: CostMode,
  qualityPreference: QualityPreference
): number {
  let score = engine.priority;

  // Cost mode adjustments
  if (costMode === 'free' && engine.tier === 'free') {
    score += 50;
  } else if (costMode === 'budget') {
    if (engine.tier === 'free') score += 30;
    if (engine.tier === 'budget') score += 20;
  } else if (costMode === 'premium') {
    if (engine.tier === 'premium') score += 20;
  } else if (costMode === 'ai-chooses') {
    // Prefer value - balance cost and quality
    score += (100 - engine.cost_per_second * 100);
  }

  // Quality preference adjustments
  if (qualityPreference === 'fast' && engine.quality === 'fast') {
    score += 25;
  } else if (qualityPreference === 'balanced' && engine.quality === 'balanced') {
    score += 20;
  } else if (qualityPreference === 'cinematic' && engine.quality === 'cinematic') {
    score += 30;
  }

  return score;
}

function buildSelectionReason(engine: VideoEngine, context: SelectionContext): string {
  const { costMode, qualityPreference } = context.input;
  
  const parts: string[] = [];
  
  if (costMode === 'free') {
    parts.push('Selected free tier engine');
  } else if (costMode === 'ai-chooses') {
    parts.push('AI selected optimal engine');
  } else {
    parts.push(`Selected from ${costMode} tier`);
  }

  if (qualityPreference === 'cinematic') {
    parts.push('for cinematic quality');
  } else if (qualityPreference === 'fast') {
    parts.push('optimized for speed');
  }

  parts.push(`(${engine.name})`);

  return parts.join(' ');
}

// Estimate cost before generation
export function estimateCost(input: VideoGenerationInput): {
  minCost: number;
  maxCost: number;
  selectedEngineCost: number;
} {
  const selection = selectEngine(input);
  const duration = input.duration;

  const availableEngines = getAllEngines().filter(e => {
    if (input.costMode === 'free') return e.tier === 'free';
    if (input.costMode === 'budget') return ['free', 'budget'].includes(e.tier);
    return true;
  });

  const costs = availableEngines.map(e => e.cost_per_second * duration);
  
  return {
    minCost: Math.min(...costs),
    maxCost: Math.max(...costs),
    selectedEngineCost: selection.estimatedCost,
  };
}
