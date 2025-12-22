import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RefreshCw, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Bug,
  XCircle,
  Loader2
} from 'lucide-react';
import { useLifecycleManagement, type SystemLog, type LogSeverity } from '@/hooks/useLifecycleManagement';
import { formatDistanceToNow } from 'date-fns';

interface SystemLogsViewerProps {
  projectId?: string;
  jobId?: string;
  tool?: string;
  maxHeight?: string;
}

const severityConfig: Record<LogSeverity, { icon: React.ReactNode; color: string; bgColor: string }> = {
  debug: { 
    icon: <Bug className="h-3 w-3" />, 
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10'
  },
  info: { 
    icon: <Info className="h-3 w-3" />, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  warning: { 
    icon: <AlertTriangle className="h-3 w-3" />, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  error: { 
    icon: <AlertCircle className="h-3 w-3" />, 
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  critical: { 
    icon: <XCircle className="h-3 w-3" />, 
    color: 'text-red-700',
    bgColor: 'bg-red-700/10'
  }
};

export function SystemLogsViewer({ 
  projectId, 
  jobId, 
  tool,
  maxHeight = '400px' 
}: SystemLogsViewerProps) {
  const { getSystemLogs } = useLifecycleManagement();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<LogSeverity | 'all'>('all');
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getSystemLogs({
        projectId,
        jobId,
        tool,
        severity: severityFilter === 'all' ? undefined : severityFilter,
        limit: 200
      });
      setLogs(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [projectId, jobId, tool, severityFilter]);

  const filteredLogs = logs;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">System Logs</CardTitle>
          <div className="flex items-center gap-2">
            <Select 
              value={severityFilter} 
              onValueChange={(v) => setSeverityFilter(v as LogSeverity | 'all')}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={loadLogs}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea style={{ height: maxHeight }}>
          {filteredLogs.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No logs found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map(log => {
                const config = severityConfig[log.severity];
                return (
                  <div
                    key={log.id}
                    className={`p-2 rounded cursor-pointer transition-colors ${config.bgColor} hover:opacity-80`}
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  >
                    <div className="flex items-start gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                            {log.tool}
                          </Badge>
                          {log.stage && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              {log.stage}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs mt-1 break-words">{log.message}</p>
                        
                        {selectedLog?.id === log.id && log.details && (
                          <pre className="mt-2 text-[10px] bg-background/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
