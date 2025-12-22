import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bug, Clock, DollarSign, Layers, Zap, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { ToolExecutionDebug } from "@/hooks/useExtendedAITools";

interface AIToolsDebugPanelProps {
  debug: ToolExecutionDebug | null;
  selectedTool: string | null;
}

export function AIToolsDebugPanel({ debug, selectedTool }: AIToolsDebugPanelProps) {
  if (!debug && !selectedTool) {
    return (
      <Card className="bg-muted/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Bug className="w-4 h-4" />
            Debug Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Select a tool and execute to see debug information
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    if (!debug) return <Zap className="w-4 h-4 text-muted-foreground" />;
    switch (debug.status) {
      case 'idle':
        return <Zap className="w-4 h-4 text-muted-foreground" />;
      case 'resolving':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'executing':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Zap className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    if (!debug) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      idle: 'outline',
      resolving: 'secondary',
      executing: 'default',
      success: 'default',
      error: 'destructive',
    };
    const colors: Record<string, string> = {
      idle: '',
      resolving: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      executing: 'bg-primary/20 text-primary border-primary/30',
      success: 'bg-green-500/20 text-green-500 border-green-500/30',
      error: '',
    };
    return (
      <Badge 
        variant={variants[debug.status] || 'outline'} 
        className={`text-xs ${colors[debug.status] || ''}`}
      >
        {debug.status}
      </Badge>
    );
  };

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-primary" />
            Debug Info
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Provider */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Provider
          </span>
          <span className="text-xs font-medium text-foreground">
            {debug?.provider || 'Not selected'}
          </span>
        </div>

        {/* Model */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Model
          </span>
          <span className="text-xs font-mono text-foreground truncate max-w-[140px]" title={debug?.model}>
            {debug?.model || '-'}
          </span>
        </div>

        <Separator className="bg-border/50" />

        {/* Reason */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Selection Reason</span>
          <p className="text-xs text-foreground bg-muted/50 rounded px-2 py-1.5">
            {debug?.reason || 'Awaiting execution'}
          </p>
        </div>

        {/* Execution Time */}
        {debug?.executionTimeMs !== undefined && debug.executionTimeMs > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Execution Time
            </span>
            <span className="text-xs font-medium text-foreground">
              {debug.executionTimeMs}ms
            </span>
          </div>
        )}

        {/* Cost Estimate */}
        {debug?.costEstimate !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Cost
            </span>
            <span className="text-xs font-medium text-green-500">
              ${debug.costEstimate.toFixed(3)}
            </span>
          </div>
        )}

        {/* Attempted Providers */}
        {debug?.attemptedProviders && debug.attemptedProviders.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Providers Tried</span>
            <div className="flex flex-wrap gap-1">
              {debug.attemptedProviders.map((p, i) => (
                <Badge key={i} variant="outline" className="text-xs py-0">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {debug?.error && (
          <div className="space-y-1">
            <span className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Error
            </span>
            <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
              {debug.error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
