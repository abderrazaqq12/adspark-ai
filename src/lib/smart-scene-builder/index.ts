// Smart Scene Builder - Main Entry Point

// Types
export * from './types';

// Engine Registry
export {
  SMART_ENGINE_REGISTRY,
  getAllEngines,
  getEngineById,
  getEnginesByTier,
  getEnginesByCapability,
  getEnginesWithinBudget,
  getTierBudgetLimit,
} from './engine-registry';

// Engine Selector
export {
  analyzeSceneComplexity,
  selectEngineForScene,
  selectEnginesForScenes,
  calculateTotalCost,
  getUniqueEnginesUsed,
} from './engine-selector';

// Scene Generator
export {
  generateSceneFromStructure,
  generateScenesFromTemplate,
  generateScenesFromAssets,
  generateEmptyScene,
  regenerateSceneEngine,
  calculateTotalDuration,
  reorderScenes,
  updateSceneDuration,
} from './scene-generator';

// Output Schema
export {
  generateScenePlanOutput,
  validateScenePlan,
  toRenderableFormat,
  exportScenePlanJSON,
  parseScenePlanJSON,
} from './output-schema';
