/**
 * Unified Components Index
 * 
 * SYSTEM-WIDE UX CONTRACT:
 * - All tools MUST use these components
 * - Identical placement and behavior across all tools
 * - Backend-driven state, no local assumptions
 */

export { 
  UnifiedHistoryControl,
  type ToolType 
} from './UnifiedHistoryControl';

export { 
  UnifiedStepSidebar,
  CREATIVE_AI_EDITOR_STEPS,
  CREATIVE_REPLICATOR_STEPS,
  STUDIO_STEPS,
  AI_TOOLS_STEPS,
  type StepConfig
} from './UnifiedStepSidebar';

export { 
  UnifiedPipelineStatus 
} from './UnifiedPipelineStatus';
