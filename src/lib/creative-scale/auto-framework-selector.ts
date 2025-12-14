/**
 * Automatic Framework Selection Engine
 * Selects optimal marketing framework based on context
 */

import type { AdPlatform, RiskLevel, FunnelStage, FrameworkContext, AutoFrameworkResult } from './compliance-types';
import { FRAMEWORK_DEFINITIONS, type ExtendedFrameworkType, type FrameworkDefinition } from './marketing-frameworks';

// Convert existing framework definitions to a simpler lookup
const FRAMEWORKS_LIST = Object.values(FRAMEWORK_DEFINITIONS).map(fw => ({
  id: fw.id.toLowerCase(),
  name: fw.name,
  description: fw.description,
  stages: fw.segmentOrder,
  hormoziAlignment: fw.hormoziAlignment,
  platforms: fw.platforms,
  hookAggressiveness: fw.hookAggressiveness,
  idealPacing: fw.idealPacing,
}));

// Lookup by lowercase id
export const MARKETING_FRAMEWORKS: Record<string, typeof FRAMEWORKS_LIST[0]> = {};
FRAMEWORKS_LIST.forEach(fw => {
  MARKETING_FRAMEWORKS[fw.id] = fw;
});

interface FrameworkScore {
  framework: typeof FRAMEWORKS_LIST[0];
  score: number;
  reasons: string[];
}

// Platform preferences for frameworks
const PLATFORM_FRAMEWORK_AFFINITY: Record<AdPlatform, Record<string, number>> = {
  tiktok: {
    'ugc_native_story': 1.5,
    'hook_benefit_cta': 1.4,
    'pas': 1.2,
    'aida': 0.8,
    'acc': 0.7,
  },
  snapchat: {
    'hook_benefit_cta': 1.5,
    'ugc_native_story': 1.4,
    'pas': 1.1,
    'bab': 1.0,
  },
  meta: {
    'pas': 1.3,
    'aida': 1.2,
    'bab': 1.2,
    '4ps': 1.1,
    'acc': 1.0,
  },
  google: {
    'aida': 1.4,
    'acc': 1.3,
    '4ps': 1.2,
    'pas': 1.0,
  },
  general: {
    'aida': 1.0,
    'pas': 1.0,
    'bab': 1.0,
  },
};

type FrameworkItem = typeof FRAMEWORKS_LIST[0];

// Video length preferences
function getVideoLengthMultiplier(framework: FrameworkItem, lengthSec: number): number {
  const isShortForm = lengthSec <= 30;
  const isMediumForm = lengthSec > 30 && lengthSec <= 60;
  
  // Short-form preferences
  if (isShortForm) {
    if (['hook_benefit_cta', 'ugc_native_story'].includes(framework.id)) return 1.5;
    if (['pas', 'bab'].includes(framework.id)) return 1.2;
    if (['aida', 'acc'].includes(framework.id)) return 0.7;
  }
  
  // Medium-form
  if (isMediumForm) {
    if (['pas', 'bab', 'aida'].includes(framework.id)) return 1.3;
    if (['4ps', 'acc'].includes(framework.id)) return 1.2;
  }
  
  // Long-form
  if (['aida', 'acc', '4ps'].includes(framework.id)) return 1.4;
  if (['ugc_native_story', 'hook_benefit_cta'].includes(framework.id)) return 0.6;
  
  return 1.0;
}

// Risk level preferences
function getRiskMultiplier(framework: FrameworkItem, riskLevel: RiskLevel): number {
  if (riskLevel === 'high_risk' || riskLevel === 'blocked') {
    // Prefer proof-heavy frameworks for risky niches
    if (['bab', 'acc'].includes(framework.id)) return 1.4;
    if (['pas'].includes(framework.id)) return 1.2;
    if (['ugc_native_story'].includes(framework.id)) return 0.7; // Less verifiable
  }
  
  return 1.0;
}

// Funnel stage preferences
function getFunnelMultiplier(framework: FrameworkItem, stage: FunnelStage): number {
  switch (stage) {
    case 'cold':
      // Cold traffic needs attention-grabbing, problem-aware
      if (['hook_benefit_cta', 'ugc_native_story', 'pas'].includes(framework.id)) return 1.4;
      if (['aida'].includes(framework.id)) return 1.2;
      break;
    case 'warm':
      // Warm traffic needs desire building
      if (['aida', 'bab', 'pas'].includes(framework.id)) return 1.3;
      if (['4ps'].includes(framework.id)) return 1.2;
      break;
    case 'retargeting':
      // Retargeting needs objection handling, proof
      if (['acc', 'bab'].includes(framework.id)) return 1.5;
      if (['4ps'].includes(framework.id)) return 1.3;
      break;
  }
  
  return 1.0;
}

// Proof elements influence
function getProofMultiplier(framework: FrameworkItem, hasProof: boolean): number {
  if (hasProof) {
    // Leverage proof-heavy frameworks
    if (['acc', 'bab', '4ps'].includes(framework.id)) return 1.3;
  } else {
    // Avoid proof-dependent frameworks
    if (['acc'].includes(framework.id)) return 0.7;
  }
  
  return 1.0;
}

export function selectFrameworkAutomatically(context: FrameworkContext): AutoFrameworkResult {
  const frameworks = Object.values(MARKETING_FRAMEWORKS);
  const scores: FrameworkScore[] = [];
  
  for (const framework of frameworks) {
    let score = 100; // Base score
    const reasons: string[] = [];
    
    // Platform affinity
    const platformAffinity = PLATFORM_FRAMEWORK_AFFINITY[context.platform]?.[framework.id] || 1.0;
    if (platformAffinity !== 1.0) {
      score *= platformAffinity;
      if (platformAffinity > 1.0) {
        reasons.push(`Optimized for ${context.platform.toUpperCase()}`);
      }
    }
    
    // Video length
    const lengthMultiplier = getVideoLengthMultiplier(framework, context.videoLengthSec);
    if (lengthMultiplier !== 1.0) {
      score *= lengthMultiplier;
      if (lengthMultiplier > 1.0) {
        const lengthDesc = context.videoLengthSec <= 30 ? 'short-form' : 
                          context.videoLengthSec <= 60 ? 'medium-form' : 'long-form';
        reasons.push(`Ideal for ${lengthDesc} content`);
      }
    }
    
    // Risk level
    const riskMultiplier = getRiskMultiplier(framework, context.riskLevel);
    if (riskMultiplier !== 1.0) {
      score *= riskMultiplier;
      if (riskMultiplier > 1.0) {
        reasons.push('Safer for compliance-sensitive niches');
      }
    }
    
    // Funnel stage
    const funnelMultiplier = getFunnelMultiplier(framework, context.funnelStage);
    if (funnelMultiplier !== 1.0) {
      score *= funnelMultiplier;
      if (funnelMultiplier > 1.0) {
        const stageDesc = context.funnelStage === 'cold' ? 'cold audience acquisition' :
                         context.funnelStage === 'warm' ? 'warm audience nurturing' : 'retargeting';
        reasons.push(`Effective for ${stageDesc}`);
      }
    }
    
    // Proof elements
    const proofMultiplier = getProofMultiplier(framework, context.hasProofElements);
    if (proofMultiplier !== 1.0) {
      score *= proofMultiplier;
      if (proofMultiplier > 1.0 && context.hasProofElements) {
        reasons.push('Leverages your proof elements effectively');
      }
    }
    
    // Hook strength influence
    if (context.hookStrength < 0.5) {
      // Weak hook - prefer frameworks that build hook strength
      if (['hook_benefit_cta', 'pas'].includes(framework.id)) {
        score *= 1.2;
        reasons.push('Strengthens weak hook');
      }
    }
    
    scores.push({ framework, score, reasons });
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  const winner = scores[0];
  const maxScore = Math.max(...scores.map(s => s.score));
  const confidence = Math.round((winner.score / maxScore) * 100);
  
  // Build reasoning string
  const platformName = context.platform === 'general' ? 'General' : context.platform.toUpperCase();
  const lengthDesc = context.videoLengthSec <= 30 ? 'short-form' : 
                    context.videoLengthSec <= 60 ? 'medium-form' : 'long-form';
  
  const reasoning = `Framework selected: ${winner.framework.name}\n` +
    `Reason: ${context.funnelStage} audience + ${lengthDesc} + ${platformName} platform` +
    (context.riskLevel !== 'safe' ? ` + compliance-aware` : '');
  
  return {
    frameworkId: winner.framework.id,
    frameworkName: winner.framework.name,
    confidence,
    reasoning,
    factors: winner.reasons.map(r => ({
      factor: r,
      influence: 'positive',
    })),
  };
}

export function getFrameworkExplanation(
  result: AutoFrameworkResult,
  context: FrameworkContext
): string {
  const framework = MARKETING_FRAMEWORKS[result.frameworkId];
  if (!framework) return result.reasoning;
  
  const lines = [
    `**Framework:** ${framework.name}`,
    '',
    `**Why this works for your ad:**`,
    '',
  ];
  
  // Platform reason
  const platformName = context.platform === 'general' ? 'multi-platform' : context.platform.toUpperCase();
  lines.push(`• **Platform fit:** ${framework.name} is proven effective on ${platformName}`);
  
  // Length reason
  const lengthDesc = context.videoLengthSec <= 30 ? 'under 30 seconds' : 
                    context.videoLengthSec <= 60 ? '30-60 seconds' : 'over 60 seconds';
  lines.push(`• **Duration match:** Optimized for ${lengthDesc} content`);
  
  // Funnel reason
  const funnelReasons: Record<FunnelStage, string> = {
    cold: 'grabs attention and creates problem awareness for new audiences',
    warm: 'builds desire and nurtures interest for familiar audiences',
    retargeting: 'overcomes objections and drives conversion for returning viewers',
  };
  lines.push(`• **Audience stage:** ${funnelReasons[context.funnelStage]}`);
  
  // Risk reason if applicable
  if (context.riskLevel !== 'safe') {
    lines.push(`• **Compliance:** Safer structure for policy-sensitive content`);
  }
  
  // Add framework description
  lines.push('');
  lines.push(`**Framework structure:** ${framework.description}`);
  
  return lines.join('\n');
}
