/**
 * Results Grid Component
 * PRD-aligned: Shows variation results with download buttons (only if video exists)
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Download,
  FileJson,
  Play,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy
} from 'lucide-react';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { RouterResult } from '@/lib/creative-scale/router-types';

interface ResultItem {
  variationIndex: number;
  plan: ExecutionPlan;
  result?: RouterResult;
  engineUsed: string;
  errorReason?: string;
}

interface ResultsGridProps {
  items: ResultItem[];
  onDownloadVideo?: (item: ResultItem) => void;
  onDownloadPlan: (item: ResultItem) => void;
  onDuplicate?: (item: ResultItem) => void;
  onRetry?: (item: ResultItem) => void;
}

export function ResultsGrid({
  items,
  onDownloadVideo,
  onDownloadPlan,
  onDuplicate,
  onRetry
}: ResultsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => {
        const hasVideo = item.result?.status === 'completed' && 
          'output_video_url' in item.result && 
          item.result.output_video_url;
        const failed = item.result?.status === 'partial_success' || !item.result;

        return (
          <div 
            key={item.plan.plan_id} 
            className={`rounded-lg border p-4 ${
              failed ? 'border-destructive/50 bg-destructive/5' : 'border-border'
            }`}
          >
            {/* Thumbnail / Placeholder */}
            <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
              {hasVideo ? (
                <video 
                  src={(item.result as any).output_video_url} 
                  className="w-full h-full object-cover"
                  controls={false}
                />
              ) : (
                <div className="text-center p-4">
                  {failed ? (
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  ) : (
                    <Play className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {failed ? 'Execution failed' : 'No video generated'}
                  </p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Variation {item.variationIndex + 1}</span>
                <Badge variant={hasVideo ? 'default' : failed ? 'destructive' : 'secondary'}>
                  {hasVideo ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Ready
                    </>
                  ) : failed ? (
                    'Failed'
                  ) : (
                    'Plan Only'
                  )}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground">
                Engine: <span className="capitalize">{item.engineUsed.replace('-', ' ')}</span>
              </div>

              {item.errorReason && (
                <p className="text-xs text-destructive">{item.errorReason}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {/* Download Video - ONLY if exists */}
                {hasVideo && onDownloadVideo && (
                  <Button 
                    size="sm" 
                    variant="default"
                    className="flex-1"
                    onClick={() => onDownloadVideo(item)}
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Video
                  </Button>
                )}

                {/* Download Plan - ALWAYS available */}
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  onClick={() => onDownloadPlan(item)}
                >
                  <FileJson className="w-3 h-3 mr-1" />
                  Plan
                </Button>

                {/* Retry if failed */}
                {failed && onRetry && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onRetry(item)}
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                )}

                {/* Duplicate & Iterate */}
                {onDuplicate && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onDuplicate(item)}
                    title="Duplicate & Iterate"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
