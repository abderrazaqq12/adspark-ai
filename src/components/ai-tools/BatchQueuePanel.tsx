import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Layers, 
  Play, 
  Pause, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileImage,
  FileVideo,
  Clock
} from "lucide-react";
import { toast } from "sonner";

export interface BatchQueueItem {
  id: string;
  file: File;
  fileUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

interface BatchQueuePanelProps {
  queue: BatchQueueItem[];
  isProcessing: boolean;
  currentIndex: number;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onStartBatch: () => void;
  onPauseBatch: () => void;
  toolName?: string;
}

export function BatchQueuePanel({
  queue,
  isProcessing,
  currentIndex,
  onRemoveItem,
  onClearQueue,
  onStartBatch,
  onPauseBatch,
  toolName
}: BatchQueuePanelProps) {
  const completedCount = queue.filter(i => i.status === 'completed').length;
  const failedCount = queue.filter(i => i.status === 'failed').length;
  const totalProgress = queue.length > 0 
    ? Math.round((completedCount / queue.length) * 100) 
    : 0;

  const getStatusIcon = (status: BatchQueueItem['status']) => {
    switch (status) {
      case 'processing': return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: BatchQueueItem['status']) => {
    switch (status) {
      case 'processing': return <Badge variant="default" className="text-xs">Processing</Badge>;
      case 'completed': return <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-500">Done</Badge>;
      case 'failed': return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      default: return <Badge variant="outline" className="text-xs">Queued</Badge>;
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) {
      return <FileVideo className="w-5 h-5 text-primary" />;
    }
    return <FileImage className="w-5 h-5 text-primary" />;
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return '-';
    const endTime = end || new Date();
    const ms = endTime.getTime() - start.getTime();
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (queue.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Batch Queue
            <Badge variant="secondary" className="ml-1">{queue.length} files</Badge>
          </span>
          <div className="flex items-center gap-1">
            {isProcessing ? (
              <Button variant="outline" size="sm" onClick={onPauseBatch}>
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
            ) : (
              <Button 
                size="sm" 
                onClick={onStartBatch}
                disabled={queue.every(i => i.status === 'completed' || i.status === 'failed')}
                className="bg-gradient-primary"
              >
                <Play className="w-4 h-4 mr-1" />
                {completedCount > 0 ? 'Resume' : 'Start'}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClearQueue}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Overall Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {toolName && <span className="text-foreground font-medium">{toolName}</span>}
              {' '}• {completedCount}/{queue.length} completed
              {failedCount > 0 && <span className="text-destructive ml-1">({failedCount} failed)</span>}
            </span>
            <span className="text-muted-foreground">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} className="h-2" />
        </div>

        {/* Queue List */}
        <ScrollArea className="h-[200px] pr-3">
          <div className="space-y-2">
            {queue.map((item, index) => (
              <div 
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                  item.status === 'processing' 
                    ? 'bg-primary/5 border-primary/30' 
                    : item.status === 'completed'
                    ? 'bg-green-500/5 border-green-500/20'
                    : item.status === 'failed'
                    ? 'bg-destructive/5 border-destructive/20'
                    : 'bg-muted/30 border-border'
                }`}
              >
                {/* File Icon & Index */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                  {getFileIcon(item.file)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    {item.status !== 'queued' && (
                      <span>• {formatDuration(item.startTime, item.endTime)}</span>
                    )}
                  </div>
                  {item.status === 'processing' && (
                    <Progress value={item.progress} className="h-1 mt-1" />
                  )}
                  {item.error && (
                    <p className="text-xs text-destructive truncate mt-1">{item.error}</p>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  {getStatusBadge(item.status)}
                  {item.status === 'queued' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Completed Actions */}
        {completedCount > 0 && !isProcessing && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {completedCount} outputs ready
            </span>
            <Button variant="outline" size="sm" onClick={() => toast.success('Results saved to gallery')}>
              View in Gallery
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
