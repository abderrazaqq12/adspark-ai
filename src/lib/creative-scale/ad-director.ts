/**
 * Ad Director - Marketing Suggestions Layer
 * Alex Hormozi-style ad review and suggestions
 * 
 * Provides actionable marketing feedback as if a top ad director
 * is reviewing and editing the ad.
 */

import type { VideoAnalysis } from './types';
import type { ExtractedSignals, DetectedProblem, HormoziValueScore, OptimizationGoal } from './brain-v2-types';

// ============================================
// HOOK REWRITES
// ============================================

export interface HookRewrite {
  id: string;
  type: 'curiosity' | 'fear' | 'desire' | 'status' | 'pattern_interrupt';
  original: string | null;
  rewrite: string;
  whyBetter: string;
  expectedLift: 'low' | 'medium' | 'high';
}

export function generateHookRewrites(
  analysis: VideoAnalysis,
  signals: ExtractedSignals
): HookRewrite[] {
  const hookSegment = analysis.segments.find(s => s.type === 'hook');
  const originalHook = hookSegment?.transcript || null;
  
  const rewrites: HookRewrite[] = [
    {
      id: 'hook_curiosity',
      type: 'curiosity',
      original: originalHook,
      rewrite: 'What if I told you the thing you\'re doing every day is the reason you\'re not seeing results?',
      whyBetter: 'Opens a curiosity gap that demands resolution. Viewers watch to close the loop.',
      expectedLift: signals.hook_strength < 0.5 ? 'high' : 'medium'
    },
    {
      id: 'hook_fear',
      type: 'fear',
      original: originalHook,
      rewrite: 'Stop scrolling. This mistake is costing you more than you realize.',
      whyBetter: 'Loss aversion is powerful. Fear of missing out or doing wrong triggers action.',
      expectedLift: 'medium'
    },
    {
      id: 'hook_pattern_interrupt',
      type: 'pattern_interrupt',
      original: originalHook,
      rewrite: 'POV: You just discovered what the top 1% have been hiding.',
      whyBetter: 'Breaks expected patterns. Native to social platforms. Triggers curiosity.',
      expectedLift: 'high'
    }
  ];
  
  return rewrites;
}

// ============================================
// CTA SUGGESTIONS
// ============================================

export interface CTARewrite {
  id: string;
  type: 'urgency' | 'scarcity' | 'social_proof' | 'risk_reversal' | 'benefit_stack';
  original: string | null;
  rewrite: string;
  whyBetter: string;
  conversionTactic: string;
}

export function generateCTARewrites(
  analysis: VideoAnalysis,
  signals: ExtractedSignals,
  hormoziScore: HormoziValueScore
): CTARewrite[] {
  const ctaSegment = analysis.segments.find(s => s.type === 'cta');
  const originalCTA = ctaSegment?.transcript || null;
  
  return [
    {
      id: 'cta_urgency',
      type: 'urgency',
      original: originalCTA,
      rewrite: 'Link in bio. But only for the next 24 hours.',
      whyBetter: 'Time pressure reduces deliberation and increases immediate action.',
      conversionTactic: 'Reduces Time Delay in value equation'
    },
    {
      id: 'cta_risk_reversal',
      type: 'risk_reversal',
      original: originalCTA,
      rewrite: 'Try it free. If you don\'t love it, you pay nothing.',
      whyBetter: 'Eliminates perceived sacrifice. Risk is on seller, not buyer.',
      conversionTactic: 'Minimizes Effort & Sacrifice'
    },
    {
      id: 'cta_benefit_stack',
      type: 'benefit_stack',
      original: originalCTA,
      rewrite: 'Get [result] + [bonus] + [guarantee]. Link below.',
      whyBetter: 'Stacking benefits increases perceived value vs. price.',
      conversionTactic: 'Maximizes Dream Outcome perception'
    }
  ];
}

// ============================================
// OBJECTION HANDLING
// ============================================

export interface ObjectionSuggestion {
  objection: string;
  targetAudience: string;
  suggestedResponse: string;
  placementAdvice: string;
  hormoziPrinciple: string;
}

export function generateObjectionHandlers(
  goal: OptimizationGoal,
  hormoziScore: HormoziValueScore
): ObjectionSuggestion[] {
  const suggestions: ObjectionSuggestion[] = [
    {
      objection: '"This won\'t work for me"',
      targetAudience: 'Skeptics who have tried before',
      suggestedResponse: 'Show specific proof for their exact situation. Use "Even if you\'ve tried X before..."',
      placementAdvice: 'Insert after main benefit, before CTA',
      hormoziPrinciple: 'Increases Perceived Likelihood of Success'
    },
    {
      objection: '"It\'s too expensive"',
      targetAudience: 'Price-sensitive buyers',
      suggestedResponse: 'Frame as investment, not cost. Compare to cost of NOT buying.',
      placementAdvice: 'Address right before CTA',
      hormoziPrinciple: 'Reframes Effort & Sacrifice as investment in Dream Outcome'
    },
    {
      objection: '"I don\'t have time"',
      targetAudience: 'Busy professionals',
      suggestedResponse: 'Show how this SAVES time. "5 minutes per day" or "Done-for-you".',
      placementAdvice: 'Early in video, part of hook',
      hormoziPrinciple: 'Reduces perceived Time Delay and Effort'
    },
    {
      objection: '"I need to think about it"',
      targetAudience: 'Deliberate decision-makers',
      suggestedResponse: 'Create urgency. Limited spots, price increase, or bonus expiration.',
      placementAdvice: 'CTA section',
      hormoziPrinciple: 'Increases immediate action through scarcity'
    }
  ];
  
  // Prioritize based on Hormozi score gaps
  if (hormoziScore.perceived_likelihood < 0.5) {
    return suggestions.filter(s => s.objection.includes('won\'t work')).concat(suggestions);
  }
  if (hormoziScore.effort_sacrifice > 0.6) {
    return suggestions.filter(s => s.objection.includes('expensive') || s.objection.includes('time')).concat(suggestions);
  }
  
  return suggestions;
}

// ============================================
// EMOTIONAL ANGLE UPGRADES
// ============================================

export type EmotionalAngle = 'fear' | 'desire' | 'status' | 'curiosity' | 'belonging' | 'urgency';

export interface EmotionalUpgrade {
  angle: EmotionalAngle;
  currentStrength: 'weak' | 'medium' | 'strong';
  suggestion: string;
  implementation: string;
  psychologyBehind: string;
}

export function suggestEmotionalUpgrades(
  signals: ExtractedSignals,
  problems: DetectedProblem[]
): EmotionalUpgrade[] {
  const upgrades: EmotionalUpgrade[] = [];
  
  // Fear-based if problem agitation is weak
  if (signals.problem_agitation < 0.5) {
    upgrades.push({
      angle: 'fear',
      currentStrength: 'weak',
      suggestion: 'Amplify the pain of the problem',
      implementation: 'Show specific negative consequences. Numbers, timelines, real examples.',
      psychologyBehind: 'Loss aversion: People are 2x motivated to avoid loss vs. gain.'
    });
  }
  
  // Desire if benefit communication is weak
  if (signals.benefit_communication < 0.5) {
    upgrades.push({
      angle: 'desire',
      currentStrength: 'weak',
      suggestion: 'Paint a vivid picture of the after-state',
      implementation: 'Be specific: "Imagine waking up and..." + concrete outcome.',
      psychologyBehind: 'Future pacing creates emotional investment in the outcome.'
    });
  }
  
  // Status if targeting ambitious audiences
  upgrades.push({
    angle: 'status',
    currentStrength: 'medium',
    suggestion: 'Position product as what successful people use',
    implementation: '"The top 1% know this..." or "What [authority] taught me..."',
    psychologyBehind: 'Social proof + status aspiration drives premium purchases.'
  });
  
  // Curiosity for hook improvement
  if (signals.hook_strength < 0.6) {
    upgrades.push({
      angle: 'curiosity',
      currentStrength: 'weak',
      suggestion: 'Open a loop that must be closed',
      implementation: 'Ask a question with a counterintuitive answer. Never reveal in first 3 seconds.',
      psychologyBehind: 'Zeigarnik effect: Incomplete thoughts demand resolution.'
    });
  }
  
  return upgrades;
}

// ============================================
// PATTERN INTERRUPTS
// ============================================

export interface PatternInterrupt {
  type: string;
  description: string;
  example: string;
  bestForFirst2Seconds: boolean;
  platformBest: string[];
}

export const PATTERN_INTERRUPTS: PatternInterrupt[] = [
  {
    type: 'Visual Break',
    description: 'Unexpected visual that stops scroll',
    example: 'Close-up face, weird angle, bright color, movement',
    bestForFirst2Seconds: true,
    platformBest: ['tiktok', 'reels', 'snapchat']
  },
  {
    type: 'Verbal Shock',
    description: 'Unexpected statement or question',
    example: '"Delete this app right now" / "This is the worst advice ever"',
    bestForFirst2Seconds: true,
    platformBest: ['tiktok', 'reels', 'youtube']
  },
  {
    type: 'Direct Address',
    description: 'Break fourth wall, speak directly to viewer',
    example: '"YOU. Yes, you scrolling. Stop."',
    bestForFirst2Seconds: true,
    platformBest: ['tiktok', 'reels', 'snapchat']
  },
  {
    type: 'Contradiction',
    description: 'Say the opposite of expected',
    example: '"Don\'t buy this product" (then explain who it\'s really for)',
    bestForFirst2Seconds: false,
    platformBest: ['youtube', 'facebook']
  },
  {
    type: 'Sound Pattern',
    description: 'Unexpected audio cue',
    example: 'Silence, sudden loud sound, ASMR whisper',
    bestForFirst2Seconds: true,
    platformBest: ['tiktok', 'reels']
  }
];

// ============================================
// AD DIRECTOR REVIEW (MAIN OUTPUT)
// ============================================

export interface AdDirectorReview {
  overallScore: number; // 0-100
  hookStrength: number; // 0-100
  dropOffRisk: 'early' | 'mid' | 'late' | 'low';
  ctaPressure: number; // 0-100
  ctrPotential: 'low' | 'medium' | 'high';
  
  // Suggestions
  hookRewrites: HookRewrite[];
  ctaRewrites: CTARewrite[];
  objectionHandlers: ObjectionSuggestion[];
  emotionalUpgrades: EmotionalUpgrade[];
  patternInterrupts: PatternInterrupt[];
  
  // Hormozi-style insights
  hormoziInsights: {
    dreamOutcomeClear: boolean;
    likelihoodBuilt: boolean;
    timeDelayMinimized: boolean;
    effortReduced: boolean;
    overallValue: number;
    topPriority: string;
  };
  
  // Edit-specific advice
  editSuggestions: Array<{
    segment: string;
    issue: string;
    fix: string;
    impact: string;
  }>;
}

export function generateAdDirectorReview(
  analysis: VideoAnalysis,
  signals: ExtractedSignals,
  problems: DetectedProblem[],
  hormoziScore: HormoziValueScore,
  goal: OptimizationGoal
): AdDirectorReview {
  // Calculate metrics
  const hookStrength = Math.round(signals.hook_strength * 100);
  const ctaPressure = Math.round(signals.cta_clarity * 100);
  
  // Determine drop-off risk
  let dropOffRisk: 'early' | 'mid' | 'late' | 'low' = 'low';
  const earlyProblems = problems.filter(p => p.type === 'HOOK_WEAK' || p.type === 'ATTENTION_DROP_EARLY');
  const midProblems = problems.filter(p => p.type === 'MID_PACING_DROP' || p.type === 'PACING_INCONSISTENT');
  const lateProblems = problems.filter(p => p.type === 'CTA_WEAK' || p.type === 'ATTENTION_DROP_LATE');
  
  if (earlyProblems.length > 0) dropOffRisk = 'early';
  else if (midProblems.length > 0) dropOffRisk = 'mid';
  else if (lateProblems.length > 0) dropOffRisk = 'late';
  
  // CTR potential
  let ctrPotential: 'low' | 'medium' | 'high' = 'medium';
  if (hookStrength > 70 && ctaPressure > 60) ctrPotential = 'high';
  else if (hookStrength < 50 || ctaPressure < 40) ctrPotential = 'low';
  
  // Overall score
  const overallScore = Math.round(
    (signals.hook_strength * 25) +
    (signals.cta_clarity * 25) +
    (signals.pacing_score * 20) +
    (signals.benefit_communication * 15) +
    (signals.proof_quality * 15)
  );
  
  // Determine top Hormozi priority
  let topPriority = 'Increase Dream Outcome clarity';
  if (hormoziScore.perceived_likelihood < 0.5) {
    topPriority = 'Build more proof and believability';
  } else if (hormoziScore.effort_sacrifice > 0.6) {
    topPriority = 'Reduce perceived effort and risk';
  } else if (hormoziScore.time_delay > 0.5) {
    topPriority = 'Show faster results path';
  }
  
  // Generate edit suggestions based on problems
  const editSuggestions: AdDirectorReview['editSuggestions'] = problems.slice(0, 4).map(problem => {
    switch (problem.type) {
      case 'HOOK_WEAK':
        return {
          segment: 'Opening (0-3s)',
          issue: 'Hook doesn\'t stop the scroll',
          fix: 'Add pattern interrupt or curiosity gap in first 1.5 seconds',
          impact: 'Could increase 3-second retention by 40-60%'
        };
      case 'MID_PACING_DROP':
        return {
          segment: 'Middle section',
          issue: 'Viewers lose interest mid-video',
          fix: 'Cut 20-30% of middle content. Add visual variety every 2-3 seconds.',
          impact: 'Improves average watch time'
        };
      case 'CTA_WEAK':
        return {
          segment: 'Call to Action',
          issue: 'CTA lacks urgency or clarity',
          fix: 'Add scarcity, risk reversal, or benefit stack to CTA',
          impact: 'Direct impact on conversion rate'
        };
      case 'PROOF_MISSING':
        return {
          segment: 'Social proof section',
          issue: 'No proof elements detected',
          fix: 'Add testimonial, result, or authority element',
          impact: 'Increases trust and conversion likelihood'
        };
      default:
        return {
          segment: problem.segment_id || 'General',
          issue: problem.details,
          fix: 'Review and optimize this section',
          impact: 'Addresses detected weakness'
        };
    }
  });
  
  return {
    overallScore,
    hookStrength,
    dropOffRisk,
    ctaPressure,
    ctrPotential,
    hookRewrites: generateHookRewrites(analysis, signals),
    ctaRewrites: generateCTARewrites(analysis, signals, hormoziScore),
    objectionHandlers: generateObjectionHandlers(goal, hormoziScore),
    emotionalUpgrades: suggestEmotionalUpgrades(signals, problems),
    patternInterrupts: PATTERN_INTERRUPTS,
    hormoziInsights: {
      dreamOutcomeClear: hormoziScore.dream_outcome > 0.6,
      likelihoodBuilt: hormoziScore.perceived_likelihood > 0.6,
      timeDelayMinimized: hormoziScore.time_delay < 0.4,
      effortReduced: hormoziScore.effort_sacrifice < 0.4,
      overallValue: hormoziScore.total_value_score,
      topPriority
    },
    editSuggestions
  };
}
