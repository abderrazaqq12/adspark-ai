/**
 * System Status Bar - Compact top status bar (SECTION 1)
 * Shows VPS, FFmpeg, GPU, Queue, and Storage status
 * READ-ONLY - No buttons, status only
 * 
 * SEVERITY AGGREGATION:
 * - Shows aggregated system health (Critical > Warning > Healthy)
 * - Critical (red): VPS offline, FFmpeg unavailable, repeated failures
 * - Warning (yellow): Drive not linked, queue blocked, cost tracking inactive
 * - Healthy (green): All systems operational
 * 
 * NOTIFICATIONS:
 * - Browser notifications for critical issues
 * - Sound alerts for new critical signals
 */

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Server,
  Film,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Loader2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Bell,
  BellOff
} from 'lucide-react';
import { useRenderBackendStatus } from '@/hooks/useRenderBackendStatus';
import { useDashboardSeverity, SeverityLevel } from '@/hooks/useDashboardSeverity';
import { useCriticalNotifications } from '@/hooks/useCriticalNotifications';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QueueStats {
  active: number;
  waiting: number;
  failed24h: number;
}

interface StorageStats {
  used: string;
  remaining: string;
  percentage: number;
  isFull: boolean;
}

export function SystemStatusBar() {
  const backendStatus = useRenderBackendStatus();
  const { addSignal, removeSignal, getAggregatedSeverity, getCriticalSignals, getWarningSignals } = useDashboardSeverity();
  const [queueStats, setQueueStats] = useState<QueueStats>({ active: 0, waiting: 0, failed24h: 0 });
  const [storage, setStorage] = useState<StorageStats>({ used: '0 GB', remaining: '∞', percentage: 0, isFull: false });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const isRealtimeConnected = false; // Realtime disabled in VPS lockdown mode


  // Initialize critical notifications with sound and browser alerts
  const { notificationPermission, requestPermission } = useCriticalNotifications({
    soundEnabled: notificationsEnabled,
    browserNotificationsEnabled: notificationsEnabled
  });

  // Report severity signals
  useEffect(() => {
    // VPS Status
    if (!backendStatus.loading) {
      if (!backendStatus.vpsServer.available) {
        addSignal({
          id: 'vps-offline',
          component: 'SystemStatusBar',
          level: 'critical',
          message: 'VPS server is offline',
          blocksOutput: true
        });
      } else {
        removeSignal('vps-offline');
      }
    }

    // FFmpeg availability (derived from VPS)
    if (!backendStatus.loading && !backendStatus.vpsServer.available) {
      addSignal({
        id: 'ffmpeg-unavailable',
        component: 'SystemStatusBar',
        level: 'critical',
        message: 'FFmpeg is unavailable',
        blocksOutput: true
      });
    } else {
      removeSignal('ffmpeg-unavailable');
    }
  }, [backendStatus.loading, backendStatus.vpsServer.available, addSignal, removeSignal]);

  // Report queue failures
  useEffect(() => {
    if (queueStats.failed24h > 2) {
      addSignal({
        id: 'repeated-failures',
        component: 'SystemStatusBar',
        level: 'critical',
        message: `${queueStats.failed24h} jobs failed in last 24h`,
        blocksOutput: false
      });
    } else if (queueStats.failed24h > 0) {
      addSignal({
        id: 'repeated-failures',
        component: 'SystemStatusBar',
        level: 'warning',
        message: `${queueStats.failed24h} job(s) failed in last 24h`,
        blocksOutput: false
      });
    } else {
      removeSignal('repeated-failures');
    }
  }, [queueStats.failed24h, addSignal, removeSignal]);

  // Report storage issues
  useEffect(() => {
    if (storage.isFull) {
      addSignal({
        id: 'storage-full',
        component: 'SystemStatusBar',
        level: 'critical',
        message: 'Storage is full or unreachable',
        blocksOutput: true
      });
    } else {
      removeSignal('storage-full');
    }
  }, [storage.isFull, addSignal, removeSignal]);

  useEffect(() => {
    // Update queue stats from backend
    if (backendStatus.queue) {
      setQueueStats({
        active: backendStatus.queue.active,
        waiting: backendStatus.queue.waiting,
        failed24h: backendStatus.queue.failed24h,
      });
    }

    // Update storage from backend
    if (backendStatus.storage && backendStatus.storage.available) {
      setStorage({
        used: backendStatus.storage.used || '0 GB',
        remaining: backendStatus.storage.free || '∞',
        percentage: backendStatus.storage.usagePercent || 0,
        isFull: (backendStatus.storage.usagePercent || 0) >= 95
      });
    }
  }, [backendStatus]);

  const aggregatedSeverity = getAggregatedSeverity();
  const criticalSignals = getCriticalSignals();
  const warningSignals = getWarningSignals();

  const SeverityIndicator = ({ severity }: { severity: SeverityLevel }) => {
    const config = {
      healthy: {
        icon: CheckCircle2,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        label: 'Healthy'
      },
      warning: {
        icon: AlertTriangle,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        label: 'Warning'
      },
      critical: {
        icon: XCircle,
        color: 'text-destructive',
        bg: 'bg-destructive/10',
        border: 'border-destructive/30',
        label: 'Critical'
      }
    };

    const { icon: Icon, color, bg, border, label } = config[severity];

    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md", bg, border, "border")}>
        <Icon className={cn("w-4 h-4", color)} />
        <span className={cn("text-xs font-medium", color)}>{label}</span>
      </div>
    );
  };

  const StatusItem = ({
    icon: Icon,
    label,
    status,
    value,
  }: {
    icon: any;
    label: string;
    status: 'online' | 'offline' | 'warning';
    value?: string;
  }) => (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "w-2 h-2 rounded-full",
          status === 'online' && "bg-green-500",
          status === 'offline' && "bg-destructive",
          status === 'warning' && "bg-amber-500"
        )} />
        <span className={cn(
          "text-xs font-medium",
          status === 'online' && "text-green-600 dark:text-green-400",
          status === 'offline' && "text-destructive",
          status === 'warning' && "text-amber-600 dark:text-amber-400"
        )}>
          {value || (status === 'online' ? 'Yes' : 'No')}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Aggregated Severity Banner - Only shows if not healthy */}
      {aggregatedSeverity !== 'healthy' && (
        <div className={cn(
          "rounded-lg border p-3",
          aggregatedSeverity === 'critical' && "bg-destructive/5 border-destructive/30",
          aggregatedSeverity === 'warning' && "bg-amber-500/5 border-amber-500/30"
        )}>
          <div className="flex items-start gap-3">
            {aggregatedSeverity === 'critical' ? (
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium",
                aggregatedSeverity === 'critical' && "text-destructive",
                aggregatedSeverity === 'warning' && "text-amber-600 dark:text-amber-400"
              )}>
                {aggregatedSeverity === 'critical'
                  ? `${criticalSignals.length} Critical Issue${criticalSignals.length > 1 ? 's' : ''}`
                  : `${warningSignals.length} Warning${warningSignals.length > 1 ? 's' : ''}`
                }
              </p>
              <div className="mt-1 space-y-1">
                {criticalSignals.map(signal => (
                  <p key={signal.id} className="text-xs text-destructive/80 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {signal.message}
                    {signal.blocksOutput && (
                      <Badge variant="outline" className="ml-1 text-[9px] h-4 border-destructive/30 text-destructive">
                        BLOCKS OUTPUT
                      </Badge>
                    )}
                  </p>
                ))}
                {aggregatedSeverity === 'warning' && warningSignals.map(signal => (
                  <p key={signal.id} className="text-xs text-amber-600/80 dark:text-amber-400/80 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                    {signal.message}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Status Bar */}
      <div className={cn(
        "rounded-lg border backdrop-blur",
        aggregatedSeverity === 'healthy' && "border-border/50 bg-muted/30",
        aggregatedSeverity === 'warning' && "border-amber-500/30 bg-amber-500/5",
        aggregatedSeverity === 'critical' && "border-destructive/30 bg-destructive/5"
      )}>
        <div className="flex flex-wrap items-center divide-x divide-border/50">
          {/* Aggregated Status Indicator */}
          <div className="px-3 py-1.5">
            <SeverityIndicator severity={aggregatedSeverity} />
          </div>

          {/* Notification toggle */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (!notificationsEnabled && notificationPermission === 'default') {
                      requestPermission();
                    }
                    setNotificationsEnabled(!notificationsEnabled);
                  }}
                  className={cn(
                    "px-3 py-1.5 hover:bg-muted/50 transition-colors",
                    notificationsEnabled ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {notificationsEnabled ? (
                    <Bell className="w-3.5 h-3.5" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {notificationsEnabled
                    ? 'Critical alerts enabled (sound + browser)'
                    : 'Critical alerts disabled'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Realtime indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="px-3 py-1.5">
                  {isRealtimeConnected ? (
                    <Wifi className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">
                  {isRealtimeConnected ? 'Realtime connected' : 'Realtime disconnected'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* VPS Status */}
          {backendStatus.loading ? (
            <div className="px-3 py-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <StatusItem
              icon={Server}
              label="VPS"
              status={backendStatus.vpsServer.available ? 'online' : 'offline'}
              value={backendStatus.vpsServer.available ? 'Online' : 'Offline'}
            />
          )}

          {/* FFmpeg */}
          <StatusItem
            icon={Film}
            label="FFmpeg"
            status={backendStatus.ffmpeg.available ? 'online' : 'offline'}
            value={backendStatus.ffmpeg.available ?
              (backendStatus.ffmpeg.version || 'Yes') :
              'No'}
          />

          {/* GPU */}
          <StatusItem
            icon={Cpu}
            label="GPU"
            status={backendStatus.gpu.available ? 'online' : 'warning'}
            value={backendStatus.gpu.available ?
              (backendStatus.gpu.count && backendStatus.gpu.count > 0 ?
                `${backendStatus.gpu.gpus?.[0]?.name?.substring(0, 20) || backendStatus.gpu.vendor}` :
                'Yes') :
              'No GPU'}
          />

          {/* Queue Status */}
          <div className="flex items-center gap-3 px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Queue:</span>
            <Badge variant="outline" className={cn(
              "h-5 px-1.5 text-[10px]",
              queueStats.active > 0
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border bg-muted/30"
            )}>
              {queueStats.active} Active
            </Badge>
            <Badge variant="outline" className={cn(
              "h-5 px-1.5 text-[10px]",
              queueStats.waiting > 0
                ? "border-amber-500/30 bg-amber-500/5 text-amber-600"
                : "border-border bg-muted/30"
            )}>
              {queueStats.waiting} Waiting
            </Badge>
            {queueStats.failed24h > 0 && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-destructive/30 bg-destructive/5 text-destructive">
                {queueStats.failed24h} Failed
              </Badge>
            )}
          </div>

          {/* Storage */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <HardDrive className={cn(
              "w-3.5 h-3.5",
              storage.isFull ? "text-destructive" : "text-muted-foreground"
            )} />
            <span className="text-xs text-muted-foreground">Storage:</span>
            <span className={cn(
              "text-xs font-medium",
              storage.isFull ? "text-destructive" : "text-foreground"
            )}>
              {storage.used}
            </span>
            <span className="text-xs text-muted-foreground">/ {storage.remaining}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
