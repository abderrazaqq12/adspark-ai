import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type BackendMode = 'ai-operator' | 'auto';

interface BackendModeState {
  mode: BackendMode;
  isLoading: boolean;
  aiOperatorEnabled: boolean;
}

export function useBackendMode() {
  const [state, setState] = useState<BackendModeState>({
    mode: 'auto',
    isLoading: true,
    aiOperatorEnabled: false,
  });

  const loadSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('ai_operator_enabled, preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings) {
        const prefs = settings.preferences as Record<string, any> | null;
        const savedMode = prefs?.backend_mode as BackendMode | undefined;
        
        setState({
          mode: savedMode || 'auto',
          isLoading: false,
          aiOperatorEnabled: settings.ai_operator_enabled || false,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error loading backend mode:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setMode = useCallback(async (newMode: BackendMode) => {
    setState(prev => ({ ...prev, mode: newMode }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentPrefs = (existingSettings?.preferences as Record<string, any>) || {};

      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          preferences: {
            ...currentPrefs,
            backend_mode: newMode,
          },
          ai_operator_enabled: newMode === 'ai-operator',
        }, { onConflict: 'user_id' });

      setState(prev => ({
        ...prev,
        aiOperatorEnabled: newMode === 'ai-operator',
      }));
    } catch (error) {
      console.error('Error saving backend mode:', error);
    }
  }, []);

  const getActiveBackend = useCallback((): string => {
    if (state.mode === 'ai-operator') return 'AI Agent Operator';
    return 'Auto (AI Brain)';
  }, [state.mode]);

  const getModeIcon = useCallback((): string => {
    if (state.mode === 'ai-operator') return '🤖';
    return '🧠';
  }, [state.mode]);

  return {
    ...state,
    setMode,
    getActiveBackend,
    getModeIcon,
    reload: loadSettings,
  };
}
