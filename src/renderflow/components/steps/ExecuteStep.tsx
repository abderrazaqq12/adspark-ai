/**
 * RenderFlow Step 4: Execute
 * Real-time polling from backend - NO fake progress
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { JobStatusBadge } from '../JobStatusBadge';
import { RenderFlowJob } from '../../api';
import { Play, AlertCircle, CheckCircle, Download, RotateCcw, Loader2 } from 'lucide-react';

interface ExecuteStepProps {
  jobs: RenderFlowJob[];
  isPolling: boolean;
  onReset: () => void;
}

export function ExecuteStep({ jobs, isPolling, onReset }: ExecuteStepProps) {
  const allDone = jobs.length > 0 && jobs.every(j => j.state === 'done' || j.state === 'failed');
  const anyFailed = jobs.some(j => j.state === 'failed');
  const successCount = jobs.filter(j => j.state === 'done').length;
  const failedCount = jobs.filter(j => j.state === 'failed').length;

  // Calculate overall progress from API states only
  const overallProgress = jobs.length > 0 
    ? Math.round(jobs.reduce((sum, j) => sum + j.progress_pct, 0) / jobs.length)
    : 0;

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="w-5 h-5" />
          Step 4: Execute
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            {isPolling && <Loader2 className="w-3 h-3 animate-spin" />}
            {allDone ? 'Execution Complete' : 'Polling Backend (1000ms)'}
          </div>
          <span className="font-mono text-sm">{overallProgress}%</span>
        </div>

        {/* Overall Progress Bar */}
        <Progress value={overallProgress} className="h-2" />

        {/* Job List - Direct from API */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {jobs.map((job) => (
            <div 
              key={job.id} 
              className={`p-3 border rounded space-y-2 ${
                job.state === 'failed' 
                  ? 'border-destructive/50 bg-destructive/5' 
                  : job.state === 'done' 
                    ? 'border-green-500/50 bg-green-500/5' 
                    : 'border-border bg-muted/30'
              }`}
            >
              {/* Job Header */}
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs truncate max-w-[180px]">{job.id}</span>
                <JobStatusBadge state={job.state} />
              </div>

              {/* Job Progress */}
              <div className="flex items-center gap-2">
                <Progress value={job.progress_pct} className="h-1.5 flex-1" />
                <span className="text-xs font-mono w-10 text-right">{job.progress_pct}%</span>
              </div>

              {/* Error Display - Verbatim from backend */}
              {job.error && (
                <div className="text-xs text-destructive font-mono flex items-start gap-1.5 mt-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{job.error.code}: {job.error.message}</span>
                </div>
              )}

              {/* Download Link - Only when state === done */}
              {job.state === 'done' && job.output && (
                <a
                  href={job.output.output_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
                >
                  <Download className="w-3 h-3" />
                  Download ({(job.output.file_size / 1024 / 1024).toFixed(2)} MB)
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Completion Summary */}
        {allDone && (
          <div className={`p-4 rounded border text-center ${
            anyFailed 
              ? 'bg-destructive/10 border-destructive/30' 
              : 'bg-green-500/10 border-green-500/30'
          }`}>
            <div className="flex items-center justify-center gap-2 mb-2">
              {anyFailed ? (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span className="text-sm font-medium">Batch completed with errors</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">All jobs completed</span>
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {successCount} succeeded, {failedCount} failed
            </div>
          </div>
        )}

        {/* Polling Notice */}
        {!allDone && (
          <p className="text-xs text-muted-foreground text-center">
            Do not close window. Progress updates from backend only.
          </p>
        )}

        {/* Reset Button */}
        {allDone && (
          <Button variant="outline" onClick={onReset} className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Start New Pipeline
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
