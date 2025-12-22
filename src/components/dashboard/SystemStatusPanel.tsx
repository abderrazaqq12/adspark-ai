/**
 * System Status Panel - Real-time health monitoring
 * Shows VPS, FFmpeg, Queue, and AI Brain status
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Server, 
  Film, 
  Brain, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Activity
} from 'lucide-react';
import { useRenderBackendStatus } from '@/hooks/useRenderBackendStatus';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface QueueStats {
  running: number;
  waiting: number;
  failed: number;
}

interface AIBrainStatus {
  status: 'active' | 'degraded' | 'fallback' | 'offline';
  activeProviders: string[];
  fallbackActive: boolean;
}

export function SystemStatusPanel() {
  const backendStatus = useRenderBackendStatus();
  const [queueStats, setQueueStats] = useState<QueueStats>({ running: 0, waiting: 0, failed: 0 });
  const [aiBrainStatus, setAiBrainStatus] = useState<AIBrainStatus>({ 
    status: 'active', 
    activeProviders: [],
    fallbackActive: false 
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchQueueStats();
    fetchAIBrainStatus();
    
    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchQueueStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchQueueStats = async () => {
    try {
      const { data: jobs } = await supabase
        .from('pipeline_jobs')
        .select('status')
        .in('status', ['processing', 'pending', 'failed'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (jobs) {
        setQueueStats({
          running: jobs.filter(j => j.status === 'processing').length,
          waiting: jobs.filter(j => j.status === 'pending').length,
          failed: jobs.filter(j => j.status === 'failed').length,
        });
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const fetchAIBrainStatus = async () => {
    try {
      const { data: keys } = await supabase.rpc('get_my_api_key_providers');
      const activeProviders = keys?.filter((k: any) => k.is_active).map((k: any) => k.provider) || [];
      
      let status: AIBrainStatus['status'] = 'active';
      let fallbackActive = false;
      
      if (activeProviders.length === 0) {
        status = 'fallback';
        fallbackActive = true;
      } else if (activeProviders.length < 2) {
        status = 'degraded';
      }
      
      setAiBrainStatus({ status, activeProviders, fallbackActive });
    } catch (error) {
      console.error('Error fetching AI brain status:', error);
      setAiBrainStatus({ status: 'offline', activeProviders: [], fallbackActive: false });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchQueueStats(),
      fetchAIBrainStatus(),
      backendStatus.refresh()
    ]);
    setIsRefreshing(false);
  };

  const StatusIndicator = ({ 
    online, 
    label, 
    sublabel,
    variant = 'default'
  }: { 
    online: boolean; 
    label: string; 
    sublabel?: string;
    variant?: 'default' | 'warning' | 'error';
  }) => (
    <div className="flex items-center gap-3">
      <div className={cn(
        "w-3 h-3 rounded-full",
        online && variant === 'default' && "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]",
        online && variant === 'warning' && "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]",
        !online && "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
        variant === 'error' && "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
      )} />
      <div>
        <span className="text-sm font-medium text-foreground">{label}</span>
        {sublabel && <span className="text-xs text-muted-foreground ml-2">{sublabel}</span>}
      </div>
    </div>
  );

  const isSystemHealthy = backendStatus.vpsServer.available && aiBrainStatus.status !== 'offline';
  const hasBlockingIssue = !backendStatus.vpsServer.available;

  return (
    <Card className={cn(
      "border-2",
      hasBlockingIssue && "border-destructive/50 bg-destructive/5"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            System Status
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing || backendStatus.loading}
          >
            <RefreshCw className={cn("w-4 h-4", (isRefreshing || backendStatus.loading) && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Warning Banner */}
        {hasBlockingIssue && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">VPS Offline</p>
              <p className="text-xs text-destructive/80">Video rendering is unavailable. Check server status.</p>
            </div>
          </div>
        )}

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* VPS Status */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">VPS Server</span>
            </div>
            {backendStatus.loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <StatusIndicator 
                online={backendStatus.vpsServer.available} 
                label={backendStatus.vpsServer.available ? 'Online' : 'Offline'}
                sublabel={backendStatus.vpsServer.latency ? `${backendStatus.vpsServer.latency}ms` : undefined}
              />
            )}
          </div>

          {/* FFmpeg Status */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Film className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">FFmpeg</span>
            </div>
            {backendStatus.loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <StatusIndicator 
                online={backendStatus.vpsServer.available} 
                label={backendStatus.vpsServer.available ? 'Ready' : 'Unavailable'}
              />
            )}
          </div>

          {/* AI Brain Status */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Brain</span>
            </div>
            <StatusIndicator 
              online={aiBrainStatus.status !== 'offline'}
              label={
                aiBrainStatus.status === 'active' ? 'Active' :
                aiBrainStatus.status === 'degraded' ? 'Degraded' :
                aiBrainStatus.status === 'fallback' ? 'Fallback Mode' : 'Offline'
              }
              variant={
                aiBrainStatus.status === 'active' ? 'default' :
                aiBrainStatus.status === 'degraded' ? 'warning' : 'error'
              }
            />
            {aiBrainStatus.fallbackActive && (
              <p className="text-xs text-yellow-600 mt-1">Using Lovable AI fallback</p>
            )}
          </div>

          {/* Render Queue */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Render Queue</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="outline" className="border-green-500/30 text-green-600 bg-green-500/10">
                {queueStats.running} Running
              </Badge>
              <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 bg-yellow-500/10">
                {queueStats.waiting} Waiting
              </Badge>
              {queueStats.failed > 0 && (
                <Badge variant="outline" className="border-red-500/30 text-red-600 bg-red-500/10">
                  {queueStats.failed} Failed
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
