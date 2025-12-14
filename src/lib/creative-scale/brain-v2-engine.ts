/**
 * AI Brain v2 - Framework Decision Engine
 * 
 * RULES (NON-NEGOTIABLE):
 * 1. Never default to AIDA
 * 2. Never choose more than ONE primary framework
 * 3. Hormozi Value Equation is an EVALUATOR, NOT a framework
 * 4. Every decision must be explainable
 * 5. Output MUST be structured JSON
 * 
 * PROCESS (STRICT ORDER):
 * 1. Extract signals (hook, proof, pacing, objections)
 * 2. Route to ONE framework (AIDA, PAS, BAB, 4Ps, Hook→Benefit→CTA)
 * 3. Optionally apply ONE style overlay (UGC, ACC)
 * 4. Evaluate using Hormozi Value Equation
 * 5. Decide what to change (not how to write it)
 */

import type {
  BrainInput,
  BrainOutput,
  BrainV2Decision,
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
  StyleOverlay,
  OptimizationGoal,
  RiskTolerance,
  ScoringWeights,
  VideoAnalysisSignals,
  ExtractedSignals,
  FrameworkDecision,
  DecisionExplanation,
  OptimizationPlan,
  OptimizationFocus,
  HormoziValueScore,
  AudienceContext
} from './brain-v2-types';

// ============================================
// FRAMEWORK ROUTING RULES (STRICT)
// ============================================

/**
 * Framework selection is based on detected problems, NOT defaults.
 * AIDA is explicitly DE-PRIORITIZED unless signals strongly support it.
 */

interface FrameworkRouteRule {
  framework: FrameworkType;
  triggers: ProblemType[];
  requires: Array<keyof ExtractedSignals>;
  contraindications: ProblemType[];
  priority: number; // Lower = higher priority (AIDA has lowest priority = 5)
}

const FRAMEWORK_ROUTING_RULES: FrameworkRouteRule[] = [
  {
    // PAS: Best when problem is clear but solution isn't emphasized
    framework: 'PAS',
    triggers: ['MID_PACING_DROP', 'CLARITY_LOW', 'BENEFIT_UNCLEAR'],
    requires: ['problem_agitation'],
    contraindications: ['DURATION_TOO_SHORT'],
    priority: 1
  },
  {
    // BAB: Best when transformation story is key
    framework: 'BAB',
    triggers: ['PROOF_MISSING', 'BENEFIT_UNCLEAR', 'OBJECTION_UNHANDLED'],
    requires: ['benefit_communication'],
    contraindications: ['DURATION_TOO_SHORT'],
    priority: 2
  },
  {
    // 4Ps: Best for high-ticket or complex offers
    framework: '4Ps',
    triggers: ['PROOF_MISSING', 'CTA_WEAK', 'OBJECTION_UNHANDLED'],
    requires: ['proof_quality'],
    contraindications: ['DURATION_TOO_LONG'],
    priority: 2
  },
  {
    // Hook→Benefit→CTA: Best for short, direct ads
    framework: 'HOOK_BENEFIT_CTA',
    triggers: ['HOOK_WEAK', 'CTA_WEAK', 'PACING_INCONSISTENT'],
    requires: ['hook_strength', 'cta_clarity'],
    contraindications: ['PROOF_MISSING'],
    priority: 1
  },
  {
    // AIDA: Generic fallback - LOWEST PRIORITY
    // Only use when other frameworks don't match
    framework: 'AIDA',
    triggers: ['ATTENTION_DROP_EARLY', 'ATTENTION_DROP_LATE', 'CTA_WEAK'],
    requires: [],
    contraindications: [],
    priority: 5 // Lowest priority - never default to AIDA
  }
];

// Style overlay detection thresholds
const STYLE_THRESHOLDS = {
  UGC: 0.6, // If authenticity_score > 0.6, suggest UGC overlay
  ACC: 0.6  // If authority_score > 0.6, suggest ACC overlay
};

// ============================================
// SIGNAL EXTRACTION
// ============================================

export function extractSignals(analysis: VideoAnalysisSignals): ExtractedSignals {
  const { signals } = analysis;
  
  return {
    hook_strength: signals.hook_score / 100,
    proof_quality: signals.proof_present ? 0.7 : 0.2,
    pacing_score: signals.pacing_drop_mid ? 0.4 : 0.8,
    objection_handling: signals.objection_handling ?? 0.5,
    cta_clarity: signals.cta_strength,
    benefit_communication: signals.benefit_clarity ?? (signals.clarity_score / 100),
    problem_agitation: signals.problem_agitation ?? 0.5
  };
}

// ============================================
// PROBLEM DETECTION
// ============================================

const PROBLEM_SEVERITY_THRESHOLD = 0.4;
const NO_ACTION_THRESHOLD = 0.3;

export function detectProblems(signals: VideoAnalysisSignals): ProblemDetectionOutput {
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

  // Benefit unclear
  if ((s.benefit_clarity ?? 0.5) < 0.5) {
    problems.push({
      type: 'BENEFIT_UNCLEAR',
      severity: 0.6,
      segment_id: segments.find(seg => seg.type === 'benefit')?.id,
      details: 'Core benefit is not clearly communicated'
    });
  }

  // Objection unhandled
  if ((s.objection_handling ?? 0.5) < 0.4) {
    problems.push({
      type: 'OBJECTION_UNHANDLED',
      severity: 0.5,
      details: 'Common objections are not addressed'
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

  problems.sort((a, b) => b.severity - a.severity);

  const maxSeverity = problems.length > 0 ? problems[0].severity : 0;
  
  if (maxSeverity < NO_ACTION_THRESHOLD) {
    return {
      problems: [],
      no_action_recommended: true,
      reason: 'No significant problems detected. Video is performing well.'
    };
  }

  const significantProblems = problems.filter(p => p.severity >= PROBLEM_SEVERITY_THRESHOLD);

  return {
    problems: significantProblems.slice(0, 4),
    no_action_recommended: false
  };
}

// ============================================
// FRAMEWORK ROUTING (NEVER DEFAULT TO AIDA)
// ============================================

interface FrameworkScore {
  framework: FrameworkType;
  score: number;
  matchedTriggers: ProblemType[];
  reasons: string[];
}

export function routeToFramework(
  problems: DetectedProblem[],
  signals: ExtractedSignals,
  audienceContext?: AudienceContext
): FrameworkScore[] {
  const problemTypes = problems.map(p => p.type);
  const scores: FrameworkScore[] = [];

  for (const rule of FRAMEWORK_ROUTING_RULES) {
    // Check for contraindications (disqualifying factors)
    const hasContraindication = rule.contraindications.some(c => problemTypes.includes(c));
    if (hasContraindication) {
      scores.push({
        framework: rule.framework,
        score: 0,
        matchedTriggers: [],
        reasons: [`Disqualified: contraindication present`]
      });
      continue;
    }

    // Calculate trigger match score
    const matchedTriggers = rule.triggers.filter(t => problemTypes.includes(t));
    const triggerScore = matchedTriggers.length / rule.triggers.length;

    // Calculate required signal score
    let signalScore = 1;
    const signalReasons: string[] = [];
    for (const req of rule.requires) {
      const signalValue = signals[req];
      if (signalValue < 0.5) {
        signalScore *= 0.5;
        signalReasons.push(`Low ${req}: ${Math.round(signalValue * 100)}%`);
      } else {
        signalReasons.push(`Strong ${req}: ${Math.round(signalValue * 100)}%`);
      }
    }

    // Apply priority penalty (AIDA gets -0.4 penalty as priority 5)
    const priorityPenalty = (rule.priority - 1) * 0.1;

    // Calculate final score
    const finalScore = (triggerScore * 0.6 + signalScore * 0.4) - priorityPenalty;

    const reasons = [
      `Matched ${matchedTriggers.length}/${rule.triggers.length} triggers`,
      ...signalReasons
    ];

    if (rule.framework === 'AIDA') {
      reasons.push('Priority penalty applied (-0.4) - AIDA is not default');
    }

    scores.push({
      framework: rule.framework,
      score: Math.max(0, finalScore),
      matchedTriggers,
      reasons
    });
  }

  // Sort by score (highest first), but AIDA is never first unless truly best
  scores.sort((a, b) => {
    if (a.score === b.score) {
      // Tie-breaker: prefer non-AIDA
      if (a.framework === 'AIDA') return 1;
      if (b.framework === 'AIDA') return -1;
    }
    return b.score - a.score;
  });

  return scores;
}

// ============================================
// STYLE OVERLAY DETECTION
// ============================================

export function detectStyleOverlay(signals: VideoAnalysisSignals): StyleOverlay {
  const { signals: s } = signals;
  
  const authenticity = s.authenticity_score ?? 0.5;
  const authority = s.authority_score ?? 0.5;

  // Only apply overlay if score clearly indicates style
  if (authenticity >= STYLE_THRESHOLDS.UGC && authenticity > authority) {
    return 'UGC';
  }
  
  if (authority >= STYLE_THRESHOLDS.ACC && authority > authenticity) {
    return 'ACC';
  }

  return null;
}

// ============================================
// HORMOZI VALUE EQUATION (EVALUATOR ONLY)
// ============================================

/**
 * Hormozi Value Equation: Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice)
 * 
 * This is an EVALUATOR, not a framework. It assesses the current ad's value proposition.
 */

export function evaluateHormoziValue(
  analysis: VideoAnalysisSignals,
  signals: ExtractedSignals
): HormoziValueScore {
  const { signals: s, segments } = analysis;

  // Dream Outcome: How clearly is the ideal result communicated?
  const dreamOutcome = signals.benefit_communication * 0.6 + (s.clarity_score / 100) * 0.4;

  // Perceived Likelihood: How achievable does it seem?
  const perceivedLikelihood = (s.proof_present ? 0.7 : 0.3) + signals.proof_quality * 0.3;

  // Time Delay: How quickly will results come? (lower is better, we invert)
  // If urgency/speed is emphasized in segments, time delay perception is lower
  const hasUrgency = segments.some(seg => 
    seg.type === 'cta' && (seg.attention_score ?? 0.5) > 0.6
  );
  const timeDelay = hasUrgency ? 0.3 : 0.6;

  // Effort & Sacrifice: How easy does it appear? (lower is better, we invert)
  const effortSacrifice = 1 - (signals.objection_handling * 0.5 + signals.cta_clarity * 0.5);

  // Calculate total value score (avoid division by zero)
  const denominator = Math.max(0.1, timeDelay * Math.max(0.1, effortSacrifice));
  const totalValueScore = (dreamOutcome * perceivedLikelihood) / denominator;

  return {
    dream_outcome: Math.round(dreamOutcome * 100) / 100,
    perceived_likelihood: Math.round(perceivedLikelihood * 100) / 100,
    time_delay: Math.round(timeDelay * 100) / 100,
    effort_sacrifice: Math.round(effortSacrifice * 100) / 100,
    total_value_score: Math.round(totalValueScore * 100) / 100
  };
}

// ============================================
// OPTIMIZATION PLAN GENERATION
// ============================================

export function generateOptimizationPlan(
  framework: FrameworkType,
  problems: DetectedProblem[],
  hormoziScore: HormoziValueScore
): OptimizationPlan {
  const focus: OptimizationFocus[] = [];
  const specificChanges: string[] = [];

  // Determine focus areas based on problems
  for (const problem of problems.slice(0, 3)) {
    switch (problem.type) {
      case 'HOOK_WEAK':
      case 'ATTENTION_DROP_EARLY':
        if (!focus.includes('hook')) {
          focus.push('hook');
          specificChanges.push('Strengthen opening hook to capture attention within 1-2 seconds');
        }
        break;
      case 'PROOF_MISSING':
        if (!focus.includes('proof')) {
          focus.push('proof');
          specificChanges.push('Add social proof or testimonial element');
        }
        break;
      case 'MID_PACING_DROP':
      case 'PACING_INCONSISTENT':
        if (!focus.includes('pacing')) {
          focus.push('pacing');
          specificChanges.push('Tighten pacing in middle section to maintain momentum');
        }
        break;
      case 'OBJECTION_UNHANDLED':
        if (!focus.includes('objection')) {
          focus.push('objection');
          specificChanges.push('Address common objections before CTA');
        }
        break;
      case 'CTA_WEAK':
      case 'ATTENTION_DROP_LATE':
        if (!focus.includes('cta')) {
          focus.push('cta');
          specificChanges.push('Make call-to-action clearer and more compelling');
        }
        break;
    }
  }

  // Add Hormozi-based recommendations
  if (hormoziScore.dream_outcome < 0.5) {
    specificChanges.push('Clarify the transformation/outcome the viewer will achieve');
  }
  if (hormoziScore.perceived_likelihood < 0.5) {
    specificChanges.push('Increase believability with proof, specifics, or guarantees');
  }
  if (hormoziScore.effort_sacrifice > 0.6) {
    specificChanges.push('Make the solution appear easier/more accessible');
  }

  // Determine expected lift based on problem severity and Hormozi score
  const avgSeverity = problems.reduce((sum, p) => sum + p.severity, 0) / Math.max(1, problems.length);
  const valuePotential = 1 - hormoziScore.total_value_score / 5; // Higher if current value is low

  let expectedLift: 'low' | 'medium' | 'high';
  if (avgSeverity > 0.7 || valuePotential > 0.6) {
    expectedLift = 'high';
  } else if (avgSeverity > 0.5 || valuePotential > 0.4) {
    expectedLift = 'medium';
  } else {
    expectedLift = 'low';
  }

  return {
    focus: focus.length > 0 ? focus : ['hook', 'cta'],
    expected_lift: expectedLift,
    specific_changes: specificChanges
  };
}

// ============================================
// MAIN BRAIN V2 DECISION FUNCTION
// ============================================

export function makeBrainV2Decision(
  analysis: VideoAnalysisSignals,
  goal: OptimizationGoal,
  audienceContext?: AudienceContext
): BrainV2Decision {
  // Step 1: Extract signals
  const signals = extractSignals(analysis);

  // Step 2: Detect problems
  const problemOutput = detectProblems(analysis);
  const problems = problemOutput.problems;

  // Step 3: Route to ONE framework (NEVER default to AIDA)
  const frameworkScores = routeToFramework(problems, signals, audienceContext);
  const bestFramework = frameworkScores[0];

  // Step 4: Optionally apply ONE style overlay
  const styleOverlay = detectStyleOverlay(analysis);

  // Step 5: Evaluate using Hormozi Value Equation
  const hormoziScore = evaluateHormoziValue(analysis, signals);

  // Step 6: Generate optimization plan (what to change, NOT how to write it)
  const optimizationPlan = generateOptimizationPlan(
    bestFramework.framework,
    problems,
    hormoziScore
  );

  // Build explanation
  const whyChosen: string[] = [
    `Best match for detected problems: ${bestFramework.matchedTriggers.join(', ') || 'general optimization'}`,
    ...bestFramework.reasons
  ];

  if (styleOverlay) {
    whyChosen.push(`${styleOverlay} style detected - overlay applied for authenticity`);
  }

  const whyOthersRejected = frameworkScores
    .slice(1)
    .filter(f => f.score < bestFramework.score)
    .map(f => ({
      framework: f.framework,
      reason: f.score === 0 
        ? 'Disqualified by contraindication' 
        : `Lower match score (${Math.round(f.score * 100)}% vs ${Math.round(bestFramework.score * 100)}%)`
    }));

  // Calculate confidence
  const confidence = Math.min(0.95, bestFramework.score * 0.8 + (problems.length > 0 ? 0.2 : 0));

  return {
    framework_decision: {
      primary_framework: bestFramework.framework,
      style_overlay: styleOverlay,
      confidence: Math.round(confidence * 100) / 100
    },
    explanation: {
      why_chosen: whyChosen,
      why_others_rejected: whyOthersRejected
    },
    optimization_plan: optimizationPlan,
    hormozi_evaluation: hormoziScore,
    input_signals: signals,
    decision_timestamp: new Date().toISOString()
  };
}

// ============================================
// LEGACY SUPPORT: Strategy Candidates & Actions
// ============================================

const FRAMEWORK_COST: Record<FrameworkType, number> = {
  HOOK_BENEFIT_CTA: 0.2,
  PAS: 0.4,
  BAB: 0.4,
  '4Ps': 0.5,
  AIDA: 0.4
};

const FRAMEWORK_RISK: Record<FrameworkType, number> = {
  HOOK_BENEFIT_CTA: 0.2,
  PAS: 0.35,
  BAB: 0.3,
  '4Ps': 0.4,
  AIDA: 0.25
};

export function generateStrategyCandidates(
  problems: DetectedProblem[],
  signals: VideoAnalysisSignals,
  userConstraints?: BrainInput['user_constraints']
): StrategyCandidate[] {
  const extractedSignals = extractSignals(signals);
  const frameworkScores = routeToFramework(problems, extractedSignals);
  const candidates: StrategyCandidate[] = [];

  for (const scored of frameworkScores.filter(f => f.score > 0)) {
    const actions = generateActionsForFramework(scored.framework, problems, signals, userConstraints?.forbidden_actions || []);
    
    if (actions.length === 0) continue;

    candidates.push({
      strategy_id: `strategy_${scored.framework.toLowerCase()}_${Date.now()}`,
      framework: scored.framework,
      solves: scored.matchedTriggers,
      cost: FRAMEWORK_COST[scored.framework],
      risk: FRAMEWORK_RISK[scored.framework],
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
    case 'HOOK_BENEFIT_CTA':
      // Simple three-part structure
      const hook = segments.find(s => s.type === 'hook');
      const benefit = segments.find(s => s.type === 'benefit');
      const cta = segments.find(s => s.type === 'cta');
      
      if (hook && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: hook.id,
          target_segment_type: hook.type,
          intent: 'Strengthen hook for immediate attention'
        });
      }
      
      if (benefit && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: benefit.id,
          target_segment_type: benefit.type,
          intent: 'Clarify core benefit'
        });
      }
      
      if (cta && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: cta.id,
          target_segment_type: cta.type,
          intent: 'Make CTA compelling and clear'
        });
      }
      break;

    case 'PAS':
      // Problem-Agitate-Solution
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

    case 'BAB':
      // Before-After-Bridge
      const beforeSeg = segments.find(s => s.type === 'problem');
      const afterSeg = segments.find(s => s.type === 'benefit');
      
      if (beforeSeg && afterSeg && !forbiddenActions.includes('reorder_segments')) {
        actions.push({
          action: 'reorder_segments',
          target_segment_id: beforeSeg.id,
          target_segment_type: beforeSeg.type,
          intent: 'Structure as clear before/after transformation'
        });
      }
      break;

    case '4Ps':
      // Promise-Picture-Proof-Push
      const promiseSeg = segments.find(s => s.type === 'hook' || s.type === 'promise');
      const proofSeg = segments.find(s => s.type === 'proof');
      const ctaSeg = segments.find(s => s.type === 'cta');
      
      if (promiseSeg && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: promiseSeg.id,
          target_segment_type: promiseSeg.type,
          intent: 'Make promise bold and specific'
        });
      }
      
      if (proofSeg && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: proofSeg.id,
          target_segment_type: proofSeg.type,
          intent: 'Strengthen proof elements'
        });
      }
      
      if (ctaSeg && !forbiddenActions.includes('emphasize_segment')) {
        actions.push({
          action: 'emphasize_segment',
          target_segment_id: ctaSeg.id,
          target_segment_type: ctaSeg.type,
          intent: 'Push with urgency and clarity'
        });
      }
      break;

    case 'AIDA':
      // Attention-Interest-Desire-Action (lowest priority)
      const hookSeg = segments.find(s => s.type === 'hook');
      const benefitSeg = segments.find(s => s.type === 'benefit');
      
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
  }

  // Remove fillers for all frameworks
  const fillers = segments.filter(s => s.type === 'filler');
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

  return actions;
}

// ============================================
// SCORING ENGINE
// ============================================

const GOAL_WEIGHTS: Record<OptimizationGoal, ScoringWeights> = {
  retention: { impact_weight: 1.2, risk_penalty: 0.8, cost_penalty: 0.3, trust_bonus: 0.2 },
  ctr: { impact_weight: 1.0, risk_penalty: 0.6, cost_penalty: 0.4, trust_bonus: 0.3 },
  conversions: { impact_weight: 0.9, risk_penalty: 0.9, cost_penalty: 0.5, trust_bonus: 0.4 }
};

export function scoreStrategies(
  candidates: StrategyCandidate[],
  problems: DetectedProblem[],
  goal: OptimizationGoal,
  historicalContext?: BrainInput['historical_context']
): ScoredStrategy[] {
  const weights = GOAL_WEIGHTS[goal];
  const scoredStrategies: ScoredStrategy[] = [];

  for (const candidate of candidates) {
    const solvedProblems = problems.filter(p => candidate.solves.includes(p.type));
    const impact = solvedProblems.reduce((sum, p) => sum + p.severity, 0) / Math.max(1, problems.length);

    let confidence = 0.5;
    if (historicalContext?.past_strategies) {
      const pastUsage = historicalContext.past_strategies.filter(
        s => s.framework === candidate.framework
      );
      if (pastUsage.length > 0) {
        const successfulUses = pastUsage.filter(s => s.was_downloaded && !s.was_regenerated);
        confidence = 0.5 + (successfulUses.length / pastUsage.length) * 0.4;
      }
    }

    // Apply AIDA penalty
    let aidaPenalty = 0;
    if (candidate.framework === 'AIDA') {
      aidaPenalty = 0.15; // Explicit penalty for AIDA
    }

    const impact_contribution = impact * weights.impact_weight;
    const risk_penalty = (candidate.risk * weights.risk_penalty) + aidaPenalty;
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

  scoredStrategies.sort((a, b) => b.final_score - a.final_score);

  return scoredStrategies;
}

// ============================================
// SELECTION & DIVERSIFICATION
// ============================================

const RISK_THRESHOLD_BY_TOLERANCE: Record<RiskTolerance, number> = {
  low: 0.3,
  medium: 0.5,
  high: 0.8
};

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
  const lastFramework = historicalContext?.past_strategies?.[0]?.framework;

  for (const scored of scoredStrategies) {
    if (results.length >= count) break;

    const candidate = candidates.find(c => c.strategy_id === scored.strategy_id);
    if (!candidate) continue;

    if (candidate.risk > riskThreshold) continue;

    // Strong preference against repeating AIDA
    if (candidate.framework === 'AIDA' && results.length === 0) {
      const alternative = scoredStrategies.find(s => 
        s.strategy_id !== scored.strategy_id && 
        candidates.find(c => c.strategy_id === s.strategy_id)?.framework !== 'AIDA' &&
        scored.final_score - s.final_score < 0.2
      );
      if (alternative) continue;
    }

    // Avoid repetition from last session
    if (candidate.framework === lastFramework && results.length === 0) {
      const secondBest = scoredStrategies.find(s => 
        s.strategy_id !== scored.strategy_id && 
        candidates.find(c => c.strategy_id === s.strategy_id)?.framework !== lastFramework
      );
      if (secondBest && scored.final_score - secondBest.final_score < 0.15) {
        continue;
      }
    }

    if (usedFrameworks.has(candidate.framework)) continue;

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
  if (rejected.framework === 'AIDA') {
    return 'AIDA deprioritized - prefer problem-specific frameworks';
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
// EXPLANATION GENERATION
// ============================================

export function generateExplanation(
  selected: StrategyCandidate,
  scored: ScoredStrategy,
  problems: DetectedProblem[],
  rejectedStrategies: Array<{ framework: FrameworkType; rejection_reason: string }>
): ExplanationBlock {
  const solvedProblems = problems.filter(p => selected.solves.includes(p.type));
  const problemDescriptions = solvedProblems.map(p => p.details).join('. ');
  
  let why_this_strategy: string;
  switch (selected.framework) {
    case 'HOOK_BENEFIT_CTA':
      why_this_strategy = `${problemDescriptions}. Hook→Benefit→CTA provides a direct, efficient structure that maximizes impact in minimal time.`;
      break;
    case 'PAS':
      why_this_strategy = `${problemDescriptions}. Problem-Agitate-Solution emphasizes pain points to create urgency before revealing the solution.`;
      break;
    case 'BAB':
      why_this_strategy = `${problemDescriptions}. Before-After-Bridge shows transformation clearly, building desire through contrast.`;
      break;
    case '4Ps':
      why_this_strategy = `${problemDescriptions}. Promise-Picture-Proof-Push provides a complete persuasion arc with strong credibility.`;
      break;
    case 'AIDA':
      why_this_strategy = `${problemDescriptions}. AIDA selected as no other framework matched the problem pattern better.`;
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
// MAIN BRAIN FUNCTION (FULL PIPELINE)
// ============================================

export function runBrainV2(
  input: BrainInput,
  variationCount: number = 3
): BrainOutput {
  // Get brain decision first
  const decision = makeBrainV2Decision(
    input.video_analysis,
    input.optimization_goal,
    input.audience_context
  );

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
        fallback_suggestion: 'Consider "medium" risk tolerance for more options'
      }
    };
  }

  // Layer 5: Generate Blueprints with Decision
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
      style_overlay: decision.framework_decision.style_overlay,
      intent: selection.selection_reason,
      expected_lift_pct: Math.round(scored.impact_score * 25),
      risk: scored.risk_score < 0.3 ? 'low' : scored.risk_score < 0.6 ? 'medium' : 'high',
      actions: selection.selected_strategy.actions,
      explanation,
      decision,
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
      attention_curve: analysis.segments?.map((s: any) => s.attention_score || 0.7) || [0.8, 0.6, 0.7],
      objection_handling: analysis.overall_scores?.objection_handling,
      benefit_clarity: analysis.overall_scores?.benefit_clarity,
      problem_agitation: analysis.overall_scores?.problem_agitation,
      authenticity_score: analysis.style_scores?.authenticity,
      authority_score: analysis.style_scores?.authority
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
