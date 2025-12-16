/**
 * Execution Console
 * Terminal-like UI for real-time FFmpeg execution logs
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Terminal,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface ExecutionLog {
  jobId: string;
  variationIndex: number;
  status: 'queued' | 'running' | 'done' | 'error';
  command: string | null;
  fullLogs: string[];
  execution: {
    engine: string;
    encoderUsed: string | null;
    exitCode: number | null;
    outputPath: string | null;
    outputExists: boolean;
    outputSize: number | null;
    durationMs: number | null;
  };
  error: { code: string; message: string } | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface ExecutionConsoleProps {
  jobId: string;
  variationIndex: number;
  apiBaseUrl?: string;
}

export function ExecutionConsole({
  jobId,
  variationIndex,
  apiBaseUrl = ''
}: ExecutionConsoleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [logs, setLogs] = useState<ExecutionLog | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = async () => {
    // Handle Preview/Simulation Mode (VPS Unavailable)
    if (jobId.startsWith('preview_') || jobId.startsWith('var_')) {
      setLogs({
        jobId,
        variationIndex,
        status: 'done',
        command: 'simulation_run --mode=preview',
        fullLogs: [
          '[System] VPS Connection Unavailable',
          '[System] Running in Simulation Mode',
          '[Simulation] Validated Execution Plan',
          '[Simulation] Skipped remote rendering',
          '[Success] Simulation complete'
        ],
        execution: {
          engine: 'simulation',
          encoderUsed: null,
          exitCode: 0,
          outputPath: null,
          outputExists: false,
          outputSize: 0,
          durationMs: 100
        },
        error: null,
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
      setIsPolling(false);
      return;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/jobs/${jobId}/logs`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setLogs({
        jobId: data.jobId,
        variationIndex,
        status: data.status,
        command: data.command,
        fullLogs: data.fullLogs || [],
        execution: data.execution,
        error: data.error,
        createdAt: data.createdAt,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      });
      setError(null);

      // Stop polling when job is complete
      if (data.status === 'done' || data.status === 'error') {
        setIsPolling(false);
      }
    } catch (err: any) {
      // If we get a syntax error (HTML response), it's likely a 404/proxy issue.
      // Don't show confusing syntax error, show "Connection unavailable"
      const msg = err.message.includes('Unexpected token')
        ? 'Backend unavailable (received HTML)'
        : err.message;
      setError(msg);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchLogs();

    // Start polling
    if (isPolling) {
      pollIntervalRef.current = setInterval(fetchLogs, 1000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [jobId, isPolling]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && logs?.fullLogs) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs?.fullLogs?.length]);

  const copyLogs = () => {
    if (!logs) return;
    const text = [
      `=== Variation ${variationIndex + 1} Execution Log ===`,
      `Job ID: ${logs.jobId}`,
      `Status: ${logs.status}`,
      `Engine: ${logs.execution?.engine || 'unified_server'}`,
      `Encoder: ${logs.execution?.encoderUsed || 'N/A'}`,
      '',
      `=== Command ===`,
      logs.command || 'N/A',
      '',
      `=== Output ===`,
      ...(logs.fullLogs || []),
      '',
      `=== Result ===`,
      `Exit Code: ${logs.execution?.exitCode ?? 'N/A'}`,
      `Output Exists: ${logs.execution?.outputExists ?? false}`,
      `Output Size: ${logs.execution?.outputSize ? `${(logs.execution.outputSize / 1024 / 1024).toFixed(2)} MB` : 'N/A'}`,
      logs.error ? `Error: ${logs.error.code} - ${logs.error.message}` : 'No errors',
    ].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Execution log copied to clipboard');
  };

  const getStatusIcon = () => {
    if (!logs) return <Clock className="w-4 h-4 text-muted-foreground" />;
    switch (logs.status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    if (!logs) return <Badge variant="outline">Loading</Badge>;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      done: 'default',
      error: 'destructive',
      running: 'secondary',
      queued: 'outline',
    };
    return <Badge variant={variants[logs.status] || 'outline'}>{logs.status.toUpperCase()}</Badge>;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-slate-700 bg-slate-900/80">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-2 px-3 hover:bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <CardTitle className="text-sm font-mono text-green-400">
                  Variation {variationIndex + 1} Console
                </CardTitle>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-0">
            {error && (
              <div className="px-3 py-2 bg-red-500/10 text-red-400 text-xs font-mono">
                Error fetching logs: {error}
              </div>
            )}

            {/* Command Section */}
            {logs?.command && (
              <div className="px-3 py-2 border-b border-slate-700 bg-slate-800/50">
                <div className="text-xs text-muted-foreground mb-1 font-mono">COMMAND:</div>
                <pre className="text-xs text-cyan-400 font-mono whitespace-pre-wrap break-all">
                  {logs.command}
                </pre>
              </div>
            )}

            {/* Logs Terminal */}
            <div
              ref={scrollRef}
              className="h-48 overflow-y-auto bg-black/50 p-3 font-mono text-xs"
            >
              {!logs && (
                <div className="text-muted-foreground italic">
                  Waiting for execution logs...
                </div>
              )}
              {logs?.fullLogs.length === 0 && logs.status === 'queued' && (
                <div className="text-yellow-400">
                  [QUEUED] Job waiting to start...
                </div>
              )}
              {logs?.fullLogs.map((line, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap break-all ${line.includes('error') || line.includes('Error') || line.includes('ERROR')
                    ? 'text-red-400'
                    : line.includes('Warning') || line.includes('warning')
                      ? 'text-yellow-400'
                      : line.includes('DONE') || line.includes('success') || line.includes('completed')
                        ? 'text-green-400'
                        : line.startsWith('[Command]')
                          ? 'text-cyan-400'
                          : 'text-slate-300'
                    }`}
                >
                  {line}
                </div>
              ))}
              {logs?.status === 'running' && (
                <div className="text-blue-400 animate-pulse mt-1">
                  ▌ Processing...
                </div>
              )}
            </div>

            {/* Execution Metadata */}
            {logs && (
              <div className="px-3 py-2 border-t border-slate-700 bg-slate-800/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Engine:</span>
                    <span className="ml-1 font-mono text-blue-400">{logs.execution?.engine || 'unified'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Encoder:</span>
                    <span className="ml-1 font-mono">{logs.execution?.encoderUsed || 'pending'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exit:</span>
                    <span className={`ml-1 font-mono ${logs.execution?.exitCode === 0 ? 'text-green-400' :
                      logs.execution?.exitCode === null || logs.execution?.exitCode === undefined ? 'text-muted-foreground' : 'text-red-400'
                      }`}>
                      {logs.execution?.exitCode ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output:</span>
                    <span className={`ml-1 font-mono ${logs.execution?.outputExists ? 'text-green-400' : 'text-muted-foreground'
                      }`}>
                      {logs.execution?.outputExists ? '✓' : '—'}
                      {logs.execution?.outputSize ? ` (${(logs.execution.outputSize / 1024 / 1024).toFixed(1)}MB)` : ''}
                    </span>
                  </div>
                </div>

                {logs.error && (
                  <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30">
                    <span className="text-red-400 font-mono text-xs">
                      {logs.error.code}: {logs.error.message}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-3 py-2 border-t border-slate-700 flex items-center justify-between bg-slate-800/50">
              <div className="flex items-center gap-2">
                {isPolling && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Live</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {logs?.fullLogs.length || 0} lines
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={copyLogs} className="h-6 text-xs">
                <Copy className="w-3 h-3 mr-1" />
                Copy Log
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Multi-Variation Execution Console
 * Shows consoles for multiple job IDs
 */
interface MultiExecutionConsoleProps {
  jobs: Array<{ jobId: string; variationIndex: number }>;
  apiBaseUrl?: string;
}

export function MultiExecutionConsole({ jobs, apiBaseUrl }: MultiExecutionConsoleProps) {
  if (jobs.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No active jobs. Click "Generate" to start rendering.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <ExecutionConsole
          key={job.jobId}
          jobId={job.jobId}
          variationIndex={job.variationIndex}
          apiBaseUrl={apiBaseUrl}
        />
      ))}
    </div>
  );
}
