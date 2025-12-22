/**
 * UnifiedPipelineStatus - Real-time pipeline status component
 * 
 * Shows current job status from backend.
 * All tools MUST use this for pipeline progress display.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, Server } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { config } from '@/config';

interface PipelineJob {
  id: string;
  type: string;
  status: string;
  progressPct: number;
  startedAt: string | null;
}

interface PipelineState {
  queuedJobs: number;
  currentJob: PipelineJob | null;
  isProcessing: boolean;
}

interface UnifiedPipelineStatusProps {
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number;
  /** Show detailed info */
  detailed?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
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
  refreshInterval = 2000,
  detailed = false,
  compact = false
}: UnifiedPipelineStatusProps) {
  const [pipeline, setPipeline] = useState<PipelineState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = getApiBaseUrl();

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

  useEffect(() => {
    fetchStatus();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, refreshInterval]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading pipeline...</span>
      </div>
    );
  }

  if (error) {
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
              {pipeline.currentJob.id}
            </span>
            <span className="font-medium">{pipeline.currentJob.progressPct}%</span>
          </div>
          <Progress value={pipeline.currentJob.progressPct} className="h-1" />
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
            <span>Type:</span>
            <span className="font-mono">{pipeline.currentJob.type}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-mono">{pipeline.currentJob.status}</span>
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
    </div>
  );
}
