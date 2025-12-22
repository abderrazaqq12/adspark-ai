// Global Audience Context Provider
// Provides audience defaults to all tools, loaded at app boot

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AudienceDefaults, AudienceOverride, ResolvedAudience, DEFAULT_AUDIENCE } from '@/lib/audience/types';
import { resolveAudienceContext } from '@/lib/audience/resolver';

interface AudienceContextType {
  /** User's saved default audience settings */
  defaults: AudienceDefaults;
  /** Current resolved audience (with any active overrides) */
  resolved: ResolvedAudience;
  /** Local override for current session */
  override: AudienceOverride | null;
  /** Loading state */
  isLoading: boolean;
  /** Set a local override (session only) */
  setOverride: (override: AudienceOverride | null) => void;
  /** Update and save user defaults */
  updateDefaults: (newDefaults: Partial<AudienceDefaults>) => Promise<boolean>;
  /** Clear any local override */
  clearOverride: () => void;
}

const AudienceContext = createContext<AudienceContextType | undefined>(undefined);

export function AudienceProvider({ children }: { children: ReactNode }) {
  const [defaults, setDefaults] = useState<AudienceDefaults>(DEFAULT_AUDIENCE);
  const [override, setOverride] = useState<AudienceOverride | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load defaults on mount
  useEffect(() => {
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('default_language, default_country')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        setDefaults({
          language: settings.default_language || DEFAULT_AUDIENCE.language,
          country: settings.default_country || DEFAULT_AUDIENCE.country,
          userId: user.id,
        });
      }
    } catch (error) {
      console.error('Error loading audience defaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDefaults = useCallback(async (newDefaults: Partial<AudienceDefaults>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const updates: Record<string, string> = {};
      if (newDefaults.language) updates.default_language = newDefaults.language;
      if (newDefaults.country) updates.default_country = newDefaults.country;

      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setDefaults(prev => ({ ...prev, ...newDefaults }));
      return true;
    } catch (error) {
      console.error('Error updating audience defaults:', error);
      return false;
    }
  }, []);

  const clearOverride = useCallback(() => {
    setOverride(null);
  }, []);

  // Resolve current audience context
  const resolved = resolveAudienceContext({
    userDefaults: defaults,
    localOverride: override,
  });

  return (
    <AudienceContext.Provider value={{
      defaults,
      resolved,
      override,
      isLoading,
      setOverride,
      updateDefaults,
      clearOverride,
    }}>
      {children}
    </AudienceContext.Provider>
  );
}

export function useAudience() {
  const context = useContext(AudienceContext);
  if (context === undefined) {
    throw new Error('useAudience must be used within an AudienceProvider');
  }
  return context;
}

// Hook for tools that need audience with optional local override
export function useAudienceWithOverride(localOverride?: AudienceOverride) {
  const { defaults } = useAudience();
  
  return resolveAudienceContext({
    userDefaults: defaults,
    localOverride,
  });
}
