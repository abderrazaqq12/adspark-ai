/**
 * RENDER ENVIRONMENT HOOK
 * 
 * Auto-detects VPS capabilities on app boot.
 * UI must consume this as READ-ONLY status.
 * NO manual backend configuration in UI.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  detectVPSCapabilities, 
  initDecisionScorer,
  type VPSCapabilities,
  type RenderEnvironmentStatus 
} from '@/lib/render';

export function useRenderEnvironment() {
  const [status, setStatus] = useState<RenderEnvironmentStatus>({
    vps: {
      available: false,
      ffmpeg: { ready: false },
      hardware: {
        cpuCores: 0,
        ramMB: 0,
        nvencAvailable: false,
        vaapiAvailable: false,
      },
      queue: { length: 0 },
    },
    recommended: 'fallback',
    loading: true,
  });

  const detectEnvironment = useCallback(async () => {
    setStatus(prev => ({ ...prev, loading: true }));

    try {
      const vps = await detectVPSCapabilities();
      
      // Initialize global decision scorer with detected capabilities
      if (vps.available) {
        initDecisionScorer(vps);
      }

      setStatus({
        vps,
        recommended: vps.available && vps.ffmpeg.ready ? 'vps' : 'fallback',
        loading: false,
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[RenderEnv] Detection failed:', error);
      setStatus(prev => ({
        ...prev,
        loading: false,
        lastChecked: new Date().toISOString(),
      }));
    }
  }, []);

  // Auto-detect on mount
  useEffect(() => {
    detectEnvironment();
  }, [detectEnvironment]);

  return {
    ...status,
    refresh: detectEnvironment,
    isVPSReady: status.vps.available && status.vps.ffmpeg.ready,
    hasGPU: status.vps.hardware.nvencAvailable || status.vps.hardware.vaapiAvailable,
  };
}
