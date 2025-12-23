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
      // In VPS mode, we bypass Supabase Auth
      const userId = '170d6fb1-4e4f-4704-ab9a-a917dc86cba5';

      // Attempt to load from local storage or use defaults
      const savedDefaults = localStorage.getItem('vps_audience_defaults');
      if (savedDefaults) {
        setDefaults({ ...JSON.parse(savedDefaults), userId });
      } else {
        setDefaults({ ...DEFAULT_AUDIENCE, userId });
      }
    } catch (error) {
      console.error('Error loading audience defaults:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDefaults = useCallback(async (newDefaults: Partial<AudienceDefaults>): Promise<boolean> => {
    try {
      setDefaults(prev => {
        const updated = { ...prev, ...newDefaults };
        localStorage.setItem('vps_audience_defaults', JSON.stringify(updated));
        return updated;
      });
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
