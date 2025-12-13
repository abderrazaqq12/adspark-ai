/**
 * Creative Scale - Barrel Export
 */

// Phase A Types
export * from './types';

// PRD Types
export * from './prd-types';

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

// FFmpeg Adapter
export {
  FFmpegAdapter,
  getFFmpegAdapter,
  resetFFmpegAdapter,
  checkFFmpegEnvironment,
  type FFmpegAdapterResult,
  type FFmpegAdapterOptions,
  type EnvironmentCheck,
} from './ffmpeg-adapter';

// Validation & Safety
export * from './validation';
export * from './brain-v2-types';
export * from './brain-v2-engine';

// Prompts (for edge functions)
export * from './prompts';
