/**
 * VPS Server Status Indicator
 * Shows connection health and FFmpeg availability for VPS rendering
 * Server-only mode - no browser FFmpeg
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
  Loader2,
  ExternalLink
} from 'lucide-react';
import { checkServerHealth, type VPSHealthStatus } from '@/lib/vps-render-service';

interface VPSServerStatusProps {
  className?: string;
}

export function VPSServerStatus({ className }: VPSServerStatusProps) {
  const [health, setHealth] = useState<VPSHealthStatus | null>(null);
  const [checking, setChecking] = useState(false);
  
  // In production on flowscale.cloud, always use relative paths
  const isProduction = typeof window !== 'undefined' && window.location.hostname === 'flowscale.cloud';
  
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    if (isProduction) return ''; // Production uses relative paths
    return localStorage.getItem('vps_api_url') || 
           import.meta.env.VITE_VPS_API_URL || 
           import.meta.env.VITE_API_BASE_URL || 
           '';
  });
  const [saved, setSaved] = useState(false);

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

  const handleSaveUrl = () => {
    localStorage.setItem('vps_api_url', apiBaseUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Re-check health with new URL
    checkHealth();
  };

  const getConnectionStatus = () => {
    if (checking) return { icon: Loader2, label: 'Checking...', color: 'text-muted-foreground' };
    if (!health) return { icon: AlertTriangle, label: 'Unknown', color: 'text-amber-500' };
    if (health.ok) return { icon: CheckCircle2, label: 'Connected', color: 'text-green-500' };
    return { icon: XCircle, label: 'Disconnected', color: 'text-destructive' };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  // Check if error indicates nginx misconfiguration
  const isNginxError = health?.error?.includes('Nginx') || health?.error?.includes('non-JSON');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">VPS Render Gateway</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Server-Only</Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkHealth}
              disabled={checking}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
              Check
            </Button>
          </div>
        </div>
        <CardDescription className="text-muted-foreground">
          All video rendering runs on your VPS with native FFmpeg. No browser-side rendering.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API URL Configuration - Only show in dev/testing */}
        {!isProduction && (
          <div className="space-y-3">
            <Label htmlFor="api-url" className="text-sm font-medium">VPS Server URL (Dev/Testing)</Label>
            <div className="flex gap-2">
              <Input
                id="api-url"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="Leave empty for relative paths"
                className="flex-1 font-mono text-sm"
              />
              <Button 
                variant={saved ? "default" : "secondary"}
                size="sm"
                onClick={handleSaveUrl}
              >
                {saved ? <CheckCircle2 className="w-4 h-4" /> : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave empty to use relative paths (/api/*). Only set if testing against external VPS.
            </p>
          </div>
        )}

        {/* Production Mode Notice */}
        {isProduction && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4 inline mr-2" />
              Production mode: Using relative paths (/api/*)
            </p>
          </div>
        )}
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
                <p className="text-sm font-medium text-foreground">API Gateway</p>
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
                  {health?.ffmpeg === 'ready' ? 'Available' : 'Unavailable'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Server Details */}
        {health && health.ok && (
          <div className="space-y-2 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium text-foreground mb-3">Server Details</p>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Render Mode</span>
                <Badge variant="outline">server-only</Badge>
              </div>
              {health.ffmpegPath && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">FFmpeg Path</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{health.ffmpegPath}</code>
                </div>
              )}
              {health.ffmpegVersion && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">FFmpeg Version</span>
                  <span className="text-foreground">{health.ffmpegVersion}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Job Queue</span>
                <Badge variant={health.queueLength > 0 ? 'secondary' : 'outline'}>
                  {health.queueLength} pending
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {health?.error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-sm text-destructive font-medium mb-2">Connection Error</p>
            <p className="text-xs text-destructive/80">{health.error}</p>
            
            {isNginxError && (
              <div className="mt-3 p-3 bg-background rounded border border-border">
                <p className="text-xs font-medium text-foreground mb-1">Troubleshooting:</p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Ensure Nginx is proxying <code className="bg-muted px-1 rounded">/api/*</code> to port 3000</li>
                  <li>Check if Node.js server is running: <code className="bg-muted px-1 rounded">pm2 status</code></li>
                  <li>Verify Nginx config with: <code className="bg-muted px-1 rounded">sudo nginx -t</code></li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Setup Instructions */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Deployment Requirements</p>
              <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
                <li>Deploy <code className="bg-muted px-1 rounded">server/api.js</code> to VPS</li>
                <li>Install FFmpeg: <code className="bg-muted px-1 rounded">sudo apt install ffmpeg</code></li>
                <li>Start with PM2: <code className="bg-muted px-1 rounded">pm2 start server/api.js --name flowscale-api</code></li>
                <li>Configure Nginx (see <code className="bg-muted px-1 rounded">deployment/nginx/flowscale.conf</code>)</li>
              </ol>
              <a 
                href="https://github.com/your-repo/deployment/PRODUCTION_CHECKLIST.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
              >
                View Production Checklist <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
