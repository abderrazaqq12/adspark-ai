/**
 * Render Debug Panel (Developer Mode)
 * Deep visibility into Creative Scale rendering pipeline
 * WITH Live Execution Console
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Bug,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Server,
  Cloud,
  FileDown,
  Loader2,
  Copy,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';
import {
  executionDebugLogger,
  ExecutionDebugState,
  VariationDebugState
} from '@/lib/creative-scale/execution-debug';
import { MultiExecutionConsole } from './ExecutionConsole';

interface RenderDebugPanelProps {
  className?: string;
}

export function RenderDebugPanel({ className }: RenderDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debugState, setDebugState] = useState<ExecutionDebugState | null>(null);
  const [activeTab, setActiveTab] = useState<'routing' | 'console'>('console');

  useEffect(() => {
    const unsubscribe = executionDebugLogger.subscribe(setDebugState);
    return unsubscribe;
  }, []);

  const copyDebugLog = () => {
    if (!debugState) return;

    const logText = JSON.stringify({
      sessionId: debugState.sessionId,
      startedAt: debugState.startedAt,
      summary: debugState.summary,
      events: debugState.events,
      variations: debugState.variations,
    }, null, 2);

    navigator.clipboard.writeText(logText);
    toast.success('Debug log copied to clipboard');
  };

  if (!debugState) {
    return null;
  }

  // Derive active jobs from variations with valid job IDs
  const activeJobs = debugState.variations
    .filter(v => v.jobId && (v.unifiedServer.status === 'dispatched' || v.unifiedServer.status === 'pending'))
    .map(v => ({ jobId: v.jobId!, variationIndex: v.variationIndex }));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'dispatched':
      case 'attempting':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'skipped':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      success: 'default',
      error: 'destructive',
      failed: 'destructive',
      pending: 'outline',
      dispatched: 'secondary',
      skipped: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Card className="border-dashed border-amber-500/50 bg-amber-500/5">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-sm font-medium">
                  Render Debug (Developer Mode)
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {activeJobs.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {activeJobs.length} job{activeJobs.length !== 1 ? 's' : ''} active
                  </Badge>
                )}
                {debugState.isComplete && debugState.summary && (
                  <Badge
                    variant={debugState.summary.failedVariations.length > 0 ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {debugState.summary.successfulVariations.length}/{debugState.summary.totalVariations} Success
                  </Badge>
                )}
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Session Info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Session: {debugState.sessionId}</span>
              <Button variant="ghost" size="sm" onClick={copyDebugLog} className="h-6 text-xs">
                <Copy className="w-3 h-3 mr-1" />
                Copy Log
              </Button>
            </div>

            {/* Tabs for Routing vs Console */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="console" className="text-xs">
                  <Terminal className="w-3 h-3 mr-1" />
                  Execution Console
                </TabsTrigger>
                <TabsTrigger value="routing" className="text-xs">
                  <Server className="w-3 h-3 mr-1" />
                  Routing Details
                </TabsTrigger>
              </TabsList>

              {/* Live Execution Console */}
              <TabsContent value="console" className="mt-3">
                <ScrollArea className="h-[400px]">
                  {activeJobs.length > 0 ? (
                    <MultiExecutionConsole jobs={activeJobs} />
                  ) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p>No active jobs.</p>
                      <p className="text-xs mt-1">Click "Generate" to start rendering and see live logs.</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Routing Details */}
              <TabsContent value="routing" className="mt-3">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {debugState.variations.map((variation) => (
                      <VariationDebugCard key={variation.variationIndex} variation={variation} />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            {/* Summary (if complete) */}
            {debugState.isComplete && debugState.summary && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Terminal className="w-4 h-4" />
                  Execution Summary
                </div>
                <div className="text-xs space-y-1">
                  <p><span className="text-muted-foreground">Action:</span> {debugState.summary.uiAction}</p>
                  <p><span className="text-muted-foreground">Selected Engine:</span> {debugState.summary.selectedEngine}</p>
                  <p><span className="text-muted-foreground">Duration:</span> {(debugState.summary.totalDurationMs / 1000).toFixed(1)}s</p>
                  {debugState.summary.failedVariations.length > 0 && (
                    <>
                      <p className="text-red-400">
                        <span className="text-muted-foreground">Failed:</span> Variations {debugState.summary.failedVariations.map(v => v + 1).join(', ')}
                      </p>
                      <p className="text-red-400">
                        <span className="text-muted-foreground">Root Cause:</span> {debugState.summary.rootCause}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function VariationDebugCard({ variation }: { variation: VariationDebugState }) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'error':
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'dispatched':
        return <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-2 bg-muted/30 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Variation {variation.variationIndex + 1}</span>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(variation.unifiedServer.status)}
              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-2 space-y-2 text-xs">
            {/* Unified Server Details */}
            <div className="flex items-start gap-2">
              <Server className="w-3 h-3 text-blue-400 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Unified VPS Engine</span>
                  {variation.unifiedServer.status === 'dispatched' && (
                    <span className="text-blue-400 font-mono">DISPATCHED</span>
                  )}
                </div>

                {variation.unifiedServer.errorReason && (
                  <p className="text-red-400 mt-1">{variation.unifiedServer.errorReason}</p>
                )}

                {variation.unifiedServer.jobId && (
                  <p className="text-muted-foreground mt-1 font-mono text-[10px]">
                    Job ID: {variation.unifiedServer.jobId}
                  </p>
                )}

                {variation.unifiedServer.durationMs && (
                  <p className="text-muted-foreground mt-1">
                    Duration: {(variation.unifiedServer.durationMs / 1000).toFixed(2)}s
                  </p>
                )}
              </div>
            </div>

            {/* Final Result */}
            <div className="flex items-center gap-2 pt-1 border-t border-border mt-2">
              {getStatusIcon(variation.finalResult.status)}
              <span className="text-muted-foreground">Final Status:</span>
              <Badge
                variant={variation.finalResult.status === 'success' ? 'default' : variation.finalResult.status === 'failed' ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {variation.finalResult.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
