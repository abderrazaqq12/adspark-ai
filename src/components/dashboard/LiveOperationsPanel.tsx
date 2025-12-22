/**
 * Live Operations Panel - Real-time job tracking
 * Shows active and failed jobs from pipeline_jobs table
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  AlertTriangle, 
  Clock, 
  Server,
  Cpu,
  Eye,
  RotateCcw,
  Inbox
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

interface ActiveJob {
  id: string;
  projectName: string;
  tool: string;
  stageName: string;
  progress: number;
  engine: string;
  startedAt: string;
}

interface FailedJob {
  id: string;
  projectId: string;
  projectName: string;
  tool: string;
  errorMessage: string;
  failedAt: string;
}

export function LiveOperationsPanel() {
  const navigate = useNavigate();
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('dashboard-pipeline-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_jobs',
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchJobs = async () => {
    try {
      // Fetch active jobs
      const { data: activeData } = await supabase
        .from('pipeline_jobs')
        .select(`
          id,
          stage_name,
          progress,
          started_at,
          input_data,
          project_id,
          projects!pipeline_jobs_project_id_fkey (name)
        `)
        .eq('status', 'processing')
        .order('started_at', { ascending: false })
        .limit(10);

      if (activeData) {
        setActiveJobs(activeData.map(job => ({
          id: job.id,
          projectName: (job.projects as any)?.name || 'Unknown Project',
          tool: extractTool(job.stage_name),
          stageName: formatStageName(job.stage_name),
          progress: job.progress || 0,
          engine: extractEngine(job.input_data),
          startedAt: job.started_at || '',
        })));
      }

      // Fetch failed jobs (last 24h)
      const { data: failedData } = await supabase
        .from('pipeline_jobs')
        .select(`
          id,
          stage_name,
          error_message,
          completed_at,
          project_id,
          projects!pipeline_jobs_project_id_fkey (name)
        `)
        .eq('status', 'failed')
        .gte('completed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false })
        .limit(10);

      if (failedData) {
        setFailedJobs(failedData.map(job => ({
          id: job.id,
          projectId: job.project_id || '',
          projectName: (job.projects as any)?.name || 'Unknown Project',
          tool: extractTool(job.stage_name),
          errorMessage: job.error_message || 'Unknown error',
          failedAt: job.completed_at || '',
        })));
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractTool = (stageName: string): string => {
    if (stageName.includes('replicator')) return 'Replicator';
    if (stageName.includes('creative_scale')) return 'Creative Scale';
    if (stageName.includes('studio')) return 'Studio';
    if (stageName.includes('quick')) return 'Quick Commerce';
    return 'Pipeline';
  };

  const formatStageName = (stageName: string): string => {
    return stageName
      .replace(/_/g, ' ')
      .replace(/v\d+/gi, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  };

  const extractEngine = (inputData: any): string => {
    if (!inputData) return 'VPS FFmpeg';
    if (inputData.vpsFirst || inputData.useVPS) return 'VPS FFmpeg';
    if (inputData.engine) return inputData.engine;
    return 'AI Fallback';
  };

  const handleRetry = async (jobId: string) => {
    // TODO: Implement retry logic
    console.log('Retry job:', jobId);
  };

  const isIdle = activeJobs.length === 0 && failedJobs.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Live Operations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Idle State */}
        {isIdle && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">System Idle</p>
            <p className="text-sm">No active jobs running</p>
          </div>
        )}

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Active Jobs ({activeJobs.length})
            </h4>
            <div className="space-y-3">
              {activeJobs.map(job => (
                <div 
                  key={job.id} 
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{job.projectName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{job.tool}</Badge>
                        <span className="text-xs text-muted-foreground">{job.stageName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline" 
                        className="border-primary/30 text-primary bg-primary/5"
                      >
                        <Server className="w-3 h-3 mr-1" />
                        {job.engine}
                      </Badge>
                      {job.startedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={job.progress} className="flex-1 h-2" />
                    <span className="text-xs font-medium text-foreground w-12 text-right">
                      {job.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Jobs */}
        {failedJobs.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-destructive mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Failed Jobs (Last 24h)
            </h4>
            <div className="space-y-2">
              {failedJobs.map(job => (
                <div 
                  key={job.id} 
                  className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{job.projectName}</p>
                      <Badge variant="outline" className="text-xs mt-1">{job.tool}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/projects?debug=${job.id}`)}
                        className="text-xs h-7"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Debug
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRetry(job.id)}
                        className="text-xs h-7"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-destructive font-mono bg-destructive/10 p-2 rounded">
                    {job.errorMessage}
                  </p>
                  {job.failedAt && (
                    <p className="text-xs text-muted-foreground">
                      Failed {formatDistanceToNow(new Date(job.failedAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
