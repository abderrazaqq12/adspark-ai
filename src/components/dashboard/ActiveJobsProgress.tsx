import { usePipelineJobs } from '@/hooks/usePipelineJobs';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ActiveJob {
  id: string;
  stage_name: string;
  stage_number: number;
  status: string;
  progress: number;
  started_at: string | null;
  error_message: string | null;
}

export function ActiveJobsProgress({ projectId }: { projectId?: string }) {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActiveJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('pipeline_jobs')
          .select('id, stage_name, stage_number, status, progress, started_at, error_message')
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setActiveJobs(data || []);
      } catch (error) {
        console.error('Error fetching active jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveJobs();

    // Subscribe to real-time updates for pipeline_jobs
    const channel = supabase
      .channel('active-jobs-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_jobs',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newJob = payload.new as ActiveJob;
            if (newJob.status === 'pending' || newJob.status === 'processing') {
              setActiveJobs(prev => [newJob, ...prev].slice(0, 5));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = payload.new as ActiveJob;
            setActiveJobs(prev => {
              // If job is no longer active, remove it
              if (updatedJob.status !== 'pending' && updatedJob.status !== 'processing') {
                return prev.filter(j => j.id !== updatedJob.id);
              }
              // Update existing job
              const exists = prev.find(j => j.id === updatedJob.id);
              if (exists) {
                return prev.map(j => j.id === updatedJob.id ? updatedJob : j);
              }
              // Add new active job
              return [updatedJob, ...prev].slice(0, 5);
            });
          } else if (payload.eventType === 'DELETE') {
            setActiveJobs(prev => prev.filter(j => j.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const getElapsedTime = (startedAt: string | null) => {
    if (!startedAt) return null;
    const start = new Date(startedAt);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour}h ${diffMin % 60}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Jobs...
        </h3>
      </div>
    );
  }

  if (activeJobs.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-2">Active Pipeline Jobs</h3>
        <p className="text-sm text-muted-foreground">No active jobs running</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Active Pipeline Jobs ({activeJobs.length})
      </h3>
      
      <div className="space-y-3">
        {activeJobs.map((job) => (
          <div key={job.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                <span className="font-medium truncate max-w-[150px]">
                  {job.stage_name}
                </span>
                <span className="text-muted-foreground text-xs">
                  Stage {job.stage_number}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {job.started_at && (
                  <span className="text-xs text-muted-foreground">
                    {getElapsedTime(job.started_at)}
                  </span>
                )}
                <span className="font-mono text-xs font-medium min-w-[40px] text-right">
                  {job.progress}%
                </span>
              </div>
            </div>
            
            <Progress 
              value={job.progress} 
              className="h-2"
            />
            
            {job.error_message && (
              <p className="text-xs text-destructive truncate">
                {job.error_message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
