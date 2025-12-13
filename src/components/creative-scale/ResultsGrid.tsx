/**
 * Results Grid Component
 * PRD-aligned: Shows variation results with download buttons (only if video exists)
 * Includes engine badges showing which engine rendered each variation
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
  FileCode
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

// Engine configuration for badges
const ENGINE_CONFIG: Record<string, { 
  label: string; 
  icon: typeof Cpu; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  'ffmpeg-browser': {
    label: 'Browser FFmpeg',
    icon: Cpu,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10 border-green-500/30',
    description: 'Rendered locally using FFmpeg WASM'
  },
  'ffmpeg-cloud': {
    label: 'Cloud FFmpeg',
    icon: Cloud,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 border-blue-500/30',
    description: 'Rendered on cloud server via fal.ai'
  },
  'cloudinary': {
    label: 'Cloudinary',
    icon: Server,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    description: 'Rendered using Cloudinary Video API'
  },
  'managed-api': {
    label: 'Managed API',
    icon: Server,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10 border-purple-500/30',
    description: 'Rendered using managed video API'
  },
  'no-render': {
    label: 'Plan Only',
    icon: FileCode,
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10 border-amber-500/30',
    description: 'No rendering - execution plan available for manual processing'
  }
};

function getEngineConfig(engineUsed: string) {
  return ENGINE_CONFIG[engineUsed] || {
    label: engineUsed.replace(/-/g, ' '),
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
        const hasVideo = item.result?.status === 'completed' && 
          'output_video_url' in item.result && 
          item.result.output_video_url;
        const failed = item.result?.status === 'partial_success' || !item.result;
        const engineConfig = getEngineConfig(item.engineUsed);
        const EngineIcon = engineConfig.icon;

        return (
          <div 
            key={item.plan.plan_id} 
            className={`rounded-lg border p-4 ${
              failed ? 'border-destructive/50 bg-destructive/5' : 'border-border'
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
                        ⚠ Used fallback engine due to primary engine failure
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

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
