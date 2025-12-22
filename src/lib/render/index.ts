/**
 * UNIFIED RENDER MODULE
 * 
 * Single entry point for all rendering operations.
 * Exports contracts, client, and decision scorer.
 */

// Contracts (types)
export * from './contracts';

// VPS Client (API calls)
export {
  detectVPSCapabilities,
  submitRenderJob,
  getJobStatus,
  waitForJobCompletion,
  uploadToVPS,
  renderVideo,
} from './vps-client';

// Decision Scorer (engine selection)
export {
  DecisionScorer,
  getDecisionScorer,
  initDecisionScorer,
} from './decision-scorer';
