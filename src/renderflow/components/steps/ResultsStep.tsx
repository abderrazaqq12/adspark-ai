/**
 * RenderFlow Step 5: Results
 * Download outputs and review completed videos
 * Shows thumbnail previews with video metadata
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RenderFlowJob } from '../../api';
import { 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Clock,
  FileVideo,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';

interface ResultsStepProps {
  jobs: RenderFlowJob[];
  onReset: () => void;
}

export function ResultsStep({ jobs, onReset }: ResultsStepProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  
  const successJobs = jobs.filter(j => j.state === 'done');
  const failedJobs = jobs.filter(j => j.state === 'failed');

  const handleDownloadAll = () => {
    successJobs.forEach((job) => {
      if (job.output?.output_url) {
        window.open(job.output.output_url, '_blank');
      }
    });
  };

  return (
    <Card className="border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="w-5 h-5" />
          Step 5: Results
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Summary Stats */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="font-medium">{successJobs.length} Completed</span>
          </div>
          {failedJobs.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="font-medium">{failedJobs.length} Failed</span>
            </div>
          )}
          <div className="ml-auto">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadAll}
              disabled={successJobs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>
        </div>

        {/* Results Grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-4">
            {jobs.map((job, index) => (
              <div
                key={job.id}
                className={`border rounded-lg overflow-hidden ${
                  job.state === 'done' 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-destructive/30 bg-destructive/5'
                }`}
              >
                {/* Video Preview / Thumbnail */}
                <div className="aspect-video bg-black relative">
                  {job.state === 'done' && job.output?.output_url ? (
                    playingId === job.id ? (
                      <video
                        src={job.output.output_url}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        onEnded={() => setPlayingId(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setPlayingId(job.id)}
                        className="w-full h-full flex items-center justify-center group hover:bg-white/5 transition-colors"
                      >
                        <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center group-hover:bg-primary transition-colors">
                          <Play className="w-8 h-8 text-primary-foreground ml-1" />
                        </div>
                        <Badge className="absolute top-2 left-2 bg-black/60 text-white">
                          Variation {index + 1}
                        </Badge>
                        {job.output.duration_ms && (
                          <Badge className="absolute bottom-2 right-2 bg-black/60 text-white font-mono text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {(job.output.duration_ms / 1000).toFixed(1)}s
                          </Badge>
                        )}
                      </button>
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-destructive/80">
                      <AlertCircle className="w-12 h-12 mb-2" />
                      <span className="text-sm">Render Failed</span>
                    </div>
                  )}
                </div>

                {/* Info & Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[150px]">
                      {job.id}
                    </span>
                    <Badge variant={job.state === 'done' ? 'default' : 'destructive'} className="text-xs">
                      {job.state === 'done' ? 'Success' : 'Failed'}
                    </Badge>
                  </div>

                  {/* Metadata */}
                  {job.state === 'done' && job.output && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileVideo className="w-3 h-3" />
                        {(job.output.file_size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}

                  {/* Error Message */}
                  {job.error && (
                    <div className="text-xs text-destructive font-mono truncate">
                      {job.error.message}
                    </div>
                  )}

                  {/* Download Button */}
                  {job.state === 'done' && job.output && (
                    <a
                      href={job.output.output_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Download className="w-3 h-3" />
                      Download Video
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Reset Button */}
        <div className="pt-4 border-t border-border">
          <Button variant="outline" onClick={onReset} className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Start New Pipeline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
