// Shared Audience Resolver
// Single source of truth for resolving audience context across all tools

import { 
  AudienceContext, 
  AudienceOverride, 
  ResolvedAudience,
  AudienceDefaults,
  DEFAULT_AUDIENCE 
} from './types';
import { 
  getCountryByCode, 
  getLanguageByCode, 
  isRTL 
} from './countries';

/**
 * Resolves the final audience context from user defaults and local overrides.
 * This is the ONLY function that should be used to determine audience context.
 * 
 * @param params.userDefaults - The user's saved default audience settings
 * @param params.localOverride - Optional local override for the current session/tool
 * @returns The resolved audience context with full display information
 */
export function resolveAudienceContext(params: {
  userDefaults?: AudienceDefaults | null;
  localOverride?: AudienceOverride | null;
  projectSettings?: AudienceContext | null;
}): ResolvedAudience {
  const { userDefaults, localOverride, projectSettings } = params;
  
  // Priority: localOverride > projectSettings > userDefaults > DEFAULT_AUDIENCE
  let finalContext: AudienceContext;
  let source: 'default' | 'override' | 'project' = 'default';
  
  // Start with defaults
  finalContext = {
    language: userDefaults?.language || DEFAULT_AUDIENCE.language,
    country: userDefaults?.country || DEFAULT_AUDIENCE.country,
  };
  
  // Apply project settings if available
  if (projectSettings?.language || projectSettings?.country) {
    finalContext = {
      language: projectSettings.language || finalContext.language,
      country: projectSettings.country || finalContext.country,
    };
    source = 'project';
  }
  
  // Apply local overrides (highest priority)
  if (localOverride?.language || localOverride?.country) {
    finalContext = {
      language: localOverride.language || finalContext.language,
      country: localOverride.country || finalContext.country,
    };
    source = 'override';
  }
  
  // Resolve display information
  const country = getCountryByCode(finalContext.country);
  const language = getLanguageByCode(finalContext.language);
  
  return {
    language: finalContext.language,
    country: finalContext.country,
    countryName: country?.name || finalContext.country,
    countryFlag: country?.flag || '🌍',
    languageName: language?.name || finalContext.language,
    isRTL: isRTL(finalContext.language),
    source,
  };
}

/**
 * Checks if an override is active (different from defaults)
 */
export function hasActiveOverride(
  userDefaults: AudienceDefaults | null,
  localOverride: AudienceOverride | null
): boolean {
  if (!localOverride) return false;
  if (!userDefaults) return !!(localOverride.language || localOverride.country);
  
  return (
    (localOverride.language && localOverride.language !== userDefaults.language) ||
    (localOverride.country && localOverride.country !== userDefaults.country)
  );
}

/**
 * Creates a display string for the current audience context
 */
export function getAudienceDisplayString(audience: ResolvedAudience): string {
  return `${audience.countryFlag} ${audience.countryName} • ${audience.languageName}`;
}
