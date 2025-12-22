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
    edgeFunctions, 
    cloudinaryApi, 
    recommended, 
    loading, 
    refresh 
  } = useRenderBackendStatus();

  // Auto-refresh on mount handled by the hook

  const getHealthStatus = () => {
    if (loading) return { label: 'Detecting...', color: 'text-muted-foreground', variant: 'outline' as const };
    
    if (vpsServer.available) {
      return { label: 'Healthy', color: 'text-green-500', variant: 'default' as const };
    }
    if (edgeFunctions.available) {
      return { label: 'Healthy', color: 'text-green-500', variant: 'default' as const };
    }
    if (cloudinaryApi.available) {
      return { label: 'Degraded', color: 'text-amber-500', variant: 'secondary' as const };
    }
    return { label: 'Offline', color: 'text-destructive', variant: 'destructive' as const };
  };

  const getAverageLatency = () => {
    if (vpsServer.available && vpsServer.latency) return vpsServer.latency;
    if (edgeFunctions.available && edgeFunctions.latency) return edgeFunctions.latency;
    return null;
  };

  const healthStatus = getHealthStatus();
  const latency = getAverageLatency();
  const activeMode = RENDER_MODES.find(m => m.id === recommended) || RENDER_MODES[1];
  const ActiveIcon = activeMode.icon;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              healthStatus.label === 'Healthy' 
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
        <div className="grid grid-cols-3 gap-3">
          {RENDER_MODES.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.id === recommended;
            const isAvailable = 
              (mode.id === 'vps' && vpsServer.available) ||
              (mode.id === 'edge' && edgeFunctions.available) ||
              (mode.id === 'cloud' && cloudinaryApi.available);
            
            return (
              <div
                key={mode.id}
                className={`p-4 rounded-lg border transition-all ${
                  isActive 
                    ? 'border-green-500 bg-green-500/10' 
                    : isAvailable
                    ? 'border-border bg-muted/30'
                    : 'border-border bg-muted/10 opacity-40'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${
                    isActive ? 'text-green-500' : isAvailable ? 'text-muted-foreground' : 'text-muted-foreground/50'
                  }`} />
                  {isActive && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {!isActive && isAvailable && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0">Fallback</Badge>
                  )}
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
        <div className="grid grid-cols-3 gap-4">
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

          {/* Active Path */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Active Path</p>
            <div className="flex items-center gap-2">
              <ActiveIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {loading ? 'Detecting...' : activeMode.label}
              </span>
            </div>
          </div>

          {/* Latency */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Latency</p>
            <span className="text-sm font-medium text-foreground">
              {loading ? '...' : latency ? `${latency}ms` : 'N/A'}
            </span>
          </div>
        </div>

        {/* Backend Details (when VPS is active) */}
        {vpsServer.available && vpsServer.version && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 text-sm">
              <Server className="w-4 h-4 text-green-500" />
              <span className="text-foreground font-medium">VPS Server</span>
              <Badge variant="outline" className="ml-auto text-xs">
                v{vpsServer.version}
              </Badge>
            </div>
          </div>
        )}

        {/* Edge Functions Active */}
        {!vpsServer.available && edgeFunctions.available && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">Edge Functions Active</span>
              <span className="text-xs text-muted-foreground ml-auto">
                Serverless rendering enabled
              </span>
            </div>
          </div>
        )}

        {/* All offline warning */}
        {!loading && !vpsServer.available && !edgeFunctions.available && !cloudinaryApi.available && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="w-4 h-4" />
              <span className="font-medium">No render backends available</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Video rendering features will be limited until a backend becomes available.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
