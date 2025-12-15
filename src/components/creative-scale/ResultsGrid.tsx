/**
 * Results Grid Component
 * PRD-aligned: Shows variation results with download buttons (only if video exists)
 * Includes engine badges showing which engine rendered each variation
 * Updated for capability-based routing
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Download,
  FileJson,
  Play,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Cpu,
  Cloud,
  Server,
  FileCode,
  Monitor
} from 'lucide-react';
import type { ExecutionPlan } from '@/lib/creative-scale/compiler-types';
import type { RouterResult } from '@/lib/creative-scale/router-types';

interface ResultItem {
  variationIndex: number;
  plan: ExecutionPlan;
  result?: RouterResult;
  engineUsed: string;
  errorReason?: string;
  fallbackUsed?: boolean;
}

interface ResultsGridProps {
  items: ResultItem[];
  onDownloadVideo?: (item: ResultItem) => void;
  onDownloadPlan: (item: ResultItem) => void;
  onDuplicate?: (item: ResultItem) => void;
  onRetry?: (item: ResultItem) => void;
}

// Engine configuration for badges - server-only engines
const ENGINE_CONFIG: Record<string, {
  label: string;
  icon: typeof Cpu;
  color: string;
  bgColor: string;
  description: string;
}> = {
  // Server engines (primary)
  'server_ffmpeg': {
    label: 'Server FFmpeg',
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    description: 'Rendered on VPS server with native FFmpeg'
  },
  'vps-ffmpeg': {
    label: 'VPS FFmpeg',
    icon: Server,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    description: 'Rendered on VPS server with native FFmpeg'
  },
  // Cloud APIs
  'cloudinary': {
    label: 'Cloudinary',
    icon: Cloud,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    description: 'Transformed via Cloudinary Video API'
  },
  'mux': {
    label: 'Mux',
    icon: Cloud,
    color: 'text-pink-600',
    bgColor: 'bg-pink-500/10 border-pink-500/30',
    description: 'Processed via Mux Video API'
  },
  'fal-ai': {
    label: 'fal.ai',
    icon: Cloud,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10 border-orange-500/30',
    description: 'Processed via fal.ai API'
  },
  // Plan export (no rendering)
  'plan_export': {
    label: 'Plan Export',
    icon: FileCode,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    description: 'Execution plan exported for external processing'
  },
  'no-render': {
    label: 'Plan Only',
    icon: FileCode,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    description: 'Execution plan available for manual processing'
  },
  'none': {
    label: 'Not Executed',
    icon: FileCode,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted border-border',
    description: 'Execution not attempted'
  }
};

function getEngineConfig(engineUsed: string) {
  return ENGINE_CONFIG[engineUsed] || {
    label: engineUsed.replace(/[-_]/g, ' '),
    icon: Cpu,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted border-border',
    description: 'Unknown engine'
  };
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
        const hasVideo = ((item.result as any)?.status === 'completed' || (item.result as any)?.status === 'success') &&
          item.result && 'output_video_url' in item.result &&
          item.result.output_video_url;
        const isPlanOnly = item.engineUsed === 'plan_export' || item.engineUsed === 'no-render';
        const failed = item.result?.status === 'partial_success' || !item.result;
        const engineConfig = getEngineConfig(item.engineUsed);
        const EngineIcon = engineConfig.icon;

        return (
          <div
            key={item.plan.plan_id}
            className={`rounded-lg border p-4 ${failed && !isPlanOnly ? 'border-destructive/50 bg-destructive/5' :
              isPlanOnly ? 'border-amber-500/30 bg-amber-500/5' :
                'border-border'
              }`}
          >
            {/* Thumbnail / Placeholder */}
            <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
              {hasVideo ? (
                <video
                  src={(item.result as any).output_video_url}
                  className="w-full h-full object-cover"
                  controls={false}
                />
              ) : (
                <div className="text-center p-4">
                  {isPlanOnly ? (
                    <FileCode className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  ) : failed ? (
                    <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                  ) : (
                    <Play className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isPlanOnly ? 'Advanced rendering required' :
                      failed ? 'Execution failed' :
                        'No video generated'}
                  </p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">Variation {item.variationIndex + 1}</span>
                <Badge variant={hasVideo ? 'default' : isPlanOnly ? 'secondary' : failed ? 'destructive' : 'secondary'}>
                  {hasVideo ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Ready
                    </>
                  ) : isPlanOnly ? (
                    'Plan Exported'
                  ) : failed ? (
                    'Failed'
                  ) : (
                    'Plan Only'
                  )}
                </Badge>
              </div>

              {/* Engine Badge with Tooltip */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium cursor-help ${engineConfig.bgColor}`}>
                      <EngineIcon className={`w-3.5 h-3.5 ${engineConfig.color}`} />
                      <span className={engineConfig.color}>{engineConfig.label}</span>
                      {item.fallbackUsed && (
                        <Badge variant="outline" className="ml-1 px-1 py-0 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Fallback
                        </Badge>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">{engineConfig.description}</p>
                    {item.fallbackUsed && (
                      <p className="text-xs text-amber-500 mt-1">
                        ⚠ Used fallback engine due to primary engine limitation
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {item.errorReason && !isPlanOnly && (
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
                  variant={isPlanOnly ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => onDownloadPlan(item)}
                >
                  <FileJson className="w-3 h-3 mr-1" />
                  {isPlanOnly ? 'Download Plan' : 'Plan'}
                </Button>

                {/* Retry if failed (not for plan-only) */}
                {failed && !isPlanOnly && onRetry && (
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
