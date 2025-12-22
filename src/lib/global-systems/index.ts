/**
 * GLOBAL SYSTEMS MODULE
 * 
 * Exports the master systems used across all FlowScale tools:
 * 1. Global Decision Scorer - VPS-First engine selection
 * 2. Global Cost Optimizer - Cost-optimized routing
 */

export {
  GlobalDecisionScorer,
  getGlobalDecisionScorer,
  initGlobalDecisionScorer,
  type EngineScoreFactors,
  type ScoringWeights,
  type EngineDecisionResult,
  type VPSStatus,
  type DecisionContext,
} from './decision-scorer';

export {
  GlobalCostOptimizer,
  getGlobalCostOptimizer,
  estimateOperationCost,
  type CostBreakdown,
  type CostEstimate,
  type CostOptimizerInput,
} from './cost-optimizer';
