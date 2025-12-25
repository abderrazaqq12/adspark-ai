/**
 * Hook for managing first-class prompt profiles with database persistence
 * VPS Mode: Uses /api/prompt-profiles proxy to bypass RLS
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client'; // For database only, NOT auth
import { getUser, getUserId } from '@/utils/auth';
import { useToast } from '@/hooks/use-toast';

export type PromptType = 'marketing_angles' | 'landing_page' | 'product_content' | 'image_generation' | 'voiceover' | 'scene_breakdown';

export interface PromptProfile {
  id: string;
  user_id: string;
  type: PromptType;
  title: string;
  prompt_text: string;
  prompt_hash: string;
  language: string;
  market: string;
  version: number;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_profile_id: string;
  version: number;
  prompt_text: string;
  prompt_hash: string;
  created_at: string;
}

// Generate hash for prompt text (for change detection)
function generatePromptHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Check if running in VPS/self-hosted mode
const isSelfHosted = () => import.meta.env.VITE_DEPLOYMENT_MODE === 'self-hosted';

export function usePromptProfiles() {
  const [loading, setLoading] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const { toast } = useToast();

  // Get active prompt for a specific type/language/market
  const getActivePrompt = useCallback(async (
    type: PromptType,
    language: string = 'ar',
    market: string = 'gcc'
  ): Promise<PromptProfile | null> => {
    try {
      if (isSelfHosted()) {
        // VPS Mode: Use API proxy
        const token = localStorage.getItem('flowscale_token');
        const res = await fetch(`/api/prompt-profiles?type=${type}&language=${language}&market=${market}`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });

        if (!res.ok) {
          console.error('[PromptProfiles] VPS fetch error');
          return null;
        }

        const data = await res.json();

        if (debugMode && data.prompt) {
          console.log(`[PromptProfiles] Active prompt loaded:`, {
            id: data.prompt.id,
            type,
            language,
            market,
            hash: data.prompt.prompt_hash,
            version: data.prompt.version
          });
        }

        return data.prompt as PromptProfile | null;
      }

      // Cloud Mode: Direct Supabase
      const user = getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('prompt_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', type)
        .eq('language', language)
        .eq('market', market)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[PromptProfiles] Error fetching:', error);
        return null;
      }

      if (debugMode && data) {
        console.log(`[PromptProfiles] Active prompt loaded:`, {
          id: data.id,
          type,
          language,
          market,
          hash: data.prompt_hash,
          version: data.version
        });
      }

      return data as PromptProfile | null;
    } catch (err) {
      console.error('[PromptProfiles] Exception:', err);
      return null;
    }
  }, [debugMode]);

  // Save or update prompt profile
  const savePrompt = useCallback(async (
    type: PromptType,
    title: string,
    promptText: string,
    language: string = 'ar',
    market: string = 'gcc'
  ): Promise<PromptProfile | null> => {
    setLoading(true);
    try {
      if (isSelfHosted()) {
        // VPS Mode: Use API proxy
        const token = localStorage.getItem('flowscale_token');
        const res = await fetch('/api/prompt-profiles', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            type,
            title,
            prompt_text: promptText,
            language,
            market
          })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.description || 'Failed to save prompt');
        }

        const data = await res.json();

        if (debugMode) {
          console.log(`[PromptProfiles] Prompt saved:`, {
            id: data.prompt.id,
            version: data.prompt.version
          });
        }

        toast({ title: 'Prompt Saved', description: `Version ${data.prompt.version} saved` });
        return data.prompt as PromptProfile;
      }

      // Cloud Mode: Direct Supabase
      const user = getUser();
      if (!user) {
        toast({ title: 'Error', description: 'Must be logged in', variant: 'destructive' });
        return null;
      }

      const promptHash = generatePromptHash(promptText);

      // Check if active prompt exists
      const existing = await getActivePrompt(type, language, market);

      if (existing) {
        // Update existing prompt with version increment
        const { data, error } = await supabase
          .from('prompt_profiles')
          .update({
            title,
            prompt_text: promptText,
            prompt_hash: promptHash,
            version: existing.version + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        if (debugMode) {
          console.log(`[PromptProfiles] Prompt updated:`, {
            id: data.id,
            oldHash: existing.prompt_hash,
            newHash: promptHash,
            version: data.version
          });
        }

        toast({ title: 'Prompt Saved', description: `Version ${data.version} saved` });
        return data as PromptProfile;
      } else {
        // Create new prompt
        const { data, error } = await supabase
          .from('prompt_profiles')
          .insert({
            user_id: user.id,
            type,
            title,
            prompt_text: promptText,
            prompt_hash: promptHash,
            language,
            market,
            version: 1,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        if (debugMode) {
          console.log(`[PromptProfiles] New prompt created:`, {
            id: data.id,
            hash: promptHash,
            version: 1
          });
        }

        toast({ title: 'Prompt Created', description: 'Custom prompt saved' });
        return data as PromptProfile;
      }
    } catch (err: any) {
      console.error('[PromptProfiles] Save error:', err);
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [getActivePrompt, debugMode, toast]);

  // Get version history for a prompt
  const getVersionHistory = useCallback(async (promptId: string): Promise<PromptVersion[]> => {
    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('prompt_profile_id', promptId)
        .order('version', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as PromptVersion[];
    } catch (err) {
      console.error('[PromptProfiles] Version history error:', err);
      return [];
    }
  }, []);

  // Restore a specific version
  const restoreVersion = useCallback(async (
    promptId: string,
    version: PromptVersion
  ): Promise<PromptProfile | null> => {
    setLoading(true);
    try {
      const { data: current } = await supabase
        .from('prompt_profiles')
        .select('version')
        .eq('id', promptId)
        .single();

      if (!current) throw new Error('Prompt not found');

      const { data, error } = await supabase
        .from('prompt_profiles')
        .update({
          prompt_text: version.prompt_text,
          prompt_hash: version.prompt_hash,
          version: current.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Version Restored', description: `Restored to v${version.version}` });
      return data as PromptProfile;
    } catch (err: any) {
      toast({ title: 'Restore Failed', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Get prompt for execution (CRITICAL: blocks if no prompt exists)
  const getPromptForExecution = useCallback(async (
    type: PromptType,
    language: string = 'ar',
    market: string = 'gcc'
  ): Promise<{ prompt: PromptProfile; debugInfo: { id: string; hash: string; version: number } } | null> => {
    const prompt = await getActivePrompt(type, language, market);

    if (!prompt) {
      console.error(`[PromptProfiles] BLOCKED: No active prompt for ${type}/${language}/${market}`);
      return null;
    }

    const debugInfo = {
      id: prompt.id,
      hash: prompt.prompt_hash,
      version: prompt.version
    };

    if (debugMode) {
      console.log(`[PromptProfiles] Execution using prompt:`, debugInfo);
    }

    return { prompt, debugInfo };
  }, [getActivePrompt, debugMode]);

  return {
    loading,
    debugMode,
    setDebugMode,
    getActivePrompt,
    savePrompt,
    getVersionHistory,
    restoreVersion,
    getPromptForExecution,
    generatePromptHash
  };
}

