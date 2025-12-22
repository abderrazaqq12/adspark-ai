/**
 * RENDER ENVIRONMENT STATUS
 * 
 * Hardware-aware status display.
 * Shows REAL backend state, not assumptions.
 * NO manual configuration allowed.
 */

import { useRenderEnvironment } from '@/hooks/useRenderEnvironment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RenderEnvironmentStatusProps {
  compact?: boolean;
  className?: string;
}

export function RenderEnvironmentStatus({ compact = false, className }: RenderEnvironmentStatusProps) {
  const { 
    vps, 
    loading, 
    refresh, 
    isVPSReady, 
    hasGPU,
    lastChecked 
  } = useRenderEnvironment();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2", className)}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : isVPSReady ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-xs text-success">VPS Online</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-destructive">VPS Offline</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>FFmpeg: {vps.ffmpeg.ready ? 'Ready' : 'Unavailable'}</p>
              {vps.ffmpeg.version && <p>Version: {vps.ffmpeg.version}</p>}
              <p>Queue: {vps.queue.length} jobs</p>
              {hasGPU && <p>GPU: {vps.hardware.gpuType || 'Available'}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn("bg-gradient-card border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            Render Environment
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          {loading ? (
            <Badge variant="outline" className="gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Detecting...
            </Badge>
          ) : isVPSReady ? (
            <Badge className="bg-success/20 text-success border-success/30 gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              VPS Online (Native FFmpeg)
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1.5">
              <XCircle className="w-3 h-3" />
              VPS Unavailable
            </Badge>
          )}
        </div>

        {/* Hardware Info */}
        {isVPSReady && (
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cpu className="w-3.5 h-3.5" />
              <span>{vps.hardware.cpuCores} CPU Cores</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <HardDrive className="w-3.5 h-3.5" />
              <span>{Math.round(vps.hardware.ramMB / 1024)}GB RAM</span>
            </div>
            {hasGPU && (
              <div className="flex items-center gap-2 text-primary col-span-2">
                <Zap className="w-3.5 h-3.5" />
                <span>
                  GPU: {vps.hardware.nvencAvailable ? 'NVENC' : 'VAAPI'} Acceleration
                </span>
              </div>
            )}
          </div>
        )}

        {/* Queue Status */}
        {isVPSReady && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="w-3.5 h-3.5" />
              <span>Queue Depth</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {vps.queue.length} jobs
            </Badge>
          </div>
        )}

        {/* Latency */}
        {vps.latencyMs && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Latency</span>
            <span className={cn(
              vps.latencyMs < 100 ? "text-success" :
              vps.latencyMs < 500 ? "text-warning" : "text-destructive"
            )}>
              {vps.latencyMs}ms
            </span>
          </div>
        )}

        {/* FFmpeg Version */}
        {vps.ffmpeg.version && (
          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border">
            FFmpeg {vps.ffmpeg.version}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
