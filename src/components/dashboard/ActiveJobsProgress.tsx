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
        const url = new URL('/api/history', window.location.origin);
        if (projectId) {
          url.searchParams.append('projectId', projectId);
        }

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error('Failed to fetch active jobs');

        const data = await response.json();
        if (data.ok && data.history) {
          // Map backend job to ActiveJob shape
          const historyJobs: ActiveJob[] = data.history
            .filter((j: any) => j.status === 'queued' || j.status === 'running' || j.status === 'processing')
            .map((j: any) => ({
              id: j.id,
              stage_name: j.type === 'execute-plan' ? 'Rendering' : 'Processing',
              stage_number: 1,
              status: j.status === 'queued' ? 'pending' : 'processing',
              progress: j.progressPct || 0,
              started_at: j.createdAt, // Using createdAt as startedAt fallback
              error_message: j.error
            }));

          setActiveJobs(historyJobs.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching active jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveJobs();
    const interval = setInterval(fetchActiveJobs, 5000); // 5s poll for active progress

    return () => {
      clearInterval(interval);
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

  const getEstimatedTimeRemaining = (startedAt: string | null, progress: number) => {
    if (!startedAt || progress <= 0 || progress >= 100) return null;

    const start = new Date(startedAt);
    const now = new Date();
    const elapsedMs = now.getTime() - start.getTime();

    // Calculate rate: ms per percent
    const msPerPercent = elapsedMs / progress;
    const remainingPercent = 100 - progress;
    const remainingMs = msPerPercent * remainingPercent;
    const remainingSec = Math.floor(remainingMs / 1000);

    if (remainingSec < 60) return `~${remainingSec}s left`;
    const remainingMin = Math.floor(remainingSec / 60);
    if (remainingMin < 60) return `~${remainingMin}m left`;
    const remainingHour = Math.floor(remainingMin / 60);
    return `~${remainingHour}h ${remainingMin % 60}m left`;
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {job.started_at && (
                  <span>
                    {getElapsedTime(job.started_at)}
                  </span>
                )}
                {job.started_at && job.progress > 0 && job.progress < 100 && (
                  <span className="text-primary font-medium">
                    {getEstimatedTimeRemaining(job.started_at, job.progress)}
                  </span>
                )}
                <span className="font-mono font-medium min-w-[40px] text-right text-foreground">
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
