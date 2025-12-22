import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Bug, 
  Clock, 
  DollarSign, 
  Layers, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Key,
  TrendingDown
} from "lucide-react";
import { ToolExecutionDebug } from "@/hooks/useExtendedAITools";

interface AIToolsDebugPanelProps {
  debug: ToolExecutionDebug | null;
  selectedTool: string | null;
  estimatedCost?: number;
  usedGlobalKey?: boolean;
}

export function AIToolsDebugPanel({ 
  debug, 
  selectedTool,
  estimatedCost,
  usedGlobalKey 
}: AIToolsDebugPanelProps) {
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

  const getStatusBadge = () => {
    if (!debug) return null;
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      idle: { variant: 'outline', className: '' },
      resolving: { variant: 'secondary', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' },
      executing: { variant: 'default', className: 'bg-primary/20 text-primary border-primary/30' },
      success: { variant: 'default', className: 'bg-green-500/20 text-green-500 border-green-500/30' },
      error: { variant: 'destructive', className: '' },
    };
    const config = configs[debug.status] || configs.idle;
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className}`}>
        {debug.status === 'resolving' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
        {debug.status === 'executing' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
        {debug.status === 'success' && <CheckCircle2 className="w-3 h-3 mr-1" />}
        {debug.status === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
        {debug.status}
      </Badge>
    );
  };

  const formatProvider = (provider: string) => {
    if (!provider || provider === 'unknown' || provider === 'resolving...') {
      return provider;
    }
    // Map internal names to friendly names
    const providerNames: Record<string, string> = {
      'fal_ai': 'Fal AI',
      'eden_ai': 'Eden AI',
      'openrouter': 'OpenRouter',
      'lovable_ai': 'Lovable AI',
      'google_ai': 'Google AI Studio',
      'heygen': 'HeyGen',
      'runway': 'Runway',
    };
    return providerNames[provider] || provider;
  };

  const formatModel = (model: string) => {
    if (!model || model === 'unknown' || model === 'resolving...') {
      return 'Not selected';
    }
    // Clean up model names
    return model.replace('fal-ai/', '').replace('google/', '');
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
            {formatProvider(debug?.provider || 'Not selected')}
          </span>
        </div>

        {/* Model */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Model
          </span>
          <span className="text-xs font-mono text-foreground truncate max-w-[140px]" title={debug?.model}>
            {formatModel(debug?.model || '')}
          </span>
        </div>

        {/* Global Key Indicator */}
        {(usedGlobalKey || debug?.provider === 'lovable_ai') && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              API Key
            </span>
            <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/30">
              Global Key
            </Badge>
          </div>
        )}

        <Separator className="bg-border/50" />

        {/* Selection Reason */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Selection Reason</span>
          <p className="text-xs text-foreground bg-muted/50 rounded px-2 py-1.5">
            {debug?.reason || 'Awaiting execution'}
          </p>
        </div>

        {/* Timing */}
        {debug?.executionTimeMs !== undefined && debug.executionTimeMs > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Duration
            </span>
            <span className="text-xs font-medium text-foreground">
              {debug.executionTimeMs >= 1000 
                ? `${(debug.executionTimeMs / 1000).toFixed(1)}s`
                : `${debug.executionTimeMs}ms`
              }
            </span>
          </div>
        )}

        {/* Cost - Before & After */}
        <div className="space-y-1.5">
          {estimatedCost !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Est. Cost
              </span>
              <span className="text-xs text-muted-foreground">
                ~${estimatedCost.toFixed(3)}
              </span>
            </div>
          )}
          {debug?.costEstimate !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Actual Cost
              </span>
              <span className="text-xs font-medium text-green-500">
                ${debug.costEstimate.toFixed(3)}
              </span>
            </div>
          )}
          {estimatedCost !== undefined && debug?.costEstimate !== undefined && 
           debug.costEstimate < estimatedCost && (
            <div className="flex items-center justify-end gap-1">
              <TrendingDown className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-500">
                Saved ${(estimatedCost - debug.costEstimate).toFixed(3)}
              </span>
            </div>
          )}
        </div>

        {/* Providers Tried */}
        {debug?.attemptedProviders && debug.attemptedProviders.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Providers Tried</span>
            <div className="flex flex-wrap gap-1">
              {debug.attemptedProviders.map((p, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className={`text-xs py-0 ${
                    p === debug.provider 
                      ? 'border-green-500/50 text-green-500' 
                      : 'border-destructive/50 text-destructive'
                  }`}
                >
                  {formatProvider(p)}
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
