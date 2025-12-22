/**
 * UnifiedPipelineStatus - Real-time pipeline status component
 * 
 * Shows current job status from backend with LIVE Supabase realtime sync.
 * All tools MUST use this for pipeline progress display.
 * 
 * Features:
 * - Real-time Supabase subscription for pipeline_jobs
 * - Fallback to HTTP polling if realtime fails
 * - Unified status display across all tools
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, Server, Wifi, WifiOff } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { config } from '@/config';
import { supabase } from '@/integrations/supabase/client';

interface PipelineJob {
  id: string;
  type: string;
  status: string;
  progressPct: number;
  startedAt: string | null;
  stageName?: string;
  projectId?: string;
}

interface PipelineState {
  queuedJobs: number;
  currentJob: PipelineJob | null;
  isProcessing: boolean;
  recentJobs?: PipelineJob[];
}

interface UnifiedPipelineStatusProps {
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Show detailed info */
  detailed?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Filter by project ID */
  projectId?: string;
  /** Tool type for context */
  tool?: 'studio' | 'creative-replicator' | 'creative-scale' | 'ai-tools';
}

const getApiBaseUrl = (): string => {
  const vpsUrl = config.backend.restApiUrl;
  if (vpsUrl) return vpsUrl;
  if (config.deploymentTarget === 'local') {
    return 'http://localhost:3000/api';
  }
  return '/api';
};

export function UnifiedPipelineStatus({
  refreshInterval = 5000,
  detailed = false,
  compact = false,
  projectId,
  tool
}: UnifiedPipelineStatusProps) {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const apiBaseUrl = getApiBaseUrl();

  // Fetch pipeline status from backend API (fallback/initial)
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/pipeline/status`);
      if (!res.ok) throw new Error('Failed to fetch pipeline status');
      
      const data = await res.json();
      setPipeline(data.pipeline);
      setError(null);
    } catch (err) {
      console.error('[PipelineStatus] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl]);

  // Fetch jobs from Supabase directly
  const fetchJobsFromSupabase = useCallback(async () => {
    try {
      let query = supabase
        .from('pipeline_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: jobs, error: dbError } = await query;
      
      if (dbError) throw dbError;

      if (jobs && jobs.length > 0) {
        const runningJob = jobs.find(j => j.status === 'running' || j.status === 'processing');
        const queuedJobs = jobs.filter(j => j.status === 'pending' || j.status === 'queued');
        
        setPipeline({
          queuedJobs: queuedJobs.length,
          currentJob: runningJob ? {
            id: runningJob.id,
            type: runningJob.stage_name,
            status: runningJob.status,
            progressPct: runningJob.progress || 0,
            startedAt: runningJob.started_at,
            stageName: runningJob.stage_name,
            projectId: runningJob.project_id
          } : null,
          isProcessing: !!runningJob,
          recentJobs: jobs.slice(0, 5).map(j => ({
            id: j.id,
            type: j.stage_name,
            status: j.status,
            progressPct: j.progress || 0,
            startedAt: j.started_at,
            stageName: j.stage_name,
            projectId: j.project_id
          }))
        });
        setError(null);
      } else {
        setPipeline({
          queuedJobs: 0,
          currentJob: null,
          isProcessing: false,
          recentJobs: []
        });
      }
    } catch (err) {
      console.error('[PipelineStatus] Supabase fetch error:', err);
      // Fall back to API fetch
      await fetchStatus();
    } finally {
      setIsLoading(false);
    }
  }, [projectId, fetchStatus]);

  // Set up Supabase real-time subscription
  useEffect(() => {
    // Initial fetch
    fetchJobsFromSupabase();

    // Set up real-time subscription to pipeline_jobs table
    const channel = supabase
      .channel('pipeline-jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'pipeline_jobs',
          ...(projectId && { filter: `project_id=eq.${projectId}` })
        },
        (payload) => {
          console.log('[PipelineStatus] Realtime update:', payload.eventType, payload.new);
          
          // Refresh jobs on any change
          fetchJobsFromSupabase();
        }
      )
      .subscribe((status) => {
        console.log('[PipelineStatus] Subscription status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    // Fallback polling if realtime not working
    let pollingInterval: NodeJS.Timeout | null = null;
    if (refreshInterval > 0) {
      pollingInterval = setInterval(() => {
        if (!isRealtimeConnected) {
          fetchJobsFromSupabase();
        }
      }, refreshInterval);
    }

    return () => {
      supabase.removeChannel(channel);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [fetchJobsFromSupabase, projectId, refreshInterval, isRealtimeConnected]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading pipeline...</span>
      </div>
    );
  }

  if (error && !pipeline) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm">
        <XCircle className="w-4 h-4" />
        <span>Pipeline offline</span>
      </div>
    );
  }

  if (!pipeline) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {/* Realtime indicator */}
        {isRealtimeConnected ? (
          <Wifi className="w-3 h-3 text-green-500" />
        ) : (
          <WifiOff className="w-3 h-3 text-muted-foreground" />
        )}
        
        {pipeline.isProcessing ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              {pipeline.currentJob?.progressPct || 0}%
            </span>
          </>
        ) : pipeline.queuedJobs > 0 ? (
          <>
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-muted-foreground">
              {pipeline.queuedJobs} queued
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="text-xs text-muted-foreground">Ready</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Pipeline</span>
          {/* Live indicator */}
          {isRealtimeConnected ? (
            <span className="flex items-center gap-1 text-[10px] text-green-600">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">Polling</span>
          )}
        </div>
        <Badge 
          variant={pipeline.isProcessing ? 'default' : 'outline'}
          className={pipeline.isProcessing ? 'bg-primary' : ''}
        >
          {pipeline.isProcessing ? 'Running' : 'Idle'}
        </Badge>
      </div>

      {/* Current Job */}
      {pipeline.currentJob && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate max-w-[150px]">
              {pipeline.currentJob.stageName || pipeline.currentJob.type}
            </span>
            <span className="font-medium">{pipeline.currentJob.progressPct}%</span>
          </div>
          <Progress value={pipeline.currentJob.progressPct} className="h-1.5" />
        </div>
      )}

      {/* Queue Status */}
      {pipeline.queuedJobs > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{pipeline.queuedJobs} jobs queued</span>
        </div>
      )}

      {/* Detailed Info */}
      {detailed && pipeline.currentJob && (
        <div className="pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Stage:</span>
            <span className="font-mono">{pipeline.currentJob.stageName || pipeline.currentJob.type}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {pipeline.currentJob.status}
            </Badge>
          </div>
          {pipeline.currentJob.startedAt && (
            <div className="flex justify-between">
              <span>Started:</span>
              <span className="font-mono">
                {new Date(pipeline.currentJob.startedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recent Jobs (when detailed) */}
      {detailed && pipeline.recentJobs && pipeline.recentJobs.length > 1 && (
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Recent Jobs</p>
          <div className="space-y-1">
            {pipeline.recentJobs.slice(1, 4).map(job => (
              <div key={job.id} className="flex items-center justify-between text-[10px]">
                <span className="truncate max-w-[100px] text-muted-foreground">
                  {job.stageName || job.type}
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-[9px] h-3.5 px-1 ${
                    job.status === 'completed' ? 'border-green-500/50 text-green-600' :
                    job.status === 'failed' ? 'border-destructive/50 text-destructive' :
                    ''
                  }`}
                >
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
