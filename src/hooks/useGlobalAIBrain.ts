/**
 * useGlobalAIBrain Hook
 * 
 * React hook for accessing the centralized AI Brain system.
 * Provides cost optimization and decision scoring across all tools.
 */

import { useMemo, useCallback } from 'react';
import { useSecureApiKeys } from './useSecureApiKeys';
import { 
  GlobalAIBrain, 
  getGlobalAIBrain,
  DecisionContext,
  FullDecision,
  BrainResponse,
} from '@/lib/ai-brain';

export function useGlobalAIBrain() {
  const { providers, loading: apiKeysLoading } = useSecureApiKeys();
  
  // Extract active provider names
  const availableApiKeys = useMemo(() => {
    return providers.filter(p => p.is_active).map(p => p.provider);
  }, [providers]);
  
  // Get brain instance
  const brain = useMemo(() => {
    return getGlobalAIBrain(availableApiKeys);
  }, [availableApiKeys]);
  
  // Process a full request
  const processRequest = useCallback((
    taskId: string,
    context: DecisionContext
  ): BrainResponse => {
    return brain.process({ taskId, context });
  }, [brain]);
  
  // Quick single decision
  const quickDecision = useCallback((context: DecisionContext): FullDecision => {
    return brain.quickDecision(context);
  }, [brain]);
  
  // Get cost estimate
  const estimateCost = useCallback((
    taskType: 'video' | 'image' | 'text' | 'audio',
    count: number,
    duration?: number
  ) => {
    return brain.estimateCost(taskType, count, duration);
  }, [brain]);
  
  return {
    brain,
    loading: apiKeysLoading,
    availableApiKeys,
    availableProviders: brain.getAvailableProviders(),
    activeProviderIds: brain.getActiveProviderIds(),
    stats: brain.getStats(),
    processRequest,
    quickDecision,
    estimateCost,
  };
}
