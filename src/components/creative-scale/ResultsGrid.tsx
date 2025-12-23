/**
 * Results Grid Component
 * PRD-aligned: Shows variation results with download buttons (only if video exists)
 * Includes engine badges showing which engine rendered each variation
 * Updated for capability-based routing with in-app video playback
 */

import { useState, useRef, useCallback } from 'react';
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
import VideoPreviewPlayer from '@/components/VideoPreviewPlayer';
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

/**
 * Video Thumbnail with static image preview, hover-to-play, and duration overlay
 * Captures a frame from the video as a static image for faster initial loading
 */
function VideoThumbnail({
  videoUrl,
  onPlay,
  hasVideo
}: {
  videoUrl: string | null;
  onPlay: () => void;
  hasVideo: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Capture thumbnail frame when video metadata loads
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.duration) {
      setDuration(video.duration);
    }

    // Only seek for thumbnail if not already generated
    if (!thumbnailGenerated) {
      // Seek to 1 second or 25% for better thumbnail
      const seekTime = Math.min(1, video.duration * 0.25);
      video.currentTime = seekTime;
    }
  }, [thumbnailGenerated]);

  // Capture frame when seeked to thumbnail position
  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || thumbnailGenerated) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 180;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setThumbnailUrl(dataUrl);
      setThumbnailGenerated(true);
      // Reset video to start for hover preview
      video.currentTime = 0;
    } catch (e) {
      // CORS or other error - fallback to video element
      console.warn('Could not generate thumbnail:', e);
      setThumbnailGenerated(true);
    }
  }, [thumbnailGenerated]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
    if (videoRef.current && hasVideo) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Autoplay may be blocked, ignore
      });
    }
  }, [hasVideo]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  if (!hasVideo || !videoUrl) return null;

  return (
    <div
      className="w-full h-full relative cursor-pointer group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onPlay}
    >
      {/* Hidden canvas for thumbnail generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Static thumbnail image - shown when not hovering */}
      {thumbnailUrl && !isHovering && (
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="w-full h-full object-cover absolute inset-0"
        />
      )}

      {/* Video element - hidden until hover or no thumbnail */}
      <video
        ref={videoRef}
        src={videoUrl}
        className={`w-full h-full object-cover ${thumbnailUrl && !isHovering ? 'invisible' : 'visible'}`}
        controls={false}
        muted
        loop
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        onLoadedMetadata={handleLoadedMetadata}
        onSeeked={handleSeeked}
      />

      {/* Play overlay - shows when not hovering */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200 ${isHovering ? 'opacity-0' : 'opacity-100'
          }`}
      >
        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center backdrop-blur-sm">
          <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
        </div>
      </div>

      {/* Duration overlay - bottom right */}
      {duration !== null && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-[11px] text-white font-medium tabular-nums">
          {formatDuration(duration)}
        </div>
      )}

      {/* Hover indicator - bottom left */}
      {isHovering && (
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-medium backdrop-blur-sm">
          Click to expand
        </div>
      )}
    </div>
  );
}

export function ResultsGrid({
  items,
  onDownloadVideo,
  onDownloadPlan,
  onDuplicate,
  onRetry
}: ResultsGridProps) {
  const [playingVideo, setPlayingVideo] = useState<{
    url: string;
    title: string;
    engine: string;
  } | null>(null);

  return (
    <>
      {/* Video Player Modal */}
      <VideoPreviewPlayer
        open={!!playingVideo}
        onOpenChange={(open) => !open && setPlayingVideo(null)}
        videoUrl={playingVideo?.url || ''}
        title={playingVideo?.title}
        engineName={playingVideo?.engine}
        onDownload={() => {
          if (playingVideo?.url) {
            window.open(playingVideo.url, '_blank');
          }
        }}
      />

      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => {
          const hasVideo = ((item.result as any)?.status === 'completed' || (item.result as any)?.status === 'success') &&
            item.result && 'output_video_url' in item.result &&
            item.result.output_video_url;
          const videoUrl = hasVideo ? (item.result as any).output_video_url : null;
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
              {/* Thumbnail / Placeholder with Hover Preview */}
              <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                {hasVideo ? (
                  <VideoThumbnail
                    videoUrl={videoUrl}
                    hasVideo={!!hasVideo}
                    onPlay={() => {
                      if (videoUrl) {
                        setPlayingVideo({
                          url: videoUrl,
                          title: `Variation ${item.variationIndex + 1}`,
                          engine: engineConfig.label
                        });
                      }
                    }}
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
                  {/* Play Video - ONLY if exists */}
                  {hasVideo && (
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        if (videoUrl) {
                          setPlayingVideo({
                            url: videoUrl,
                            title: `Variation ${item.variationIndex + 1}`,
                            engine: engineConfig.label
                          });
                        }
                      }}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Play
                    </Button>
                  )}

                  {/* Download Video - ONLY if exists */}
                  {hasVideo && onDownloadVideo && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDownloadVideo(item)}
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  )}

                  {/* Download Plan - ALWAYS available */}
                  <Button
                    size="sm"
                    variant={isPlanOnly ? 'default' : 'outline'}
                    className={hasVideo ? '' : 'flex-1'}
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
    </>
  );
}
