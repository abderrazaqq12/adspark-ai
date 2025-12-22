import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { History, CheckCircle2, XCircle, Clock, DollarSign, Trash2 } from "lucide-react";

export interface ExecutionHistoryItem {
  id: string;
  timestamp: Date;
  toolId: string;
  toolName: string;
  provider: string;
  model: string;
  cost: number;
  success: boolean;
  durationMs: number;
  outputUrl?: string;
}

interface ExecutionHistoryPanelProps {
  history: ExecutionHistoryItem[];
  onClear?: () => void;
  onSelectItem?: (item: ExecutionHistoryItem) => void;
}

export function ExecutionHistoryPanel({ 
  history, 
  onClear,
  onSelectItem 
}: ExecutionHistoryPanelProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  if (history.length === 0) {
    return (
      <Card className="bg-muted/30 border-border">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <History className="w-4 h-4" />
            Execution History
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-xs text-muted-foreground text-center py-4">
            No executions yet this session
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalCost = history.reduce((sum, item) => sum + item.cost, 0);
  const successCount = history.filter(item => item.success).length;

  return (
    <Card className="bg-muted/30 border-border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            History
            <Badge variant="secondary" className="text-xs">
              {history.length}
            </Badge>
          </span>
          {onClear && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={onClear}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 text-center p-2 bg-muted/50 rounded">
          <div>
            <p className="text-xs text-muted-foreground">Runs</p>
            <p className="text-sm font-semibold text-foreground">{history.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Success</p>
            <p className="text-sm font-semibold text-green-500">
              {successCount}/{history.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-sm font-semibold text-primary">
              ${totalCost.toFixed(2)}
            </p>
          </div>
        </div>

        {/* History List */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {history.slice().reverse().map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectItem?.(item)}
                className={`p-2 rounded border cursor-pointer transition-colors ${
                  item.success 
                    ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10' 
                    : 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {item.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                      {item.toolName}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[100px]" title={item.provider}>
                    {item.provider}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDuration(item.durationMs)}
                    </span>
                    <span className="flex items-center gap-0.5 text-green-500">
                      <DollarSign className="w-3 h-3" />
                      {item.cost.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
