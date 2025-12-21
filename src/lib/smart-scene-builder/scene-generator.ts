// Smart Scene Builder - Scene Generation Logic
// AI-powered scene creation that's script-agnostic but script-compatible

import {
  SmartScenePlan,
  SceneStructure,
  SceneGoal,
  MotionIntensity,
  SceneDuration,
  VisualAsset,
  VideoConfig,
  BudgetPreference,
} from './types';
import { selectEngineForScene } from './engine-selector';

// Scene structure templates for different ad formats
const SCENE_STRUCTURE_TEMPLATES: Record<string, SceneStructure[]> = {
  product_focused: [
    'product_closeup',
    'feature_highlight',
    'lifestyle_usage',
    'social_proof',
    'cta_background',
  ],
  problem_solution: [
    'problem_visualization',
    'product_closeup',
    'before_after',
    'social_proof',
    'cta_background',
  ],
  testimonial: [
    'testimonial',
    'product_closeup',
    'lifestyle_usage',
    'cta_background',
  ],
  unboxing: [
    'unboxing',
    'product_closeup',
    'feature_highlight',
    'cta_background',
  ],
  comparison: [
    'comparison',
    'feature_highlight',
    'social_proof',
    'cta_background',
  ],
};

// Scene structure to goal mapping
const STRUCTURE_TO_GOAL: Record<SceneStructure, SceneGoal> = {
  product_closeup: 'explain',
  problem_visualization: 'hook',
  lifestyle_usage: 'explain',
  social_proof: 'proof',
  cta_background: 'cta',
  before_after: 'proof',
  unboxing: 'hook',
  testimonial: 'proof',
  feature_highlight: 'explain',
  comparison: 'explain',
};

// Scene structure to motion mapping
const STRUCTURE_TO_MOTION: Record<SceneStructure, MotionIntensity> = {
  product_closeup: 'low',
  problem_visualization: 'medium',
  lifestyle_usage: 'high',
  social_proof: 'low',
  cta_background: 'low',
  before_after: 'medium',
  unboxing: 'high',
  testimonial: 'low',
  feature_highlight: 'medium',
  comparison: 'medium',
};

// Visual intent templates
const VISUAL_INTENT_TEMPLATES: Record<SceneStructure, string[]> = {
  product_closeup: [
    'Elegant product showcase with soft lighting and subtle rotation',
    'Cinematic close-up revealing product details and craftsmanship',
    'Clean, minimalist product display with professional lighting',
  ],
  problem_visualization: [
    'Visual representation of the problem customers face',
    'Dramatic scene showing frustration or inconvenience',
    'Before-state visualization emphasizing pain points',
  ],
  lifestyle_usage: [
    'Product in real-life context, showing natural usage',
    'Lifestyle scene demonstrating product benefits',
    'Active usage showing product value in daily life',
  ],
  social_proof: [
    'Customer satisfaction visualization with positive emotions',
    'Social proof elements like ratings and reviews',
    'Trust-building scene with authentic testimonials',
  ],
  cta_background: [
    'Dynamic background for call-to-action overlay',
    'Eye-catching visual to support final message',
    'Compelling backdrop for purchase prompt',
  ],
  before_after: [
    'Split-screen or transition showing transformation',
    'Dramatic before/after comparison',
    'Visual proof of product effectiveness',
  ],
  unboxing: [
    'Exciting unboxing experience with anticipation',
    'First impressions and product reveal',
    'Premium packaging and presentation',
  ],
  testimonial: [
    'Authentic customer speaking about experience',
    'Real person sharing genuine feedback',
    'Testimonial with natural setting',
  ],
  feature_highlight: [
    'Focused demonstration of key feature',
    'Technical capability showcase',
    'Feature in action with clear benefit',
  ],
  comparison: [
    'Side-by-side comparison with alternatives',
    'Competitive advantage visualization',
    'Clear differentiation showcase',
  ],
};

// Generate unique ID
function generateId(): string {
  return `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get random visual intent
function getRandomVisualIntent(structure: SceneStructure): string {
  const templates = VISUAL_INTENT_TEMPLATES[structure];
  return templates[Math.floor(Math.random() * templates.length)];
}

// Generate scene from structure
export function generateSceneFromStructure(
  structure: SceneStructure,
  index: number,
  config: VideoConfig,
  asset?: VisualAsset
): SmartScenePlan {
  const duration = config.defaultSceneDuration;
  const goal = STRUCTURE_TO_GOAL[structure];
  const motionIntensity = STRUCTURE_TO_MOTION[structure];
  const visualIntent = getRandomVisualIntent(structure);
  
  const partialScene: Partial<SmartScenePlan> = {
    structure,
    goal,
    motionIntensity,
    duration,
    sourceAsset: asset,
    productImageUrl: asset?.type === 'image' ? asset.url : undefined,
  };
  
  const engineDecision = selectEngineForScene(partialScene, config.budgetPreference);
  
  return {
    id: generateId(),
    index,
    structure,
    goal,
    visualIntent,
    motionIntensity,
    textSafeArea: config.enableTextOverlays,
    duration,
    sourceAsset: asset,
    productImageUrl: asset?.type === 'image' ? asset.url : undefined,
    selectedEngine: engineDecision,
    status: 'pending',
  };
}

// Generate scenes from template
export function generateScenesFromTemplate(
  templateName: string,
  config: VideoConfig,
  assets: VisualAsset[] = []
): SmartScenePlan[] {
  const template = SCENE_STRUCTURE_TEMPLATES[templateName] || 
                   SCENE_STRUCTURE_TEMPLATES.product_focused;
  
  return template.map((structure, index) => {
    const asset = assets[index]; // Match assets to scenes if available
    return generateSceneFromStructure(structure, index, config, asset);
  });
}

// Generate scenes from assets (visual-first approach)
export function generateScenesFromAssets(
  assets: VisualAsset[],
  config: VideoConfig
): SmartScenePlan[] {
  if (assets.length === 0) {
    // No assets - generate from template
    return generateScenesFromTemplate('product_focused', config);
  }
  
  // Analyze assets and assign appropriate structures
  return assets.slice(0, 8).map((asset, index) => {
    let structure: SceneStructure;
    
    // Determine structure based on asset analysis or position
    if (index === 0) {
      structure = 'product_closeup'; // First scene is usually product intro
    } else if (index === assets.length - 1) {
      structure = 'cta_background'; // Last scene is CTA
    } else if (asset.analysis?.suggestedSceneTypes?.[0]) {
      structure = asset.analysis.suggestedSceneTypes[0];
    } else if (asset.type === 'video') {
      structure = 'lifestyle_usage';
    } else {
      // Cycle through structures
      const structures: SceneStructure[] = [
        'feature_highlight',
        'lifestyle_usage',
        'social_proof',
        'before_after',
      ];
      structure = structures[(index - 1) % structures.length];
    }
    
    return generateSceneFromStructure(structure, index, config, asset);
  });
}

// Generate empty scene for manual creation
export function generateEmptyScene(
  index: number,
  config: VideoConfig
): SmartScenePlan {
  const structure: SceneStructure = 'product_closeup';
  
  const partialScene: Partial<SmartScenePlan> = {
    structure,
    goal: 'explain',
    motionIntensity: 'medium',
    duration: config.defaultSceneDuration,
  };
  
  const engineDecision = selectEngineForScene(partialScene, config.budgetPreference);
  
  return {
    id: generateId(),
    index,
    structure,
    goal: 'explain',
    visualIntent: 'Custom scene - add your visual description',
    motionIntensity: 'medium',
    textSafeArea: config.enableTextOverlays,
    duration: config.defaultSceneDuration,
    selectedEngine: engineDecision,
    status: 'pending',
  };
}

// Regenerate engine for existing scene
export function regenerateSceneEngine(
  scene: SmartScenePlan,
  budgetPreference: BudgetPreference
): SmartScenePlan {
  const newEngine = selectEngineForScene(scene, budgetPreference);
  return {
    ...scene,
    selectedEngine: newEngine,
  };
}

// Calculate total duration
export function calculateTotalDuration(scenes: SmartScenePlan[]): number {
  return scenes.reduce((total, scene) => total + scene.duration, 0);
}

// Reorder scenes and update indices
export function reorderScenes(
  scenes: SmartScenePlan[],
  fromIndex: number,
  toIndex: number
): SmartScenePlan[] {
  const result = [...scenes];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  
  return result.map((scene, index) => ({
    ...scene,
    index,
  }));
}

// Update scene duration
export function updateSceneDuration(
  scene: SmartScenePlan,
  newDuration: SceneDuration,
  budgetPreference: BudgetPreference
): SmartScenePlan {
  const updatedScene = { ...scene, duration: newDuration };
  // Recalculate engine since duration affects cost
  const newEngine = selectEngineForScene(updatedScene, budgetPreference);
  return {
    ...updatedScene,
    selectedEngine: newEngine,
  };
}
