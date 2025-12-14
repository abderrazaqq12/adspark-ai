/**
 * VPS Server Status Indicator
 * Shows connection health and FFmpeg availability for VPS rendering
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Server, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Loader2,
  HardDrive,
  Cpu,
  Film,
  Wifi,
  WifiOff
} from 'lucide-react';
import { checkServerHealth } from '@/lib/vps-render-service';
import { toast } from 'sonner';

interface VPSHealth {
  healthy: boolean;
  ffmpeg: string;
  uploadDir?: string;
  outputDir?: string;
  maxFileSize?: string;
  timestamp?: string;
  error?: string;
}

export function VPSServerStatus() {
  const [health, setHealth] = useState<VPSHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    return localStorage.getItem('vps_api_base_url') || '';
  });

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkServerHealth();
      setHealth({
        healthy: result.healthy,
        ffmpeg: result.ffmpeg,
        error: result.error,
      });
      setLastChecked(new Date());
      
      if (result.healthy) {
        toast.success('VPS server is healthy');
      } else {
        toast.error('VPS server unreachable', {
          description: result.error || 'Check your server configuration',
        });
      }
    } catch (error) {
      setHealth({
        healthy: false,
        ffmpeg: 'unavailable',
        error: error instanceof Error ? error.message : 'Connection failed',
      });
      setLastChecked(new Date());
    } finally {
      setChecking(false);
    }
  }, []);

  const saveApiBaseUrl = useCallback(() => {
    localStorage.setItem('vps_api_base_url', apiBaseUrl);
    toast.success('VPS API URL saved');
    // Trigger health check with new URL
    checkHealth();
  }, [apiBaseUrl, checkHealth]);

  // Auto-check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" />
          VPS Server Status
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Monitor your VPS render server connection and FFmpeg availability
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Base URL Configuration */}
        <div className="space-y-2">
          <Label htmlFor="vps-api-url" className="text-foreground">
            VPS API Base URL
          </Label>
          <div className="flex gap-2">
            <Input
              id="vps-api-url"
              placeholder="https://your-domain.com or leave empty for relative /api"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              className="flex-1 bg-background border-border text-foreground"
            />
            <Button 
              variant="outline" 
              onClick={saveApiBaseUrl}
              className="shrink-0"
            >
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Leave empty if your frontend and API are on the same domain (Nginx proxies /api/*)
          </p>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Connection Status */}
          <div className={`p-4 rounded-lg border ${
            health?.healthy 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-center gap-3">
              {health?.healthy ? (
                <Wifi className="w-8 h-8 text-green-500" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">Connection</p>
                <p className={`text-lg font-bold ${health?.healthy ? 'text-green-500' : 'text-red-500'}`}>
                  {health?.healthy ? 'Connected' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          {/* FFmpeg Status */}
          <div className={`p-4 rounded-lg border ${
            health?.ffmpeg === 'available' 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
          }`}>
            <div className="flex items-center gap-3">
              <Film className={`w-8 h-8 ${
                health?.ffmpeg === 'available' ? 'text-green-500' : 'text-amber-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-foreground">FFmpeg</p>
                <p className={`text-lg font-bold ${
                  health?.ffmpeg === 'available' ? 'text-green-500' : 'text-amber-500'
                }`}>
                  {health?.ffmpeg === 'available' ? 'Ready' : health?.ffmpeg || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Server Mode */}
          <div className="p-4 rounded-lg border bg-primary/10 border-primary/30">
            <div className="flex items-center gap-3">
              <Cpu className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Render Mode</p>
                <p className="text-lg font-bold text-primary">Server-Only</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Details */}
        {health && (
          <div className="p-4 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={health.healthy ? 'default' : 'destructive'}>
                {health.healthy ? 'Healthy' : 'Unhealthy'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">FFmpeg Binary</span>
              <span className="text-sm text-foreground">{health.ffmpeg}</span>
            </div>
            {health.error && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Error</span>
                <span className="text-sm text-red-500">{health.error}</span>
              </div>
            )}
            {lastChecked && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Checked</span>
                <span className="text-sm text-foreground">
                  {lastChecked.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={checkHealth}
            disabled={checking}
            className="flex-1"
          >
            {checking ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {checking ? 'Checking...' : 'Check Connection'}
          </Button>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex gap-3">
            <HardDrive className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Server-Side Rendering</p>
              <p className="text-xs text-muted-foreground">
                All video processing runs on your VPS with native FFmpeg. 
                No browser-side WASM or WebCodecs required.
                Videos are uploaded to <code className="bg-muted px-1 rounded">/api/upload</code> and 
                rendered via <code className="bg-muted px-1 rounded">/api/execute</code>.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
