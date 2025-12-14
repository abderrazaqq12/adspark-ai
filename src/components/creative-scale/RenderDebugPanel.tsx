/**
 * Render Debug Panel (Developer Mode)
 * Deep visibility into Creative Scale rendering pipeline
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface RenderDebugPanelProps {
  className?: string;
}

export function RenderDebugPanel({ className }: RenderDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debugState, setDebugState] = useState<ExecutionDebugState | null>(null);

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

            {/* Variation Debug States */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {debugState.variations.map((variation) => (
                  <VariationDebugCard key={variation.variationIndex} variation={variation} />
                ))}
              </div>
            </ScrollArea>

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
                      <p className="text-amber-400">
                        <span className="text-muted-foreground">Next Action:</span> {debugState.summary.nextAction}
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
      case 'skipped':
        return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
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
              <Badge variant="outline" className="text-xs font-mono">
                {variation.routing.selectedEngine || 'pending'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(variation.finalResult.status)}
              {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-2 space-y-2 text-xs">
            {/* Routing */}
            <div className="flex items-center gap-2">
              {getStatusIcon(variation.routing.status)}
              <span className="text-muted-foreground">Capability Routing</span>
              {variation.routing.status === 'success' && (
                <span className="text-green-400 font-mono">
                  [{variation.routing.requiredCapabilities.join(', ')}]
                </span>
              )}
            </div>

            {/* Server FFmpeg */}
            <div className="flex items-start gap-2">
              {getStatusIcon(variation.serverFFmpeg.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Server className="w-3 h-3 text-blue-400" />
                  <span className="text-muted-foreground">Server FFmpeg</span>
                  {variation.serverFFmpeg.endpoint && (
                    <span className="font-mono text-blue-300">
                      POST {variation.serverFFmpeg.endpoint}
                    </span>
                  )}
                </div>
                {variation.serverFFmpeg.status === 'error' && (
                  <div className="mt-1 p-1.5 rounded bg-red-500/10 border border-red-500/30">
                    <p className="text-red-400">
                      {variation.serverFFmpeg.httpStatus && (
                        <span className="font-mono">HTTP {variation.serverFFmpeg.httpStatus} • </span>
                      )}
                      {variation.serverFFmpeg.contentType && (
                        <span className="font-mono">{variation.serverFFmpeg.contentType}</span>
                      )}
                    </p>
                    {variation.serverFFmpeg.errorReason && (
                      <p className="text-red-300 mt-1">{variation.serverFFmpeg.errorReason}</p>
                    )}
                    {variation.serverFFmpeg.responsePreview && (
                      <details className="mt-1">
                        <summary className="text-muted-foreground cursor-pointer">Response preview</summary>
                        <pre className="mt-1 p-1 bg-background/50 rounded text-xs overflow-x-auto">
                          {variation.serverFFmpeg.responsePreview.substring(0, 300)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cloudinary */}
            {variation.cloudinary.status !== 'pending' && (
              <div className="flex items-start gap-2">
                {getStatusIcon(variation.cloudinary.status)}
                <div className="flex items-center gap-2">
                  <Cloud className="w-3 h-3 text-purple-400" />
                  <span className="text-muted-foreground">Cloudinary</span>
                </div>
                {variation.cloudinary.errorReason && (
                  <span className="text-red-400">{variation.cloudinary.errorReason}</span>
                )}
              </div>
            )}

            {/* Final Result */}
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              {getStatusIcon(variation.finalResult.status)}
              <span className="text-muted-foreground">Result:</span>
              <Badge 
                variant={variation.finalResult.status === 'success' ? 'default' : 'destructive'} 
                className="text-xs"
              >
                {variation.finalResult.status}
              </Badge>
              {variation.finalResult.engineUsed && (
                <span className="font-mono text-muted-foreground">
                  via {variation.finalResult.engineUsed}
                </span>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
