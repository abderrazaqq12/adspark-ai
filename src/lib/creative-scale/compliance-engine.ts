/**
 * Advertising Policy Compliance Engine
 * Scans content, detects violations, and rewrites for compliance
 */

import {
  AdPlatform,
  RiskLevel,
  ViolationType,
  PolicyViolation,
  ComplianceResult,
  PLATFORM_POLICIES,
  COMPLIANT_REWRITES,
} from './compliance-types';
import type { VideoAnalysis, CreativeBlueprint, VariationIdea } from './types';

function generateViolationId(): string {
  return `vio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getViolationType(pattern: RegExp): ViolationType {
  const patternStr = pattern.source.toLowerCase();
  
  if (patternStr.includes('guaranteed') || patternStr.includes('100%')) {
    return 'guaranteed_results';
  }
  if (patternStr.includes('lose') && patternStr.includes('lbs')) {
    return 'medical_disclaimer';
  }
  if (patternStr.includes('make') && patternStr.includes('\\$')) {
    return 'financial_disclaimer';
  }
  if (patternStr.includes('before') && patternStr.includes('after')) {
    return 'before_after';
  }
  if (patternStr.includes('are you') || patternStr.includes('do you suffer')) {
    return 'personal_attribute';
  }
  if (patternStr.includes('act now') || patternStr.includes('last chance') || patternStr.includes('hurry')) {
    return 'misleading_urgency';
  }
  if (patternStr.includes('miracle') || patternStr.includes('secret')) {
    return 'prohibited_claim';
  }
  if (patternStr.includes('best') || patternStr.includes('#1') || patternStr.includes('most')) {
    return 'superlative_claim';
  }
  
  return 'prohibited_claim';
}

function findBestRewrite(originalText: string): string | undefined {
  const lowerText = originalText.toLowerCase();
  
  for (const [pattern, alternatives] of Object.entries(COMPLIANT_REWRITES)) {
    if (lowerText.includes(pattern.toLowerCase())) {
      // Pick a random alternative for variety
      return alternatives[Math.floor(Math.random() * alternatives.length)];
    }
  }
  
  return undefined;
}

function getExplanation(type: ViolationType, platform: AdPlatform): string {
  const platformName = PLATFORM_POLICIES[platform].name;
  
  const explanations: Record<ViolationType, string> = {
    prohibited_claim: `${platformName} prohibits unsubstantiated claims that could mislead users.`,
    medical_disclaimer: `${platformName} requires medical claims to be substantiated and may require disclaimers.`,
    financial_disclaimer: `${platformName} restricts income claims and requires disclosure of typical results.`,
    before_after: `${platformName} has strict rules on before/after imagery to prevent unrealistic expectations.`,
    personal_attribute: `${platformName} prohibits ads that imply knowledge of personal attributes or make users feel targeted.`,
    misleading_urgency: `${platformName} limits artificial urgency tactics that pressure users into quick decisions.`,
    guaranteed_results: `${platformName} prohibits guarantees as results vary by individual.`,
    age_restricted: `This content may require age-gating or restrictions on ${platformName}.`,
    comparative_claim: `${platformName} requires comparative claims to be substantiated.`,
    testimonial_violation: `${platformName} requires testimonials to represent typical results.`,
    price_claim: `${platformName} requires accurate and current pricing information.`,
    superlative_claim: `${platformName} requires superlative claims (#1, best) to be substantiated.`,
  };
  
  return explanations[type] || `This content may violate ${platformName} advertising policies.`;
}

export function scanContent(
  content: string,
  platform: AdPlatform
): PolicyViolation[] {
  const policy = PLATFORM_POLICIES[platform];
  const violations: PolicyViolation[] = [];
  
  // Check prohibited patterns (high risk)
  for (const pattern of policy.prohibitedPatterns) {
    const match = content.match(pattern);
    if (match) {
      const originalText = match[0];
      const rewrite = findBestRewrite(originalText);
      
      violations.push({
        id: generateViolationId(),
        type: getViolationType(pattern),
        severity: 'high_risk',
        originalText,
        suggestion: rewrite ? `Consider: "${rewrite}"` : 'Rephrase to avoid policy violation',
        rewrittenText: rewrite,
        explanation: getExplanation(getViolationType(pattern), platform),
        policyReference: `${policy.name} Advertising Policies`,
      });
    }
  }
  
  // Check warning patterns
  for (const pattern of policy.warningPatterns) {
    const match = content.match(pattern);
    if (match) {
      const originalText = match[0];
      const rewrite = findBestRewrite(originalText);
      
      violations.push({
        id: generateViolationId(),
        type: getViolationType(pattern),
        severity: 'warning',
        originalText,
        suggestion: rewrite ? `Consider: "${rewrite}"` : 'Review for compliance',
        rewrittenText: rewrite,
        explanation: getExplanation(getViolationType(pattern), platform),
      });
    }
  }
  
  // Check before/after if not allowed
  if (!policy.beforeAfterAllowed) {
    const beforeAfterPatterns = [
      /before\s+and\s+after/i,
      /before\/after/i,
      /transformation\s+(photo|picture|image|video)/i,
    ];
    
    for (const pattern of beforeAfterPatterns) {
      const match = content.match(pattern);
      if (match && !violations.some(v => v.type === 'before_after')) {
        violations.push({
          id: generateViolationId(),
          type: 'before_after',
          severity: 'high_risk',
          originalText: match[0],
          suggestion: 'Show product benefits without before/after comparison',
          rewrittenText: 'product demonstration',
          explanation: `${policy.name} restricts before/after content to prevent unrealistic expectations.`,
        });
      }
    }
  }
  
  return violations;
}

export function scanVideoAnalysis(
  analysis: VideoAnalysis,
  platform: AdPlatform
): PolicyViolation[] {
  const allViolations: PolicyViolation[] = [];
  
  // Scan each segment's transcript
  for (const segment of analysis.segments) {
    if (segment.transcript) {
      const violations = scanContent(segment.transcript, platform);
      allViolations.push(...violations);
    }
  }
  
  return allViolations;
}

export function scanBlueprint(
  blueprint: CreativeBlueprint,
  platform: AdPlatform
): PolicyViolation[] {
  const allViolations: PolicyViolation[] = [];
  
  // Scan objective
  if (blueprint.objective) {
    const keyMessage = blueprint.objective.key_message || '';
    allViolations.push(...scanContent(keyMessage, platform));
  }
  
  // Scan variation ideas
  for (const idea of blueprint.variation_ideas || []) {
    if (idea.intent) {
      allViolations.push(...scanContent(idea.intent, platform));
    }
  }
  
  // Scan strategic insights
  for (const insight of blueprint.strategic_insights || []) {
    allViolations.push(...scanContent(insight, platform));
  }
  
  return allViolations;
}

export function rewriteForCompliance(
  text: string,
  violations: PolicyViolation[]
): string {
  let result = text;
  
  for (const violation of violations) {
    if (violation.rewrittenText && violation.originalText) {
      result = result.replace(
        new RegExp(escapeRegex(violation.originalText), 'gi'),
        violation.rewrittenText
      );
    }
  }
  
  return result;
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function calculateOverallRisk(violations: PolicyViolation[]): RiskLevel {
  if (violations.length === 0) return 'safe';
  
  const hasBlocked = violations.some(v => v.severity === 'blocked');
  const hasHighRisk = violations.some(v => v.severity === 'high_risk');
  const hasWarning = violations.some(v => v.severity === 'warning');
  
  if (hasBlocked) return 'blocked';
  if (hasHighRisk) return 'high_risk';
  if (hasWarning) return 'warning';
  
  return 'safe';
}

export function generateComplianceResult(
  platform: AdPlatform,
  analysisViolations: PolicyViolation[],
  blueprintViolations: PolicyViolation[]
): ComplianceResult {
  const allViolations = [...analysisViolations, ...blueprintViolations];
  
  // Deduplicate by original text
  const uniqueViolations = allViolations.filter(
    (v, i, arr) => arr.findIndex(x => x.originalText === v.originalText) === i
  );
  
  const overallRisk = calculateOverallRisk(uniqueViolations);
  const autoFixedCount = uniqueViolations.filter(v => v.rewrittenText).length;
  
  const canRender = overallRisk !== 'blocked' && 
    !uniqueViolations.some(v => v.severity === 'high_risk' && !v.rewrittenText);
  
  const platformName = PLATFORM_POLICIES[platform].name;
  
  let summary: string;
  if (uniqueViolations.length === 0) {
    summary = `✅ This ad is compliant with ${platformName} policies`;
  } else if (canRender && autoFixedCount === uniqueViolations.length) {
    summary = `✅ All ${autoFixedCount} issues auto-corrected for ${platformName} compliance`;
  } else if (canRender) {
    summary = `⚠️ ${platformName}: ${uniqueViolations.length} items reviewed, ${autoFixedCount} auto-fixed`;
  } else {
    summary = `❌ Rendering blocked: Violates ${platformName} policies`;
  }
  
  return {
    platform,
    overallRisk,
    isCompliant: uniqueViolations.length === 0,
    canRender,
    violations: uniqueViolations,
    autoFixedCount,
    summary,
  };
}

export function getComplianceStatusIcon(risk: RiskLevel): string {
  switch (risk) {
    case 'safe': return '✅';
    case 'warning': return '⚠️';
    case 'high_risk': return '🔴';
    case 'blocked': return '❌';
    default: return '❓';
  }
}

export function getComplianceStatusColor(risk: RiskLevel): string {
  switch (risk) {
    case 'safe': return 'text-green-500';
    case 'warning': return 'text-yellow-500';
    case 'high_risk': return 'text-orange-500';
    case 'blocked': return 'text-red-500';
    default: return 'text-muted-foreground';
  }
}
