/**
 * UnifiedDebugPanel - Unified Debug & Observability UI
 * 
 * A consistent debug panel for all tools that shows:
 * - Pipeline stages with real backend state
 * - Clear error messages (not generic)
 * - Retry button (when allowed)
 * - View logs / Delete logs
 * 
 * Same design across: Studio, Creative Replicator, Creative Scale, AI Tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Server,
  Wifi,
  WifiOff,
  Info,
  Bug,
  Copy,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLifecycleManagement, type SystemLog, type LogSeverity } from '@/hooks/useLifecycleManagement';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export type ToolType = 'studio' | 'creative-replicator' | 'creative-scale' | 'ai-tools';

interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'queued';
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  canRetry: boolean;
}

interface UnifiedDebugPanelProps {
  /** Current tool type */
  tool: ToolType;
  /** Project ID for filtering */
  projectId?: string;
  /** Specific job ID to show */
  jobId?: string;
  /** Callback when retry is triggered */
  onRetry?: (stageId: string) => void;
  /** Show expanded by default */
  defaultExpanded?: boolean;
  /** Maximum height for scroll areas */
  maxHeight?: string;
}

const severityConfig: Record<LogSeverity, { 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  debug: { 
    icon: <Bug className="h-3 w-3" />, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    label: 'Debug'
  },
  info: { 
    icon: <Info className="h-3 w-3" />, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Info'
  },
  warning: { 
    icon: <AlertTriangle className="h-3 w-3" />, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    label: 'Warning'
  },
  error: { 
    icon: <XCircle className="h-3 w-3" />, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    label: 'Error'
  },
  critical: { 
    icon: <XCircle className="h-3 w-3" />, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/20',
    label: 'Critical'
  }
};

const statusConfig: Record<string, { 
  icon: React.ReactNode; 
  color: string;
  label: string;
}> = {
  pending: { 
    icon: <Clock className="h-3.5 w-3.5" />, 
    color: 'text-muted-foreground',
    label: 'Pending'
  },
  queued: { 
    icon: <Clock className="h-3.5 w-3.5" />, 
    color: 'text-amber-500',
    label: 'Queued'
  },
  running: { 
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, 
    color: 'text-primary',
    label: 'Running'
  },
  completed: { 
    icon: <CheckCircle2 className="h-3.5 w-3.5" />, 
    color: 'text-green-500',
    label: 'Completed'
  },
  failed: { 
    icon: <XCircle className="h-3.5 w-3.5" />, 
    color: 'text-destructive',
    label: 'Failed'
  }
};

export function UnifiedDebugPanel({
  tool,
  projectId,
  jobId,
  onRetry,
  defaultExpanded = false,
  maxHeight = '300px'
}: UnifiedDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'logs'>('pipeline');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  const { getSystemLogs, executeCleanup } = useLifecycleManagement();

  // Fetch pipeline stages from Supabase
  const fetchStages = useCallback(async () => {
    try {
      let query = supabase
        .from('pipeline_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (jobId) {
        query = query.eq('id', jobId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedStages: PipelineStage[] = (data || []).map((job: any) => ({
        id: job.id,
        name: job.stage_name || 'Unknown Stage',
        status: job.status as PipelineStage['status'],
        progress: job.progress || 0,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        errorMessage: job.error_message,
        canRetry: job.status === 'failed'
      }));

      setStages(mappedStages);
    } catch (error) {
      console.error('[UnifiedDebugPanel] Fetch stages error:', error);
    }
  }, [projectId, jobId]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSystemLogs({
        projectId,
        jobId,
        tool,
        limit: 100
      });
      setLogs(data);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, jobId, tool, getSystemLogs]);

  // Set up realtime subscription
  useEffect(() => {
    fetchStages();
    fetchLogs();

    const channel = supabase
      .channel(`debug-panel-${tool}-${projectId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_jobs',
          ...(projectId && { filter: `project_id=eq.${projectId}` })
        },
        () => {
          fetchStages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_logs',
          ...(projectId && { filter: `project_id=eq.${projectId}` })
        },
        () => {
          fetchLogs();
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStages, fetchLogs, tool, projectId]);

  // Handle retry
  const handleRetry = async (stageId: string) => {
    setIsRetrying(stageId);
    try {
      if (onRetry) {
        onRetry(stageId);
      } else {
        // Default retry: update job status to pending
        const { error } = await supabase
          .from('pipeline_jobs')
          .update({ status: 'pending', error_message: null, progress: 0 })
          .eq('id', stageId);

        if (error) throw error;
        toast.success('Job queued for retry');
        fetchStages();
      }
    } catch (error) {
      toast.error('Failed to retry', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRetrying(null);
    }
  };

  // Handle delete logs
  const handleDeleteLogs = async () => {
    setIsDeleting(true);
    try {
      const result = await executeCleanup(
        projectId ? 'project' : 'user',
        projectId,
        { deleteLogs: true, deleteFiles: false, updateJobs: false }
      );

      if (result?.success) {
        setLogs([]);
        toast.success('Logs deleted');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Copy logs to clipboard
  const copyLogs = () => {
    const logText = logs.map(l => 
      `[${l.severity.toUpperCase()}] ${l.createdAt} - ${l.tool}${l.stage ? `/${l.stage}` : ''}: ${l.message}`
    ).join('\n');
    navigator.clipboard.writeText(logText);
    toast.success('Logs copied to clipboard');
  };

  // Count errors/warnings
  const errorCount = stages.filter(s => s.status === 'failed').length;
  const runningCount = stages.filter(s => s.status === 'running').length;
  const warningCount = logs.filter(l => l.severity === 'warning').length;
  const errorLogCount = logs.filter(l => l.severity === 'error' || l.severity === 'critical').length;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Debug & Observability</CardTitle>
                
                {/* Status indicators */}
                <div className="flex items-center gap-1.5 ml-2">
                  {isRealtimeConnected ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-muted-foreground" />
                  )}
                  
                  {runningCount > 0 && (
                    <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                      <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" />
                      {runningCount} running
                    </Badge>
                  )}
                  
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      {errorCount} failed
                    </Badge>
                  )}
                  
                  {errorLogCount > 0 && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-destructive/50 text-destructive">
                      {errorLogCount} errors
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] h-5">
                  {tool}
                </Badge>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pipeline' | 'logs')}>
              <div className="px-4 border-b border-border/50">
                <TabsList className="h-8 bg-transparent p-0 gap-4">
                  <TabsTrigger 
                    value="pipeline" 
                    className="h-8 px-2 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    <Server className="h-3 w-3 mr-1.5" />
                    Pipeline ({stages.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="logs" 
                    className="h-8 px-2 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                  >
                    <Terminal className="h-3 w-3 mr-1.5" />
                    Logs ({logs.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Pipeline Tab */}
              <TabsContent value="pipeline" className="m-0">
                <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Pipeline Stages
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={fetchStages}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                
                <ScrollArea style={{ maxHeight }}>
                  {stages.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No pipeline jobs found
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {stages.map((stage) => {
                        const config = statusConfig[stage.status] || statusConfig.pending;
                        return (
                          <div key={stage.id} className="p-3 hover:bg-muted/20 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={config.color}>{config.icon}</span>
                                  <span className="text-sm font-medium truncate">{stage.name}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[10px] h-4 px-1 ${config.color}`}
                                  >
                                    {config.label}
                                  </Badge>
                                </div>
                                
                                {/* Progress bar for running jobs */}
                                {stage.status === 'running' && (
                                  <div className="mt-2 space-y-1">
                                    <Progress value={stage.progress} className="h-1" />
                                    <span className="text-[10px] text-muted-foreground">
                                      {stage.progress}% complete
                                    </span>
                                  </div>
                                )}
                                
                                {/* Error message for failed jobs */}
                                {stage.status === 'failed' && stage.errorMessage && (
                                  <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                                    <p className="text-xs text-destructive font-mono break-words">
                                      {stage.errorMessage}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Timestamps */}
                                <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                                  {stage.startedAt && (
                                    <span>
                                      Started: {formatDistanceToNow(new Date(stage.startedAt), { addSuffix: true })}
                                    </span>
                                  )}
                                  {stage.completedAt && (
                                    <span>
                                      Completed: {formatDistanceToNow(new Date(stage.completedAt), { addSuffix: true })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Retry button for failed jobs */}
                              {stage.canRetry && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => handleRetry(stage.id)}
                                  disabled={isRetrying === stage.id}
                                >
                                  {isRetrying === stage.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : (
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                  )}
                                  Retry
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="m-0">
                <div className="px-4 py-2 border-b border-border/30 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    System Logs
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={copyLogs}
                      title="Copy logs"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={fetchLogs}
                      disabled={isLoading}
                      title="Refresh logs"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={handleDeleteLogs}
                      disabled={isDeleting || logs.length === 0}
                      title="Delete logs"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <ScrollArea style={{ maxHeight }}>
                  {logs.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No logs found
                    </div>
                  ) : (
                    <div className="divide-y divide-border/20">
                      {logs.map((log) => {
                        const config = severityConfig[log.severity];
                        const isSelected = selectedLog === log.id;
                        
                        return (
                          <div
                            key={log.id}
                            className={`p-2 cursor-pointer transition-colors hover:bg-muted/20 ${config.bgColor}`}
                            onClick={() => setSelectedLog(isSelected ? null : log.id)}
                          >
                            <div className="flex items-start gap-2">
                              <span className={config.color}>{config.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                                    {log.tool}
                                  </Badge>
                                  {log.stage && (
                                    <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                      {log.stage}
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant="outline" 
                                    className={`text-[9px] h-4 px-1 ${config.color}`}
                                  >
                                    {config.label}
                                  </Badge>
                                  <span className="text-[9px] text-muted-foreground ml-auto">
                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                  </span>
                                </div>
                                <p className="text-xs mt-1 break-words">{log.message}</p>
                                
                                {/* Expanded details */}
                                {isSelected && log.details && (
                                  <pre className="mt-2 p-2 rounded bg-background/80 text-[10px] font-mono overflow-x-auto border border-border/30">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                )}
                              </div>
                              <button className="text-muted-foreground hover:text-foreground p-1">
                                {isSelected ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
