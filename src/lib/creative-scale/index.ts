/**
 * Creative Scale - Barrel Export
 */

// Phase A Types
export * from './types';

// Step 4: Compiler
export * from './compiler-types';
export { compile, compileAll } from './compiler';

// Phase B Step 5: Router
export * from './router-types';
export * from './engine-registry';
export {
  extractRequiredCapabilities,
  scoreEngines,
  selectBestEngine,
  simplifyPlan,
  createJobContext,
  transitionState,
  routeExecution,
  getCompatibleEngines,
} from './router';

// Validation & Safety
export * from './validation';

// Prompts (for edge functions)
export * from './prompts';
