/**
 * Auto-detect available render backends
 * Checks VPS server and cloud APIs availability
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RenderBackendStatus {
  vpsServer: {
    available: boolean;
    latency?: number;
    version?: string;
  };
  cloudinaryApi: {
    available: boolean;
    configured: boolean;
  };
  edgeFunctions: {
    available: boolean;
    latency?: number;
  };
  recommended: 'vps' | 'cloud' | 'edge';
  loading: boolean;
}

export function useRenderBackendStatus() {
  const [status, setStatus] = useState<RenderBackendStatus>({
    vpsServer: { available: false },
    cloudinaryApi: { available: false, configured: false },
    edgeFunctions: { available: false },
    recommended: 'edge',
    loading: true,
  });

  useEffect(() => {
    checkBackends();
  }, []);

  const checkBackends = async () => {
    setStatus(prev => ({ ...prev, loading: true }));

    const results: RenderBackendStatus = {
      vpsServer: { available: false },
      cloudinaryApi: { available: false, configured: false },
      edgeFunctions: { available: false },
      recommended: 'edge',
      loading: false,
    };

    // 1. Check VPS Server (RenderFlow)
    try {
      const vpsStart = Date.now();
      const response = await fetch('/api/health', { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) 
      });
      
      if (response.ok) {
        const data = await response.json();
        results.vpsServer = {
          available: true,
          latency: Date.now() - vpsStart,
          version: data.version || 'unknown',
        };
      }
    } catch (err) {
      console.log('[Backend Check] VPS not available');
    }

    // 2. Check Edge Functions
    try {
      const edgeStart = Date.now();
      const { data, error } = await supabase.functions.invoke('renderflow-health', {
        body: { ping: true }
      });
      
      if (!error && data) {
        results.edgeFunctions = {
          available: true,
          latency: Date.now() - edgeStart,
        };
      }
    } catch (err) {
      console.log('[Backend Check] Edge functions not responding');
    }

    // 3. Check Cloudinary (via user settings/API keys)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: keys } = await supabase
          .rpc('get_my_api_key_providers');
        
        const hasCloudinary = keys?.some((k: any) => 
          k.provider === 'CLOUDINARY_API_KEY' && k.is_active
        );
        
        results.cloudinaryApi = {
          available: hasCloudinary || false,
          configured: hasCloudinary || false,
        };
      }
    } catch (err) {
      console.log('[Backend Check] Could not check Cloudinary');
    }

    // 4. Determine recommended backend
    if (results.vpsServer.available) {
      results.recommended = 'vps';
    } else if (results.edgeFunctions.available) {
      results.recommended = 'edge';
    } else if (results.cloudinaryApi.available) {
      results.recommended = 'cloud';
    }

    setStatus(results);
  };

  const refresh = () => checkBackends();

  return { ...status, refresh };
}
