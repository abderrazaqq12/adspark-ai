// Global Audience Context Types
// Single source of truth for audience targeting across FlowScale

export interface AudienceContext {
  /** ISO 639-1 language code (e.g., 'en', 'ar', 'es') */
  language: string;
  /** ISO 3166-1 alpha-2 country code (e.g., 'US', 'SA', 'DE') */
  country: string;
}

export interface AudienceDefaults extends AudienceContext {
  /** User ID from Supabase auth */
  userId?: string;
  /** When the defaults were last updated */
  updatedAt?: string;
}

export interface ResolvedAudience extends AudienceContext {
  /** Country name for display */
  countryName: string;
  /** Country flag emoji */
  countryFlag: string;
  /** Language display name */
  languageName: string;
  /** Whether text should be RTL */
  isRTL: boolean;
  /** Source of the audience context */
  source: 'default' | 'override' | 'project';
}

export interface AudienceOverride {
  /** Optional language override for current session/tool */
  language?: string;
  /** Optional country override for current session/tool */
  country?: string;
}

// Default values when nothing is set
export const DEFAULT_AUDIENCE: AudienceContext = {
  language: 'en',
  country: 'US',
};
