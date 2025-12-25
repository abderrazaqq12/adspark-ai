import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Database only
import { getUser, getUserId } from '@/utils/auth';

interface CostTransaction {
  id: string;
  pipeline_stage: string;
  engine_name: string;
  operation_type: string;
  cost_usd: number;
  tokens_used?: number;
  duration_sec?: number;
  created_at: string;
}

interface CostSummary {
  total: number;
  byStage: Record<string, number>;
  byEngine: Record<string, number>;
  transactions: CostTransaction[];
}

interface UseRealTimeCostReturn {
  costs: CostSummary;
  isLoading: boolean;
  projectCost: number;
  estimatedTotal: number;
  recordCost: (transaction: Omit<CostTransaction, 'id' | 'created_at'>) => Promise<void>;
}

export function useRealTimeCost(projectId?: string): UseRealTimeCostReturn {
  const [costs, setCosts] = useState<CostSummary>({
    total: 0,
    byStage: {},
    byEngine: {},
    transactions: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [estimatedTotal, setEstimatedTotal] = useState(0);

  const calculateSummary = useCallback((transactions: CostTransaction[]): CostSummary => {
    const byStage: Record<string, number> = {};
    const byEngine: Record<string, number> = {};
    let total = 0;

    for (const tx of transactions) {
      total += tx.cost_usd || 0;
      byStage[tx.pipeline_stage] = (byStage[tx.pipeline_stage] || 0) + (tx.cost_usd || 0);
      byEngine[tx.engine_name] = (byEngine[tx.engine_name] || 0) + (tx.cost_usd || 0);
    }

    return { total, byStage, byEngine, transactions };
  }, []);

  const fetchCosts = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cost_transactions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const summary = calculateSummary(data || []);
      setCosts(summary);
    } catch (error) {
      console.error('Error fetching costs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, calculateSummary]);

  const recordCost = useCallback(async (transaction: Omit<CostTransaction, 'id' | 'created_at'>) => {
    try {
      // VPS-ONLY: Use centralized auth
      const user = getUser();
      if (!user) return;

      const { error } = await supabase
        .from('cost_transactions')
        .insert({
          ...transaction,
          user_id: user.id,
          project_id: projectId,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording cost:', error);
    }
  }, [projectId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!projectId) return;

    fetchCosts();

    const channel = supabase
      .channel(`cost-transactions-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cost_transactions',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setCosts((prev) => {
            const newTx = payload.new as CostTransaction;
            const transactions = [newTx, ...prev.transactions];
            return calculateSummary(transactions);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchCosts, calculateSummary]);

  // Estimate remaining costs based on pipeline stages
  useEffect(() => {
    const stageEstimates: Record<string, number> = {
      product_content: 0.02,
      image_generation: 0.10,
      landing_page: 0.02,
      voiceover: 0.05,
      scene_builder: 0.01,
      video_generation: 0.50,
      assembly: 0.05,
      export: 0.01,
    };

    const completed = Object.keys(costs.byStage);
    let remaining = 0;

    for (const [stage, estimate] of Object.entries(stageEstimates)) {
      if (!completed.includes(stage)) {
        remaining += estimate;
      }
    }

    setEstimatedTotal(costs.total + remaining);
  }, [costs]);

  return {
    costs,
    isLoading,
    projectCost: costs.total,
    estimatedTotal,
    recordCost,
  };
}
