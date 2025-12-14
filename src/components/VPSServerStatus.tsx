/**
 * VPS Server Status Indicator
 * Shows connection health and FFmpeg availability for VPS rendering
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Server, 
  Film, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Info,
  Loader2
} from 'lucide-react';
import { checkServerHealth, type VPSHealthStatus } from '@/lib/vps-render-service';

interface VPSServerStatusProps {
  className?: string;
}

export function VPSServerStatus({ className }: VPSServerStatusProps) {
  const [health, setHealth] = useState<VPSHealthStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(
    import.meta.env.VITE_VPS_API_URL || import.meta.env.VITE_API_BASE_URL || ''
  );

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkServerHealth();
      setHealth(result);
    } catch (error) {
      setHealth({
        ok: false,
        ffmpeg: 'unavailable',
        mode: 'unknown',
        queueLength: 0,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const getConnectionStatus = () => {
    if (checking) return { icon: Loader2, label: 'Checking...', color: 'text-muted-foreground' };
    if (!health) return { icon: AlertTriangle, label: 'Unknown', color: 'text-amber-500' };
    if (health.ok) return { icon: CheckCircle2, label: 'Connected', color: 'text-green-500' };
    return { icon: XCircle, label: 'Disconnected', color: 'text-destructive' };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">VPS Server Status</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkHealth}
            disabled={checking}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
        </div>
        <CardDescription className="text-muted-foreground">
          Monitor your VPS render server connection and FFmpeg availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API URL Configuration */}
        <div className="space-y-3">
          <Label htmlFor="api-url" className="text-sm font-medium">VPS Server URL</Label>
          <div className="flex gap-2">
            <Input
              id="api-url"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://yourdomain.com"
              className="flex-1"
            />
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => {
                localStorage.setItem('vps_api_url', apiBaseUrl);
              }}
            >
              Save
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-2">
            <p className="font-medium text-foreground">Setup Requirements:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Deploy <code className="bg-muted px-1 rounded">server/api.js</code> to your Hostinger VPS</li>
              <li>Install FFmpeg: <code className="bg-muted px-1 rounded">sudo apt install ffmpeg</code></li>
              <li>Run with PM2: <code className="bg-muted px-1 rounded">pm2 start server/api.js</code></li>
              <li>Configure Nginx to proxy <code className="bg-muted px-1 rounded">/api/*</code> to port 3000</li>
              <li>Enter your VPS domain URL above (e.g., <code className="bg-muted px-1 rounded">https://flowscale.yourdomain.com</code>)</li>
            </ol>
            <p className="text-muted-foreground mt-2">
              <strong>Note:</strong> This is NOT an API key. It's your VPS server URL where the backend is running.
            </p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4">
          {/* Connection Status */}
          <div className={`p-4 rounded-lg border ${
            health?.ok 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-8 h-8 ${status.color} ${checking ? 'animate-spin' : ''}`} />
              <div>
                <p className="text-sm font-medium text-foreground">Connection</p>
                <p className={`text-lg font-bold ${status.color}`}>
                  {status.label}
                </p>
              </div>
            </div>
          </div>

          {/* FFmpeg Status */}
          <div className={`p-4 rounded-lg border ${
            health?.ffmpeg === 'ready' 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <Film className={`w-8 h-8 ${
                health?.ffmpeg === 'ready' ? 'text-green-500' : 'text-amber-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-foreground">FFmpeg</p>
                <p className={`text-lg font-bold ${
                  health?.ffmpeg === 'ready' ? 'text-green-500' : 'text-amber-500'
                }`}>
                  {health?.ffmpeg === 'ready' ? 'Ready' : health?.ffmpeg || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Server Details */}
        {health && (
          <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium text-foreground mb-3">Server Details</p>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mode</span>
                <Badge variant="outline">{health.mode}</Badge>
              </div>
              {health.ffmpegPath && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">FFmpeg Path</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{health.ffmpegPath}</code>
                </div>
              )}
              {health.ffmpegVersion && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">FFmpeg Version</span>
                  <span className="text-foreground">{health.ffmpegVersion}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Queue Length</span>
                <Badge variant={health.queueLength > 0 ? 'secondary' : 'outline'}>
                  {health.queueLength} jobs
                </Badge>
              </div>
            </div>
            {health.error && (
              <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive font-medium">Error</p>
                <p className="text-xs text-destructive/80 mt-1">{health.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Server-Side Rendering</p>
            <p className="text-xs text-muted-foreground">
              All video processing runs on your VPS with native FFmpeg. 
              No browser-side rendering required.
              Videos upload to <code className="bg-muted px-1 rounded">/api/upload</code> and 
              render via <code className="bg-muted px-1 rounded">/api/execute</code>.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
