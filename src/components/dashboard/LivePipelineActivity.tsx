/**
 * Live Pipeline Activity - SECTION 3
 * Shows running and recently failed jobs
 * READ-ONLY - No retry buttons, awareness only
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  AlertTriangle,
  Clock,
  Loader2,
  Inbox,
  Server
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGlobalProject } from '@/contexts/GlobalProjectContext';
import { formatDistanceToNow } from 'date-fns';

interface RunningJob {
  id: string;
  tool: string;
  stage: string;
  progress: number;
  duration: string;
  projectName: string;
}

interface FailedJob {
  id: string;
  tool: string;
  stage: string;
  error: string;
  failedAt: string;
  projectName: string;
}

export function LivePipelineActivity() {
  const { activeProject } = useGlobalProject();
  const [runningJobs, setRunningJobs] = useState<RunningJob[]>([]);
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);

  useEffect(() => {
    fetchJobs();
    
    const channel = supabase
      .channel('live-pipeline-activity')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_jobs' },
        () => fetchJobs()
      )
      .subscribe();

    // Refresh duration every 10 seconds for running jobs
    const interval = setInterval(() => {
      if (runningJobs.length > 0) {
        fetchJobs();
      }
    }, 10000);

    // Timeout to prevent perpetual loading - max 8 seconds
    const timeout = setTimeout(() => {
      if (isLoading && loadAttempts >= 1) {
        setIsLoading(false);
        setLoadError('Backend not responding');
      }
    }, 8000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [activeProject?.id, loadAttempts]);

  const fetchJobs = async () => {
    setLoadAttempts(prev => prev + 1);
    setLoadError(null);
    
    try {
      // Fetch running jobs
      let runningQuery = supabase
        .from('pipeline_jobs')
        .select(`
          id,
          stage_name,
          progress,
          started_at,
          input_data,
          projects!pipeline_jobs_project_id_fkey (name)
        `)
        .in('status', ['processing', 'running'])
        .order('started_at', { ascending: false })
        .limit(5);

      if (activeProject?.id) {
        runningQuery = runningQuery.eq('project_id', activeProject.id);
      }

      const { data: running, error: runningError } = await runningQuery;

      if (runningError) {
        console.error('Error fetching running jobs:', runningError);
        setLoadError('Failed to fetch running jobs');
        setIsLoading(false);
        return;
      }

      if (running) {
        setRunningJobs(running.map(job => ({
          id: job.id,
          tool: extractTool(job.stage_name),
          stage: formatStage(job.stage_name),
          progress: job.progress || 0,
          duration: job.started_at 
            ? formatDistanceToNow(new Date(job.started_at), { addSuffix: false })
            : '0s',
          projectName: (job.projects as any)?.name || 'Unknown'
        })));
      } else {
        setRunningJobs([]);
      }

      // Fetch failed jobs (last 24h)
      let failedQuery = supabase
        .from('pipeline_jobs')
        .select(`
          id,
          stage_name,
          error_message,
          completed_at,
          projects!pipeline_jobs_project_id_fkey (name)
        `)
        .eq('status', 'failed')
        .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false })
        .limit(5);

      if (activeProject?.id) {
        failedQuery = failedQuery.eq('project_id', activeProject.id);
      }

      const { data: failed, error: failedError } = await failedQuery;

      if (failedError) {
        console.error('Error fetching failed jobs:', failedError);
        // Don't block - we still got running jobs
      }

      if (failed) {
        setFailedJobs(failed.map(job => ({
          id: job.id,
          tool: extractTool(job.stage_name),
          stage: formatStage(job.stage_name),
          error: humanizeError(job.error_message),
          failedAt: job.completed_at 
            ? formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })
            : 'Unknown',
          projectName: (job.projects as any)?.name || 'Unknown'
        })));
      } else {
        setFailedJobs([]);
      }
      
      setLoadError(null);
    } catch (error) {
      console.error('Error fetching pipeline jobs:', error);
      setLoadError('Backend connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const extractTool = (stageName: string): string => {
    if (stageName?.includes('replicator')) return 'Replicator';
    if (stageName?.includes('creative_scale')) return 'Creative Scale';
    if (stageName?.includes('studio')) return 'Studio';
    if (stageName?.includes('ai_tools')) return 'AI Tools';
    return 'Pipeline';
  };

  const formatStage = (stageName: string): string => {
    if (!stageName) return 'Processing';
    
    // Map technical stage names to human-readable
    const stageMap: Record<string, string> = {
      'analyze': 'Analyzing',
      'planning': 'Planning',
      'generating': 'Generating',
      'rendering': 'Rendering',
      'exporting': 'Exporting',
      'uploading': 'Uploading',
      'voice': 'Voice Generation',
      'script': 'Script Writing',
      'image': 'Image Generation',
      'video': 'Video Generation'
    };

    for (const [key, value] of Object.entries(stageMap)) {
      if (stageName.toLowerCase().includes(key)) {
        return value;
      }
    }

    return stageName
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const humanizeError = (error: string | null): string => {
    if (!error) return 'Unknown error occurred';
    
    // Map common error patterns to human-readable messages
    if (error.includes('timeout') || error.includes('TIMEOUT')) {
      return 'Operation timed out - server may be overloaded';
    }
    if (error.includes('network') || error.includes('fetch')) {
      return 'Network connection failed';
    }
    if (error.includes('ffmpeg') || error.includes('FFmpeg')) {
      return 'Video processing failed - FFmpeg error';
    }
    if (error.includes('API') || error.includes('401') || error.includes('403')) {
      return 'API authentication failed';
    }
    if (error.includes('quota') || error.includes('limit')) {
      return 'API quota or rate limit exceeded';
    }
    if (error.includes('memory') || error.includes('OOM')) {
      return 'Server ran out of memory';
    }
    
    // Truncate long errors
    return error.length > 80 ? error.slice(0, 80) + '...' : error;
  };

  const isEmpty = runningJobs.length === 0 && failedJobs.length === 0;

  // Error state - backend not responding
  if (loadError) {
    return (
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Live Pipeline Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-amber-600 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Server className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Status unavailable</p>
              <p className="text-xs text-amber-600/80">{loadError}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Short loading state (max 3 seconds visible)
  if (isLoading && loadAttempts < 2) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading pipeline activity...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Live Pipeline Activity
          </CardTitle>
          {runningJobs.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600">{runningJobs.length} running</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Idle State - Truthful empty state */}
        {isEmpty && (
          <div className="text-center py-6 text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No active jobs</p>
            <p className="text-xs mt-1">Pipeline is idle. No jobs running or failed in the last 24 hours.</p>
            <p className="text-[10px] mt-2 text-muted-foreground/60">
              Jobs will appear here when you start a generation in Studio, Replicator, or AI Tools.
            </p>
          </div>
        )}

        {/* Running Jobs */}
        {runningJobs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Running Now
            </h4>
            {runningJobs.map(job => (
              <div 
                key={job.id}
                className="p-3 rounded-lg bg-primary/5 border border-primary/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5">
                      {job.tool}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">{job.stage}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {job.duration}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={job.progress} className="flex-1 h-1.5" />
                  <span className="text-xs font-mono text-foreground w-10 text-right">
                    {job.progress}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {job.projectName}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Failed Jobs */}
        {failedJobs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-medium text-destructive uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Failed (Last 24h)
            </h4>
            {failedJobs.map(job => (
              <div 
                key={job.id}
                className="p-3 rounded-lg bg-destructive/5 border border-destructive/20"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] h-5 border-destructive/30 text-destructive">
                      {job.tool}
                    </Badge>
                    <span className="text-sm text-destructive">{job.stage}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{job.failedAt}</span>
                </div>
                <p className="text-xs text-destructive/80 bg-destructive/10 p-2 rounded font-mono">
                  {job.error}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {job.projectName}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}