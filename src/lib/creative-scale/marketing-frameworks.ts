/**
 * Marketing Frameworks Engine
 * Alex Hormozi-style ad thinking
 * 
 * Expanded framework definitions with platform awareness
 */

// ============================================
// FRAMEWORK DEFINITIONS (MARKETING-FIRST)
// ============================================

export type ExtendedFrameworkType = 
  | 'AIDA'                    // Attention-Interest-Desire-Action
  | 'PAS'                     // Problem-Agitate-Solution
  | 'BAB'                     // Before-After-Bridge
  | '4Ps'                     // Promise-Picture-Proof-Push
  | 'HOOK_BENEFIT_CTA'        // Simple direct flow
  | 'ACC'                     // Awareness-Comprehension-Conviction
  | 'UGC_NATIVE_STORY'        // TikTok/Snapchat native style
  | 'HOOK_BENEFIT_OBJECTION_CTA'; // Hook → Benefit → Objection → CTA

export type PlatformType = 'tiktok' | 'reels' | 'snapchat' | 'youtube' | 'facebook' | 'general';

export interface FrameworkDefinition {
  id: ExtendedFrameworkType;
  name: string;
  shortName: string;
  description: string;
  segmentOrder: string[];
  bestFor: string[];
  hookAggressiveness: 'low' | 'medium' | 'high';
  ctaPlacement: 'early' | 'middle' | 'end' | 'multiple';
  idealPacing: 'slow' | 'medium' | 'fast';
  platforms: PlatformType[];
  hormoziAlignment: string;
}

export const FRAMEWORK_DEFINITIONS: Record<ExtendedFrameworkType, FrameworkDefinition> = {
  'PAS': {
    id: 'PAS',
    name: 'Problem-Agitate-Solution',
    shortName: 'PAS',
    description: 'Identify pain, make it worse, present solution',
    segmentOrder: ['problem', 'agitation', 'solution', 'cta'],
    bestFor: ['Pain-driven products', 'Health/wellness', 'B2B solutions'],
    hookAggressiveness: 'high',
    ctaPlacement: 'end',
    idealPacing: 'medium',
    platforms: ['facebook', 'youtube', 'general'],
    hormoziAlignment: 'Emphasizes Dream Outcome by contrasting current pain'
  },
  'AIDA': {
    id: 'AIDA',
    name: 'Attention-Interest-Desire-Action',
    shortName: 'AIDA',
    description: 'Classic funnel: grab attention, build interest, create desire, call to action',
    segmentOrder: ['hook', 'interest', 'desire', 'cta'],
    bestFor: ['Broad audiences', 'Brand awareness', 'General products'],
    hookAggressiveness: 'medium',
    ctaPlacement: 'end',
    idealPacing: 'medium',
    platforms: ['youtube', 'facebook', 'general'],
    hormoziAlignment: 'Balanced approach across all Value Equation factors'
  },
  'BAB': {
    id: 'BAB',
    name: 'Before-After-Bridge',
    shortName: 'BAB',
    description: 'Show transformation: life before, life after, your product is the bridge',
    segmentOrder: ['before', 'after', 'bridge', 'cta'],
    bestFor: ['Transformation products', 'Fitness', 'Education', 'SaaS'],
    hookAggressiveness: 'medium',
    ctaPlacement: 'end',
    idealPacing: 'medium',
    platforms: ['facebook', 'youtube', 'reels'],
    hormoziAlignment: 'Maximizes Dream Outcome and Perceived Likelihood'
  },
  '4Ps': {
    id: '4Ps',
    name: 'Promise-Picture-Proof-Push',
    shortName: '4Ps',
    description: 'Make bold promise, paint picture of result, prove it works, push to action',
    segmentOrder: ['promise', 'picture', 'proof', 'push'],
    bestFor: ['High-ticket offers', 'Info products', 'Coaching', 'Services'],
    hookAggressiveness: 'high',
    ctaPlacement: 'end',
    idealPacing: 'medium',
    platforms: ['facebook', 'youtube', 'general'],
    hormoziAlignment: 'Strong on Perceived Likelihood through proof elements'
  },
  'HOOK_BENEFIT_CTA': {
    id: 'HOOK_BENEFIT_CTA',
    name: 'Hook → Benefit → CTA',
    shortName: 'Direct',
    description: 'Fast, direct: hook attention, show benefit, call to action',
    segmentOrder: ['hook', 'benefit', 'cta'],
    bestFor: ['Short-form', 'Low-ticket', 'Impulse buys', 'Simple products'],
    hookAggressiveness: 'high',
    ctaPlacement: 'early',
    idealPacing: 'fast',
    platforms: ['tiktok', 'reels', 'snapchat'],
    hormoziAlignment: 'Minimizes Time Delay and Effort perception'
  },
  'ACC': {
    id: 'ACC',
    name: 'Awareness-Comprehension-Conviction',
    shortName: 'ACC',
    description: 'Build awareness, ensure understanding, create conviction',
    segmentOrder: ['awareness', 'comprehension', 'conviction', 'cta'],
    bestFor: ['Complex products', 'B2B', 'Technical solutions', 'High-consideration'],
    hookAggressiveness: 'low',
    ctaPlacement: 'end',
    idealPacing: 'slow',
    platforms: ['youtube', 'facebook', 'general'],
    hormoziAlignment: 'Builds Perceived Likelihood through education'
  },
  'UGC_NATIVE_STORY': {
    id: 'UGC_NATIVE_STORY',
    name: 'UGC Native Story',
    shortName: 'UGC',
    description: 'Native social feel: personal story, authentic review, casual CTA',
    segmentOrder: ['pattern_interrupt', 'personal_story', 'discovery', 'result', 'soft_cta'],
    bestFor: ['Gen Z audiences', 'Social commerce', 'DTC brands', 'Beauty/fashion'],
    hookAggressiveness: 'medium',
    ctaPlacement: 'multiple',
    idealPacing: 'fast',
    platforms: ['tiktok', 'reels', 'snapchat'],
    hormoziAlignment: 'Increases Perceived Likelihood through relatability'
  },
  'HOOK_BENEFIT_OBJECTION_CTA': {
    id: 'HOOK_BENEFIT_OBJECTION_CTA',
    name: 'Hook → Benefit → Objection → CTA',
    shortName: 'HBOC',
    description: 'Hook, show benefit, handle objection, call to action',
    segmentOrder: ['hook', 'benefit', 'objection_handle', 'cta'],
    bestFor: ['Skeptical audiences', 'High-friction products', 'Price-sensitive'],
    hookAggressiveness: 'high',
    ctaPlacement: 'end',
    idealPacing: 'medium',
    platforms: ['facebook', 'youtube', 'general'],
    hormoziAlignment: 'Reduces Effort & Sacrifice perception'
  }
};

// ============================================
// PLATFORM-SPECIFIC PREFERENCES
// ============================================

export interface PlatformPreferences {
  idealDuration: { min: number; max: number };
  hookWindow: number; // seconds to capture attention
  preferredFrameworks: ExtendedFrameworkType[];
  pacingMultiplier: number;
  ctaStyle: 'hard' | 'soft' | 'native';
}

export const PLATFORM_PREFERENCES: Record<PlatformType, PlatformPreferences> = {
  tiktok: {
    idealDuration: { min: 8, max: 30 },
    hookWindow: 1.5,
    preferredFrameworks: ['HOOK_BENEFIT_CTA', 'UGC_NATIVE_STORY', 'HOOK_BENEFIT_OBJECTION_CTA'],
    pacingMultiplier: 1.3,
    ctaStyle: 'native'
  },
  reels: {
    idealDuration: { min: 8, max: 30 },
    hookWindow: 2,
    preferredFrameworks: ['HOOK_BENEFIT_CTA', 'UGC_NATIVE_STORY', 'BAB'],
    pacingMultiplier: 1.2,
    ctaStyle: 'native'
  },
  snapchat: {
    idealDuration: { min: 6, max: 15 },
    hookWindow: 1,
    preferredFrameworks: ['HOOK_BENEFIT_CTA', 'UGC_NATIVE_STORY'],
    pacingMultiplier: 1.4,
    ctaStyle: 'soft'
  },
  youtube: {
    idealDuration: { min: 15, max: 60 },
    hookWindow: 5,
    preferredFrameworks: ['PAS', '4Ps', 'ACC', 'AIDA'],
    pacingMultiplier: 0.9,
    ctaStyle: 'hard'
  },
  facebook: {
    idealDuration: { min: 10, max: 45 },
    hookWindow: 3,
    preferredFrameworks: ['PAS', 'BAB', '4Ps', 'HOOK_BENEFIT_OBJECTION_CTA'],
    pacingMultiplier: 1.0,
    ctaStyle: 'hard'
  },
  general: {
    idealDuration: { min: 10, max: 45 },
    hookWindow: 3,
    preferredFrameworks: ['PAS', 'BAB', 'HOOK_BENEFIT_CTA', '4Ps'],
    pacingMultiplier: 1.0,
    ctaStyle: 'hard'
  }
};

// ============================================
// FRAMEWORK SELECTION LOGIC
// ============================================

export interface FrameworkSelectionInput {
  goal: 'retention' | 'ctr' | 'conversions';
  platform: PlatformType;
  videoDuration: number; // seconds
  detectedStructure: string[]; // segment types found
  hasProof: boolean;
  hasUGCStyle: boolean;
  hookStrength: number; // 0-100
}

export interface FrameworkRecommendation {
  primary: ExtendedFrameworkType;
  secondary: ExtendedFrameworkType | null;
  confidence: number;
  reasoning: string[];
  platformFit: 'excellent' | 'good' | 'acceptable' | 'poor';
}

export function selectOptimalFramework(input: FrameworkSelectionInput): FrameworkRecommendation {
  const platformPrefs = PLATFORM_PREFERENCES[input.platform];
  const scores: Array<{ framework: ExtendedFrameworkType; score: number; reasons: string[] }> = [];
  
  for (const [fwId, fw] of Object.entries(FRAMEWORK_DEFINITIONS)) {
    const framework = fwId as ExtendedFrameworkType;
    let score = 0;
    const reasons: string[] = [];
    
    // Platform fit bonus (highest weight)
    if (platformPrefs.preferredFrameworks.includes(framework)) {
      score += 30;
      reasons.push(`Optimized for ${input.platform}`);
    }
    
    // Duration fit
    const isShortForm = input.videoDuration < 20;
    if (isShortForm && fw.idealPacing === 'fast') {
      score += 20;
      reasons.push('Fast pacing matches short-form');
    } else if (!isShortForm && fw.idealPacing !== 'fast') {
      score += 15;
      reasons.push('Pacing appropriate for length');
    }
    
    // Goal alignment
    if (input.goal === 'ctr' && fw.hookAggressiveness === 'high') {
      score += 25;
      reasons.push('Aggressive hook drives CTR');
    } else if (input.goal === 'retention' && fw.idealPacing !== 'fast') {
      score += 20;
      reasons.push('Measured pacing improves retention');
    } else if (input.goal === 'conversions' && fw.ctaPlacement === 'end') {
      score += 20;
      reasons.push('End CTA maximizes intent');
    }
    
    // Structure match
    const requiredSegments = fw.segmentOrder;
    const matchedSegments = requiredSegments.filter(seg => 
      input.detectedStructure.includes(seg) || 
      input.detectedStructure.includes(seg.replace('_', ''))
    );
    const structureMatch = matchedSegments.length / requiredSegments.length;
    score += structureMatch * 15;
    if (structureMatch > 0.5) {
      reasons.push(`Structure aligns (${Math.round(structureMatch * 100)}% match)`);
    }
    
    // Proof requirement check
    if (framework === '4Ps' && !input.hasProof) {
      score -= 20;
      reasons.push('Missing proof elements for 4Ps');
    }
    
    // UGC style detection
    if (framework === 'UGC_NATIVE_STORY' && input.hasUGCStyle) {
      score += 25;
      reasons.push('Authentic UGC style detected');
    }
    
    // Hook strength consideration
    if (input.hookStrength < 50 && fw.hookAggressiveness === 'high') {
      score += 10;
      reasons.push('Framework will strengthen weak hook');
    }
    
    // AIDA de-prioritization (as per existing logic)
    if (framework === 'AIDA') {
      score -= 15;
    }
    
    scores.push({ framework, score, reasons });
  }
  
  scores.sort((a, b) => b.score - a.score);
  
  const primary = scores[0];
  const secondary = scores[1].score > 0 ? scores[1] : null;
  
  // Determine platform fit
  let platformFit: 'excellent' | 'good' | 'acceptable' | 'poor';
  if (platformPrefs.preferredFrameworks.includes(primary.framework)) {
    platformFit = 'excellent';
  } else if (FRAMEWORK_DEFINITIONS[primary.framework].platforms.includes(input.platform)) {
    platformFit = 'good';
  } else if (primary.score > 50) {
    platformFit = 'acceptable';
  } else {
    platformFit = 'poor';
  }
  
  return {
    primary: primary.framework,
    secondary: secondary?.framework ?? null,
    confidence: Math.min(0.95, primary.score / 100),
    reasoning: primary.reasons,
    platformFit
  };
}

// ============================================
// FRAMEWORK IMPACT ON EDITING
// ============================================

export interface FrameworkEditingGuidance {
  segmentPriorities: Record<string, number>; // 1-10 priority
  pacingRecommendation: string;
  hookGuidance: string;
  ctaGuidance: string;
  overallTone: string;
}

export function getEditingGuidance(framework: ExtendedFrameworkType): FrameworkEditingGuidance {
  const fw = FRAMEWORK_DEFINITIONS[framework];
  
  const segmentPriorities: Record<string, number> = {};
  fw.segmentOrder.forEach((seg, idx) => {
    // First and last segments are highest priority
    if (idx === 0) segmentPriorities[seg] = 10;
    else if (idx === fw.segmentOrder.length - 1) segmentPriorities[seg] = 9;
    else segmentPriorities[seg] = 8 - idx;
  });
  
  const hookGuidance = fw.hookAggressiveness === 'high' 
    ? 'Hook must stop the scroll within 1-2 seconds. Use pattern interrupts, bold claims, or curiosity gaps.'
    : fw.hookAggressiveness === 'medium'
    ? 'Hook should be engaging but can build naturally. 2-3 seconds to capture attention.'
    : 'Hook can be softer - focus on relatability over shock value.';
  
  const ctaGuidance = fw.ctaPlacement === 'early'
    ? 'CTA should appear within first 30% of video. Direct and clear.'
    : fw.ctaPlacement === 'multiple'
    ? 'Sprinkle soft CTAs throughout. Main CTA at end feels organic.'
    : 'Build to CTA at end. Make it the natural conclusion of your argument.';
  
  const pacingRecommendation = fw.idealPacing === 'fast'
    ? 'Quick cuts (1-3 sec). High energy. Never let viewer settle.'
    : fw.idealPacing === 'medium'
    ? 'Balanced pacing (2-5 sec per cut). Allow key points to land.'
    : 'Measured pacing (3-7 sec). Give viewer time to comprehend.';
  
  return {
    segmentPriorities,
    pacingRecommendation,
    hookGuidance,
    ctaGuidance,
    overallTone: fw.bestFor[0]
  };
}
