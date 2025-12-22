import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Play, CheckCircle2, XCircle, Loader2, Timer } from "lucide-react";

export type ExecutionState = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

export interface ExecutionTiming {
  startTime: Date | null;
  endTime: Date | null;
  state: ExecutionState;
  progress: number;
}

interface ExecutionStatusTrackerProps {
  timing: ExecutionTiming;
  toolName?: string;
}

export function ExecutionStatusTracker({ timing, toolName }: ExecutionStatusTrackerProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getDuration = () => {
    if (!timing.startTime) return '0s';
    const end = timing.endTime || new Date();
    const diffMs = end.getTime() - timing.startTime.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStateConfig = () => {
    switch (timing.state) {
      case 'idle':
        return {
          icon: <Play className="w-4 h-4" />,
          label: 'Ready',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-border',
        };
      case 'queued':
        return {
          icon: <Clock className="w-4 h-4 animate-pulse" />,
          label: 'Queued',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          label: 'Processing',
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          borderColor: 'border-primary/30',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Completed',
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4" />,
          label: 'Failed',
          color: 'text-destructive',
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/30',
        };
    }
  };

  const stateConfig = getStateConfig();
  const showProgress = timing.state === 'processing' || timing.state === 'queued';

  if (timing.state === 'idle') {
    return null;
  }

  return (
    <Card className={`${stateConfig.bgColor} ${stateConfig.borderColor} border`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className={`flex items-center gap-2 ${stateConfig.color}`}>
            {stateConfig.icon}
            Execution Status
          </span>
          <Badge 
            variant="outline" 
            className={`text-xs ${stateConfig.color} ${stateConfig.borderColor}`}
          >
            {stateConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Progress bar for active states */}
        {showProgress && (
          <div className="space-y-1">
            <Progress value={timing.progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {timing.progress}%
            </p>
          </div>
        )}

        {/* Timing info */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Started</p>
            <p className="text-xs font-mono text-foreground">
              {formatTime(timing.startTime)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className={`text-xs font-mono font-semibold ${stateConfig.color}`}>
              {getDuration()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Ended</p>
            <p className="text-xs font-mono text-foreground">
              {timing.endTime ? formatTime(timing.endTime) : '--:--:--'}
            </p>
          </div>
        </div>

        {/* Tool name if provided */}
        {toolName && (
          <div className="pt-1 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Running: <span className="font-medium text-foreground">{toolName}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
