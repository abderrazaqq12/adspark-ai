import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { usePipelineJobs } from '@/hooks/usePipelineJobs';

interface PipelineJobsTrackerProps {
  projectId?: string;
}

const STAGE_ICONS: Record<string, any> = {
  product_input: '📦',
  product_content: '💡',
  image_generation: '🖼️',
  landing_page: '📄',
  video_script: '🎙️',
  scene_builder: '🎬',
  video_generation: '📹',
  assembly: '🔧',
  export: '📤',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-500',
  processing: 'bg-blue-500 animate-pulse',
  completed: 'bg-emerald-500',
  failed: 'bg-destructive',
  cancelled: 'bg-amber-500',
};

export function PipelineJobsTracker({ projectId }: PipelineJobsTrackerProps) {
  const { jobs, currentJob, isLoading, cancelJob, retryJob, getStageStatus } = usePipelineJobs(projectId);

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading pipeline status...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0 && !projectId) {
    return null;
  }

  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const totalJobs = jobs.length;
  const overallProgress = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
  const totalCost = jobs.reduce((sum, j) => sum + (j.actual_cost || 0), 0);

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Pipeline Jobs
          </div>
          {totalCost > 0 && (
            <Badge variant="outline" className="font-mono">
              ${totalCost.toFixed(3)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall Progress */}
        {totalJobs > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{completedJobs} of {totalJobs} stages</span>
              <span>{overallProgress.toFixed(0)}%</span>
            </div>
            <Progress value={overallProgress} className="h-1.5" />
          </div>
        )}

        {/* Current Job */}
        {currentJob && (
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {STAGE_ICONS[currentJob.stage_name] || '⚙️'} {currentJob.stage_name.replace('_', ' ')}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelJob(currentJob.id)}
                className="h-6 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>
            {currentJob.progress > 0 && (
              <Progress value={currentJob.progress} className="h-1 mt-2" />
            )}
          </div>
        )}

        {/* Recent Jobs */}
        {jobs.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {jobs.slice(0, 5).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-2 rounded bg-muted/30 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[job.status]}`} />
                  <span>{STAGE_ICONS[job.stage_name] || '⚙️'}</span>
                  <span className="text-muted-foreground">
                    Stage {job.stage_number}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === 'completed' && (
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                  )}
                  {job.status === 'failed' && (
                    <>
                      <XCircle className="h-3 w-3 text-destructive" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryJob(job.id)}
                        className="h-5 px-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {job.actual_cost > 0 && (
                    <span className="font-mono text-muted-foreground">
                      ${job.actual_cost.toFixed(3)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {jobs.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No pipeline jobs yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
