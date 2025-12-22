/**
 * System Status Bar - Compact top status bar (SECTION 1)
 * Shows VPS, FFmpeg, GPU, Queue, and Storage status
 * READ-ONLY - No buttons, status only
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
  Loader2
} from 'lucide-react';
import { useRenderBackendStatus } from '@/hooks/useRenderBackendStatus';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface QueueStats {
  active: number;
  waiting: number;
}

interface StorageStats {
  used: string;
  remaining: string;
  percentage: number;
}

export function SystemStatusBar() {
  const backendStatus = useRenderBackendStatus();
  const [queueStats, setQueueStats] = useState<QueueStats>({ active: 0, waiting: 0 });
  const [storage, setStorage] = useState<StorageStats>({ used: '0 GB', remaining: '∞', percentage: 0 });
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    fetchQueueStats();
    
    const channel = supabase
      .channel('system-status-bar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pipeline_jobs' },
        () => fetchQueueStats()
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQueueStats = async () => {
    try {
      const { data: jobs } = await supabase
        .from('pipeline_jobs')
        .select('status')
        .in('status', ['processing', 'running', 'pending', 'queued'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (jobs) {
        setQueueStats({
          active: jobs.filter(j => j.status === 'processing' || j.status === 'running').length,
          waiting: jobs.filter(j => j.status === 'pending' || j.status === 'queued').length,
        });
      }

      // Estimate storage from file_assets
      const { data: files } = await supabase
        .from('file_assets')
        .select('file_size')
        .eq('status', 'active');

      if (files) {
        const totalBytes = files.reduce((sum, f) => sum + (f.file_size || 0), 0);
        const usedGB = totalBytes / (1024 * 1024 * 1024);
        setStorage({
          used: usedGB < 1 ? `${(usedGB * 1024).toFixed(1)} MB` : `${usedGB.toFixed(2)} GB`,
          remaining: 'Unlimited', // Cloud storage
          percentage: Math.min(usedGB / 100 * 100, 100) // Assume 100GB quota for visualization
        });
      }
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const StatusItem = ({ 
    icon: Icon, 
    label, 
    status, 
    value,
    isOnline = true
  }: { 
    icon: any; 
    label: string; 
    status: 'online' | 'offline' | 'warning';
    value?: string;
    isOnline?: boolean;
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
    <div className="rounded-lg border border-border/50 bg-muted/30 backdrop-blur">
      <div className="flex flex-wrap items-center divide-x divide-border/50">
        {/* Realtime indicator */}
        <div className="px-3 py-1.5">
          {isRealtimeConnected ? (
            <Wifi className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>

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
          status={backendStatus.vpsServer.available ? 'online' : 'offline'}
        />

        {/* GPU */}
        <StatusItem 
          icon={Cpu}
          label="GPU"
          status="warning"
          value="N/A"
        />

        {/* Queue Status */}
        <div className="flex items-center gap-3 px-3 py-1.5">
          <span className="text-xs text-muted-foreground">Queue:</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-primary/30 bg-primary/5 text-primary">
            {queueStats.active} Active
          </Badge>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-amber-500/30 bg-amber-500/5 text-amber-600">
            {queueStats.waiting} Waiting
          </Badge>
        </div>

        {/* Storage */}
        <div className="flex items-center gap-2 px-3 py-1.5">
          <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Storage:</span>
          <span className="text-xs font-medium text-foreground">{storage.used}</span>
          <span className="text-xs text-muted-foreground">/ {storage.remaining}</span>
        </div>
      </div>
    </div>
  );
}