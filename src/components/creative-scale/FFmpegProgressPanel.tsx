/**
 * FFmpeg Progress Panel
 * Shows real-time progress during video rendering
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Terminal 
} from 'lucide-react';
import type { RouterEvent } from '@/lib/creative-scale/router-types';
import { checkFFmpegEnvironment } from '@/lib/creative-scale/ffmpeg-adapter';

interface FFmpegProgressPanelProps {
  events: RouterEvent[];
  isActive: boolean;
}

export function FFmpegProgressPanel({ events, isActive }: FFmpegProgressPanelProps) {
  const [envReady, setEnvReady] = useState<boolean | null>(null);
  const [envReason, setEnvReason] = useState<string | null>(null);

  // Check environment on mount
  useEffect(() => {
    const check = checkFFmpegEnvironment();
    setEnvReady(check.ready);
    setEnvReason(check.reason || null);
  }, []);

  // Extract progress from events
  const progressEvents = events.filter(e => e.event_type === 'progress');
  const lastProgress = progressEvents.length > 0 
    ? (progressEvents[progressEvents.length - 1].payload.progress as number) * 100
    : 0;

  // Extract logs
  const logEvents = events.filter(e => e.event_type === 'log');
  const logs = logEvents.map(e => e.payload.message as string).slice(-10);

  // Get current state
  const stateEvents = events.filter(e => e.event_type === 'state_change');
  const currentState = stateEvents.length > 0
    ? stateEvents[stateEvents.length - 1].payload.to as string
    : 'idle';

  // Check for completion or failure
  const isComplete = events.some(e => e.event_type === 'execution_complete');
  const isFailed = events.some(e => e.event_type === 'execution_failed');

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            FFmpeg WASM Engine
          </div>
          {envReady === null && (
            <Badge variant="outline">Checking...</Badge>
          )}
          {envReady === true && (
            <Badge variant="default" className="bg-green-500">Ready</Badge>
          )}
          {envReady === false && (
            <Badge variant="destructive">Unavailable</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Warning */}
        {envReady === false && envReason && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span>{envReason}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Video generation will fall back to returning your execution plan for manual editing.
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {isActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {!isComplete && !isFailed && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isComplete && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                {isFailed && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                <span className="capitalize">{currentState.replace('_', ' ')}</span>
              </span>
              <span className="text-muted-foreground">{Math.round(lastProgress)}%</span>
            </div>
            <Progress value={lastProgress} className="h-2" />
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Terminal className="w-3 h-3" />
              <span>Processing Log</span>
            </div>
            <ScrollArea className="h-[100px] rounded bg-muted/30 p-2">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, idx) => (
                  <div key={idx} className="text-muted-foreground">
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Status Messages */}
        {isComplete && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Video rendered successfully!</span>
            </div>
          </div>
        )}

        {isFailed && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Rendering failed - artifacts preserved</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
