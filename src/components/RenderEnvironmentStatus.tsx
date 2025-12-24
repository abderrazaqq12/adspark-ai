/**
 * Auto-Detected Render Environment Status
 * Read-only panel that reflects backend truth - no user configuration
 */

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Server,
  Cloud,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Activity
} from 'lucide-react';
import { useRenderBackendStatus, type RenderBackendStatus } from '@/hooks/useRenderBackendStatus';

interface RenderModeConfig {
  id: RenderBackendStatus['recommended'];
  label: string;
  description: string;
  icon: React.ElementType;
}

const RENDER_MODES: RenderModeConfig[] = [
  {
    id: 'vps',
    label: 'Self-Hosted VPS',
    description: 'Native FFmpeg rendering on your server',
    icon: Server
  },
  {
    id: 'edge',
    label: 'Edge Functions',
    description: 'Serverless rendering via cloud functions',
    icon: Zap
  },
  {
    id: 'cloud',
    label: 'Cloud APIs',
    description: 'External cloud rendering services',
    icon: Cloud
  },
];

export function RenderEnvironmentStatus() {
  const {
    vpsServer,
    ffmpeg,
    gpu,
    storage,
    deployment,
    loading,
    refresh
  } = useRenderBackendStatus();

  // Logic to determine active mode - in VPS Lockdown, it's always VPS if available
  const recommended = vpsServer.available ? 'vps' : 'unknown';

  // Auto-refresh on mount handled by the hook

  const getHealthStatus = () => {
    if (loading) return { label: 'Detecting...', color: 'text-muted-foreground', variant: 'outline' as const };

    if (vpsServer.available && ffmpeg.available) {
      return { label: 'Healthy', color: 'text-green-500', variant: 'default' as const };
    }
    if (vpsServer.available) {
      return { label: 'Degraded', color: 'text-amber-500', variant: 'secondary' as const };
    }
    return { label: 'Offline', color: 'text-destructive', variant: 'destructive' as const };
  };

  const getAverageLatency = () => {
    if (vpsServer.available && vpsServer.latency) return vpsServer.latency;
    return null;
  };

  const healthStatus = getHealthStatus();
  const latency = getAverageLatency();
  const activeMode = RENDER_MODES.find(m => m.id === recommended) || RENDER_MODES[0];
  const ActiveIcon = activeMode.icon;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${healthStatus.label === 'Healthy'
                ? 'bg-green-500/20'
                : healthStatus.label === 'Degraded'
                  ? 'bg-amber-500/20'
                  : 'bg-muted'
              }`}>
              <Activity className={`w-5 h-5 ${healthStatus.color}`} />
            </div>
            <div>
              <CardTitle className="text-lg">Render Environment</CardTitle>
              <CardDescription>Automatically detected and managed by the system</CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Render Mode */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {RENDER_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.id === recommended;
            const isAvailable = (mode.id === 'vps' && vpsServer.available);

            return (
              <div
                key={mode.id}
                className={`p-4 rounded-lg border transition-all ${isActive
                    ? 'border-green-500 bg-green-500/10'
                    : isAvailable
                      ? 'border-border bg-muted/30'
                      : 'border-border bg-muted/10 opacity-40'
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-green-500' : isAvailable ? 'text-muted-foreground' : 'text-muted-foreground/50'
                    }`} />
                  {isActive && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {mode.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{mode.description}</p>
              </div>
            );
          })}
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Health Status */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : healthStatus.label === 'Healthy' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : healthStatus.label === 'Degraded' ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive" />
              )}
              <span className={`text-sm font-medium ${healthStatus.color}`}>
                {healthStatus.label}
              </span>
            </div>
          </div>

          {/* Infrastructure */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Infrastructure</p>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {loading ? 'Detecting...' : deployment.environment.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Storage */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Storage</p>
            <span className="text-sm font-medium text-foreground">
              {loading ? '...' : storage.free || 'N/A'} free
            </span>
          </div>
        </div>

        {/* Backend Details (when VPS is active) */}
        {vpsServer.available && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Server className="w-4 h-4 text-green-500" />
                <span className="text-foreground font-medium">VPS Operational</span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {vpsServer.uptime || 'Online'}
                </Badge>
              </div>
              <div className="flex gap-4 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                <span>FFmpeg: {ffmpeg.available ? 'OK' : 'MISSING'}</span>
                <span>GPU: {gpu.available ? gpu.vendor : 'NONE'}</span>
                <span>Disk: {storage.usagePercent}% used</span>
              </div>
            </div>
          </div>
        )}

        {/* All offline warning */}
        {!loading && !vpsServer.available && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">VPS Backend Offline</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Connect to your VPS to enable rendering features.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
