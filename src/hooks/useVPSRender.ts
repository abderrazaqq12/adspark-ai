/**
 * useVPSRender Hook
 * React hook for VPS-based video rendering
 */

import { useState, useCallback } from 'react';
import {
  uploadAndRender,
  uploadAndExecutePlan,
  checkServerHealth,
  type ExecuteOptions,
  type ExecuteResult,
  type RenderProgress,
} from '@/lib/vps-render-service';

interface UseVPSRenderState {
  isRendering: boolean;
  progress: RenderProgress | null;
  result: ExecuteResult | null;
  error: string | null;
  serverHealthy: boolean | null;
}

export function useVPSRender() {
  const [state, setState] = useState<UseVPSRenderState>({
    isRendering: false,
    progress: null,
    result: null,
    error: null,
    serverHealthy: null,
  });

  const handleProgress = useCallback((progress: RenderProgress) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  const checkHealth = useCallback(async () => {
    const health = await checkServerHealth();
    setState(prev => ({ ...prev, serverHealthy: health.healthy }));
    return health;
  }, []);

  const renderVideo = useCallback(async (
    file: File,
    options: ExecuteOptions = {}
  ): Promise<ExecuteResult> => {
    setState(prev => ({
      ...prev,
      isRendering: true,
      error: null,
      result: null,
      progress: { stage: 'uploading', progress: 0, message: 'Starting...' },
    }));

    try {
      const result = await uploadAndRender(file, options, handleProgress);
      setState(prev => ({
        ...prev,
        isRendering: false,
        result,
      }));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Render failed';
      setState(prev => ({
        ...prev,
        isRendering: false,
        error: message,
        progress: { stage: 'error', progress: 0, message },
      }));
      throw error;
    }
  }, [handleProgress]);

  const renderWithPlan = useCallback(async (
    file: File,
    plan: Record<string, unknown>,
    outputName?: string
  ): Promise<ExecuteResult> => {
    setState(prev => ({
      ...prev,
      isRendering: true,
      error: null,
      result: null,
      progress: { stage: 'uploading', progress: 0, message: 'Starting...' },
    }));

    try {
      const result = await uploadAndExecutePlan(file, plan, outputName, handleProgress);
      setState(prev => ({
        ...prev,
        isRendering: false,
        result,
      }));
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Render failed';
      setState(prev => ({
        ...prev,
        isRendering: false,
        error: message,
        progress: { stage: 'error', progress: 0, message },
      }));
      throw error;
    }
  }, [handleProgress]);

  const reset = useCallback(() => {
    setState({
      isRendering: false,
      progress: null,
      result: null,
      error: null,
      serverHealthy: null,
    });
  }, []);

  return {
    ...state,
    renderVideo,
    renderWithPlan,
    checkHealth,
    reset,
  };
}
