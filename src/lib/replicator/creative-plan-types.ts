/**
 * CREATIVE PLAN CONTRACT
 * 
 * A CreativePlan is an AI-generated, read-only execution contract.
 * It MUST be generated and validated BEFORE any generation can start.
 * 
 * ARCHITECTURAL LAWS:
 * 1. Duration hard-locked: 20-35 seconds (no override)
 * 2. VPS-First: FFmpeg engines only when VPS available
 * 3. Audience required: Must inherit from Settings → Preferences
 * 4. Plan is immutable once validated
 */

import type { MarketingFramework, VideoType, HookType, PacingStyle } from './ai-creative-brain';

// Duration constraints (HARD-LOCKED)
export const DURATION_MIN = 20;
export const DURATION_MAX = 35;

// Plan status lifecycle
export type PlanStatus = 
  | 'pending'      // Initial state
  | 'generating'   // AI is creating the plan
  | 'validated'    // Plan passed all checks
  | 'invalid'      // Plan failed validation
  | 'locked'       // Ready for execution (immutable)
  | 'executing'    // Generation in progress
  | 'completed';   // All variations generated

// Audience contract (inherited from Settings)
export interface AudienceContract {
  language: string;
  country: string;
  market: string;
  isValid: boolean;
  source: 'settings' | 'override';
}

// Single variation plan
export interface VariationPlan {
  index: number;
  // Creative strategy
  framework: MarketingFramework;
  videoType: VideoType;
  hookType: HookType;
  pacing: PacingStyle;
  transitions: string[];
  // Technical execution
  engineId: 'ffmpeg-native' | 'ffmpeg-gpu' | 'ai-fallback';
  engineProvider: string;
  useVPS: boolean;
  // Duration (enforced 20-35s)
  targetDuration: number;
  // Cost estimate
  estimatedCost: number;
  // AI reasoning
  reasoning: {
    framework: string;
    engine: string;
    duration: string;
  };
}

// Full Creative Plan
export interface CreativePlan {
  id: string;
  status: PlanStatus;
  createdAt: string;
  validatedAt?: string;
  lockedAt?: string;
  
  // Audience contract (required)
  audience: AudienceContract;
  
  // Global settings
  globalSettings: {
    totalVariations: number;
    durationMin: number;
    durationMax: number;
    platform: string;
    aspectRatio: string;
    vpsRequired: boolean;
    vpsAvailable: boolean;
  };
  
  // Per-variation plans
  variations: VariationPlan[];
  
  // Cost summary
  costEstimate: {
    minimum: number;
    maximum: number;
    optimized: number;
    freeCount: number;
    paidCount: number;
  };
  
  // Execution strategy
  executionStrategy: {
    description: string;
    vpsFirst: boolean;
    fallbackAllowed: boolean;
    parallelJobs: number;
  };
  
  // Validation results
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// Validation result
export interface PlanValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  plan: CreativePlan | null;
}

/**
 * Validate a CreativePlan against architectural contracts
 */
export function validateCreativePlan(plan: CreativePlan): PlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Contract 1: Audience must be valid
  if (!plan.audience.isValid) {
    errors.push('Default Audience not configured. Go to Settings → Preferences to set language and country.');
  }

  // Contract 2: Duration hard-locked 20-35s
  for (const variation of plan.variations) {
    if (variation.targetDuration < DURATION_MIN || variation.targetDuration > DURATION_MAX) {
      errors.push(`Variation ${variation.index + 1}: Duration ${variation.targetDuration}s violates 20-35s constraint`);
    }
  }

  // Contract 3: VPS-First enforcement
  if (plan.globalSettings.vpsAvailable) {
    const aiVariations = plan.variations.filter(v => v.engineId === 'ai-fallback');
    if (aiVariations.length > 0) {
      warnings.push(`${aiVariations.length} variations using AI fallback when VPS is available. Consider FFmpeg-first.`);
    }
  }

  // Contract 4: At least one variation
  if (plan.variations.length === 0) {
    errors.push('Plan must have at least one variation');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    plan: errors.length === 0 ? plan : null,
  };
}

/**
 * Check if audience is configured
 */
export function isAudienceConfigured(language?: string, country?: string): boolean {
  return Boolean(language && language.length > 0 && country && country.length > 0);
}

/**
 * Create audience contract from resolved audience
 */
export function createAudienceContract(
  language: string,
  country: string,
  source: 'settings' | 'override' = 'settings'
): AudienceContract {
  const market = deriveMarketFromCountry(country);
  const isValid = isAudienceConfigured(language, country);
  
  return {
    language,
    country,
    market,
    isValid,
    source,
  };
}

/**
 * Derive market region from country code
 */
function deriveMarketFromCountry(country: string): string {
  const gccCountries = ['SA', 'AE', 'KW', 'QA', 'BH', 'OM'];
  const latamCountries = ['MX', 'BR', 'AR', 'CO', 'CL', 'PE'];
  const europeCountries = ['GB', 'DE', 'FR', 'ES', 'IT', 'NL', 'PT', 'PL'];
  
  if (gccCountries.includes(country)) return 'gcc';
  if (latamCountries.includes(country)) return 'latam';
  if (europeCountries.includes(country)) return 'europe';
  if (country === 'US' || country === 'CA') return 'usa';
  
  return 'global';
}
