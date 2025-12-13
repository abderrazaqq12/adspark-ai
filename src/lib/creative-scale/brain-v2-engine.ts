/**
 * AI Brain v2 - Multi-Layer Decision Engine
 * 5-Layer Architecture: Problem → Candidates → Scoring → Selection → Explainability
 * 
 * LLM is allowed ONLY in:
 * - Problem interpretation
 * - Explanation generation
 * 
 * All scoring, selection, and constraints are CODE-CONTROLLED
 */

import type {
  BrainInput,
  BrainOutput,
  BrainFailureOutput,
  DetectedProblem,
  ProblemDetectionOutput,
  ProblemType,
  StrategyCandidate,
  StrategyAction,
  ScoredStrategy,
  SelectionResult,
  CreativeBlueprintV2,
  ExplanationBlock,
  FrameworkType,
  OptimizationGoal,
  RiskTolerance,
  ScoringWeights,
  VideoAnalysisSignals
} from './brain-v2-types';

// ============================================
// CONSTANTS & THRESHOLDS
// ============================================

const PROBLEM_SEVERITY_THRESHOLD = 0.4; // Below this = not a real problem
const NO_ACTION_THRESHOLD = 0.3; // If max severity below this, recommend no action
const RISK_THRESHOLD_BY_TOLERANCE: Record<RiskTolerance, number> = {
  low: 0.3,
  medium: 0.5,
  high: 0.8
};

// Goal-specific weights for scoring
const GOAL_WEIGHTS: Record<OptimizationGoal, ScoringWeights> = {
  retention: { impact_weight: 1.2, risk_penalty: 0.8, cost_penalty: 0.3, trust_bonus: 0.2 },
  ctr: { impact_weight: 1.0, risk_penalty: 0.6, cost_penalty: 0.4, trust_bonus: 0.3 },
  cpa: { impact_weight: 0.8, risk_penalty: 1.0, cost_penalty: 0.6, trust_bonus: 0.4 }
};

// Framework → Problem type mappings
const FRAMEWORK_SOLVES: Record<FrameworkType, ProblemType[]> = {
  AIDA: ['ATTENTION_DROP_EARLY', 'CTA_WEAK', 'BENEFIT_UNCLEAR'],
  PAS: ['MID_PACING_DROP', 'CLARITY_LOW', 'PROOF_MISSING'],
  HOOK_DEMO_CTA: ['HOOK_WEAK', 'PROOF_MISSING', 'CTA_WEAK'],
  PATTERN_INTERRUPT: ['HOOK_WEAK', 'ATTENTION_DROP_EARLY'],
  PROOF_FIRST: ['PROOF_MISSING', 'CTA_WEAK'],
  SPEED_ONLY: ['PACING_INCONSISTENT', 'DURATION_TOO_LONG', 'MID_PACING_DROP'],
  FAB: ['BENEFIT_UNCLEAR', 'PROOF_MISSING'],
  BAB: ['CLARITY_LOW', 'BENEFIT_UNCLEAR']
};

// Framework characteristics
const FRAMEWORK_RISK: Record<FrameworkType, number> = {
  SPEED_ONLY: 0.1, // Low risk - just pacing
  AIDA: 0.2,
  FAB: 0.25,
  BAB: 0.3,
  PAS: 0.35,
  HOOK_DEMO_CTA: 0.4,
  PROOF_FIRST: 0.45,
  PATTERN_INTERRUPT: 0.6 // High risk - major restructure
};

const FRAMEWORK_COST: Record<FrameworkType, number> = {
  SPEED_ONLY: 0.1,
  AIDA: 0.4,
  FAB: 0.35,
  BAB: 0.45,
  PAS: 0.5,
  HOOK_DEMO_CTA: 0.55,
  PROOF_FIRST: 0.5,
  PATTERN_INTERRUPT: 0.7
};

// ============================================
// LAYER 1: PROBLEM DETECTION (Code-controlled)
// ============================================

export function detectProblems(
  signals: VideoAnalysisSignals
): ProblemDetectionOutput {
  const problems: DetectedProblem[] = [];
  const { signals: s, segments, technical } = signals;

  // Hook weakness
  if (s.hook_score < 70) {
    problems.push({
      type: 'HOOK_WEAK',
      severity: 1 - (s.hook_score / 100),
      segment_id: segments.find(seg => seg.type === 'hook')?.id,
      details: `Hook score ${s.hook_score}/100 is below optimal threshold`
    });
  }

  // Mid pacing drop
  if (s.pacing_drop_mid) {
    problems.push({
      type: 'MID_PACING_DROP',
      severity: 0.65,
      segment_id: segments.find(seg => seg.type === 'body')?.id,
      details: 'Viewer attention drops significantly in the middle section'
    });
  }

  // CTA weakness
  if (s.cta_strength < 0.5) {
    problems.push({
      type: 'CTA_WEAK',
      severity: 1 - s.cta_strength,
      segment_id: segments.find(seg => seg.type === 'cta')?.id,
      details: `CTA strength ${Math.round(s.cta_strength * 100)}% needs improvement`
    });
  }

  // Missing proof
  if (!s.proof_present) {
    problems.push({
      type: 'PROOF_MISSING',
      severity: 0.55,
      details: 'No social proof or testimonial elements detected'
    });
  }

  // Clarity issues
  if (s.clarity_score < 60) {
    problems.push({
      type: 'CLARITY_LOW',
      severity: 1 - (s.clarity_score / 100),
      details: `Message clarity score ${s.clarity_score}/100 is suboptimal`
    });
  }

  // Attention curve analysis
  if (s.attention_curve && s.attention_curve.length >= 3) {
    const early = s.attention_curve[0];
    const mid = s.attention_curve[Math.floor(s.attention_curve.length / 2)];
    const late = s.attention_curve[s.attention_curve.length - 1];

    if (early < 0.5) {
      problems.push({
        type: 'ATTENTION_DROP_EARLY',
        severity: 1 - early,
        details: 'Viewers lose attention in the first few seconds'
      });
    }

    if (late < mid * 0.7) {
      problems.push({
        type: 'ATTENTION_DROP_LATE',
        severity: 0.5,
        details: 'Attention drops off before CTA'
      });
    }

    // Check for pacing inconsistency
    const variance = calculateVariance(s.attention_curve);
    if (variance > 0.15) {
      problems.push({
        type: 'PACING_INCONSISTENT',
        severity: Math.min(1, variance * 2),
        details: 'Pacing is inconsistent throughout the video'
      });
    }
  }

  // Duration issues
  const durationSec = technical.duration_ms / 1000;
  if (durationSec > 45) {
    problems.push({
      type: 'DURATION_TOO_LONG',
      severity: Math.min(1, (durationSec - 45) / 30),
      details: `Video duration ${Math.round(durationSec)}s exceeds optimal length`
    });
  } else if (durationSec < 8) {
    problems.push({
      type: 'DURATION_TOO_SHORT',
      severity: Math.min(1, (8 - durationSec) / 5),
      details: `Video duration ${Math.round(durationSec)}s may be too short`
    });
  }

  // Sort by severity
  problems.sort((a, b) => b.severity - a.severity);

  // Check if we should recommend no action
  const maxSeverity = problems.length > 0 ? problems[0].severity : 0;
  
  if (maxSeverity < NO_ACTION_THRESHOLD) {
    return {
      problems: [],
      no_action_recommended: true,
      reason: 'No significant problems detected. Video is performing well.'
    };
  }

  // Filter to significant problems only
  const significantProblems = problems.filter(p => p.severity >= PROBLEM_SEVERITY_THRESHOLD);

  return {
    problems: significantProblems.slice(0, 4), // Max 4 problems to address
    no_action_recommended: false
  };
}

// ============================================
// LAYER 2: STRATEGY CANDIDATES (Code-controlled)
// ============================================

export function generateStrategyCandidates(
  problems: DetectedProblem[],
  signals: VideoAnalysisSignals,
  userConstraints?: BrainInput['user_constraints']
): StrategyCandidate[] {
  const candidates: StrategyCandidate[] = [];
  const forbiddenActions = userConstraints?.forbidden_actions || [];
  const problemTypes = problems.map(p => p.type);

  // Generate candidates for each framework that could help
  for (const [framework, solvableProblems] of Object.entries(FRAMEWORK_SOLVES) as [FrameworkType, ProblemType[]][]) {
    const solves = solvableProblems.filter(p => problemTypes.includes(p));
    
    if (solves.length === 0) continue;

    const actions = generateActionsForFramework(framework, problems, signals, forbiddenActions);
    
    if (actions.length === 0) continue;

    candidates.push({
      strategy_id: `strategy_${framework.toLowerCase()}_${Date.now()}`,
      framework,
      solves,
      cost: FRAMEWORK_COST[framework],
      risk: FRAMEWORK_RISK[framework],
      actions
    });
  }

  return candidates;
}

function generateActionsForFramework(
  framework: FrameworkType,
  problems: DetectedProblem[],
  signals: VideoAnalysisSignals,
  forbiddenActions: string[]
): StrategyAction[] {
  const actions: StrategyAction[] = [];
  const segments = signals.segments;

  switch (framework) {
    case 'SPEED_ONLY':
      // Just compress slow segments
      if (!forbiddenActions.includes('compress_segment')) {
        const bodySegment = segments.find(s => s.type === 'body');
        if (bodySegment) {
          actions.push({
            action: 'compress_segment',
            target_segment_id: bodySegment.id,
            target_segment_type: bodySegment.type,
            factor: 1.3, // Speed up by 30%
            intent: 'Speed up mid-section to maintain momentum'
          });
        }
      }
      break;

    case 'PATTERN_INTERRUPT':
      // Emphasize hook, reorder for impact
      const hookSegment = segments.find(s => s.type === 'hook');
      if (hookSegment && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: hookSegment.id,
          target_segment_type: hookSegment.type,
          intent: 'Make hook more impactful with pattern interrupt'
        });
      }
      break;

    case 'PAS':
      // Problem-Agitate-Solution: reorder and compress
      const problemSeg = segments.find(s => s.type === 'problem');
      const solutionSeg = segments.find(s => s.type === 'solution');
      
      if (problemSeg && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: problemSeg.id,
          target_segment_type: problemSeg.type,
          intent: 'Emphasize problem to create urgency'
        });
      }
      
      if (solutionSeg && !forbiddenActions.includes('compress_segment')) {
        actions.push({
          action: 'compress_segment',
          target_segment_id: solutionSeg.id,
          target_segment_type: solutionSeg.type,
          factor: 1.2,
          intent: 'Tighten solution delivery'
        });
      }
      break;

    case 'PROOF_FIRST':
      // Lead with proof segment
      const proofSegment = segments.find(s => s.type === 'proof');
      if (proofSegment && !forbiddenActions.includes('reorder_segments')) {
        actions.push({
          action: 'reorder_segments',
          target_segment_id: proofSegment.id,
          target_segment_type: proofSegment.type,
          intent: 'Move proof to beginning for credibility'
        });
      }
      break;

    case 'HOOK_DEMO_CTA':
      // Three-part structure
      const hook = segments.find(s => s.type === 'hook');
      const cta = segments.find(s => s.type === 'cta');
      const fillers = segments.filter(s => s.type === 'filler');
      
      if (hook && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: hook.id,
          target_segment_type: hook.type,
          intent: 'Strengthen hook'
        });
      }
      
      if (cta && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: cta.id,
          target_segment_type: cta.type,
          intent: 'Make CTA more compelling'
        });
      }
      
      // Remove fillers
      for (const filler of fillers.slice(0, 2)) {
        if (!forbiddenActions.includes('remove_segment')) {
          actions.push({
            action: 'remove_segment',
            target_segment_id: filler.id,
            target_segment_type: filler.type,
            intent: 'Remove non-essential content'
          });
        }
      }
      break;

    case 'AIDA':
      // Attention-Interest-Desire-Action
      const hookSeg = segments.find(s => s.type === 'hook');
      const benefitSeg = segments.find(s => s.type === 'benefit');
      const ctaSeg = segments.find(s => s.type === 'cta');
      
      if (hookSeg && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: hookSeg.id,
          target_segment_type: hookSeg.type,
          intent: 'Capture attention immediately'
        });
      }
      
      if (benefitSeg && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: benefitSeg.id,
          target_segment_type: benefitSeg.type,
          intent: 'Build desire through benefits'
        });
      }
      break;

    case 'FAB':
    case 'BAB':
      // Features/Benefits focused
      const benefitSegment = segments.find(s => s.type === 'benefit');
      if (benefitSegment && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: benefitSegment.id,
          target_segment_type: benefitSegment.type,
          intent: 'Highlight key benefits'
        });
      }
      break;
  }

  return actions;
}

// ============================================
// LAYER 3: SCORING ENGINE (Code-controlled)
// ============================================

export function scoreStrategies(
  candidates: StrategyCandidate[],
  problems: DetectedProblem[],
  goal: OptimizationGoal,
  historicalContext?: BrainInput['historical_context']
): ScoredStrategy[] {
  const weights = GOAL_WEIGHTS[goal];
  const scoredStrategies: ScoredStrategy[] = [];

  for (const candidate of candidates) {
    // Calculate impact based on problem severity solved
    const solvedProblems = problems.filter(p => candidate.solves.includes(p.type));
    const impact = solvedProblems.reduce((sum, p) => sum + p.severity, 0) / Math.max(1, problems.length);

    // Get historical confidence
    let confidence = 0.5; // Base confidence
    if (historicalContext?.past_strategies) {
      const pastUsage = historicalContext.past_strategies.filter(
        s => s.framework === candidate.framework
      );
      if (pastUsage.length > 0) {
        const successfulUses = pastUsage.filter(s => s.was_downloaded && !s.was_regenerated);
        confidence = 0.5 + (successfulUses.length / pastUsage.length) * 0.4;
      }
    }

    // Calculate final score
    const impact_contribution = impact * weights.impact_weight;
    const risk_penalty = candidate.risk * weights.risk_penalty;
    const cost_penalty = candidate.cost * weights.cost_penalty;
    const trust_bonus = confidence * weights.trust_bonus;

    const final_score = impact_contribution - risk_penalty - cost_penalty + trust_bonus;

    scoredStrategies.push({
      strategy_id: candidate.strategy_id,
      framework: candidate.framework,
      final_score,
      impact_score: impact,
      risk_score: candidate.risk,
      cost_score: candidate.cost,
      confidence_score: confidence,
      breakdown: {
        impact_contribution,
        risk_penalty,
        cost_penalty,
        trust_bonus
      }
    });
  }

  // Sort by final score
  scoredStrategies.sort((a, b) => b.final_score - a.final_score);

  return scoredStrategies;
}

// ============================================
// LAYER 4: SELECTION & DIVERSIFICATION (Code-controlled)
// ============================================

export function selectStrategies(
  candidates: StrategyCandidate[],
  scoredStrategies: ScoredStrategy[],
  userConstraints?: BrainInput['user_constraints'],
  historicalContext?: BrainInput['historical_context'],
  count: number = 3
): SelectionResult[] {
  const results: SelectionResult[] = [];
  const usedFrameworks = new Set<FrameworkType>();
  const riskThreshold = RISK_THRESHOLD_BY_TOLERANCE[userConstraints?.risk_tolerance || 'medium'];

  // Get last used framework to avoid repetition
  const lastFramework = historicalContext?.past_strategies?.[0]?.framework;

  for (const scored of scoredStrategies) {
    if (results.length >= count) break;

    const candidate = candidates.find(c => c.strategy_id === scored.strategy_id);
    if (!candidate) continue;

    // Check risk tolerance
    if (candidate.risk > riskThreshold) {
      continue;
    }

    // Avoid repetition (unless it's clearly the best)
    if (candidate.framework === lastFramework && results.length === 0) {
      // If it's the best option and same as last time, allow it but note
      // Otherwise, prefer diversity
      const secondBest = scoredStrategies.find(s => 
        s.strategy_id !== scored.strategy_id && 
        candidates.find(c => c.strategy_id === s.strategy_id)?.framework !== lastFramework
      );
      
      if (secondBest && scored.final_score - secondBest.final_score < 0.15) {
        // Scores are close, prefer diversity
        continue;
      }
    }

    // Avoid duplicate frameworks
    if (usedFrameworks.has(candidate.framework)) {
      continue;
    }

    usedFrameworks.add(candidate.framework);

    const rejectedStrategies = candidates
      .filter(c => c.strategy_id !== candidate.strategy_id)
      .slice(0, 3)
      .map(c => ({
        strategy_id: c.strategy_id,
        framework: c.framework,
        rejection_reason: getRejectReason(c, candidate, riskThreshold, lastFramework)
      }));

    results.push({
      selected_strategy: candidate,
      selection_reason: generateSelectionReason(candidate, scored, results.length === 0),
      rejected_strategies: rejectedStrategies
    });
  }

  return results;
}

function getRejectReason(
  rejected: StrategyCandidate,
  selected: StrategyCandidate,
  riskThreshold: number,
  lastFramework?: FrameworkType
): string {
  if (rejected.risk > riskThreshold) {
    return `Risk level ${Math.round(rejected.risk * 100)}% exceeds tolerance`;
  }
  if (rejected.framework === lastFramework) {
    return 'Avoiding repetition from previous session';
  }
  if (rejected.solves.length < selected.solves.length) {
    return 'Addresses fewer problems than selected strategy';
  }
  return 'Lower overall score based on impact vs. risk balance';
}

function generateSelectionReason(
  candidate: StrategyCandidate,
  scored: ScoredStrategy,
  isPrimary: boolean
): string {
  const parts: string[] = [];
  
  if (isPrimary) {
    parts.push('Highest score with acceptable risk');
  } else {
    parts.push('Alternative variation for testing');
  }
  
  if (candidate.solves.length > 1) {
    parts.push(`Addresses ${candidate.solves.length} issues`);
  }
  
  if (scored.confidence_score > 0.7) {
    parts.push('High confidence based on past success');
  }

  return parts.join('. ');
}

// ============================================
// LAYER 5: EXPLAINABILITY (Can use LLM)
// ============================================

export function generateExplanation(
  selected: StrategyCandidate,
  scored: ScoredStrategy,
  problems: DetectedProblem[],
  rejectedStrategies: Array<{ framework: FrameworkType; rejection_reason: string }>
): ExplanationBlock {
  const solvedProblems = problems.filter(p => selected.solves.includes(p.type));
  
  // Generate human-readable explanation (no LLM needed for basic version)
  const problemDescriptions = solvedProblems.map(p => p.details).join('. ');
  
  let why_this_strategy: string;
  switch (selected.framework) {
    case 'SPEED_ONLY':
      why_this_strategy = `The video has pacing issues. ${problemDescriptions}. Optimizing speed will restore momentum without risky structural changes.`;
      break;
    case 'PAS':
      why_this_strategy = `${problemDescriptions}. The Problem-Agitate-Solution framework emphasizes pain points to create urgency before revealing the solution.`;
      break;
    case 'PATTERN_INTERRUPT':
      why_this_strategy = `${problemDescriptions}. Pattern Interrupt uses unexpected elements to recapture wandering attention immediately.`;
      break;
    case 'PROOF_FIRST':
      why_this_strategy = `${problemDescriptions}. Leading with proof builds credibility before asking for action.`;
      break;
    case 'HOOK_DEMO_CTA':
      why_this_strategy = `${problemDescriptions}. A tight Hook-Demo-CTA structure maximizes impact in minimal time.`;
      break;
    default:
      why_this_strategy = `${problemDescriptions}. The ${selected.framework} framework best addresses these issues.`;
  }

  const why_not_others = rejectedStrategies.map(r => 
    `${r.framework}: ${r.rejection_reason}`
  );

  const expectedLift = Math.round(scored.impact_score * 25);
  const expected_outcome = `Expected ${expectedLift}% improvement in ${
    solvedProblems[0]?.type.toLowerCase().replace(/_/g, ' ') || 'overall performance'
  }`;

  const confidence_level: 'low' | 'medium' | 'high' = 
    scored.confidence_score > 0.7 ? 'high' :
    scored.confidence_score > 0.4 ? 'medium' : 'low';

  return {
    why_this_strategy,
    why_not_others,
    expected_outcome,
    confidence_level
  };
}

// ============================================
// MAIN BRAIN FUNCTION
// ============================================

export function runBrainV2(
  input: BrainInput,
  variationCount: number = 3
): BrainOutput {
  // Layer 1: Problem Detection
  const problemOutput = detectProblems(input.video_analysis);

  if (problemOutput.no_action_recommended) {
    return {
      success: false,
      failure: {
        mode: 'NO_ACTION',
        reason: problemOutput.reason || 'No significant problems detected',
        fallback_suggestion: 'Consider testing with different audience targeting instead'
      }
    };
  }

  // Layer 2: Generate Strategy Candidates
  const candidates = generateStrategyCandidates(
    problemOutput.problems,
    input.video_analysis,
    input.user_constraints
  );

  if (candidates.length === 0) {
    return {
      success: false,
      failure: {
        mode: 'SAFE_OPTIMIZATION_ONLY',
        reason: 'No valid strategies available within risk tolerance',
        fallback_suggestion: 'Try increasing risk tolerance or removing action restrictions'
      }
    };
  }

  // Layer 3: Score Strategies
  const scoredStrategies = scoreStrategies(
    candidates,
    problemOutput.problems,
    input.optimization_goal,
    input.historical_context
  );

  // Layer 4: Select & Diversify
  const selections = selectStrategies(
    candidates,
    scoredStrategies,
    input.user_constraints,
    input.historical_context,
    variationCount
  );

  if (selections.length === 0) {
    return {
      success: false,
      failure: {
        mode: 'SAFE_OPTIMIZATION_ONLY',
        reason: 'All strategies exceed risk threshold',
        fallback_suggestion: 'Consider \\"medium\\" risk tolerance for more options'
      }
    };
  }

  // Layer 5: Generate Explanations & Build Blueprints
  const blueprints: CreativeBlueprintV2[] = selections.map((selection, index) => {
    const scored = scoredStrategies.find(s => s.strategy_id === selection.selected_strategy.strategy_id)!;
    const explanation = generateExplanation(
      selection.selected_strategy,
      scored,
      problemOutput.problems,
      selection.rejected_strategies
    );

    return {
      variation_id: `var_${index}_${Date.now()}`,
      framework: selection.selected_strategy.framework,
      intent: selection.selection_reason,
      expected_lift_pct: Math.round(scored.impact_score * 25),
      risk: scored.risk_score < 0.3 ? 'low' : scored.risk_score < 0.6 ? 'medium' : 'high',
      actions: selection.selected_strategy.actions,
      explanation,
      learning_hooks: {
        framework_used: selection.selected_strategy.framework,
        problems_solved: selection.selected_strategy.solves,
        confidence: scored.confidence_score
      },
      detected_problems: problemOutput.problems,
      all_candidates: candidates,
      scoring_details: scoredStrategies
    };
  });

  return {
    success: true,
    blueprints
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateVariance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squaredDiffs = arr.map(x => Math.pow(x - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / arr.length;
}

// Convert VideoAnalysis to VideoAnalysisSignals
export function convertToSignals(analysis: any): VideoAnalysisSignals {
  return {
    source_id: analysis.id || analysis.source_video_id,
    technical: {
      duration_ms: analysis.metadata?.duration_ms || 15000,
      fps: analysis.metadata?.fps || 30,
      ratio: analysis.metadata?.aspect_ratio || '9:16'
    },
    signals: {
      hook_score: Math.round((analysis.overall_scores?.hook_strength || 0.7) * 100),
      pacing_drop_mid: (analysis.overall_scores?.pacing_consistency || 0.7) < 0.6,
      cta_strength: analysis.overall_scores?.cta_effectiveness || 0.5,
      talking_head: analysis.segments?.some((s: any) => s.visual_tags?.includes('face')) || false,
      product_demo: analysis.segments?.some((s: any) => s.visual_tags?.includes('demo')) || false,
      proof_present: analysis.segments?.some((s: any) => s.type === 'proof') || false,
      clarity_score: Math.round((analysis.overall_scores?.message_clarity || 0.7) * 100),
      attention_curve: analysis.segments?.map((s: any) => s.attention_score || 0.7) || [0.8, 0.6, 0.7]
    },
    segments: analysis.segments?.map((s: any) => ({
      id: s.id,
      type: s.type,
      start_ms: s.start_ms,
      end_ms: s.end_ms,
      attention_score: s.attention_score,
      pacing_score: s.pacing_score
    })) || []
  };
}
