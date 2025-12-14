/**
 * Advertising Policy Compliance Types
 * Platform-specific rules and violation detection
 */

export type AdPlatform = 'tiktok' | 'snapchat' | 'meta' | 'google' | 'general';

export type RiskLevel = 'safe' | 'warning' | 'high_risk' | 'blocked';

export type ViolationType = 
  | 'prohibited_claim'
  | 'medical_disclaimer'
  | 'financial_disclaimer'
  | 'before_after'
  | 'personal_attribute'
  | 'misleading_urgency'
  | 'guaranteed_results'
  | 'age_restricted'
  | 'comparative_claim'
  | 'testimonial_violation'
  | 'price_claim'
  | 'superlative_claim';

export type FunnelStage = 'cold' | 'warm' | 'retargeting';

export interface PolicyViolation {
  id: string;
  type: ViolationType;
  severity: RiskLevel;
  originalText: string;
  suggestion?: string;
  rewrittenText?: string;
  explanation: string;
  policyReference?: string;
}

export interface ComplianceResult {
  platform: AdPlatform;
  overallRisk: RiskLevel;
  isCompliant: boolean;
  canRender: boolean;
  violations: PolicyViolation[];
  autoFixedCount: number;
  summary: string;
}

export interface PlatformPolicy {
  id: AdPlatform;
  name: string;
  prohibitedPatterns: RegExp[];
  warningPatterns: RegExp[];
  beforeAfterAllowed: boolean;
  requiresDisclaimer: string[];
  maxUrgencyLevel: 'none' | 'soft' | 'moderate';
  testimonialRules: string;
  medicalRestrictions: boolean;
  financialRestrictions: boolean;
}

export interface FrameworkContext {
  platform: AdPlatform;
  videoLengthSec: number;
  productCategory?: string;
  riskLevel: RiskLevel;
  funnelStage: FunnelStage;
  hasProofElements: boolean;
  hookStrength: number;
}

export interface AutoFrameworkResult {
  frameworkId: string;
  frameworkName: string;
  confidence: number;
  reasoning: string;
  factors: {
    factor: string;
    influence: string;
  }[];
}

// Platform-specific policy definitions
export const PLATFORM_POLICIES: Record<AdPlatform, PlatformPolicy> = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Ads',
    prohibitedPatterns: [
      /guaranteed\s+(results?|weight\s*loss|income|cure)/i,
      /100%\s+(effective|guaranteed|safe)/i,
      /miracle\s+(cure|solution|product)/i,
      /doctor[s']?\s+hate/i,
      /this\s+one\s+trick/i,
      /pharmaceutical\s+companies\s+don't\s+want/i,
      /lose\s+\d+\s*(kg|lbs?|pounds?)\s+in\s+\d+\s*(days?|weeks?)/i,
      /make\s+\$?\d+[k,]?\d*\s+(per|a)\s+(day|week|month)/i,
    ],
    warningPatterns: [
      /before\s+and\s+after/i,
      /limited\s+time\s+only/i,
      /act\s+now/i,
      /don't\s+miss\s+out/i,
      /last\s+chance/i,
      /only\s+\d+\s+left/i,
      /you\s+need\s+this/i,
      /change\s+your\s+life/i,
    ],
    beforeAfterAllowed: false,
    requiresDisclaimer: ['weight_loss', 'supplements', 'financial'],
    maxUrgencyLevel: 'soft',
    testimonialRules: 'Must be genuine, no actors claiming to be customers',
    medicalRestrictions: true,
    financialRestrictions: true,
  },
  snapchat: {
    id: 'snapchat',
    name: 'Snapchat Ads',
    prohibitedPatterns: [
      /guaranteed\s+(results?|cure|income)/i,
      /100%\s+(effective|safe)/i,
      /get\s+rich\s+quick/i,
      /miracle/i,
      /instant\s+(results?|cure|wealth)/i,
      /no\s+effort\s+required/i,
    ],
    warningPatterns: [
      /limited\s+offer/i,
      /expires\s+(soon|today)/i,
      /shocking/i,
      /unbelievable/i,
      /you\s+won't\s+believe/i,
    ],
    beforeAfterAllowed: false,
    requiresDisclaimer: ['health', 'financial', 'alcohol'],
    maxUrgencyLevel: 'moderate',
    testimonialRules: 'Testimonials must reflect typical results',
    medicalRestrictions: true,
    financialRestrictions: true,
  },
  meta: {
    id: 'meta',
    name: 'Meta (Facebook/Instagram)',
    prohibitedPatterns: [
      /are\s+you\s+(fat|ugly|poor|lonely|depressed)/i,
      /do\s+you\s+suffer\s+from/i,
      /guaranteed\s+(results?|cure|income|weight\s*loss)/i,
      /100%\s+guaranteed/i,
      /doctors?\s+(hate|don't\s+want)/i,
      /big\s+pharma/i,
      /lose\s+\d+\s*(kg|lbs?)\s+in\s+\d+\s*(days?)/i,
      /make\s+\$\d+\s+from\s+home/i,
      /spy\s+on/i,
      /hack\s+(your|the)/i,
    ],
    warningPatterns: [
      /before\s+and\s+after/i,
      /transformation/i,
      /results\s+may\s+vary/i,
      /limited\s+time/i,
      /last\s+chance/i,
      /exclusive\s+offer/i,
      /struggling\s+with/i,
    ],
    beforeAfterAllowed: false,
    requiresDisclaimer: ['supplements', 'financial', 'alcohol', 'gambling'],
    maxUrgencyLevel: 'soft',
    testimonialRules: 'No personal attributes, no implying knowledge of user characteristics',
    medicalRestrictions: true,
    financialRestrictions: true,
  },
  google: {
    id: 'google',
    name: 'Google/YouTube Ads',
    prohibitedPatterns: [
      /guaranteed\s+(results?|cure|returns?)/i,
      /100%\s+(effective|guaranteed|success)/i,
      /miracle\s+(cure|solution)/i,
      /click\s+here\s+now/i,
      /act\s+immediately/i,
      /once\s+in\s+a\s+lifetime/i,
      /secret\s+(method|formula|trick)/i,
      /doctors?\s+hate\s+(this|him|her)/i,
      /government\s+doesn't\s+want/i,
      /earn\s+\$\d+\s+per\s+day/i,
    ],
    warningPatterns: [
      /best\s+in\s+class/i,
      /#1\s+(rated|selling|choice)/i,
      /most\s+(effective|popular)/i,
      /limited\s+availability/i,
      /hurry/i,
      /don't\s+wait/i,
      /risk\s+free/i,
    ],
    beforeAfterAllowed: true, // With restrictions
    requiresDisclaimer: ['medical', 'financial', 'gambling', 'alcohol', 'political'],
    maxUrgencyLevel: 'moderate',
    testimonialRules: 'Must be verifiable, typical results disclosed',
    medicalRestrictions: true,
    financialRestrictions: true,
  },
  general: {
    id: 'general',
    name: 'General Best Practices',
    prohibitedPatterns: [
      /guaranteed\s+results?/i,
      /100%\s+guaranteed/i,
      /miracle/i,
    ],
    warningPatterns: [
      /limited\s+time/i,
      /act\s+now/i,
    ],
    beforeAfterAllowed: true,
    requiresDisclaimer: [],
    maxUrgencyLevel: 'moderate',
    testimonialRules: 'Standard testimonial practices',
    medicalRestrictions: false,
    financialRestrictions: false,
  },
};

// Compliant rewrites for common violations
export const COMPLIANT_REWRITES: Record<string, string[]> = {
  'guaranteed results': ['potential benefits', 'designed to help', 'may support'],
  'guaranteed weight loss': ['supports weight management goals', 'designed for your wellness journey'],
  '100% effective': ['highly effective for many users', 'designed for optimal results'],
  'miracle cure': ['innovative solution', 'breakthrough approach'],
  'lose X lbs in X days': ['supports your weight management journey', 'helps you work toward your goals'],
  'make $X per day': ['income potential varies', 'results depend on individual effort'],
  'doctors hate this': ['discover what works', 'an approach worth considering'],
  'act now': ['learn more today', 'explore your options'],
  'last chance': ['available now', 'join others who chose this'],
  'don\'t miss out': ['discover the benefits', 'see what\'s possible'],
  'you need this': ['consider this option', 'explore how this could help'],
  'change your life': ['enhance your daily routine', 'discover new possibilities'],
  'are you fat': ['looking to feel more confident', 'on your wellness journey'],
  'do you suffer from': ['if you\'re experiencing', 'for those seeking solutions'],
  'struggling with': ['working on', 'focusing on improving'],
};
