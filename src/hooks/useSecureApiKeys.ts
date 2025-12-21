/**
 * Hook for securely managing API keys using the secure_api_keys table
 * This uses SECURITY DEFINER functions to prevent direct access to encrypted keys
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ApiKeyProvider {
  provider: string;
  is_active: boolean;
  last_validated_at: string | null;
  last_validation_success: boolean | null;
  last_validation_message: string | null;
}

interface SecureApiKeysHook {
  providers: ApiKeyProvider[];
  loading: boolean;
  saveApiKey: (provider: string, encryptedKey: string, isActive?: boolean) => Promise<boolean>;
  deleteApiKey: (provider: string) => Promise<boolean>;
  toggleApiKeyActive: (provider: string, isActive: boolean) => Promise<boolean>;
  updateValidationStatus: (provider: string, success: boolean, message: string) => Promise<boolean>;
  hasApiKey: (provider: string) => boolean;
  isApiKeyActive: (provider: string) => boolean;
  getValidationStatus: (provider: string) => { validated_at: string | null; success: boolean | null; message: string | null };
  refreshProviders: () => Promise<void>;
}

export function useSecureApiKeys(): SecureApiKeysHook {
  const [providers, setProviders] = useState<ApiKeyProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const refreshProviders = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_my_api_key_providers');
      
      if (error) {
        console.error('Error fetching API key providers:', error);
        return;
      }
      
      setProviders(data || []);
    } catch (err) {
      console.error('Failed to fetch API key providers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProviders();
  }, [refreshProviders]);

  const saveApiKey = useCallback(async (
    provider: string, 
    encryptedKey: string, 
    isActive: boolean = true
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('upsert_secure_api_key', {
        p_provider: provider,
        p_encrypted_key: encryptedKey,
        p_is_active: isActive,
      });

      if (error) {
        console.error('Error saving API key:', error);
        toast({
          title: 'Error',
          description: 'Failed to save API key securely',
          variant: 'destructive',
        });
        return false;
      }

      await refreshProviders();
      return true;
    } catch (err) {
      console.error('Failed to save API key:', err);
      return false;
    }
  }, [refreshProviders, toast]);

  const deleteApiKey = useCallback(async (provider: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('delete_my_api_key', {
        p_provider: provider,
      });

      if (error) {
        console.error('Error deleting API key:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete API key',
          variant: 'destructive',
        });
        return false;
      }

      await refreshProviders();
      return true;
    } catch (err) {
      console.error('Failed to delete API key:', err);
      return false;
    }
  }, [refreshProviders, toast]);

  const toggleApiKeyActive = useCallback(async (
    provider: string, 
    isActive: boolean
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('toggle_api_key_active', {
        p_provider: provider,
        p_is_active: isActive,
      });

      if (error) {
        console.error('Error toggling API key:', error);
        return false;
      }

      await refreshProviders();
      return true;
    } catch (err) {
      console.error('Failed to toggle API key:', err);
      return false;
    }
  }, [refreshProviders]);

  const hasApiKey = useCallback((provider: string): boolean => {
    return providers.some(p => p.provider === provider);
  }, [providers]);

  const isApiKeyActive = useCallback((provider: string): boolean => {
    const p = providers.find(p => p.provider === provider);
    return p?.is_active ?? false;
  }, [providers]);

  const getValidationStatus = useCallback((provider: string): { validated_at: string | null; success: boolean | null; message: string | null } => {
    const p = providers.find(p => p.provider === provider);
    return {
      validated_at: p?.last_validated_at ?? null,
      success: p?.last_validation_success ?? null,
      message: p?.last_validation_message ?? null,
    };
  }, [providers]);

  const updateValidationStatus = useCallback(async (
    provider: string,
    success: boolean,
    message: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.rpc('update_api_key_validation', {
        p_provider: provider,
        p_success: success,
        p_message: message,
      });

      if (error) {
        console.error('Error updating validation status:', error);
        return false;
      }

      await refreshProviders();
      return true;
    } catch (err) {
      console.error('Failed to update validation status:', err);
      return false;
    }
  }, [refreshProviders]);

  return {
    providers,
    loading,
    saveApiKey,
    deleteApiKey,
    toggleApiKeyActive,
    updateValidationStatus,
    hasApiKey,
    isApiKeyActive,
    getValidationStatus,
    refreshProviders,
  };
}
