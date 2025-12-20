import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PipelineJob {
  id: string;
  stage_number: number;
  stage_name: string;
  status: string;
  progress: number;
  input_data: any;
  output_data: any;
  error_message?: string | null;
  
  estimated_cost: number;
  actual_cost: number;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
}

interface UsePipelineJobsReturn {
  jobs: PipelineJob[];
  currentJob: PipelineJob | null;
  isLoading: boolean;
  startStage: (stage: number, stageName: string, inputData: any) => Promise<string | null>;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  getStageStatus: (stage: number) => 'pending' | 'processing' | 'completed' | 'failed';
}

export function usePipelineJobs(projectId?: string): UsePipelineJobsReturn {
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pipeline_jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('stage_number', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching pipeline jobs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const startStage = useCallback(async (
    stage: number,
    stageName: string,
    inputData: any
  ): Promise<string | null> => {
    if (!projectId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('pipeline-stage', {
        body: {
          project_id: projectId,
          stage,
          stage_name: stageName,
          input_data: inputData,
        },
      });

      if (response.error) throw response.error;

      return response.data?.job_id || null;
    } catch (error) {
      console.error('Error starting pipeline stage:', error);
      return null;
    }
  }, [projectId]);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      await supabase
        .from('pipeline_jobs')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      await fetchJobs();
    } catch (error) {
      console.error('Error cancelling job:', error);
    }
  }, [fetchJobs]);

  const retryJob = useCallback(async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    await startStage(job.stage_number, job.stage_name, job.input_data);
  }, [jobs, startStage]);

  const getStageStatus = useCallback((stage: number): 'pending' | 'processing' | 'completed' | 'failed' => {
    const stageJobs = jobs.filter(j => j.stage_number === stage);
    if (stageJobs.length === 0) return 'pending';

    const latestJob = stageJobs[0];
    return latestJob.status as any;
  }, [jobs]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!projectId) return;

    fetchJobs();

    const channel = supabase
      .channel(`pipeline-jobs-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_jobs',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new as PipelineJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(j => 
              j.id === payload.new.id ? payload.new as PipelineJob : j
            ));
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(j => j.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchJobs]);

  const currentJob = jobs.find(j => j.status === 'processing') || null;

  return {
    jobs,
    currentJob,
    isLoading,
    startStage,
    cancelJob,
    retryJob,
    getStageStatus,
  };
}
