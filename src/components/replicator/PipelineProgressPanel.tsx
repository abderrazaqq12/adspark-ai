import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, CheckCircle2, XCircle, Clock, AlertTriangle,
  RotateCw, Zap, Timer, Settings2
} from "lucide-react";
import { useRealtimePipeline, type VideoJobStatus, type PipelineStage } from "@/hooks/useRealtimePipeline";

interface PipelineProgressPanelProps {
  jobId: string | null;
  onComplete?: () => void;
  onVideoReady?: (videoId: string, url: string) => void;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  queued: 'Queued',
  analyzing: 'AI Analysis',
  rewriting: 'Creative Rewrite',
  voice: 'Voice Generation',
  assembling: 'Video Assembly',
  ffmpeg_render: 'FFMPEG Render',
  subtitle_burn: 'Subtitles',
  upload: 'Uploading',
  validate: 'Validating',
  completed: 'Ready',
  failed: 'Failed',
};

const STAGE_ICONS: Record<PipelineStage, React.ReactNode> = {
  queued: <Clock className="w-4 h-4" />,
  analyzing: <Settings2 className="w-4 h-4 animate-spin" />,
  rewriting: <Zap className="w-4 h-4" />,
  voice: <Loader2 className="w-4 h-4 animate-spin" />,
  assembling: <Loader2 className="w-4 h-4 animate-spin" />,
  ffmpeg_render: <Settings2 className="w-4 h-4 animate-spin" />,
  subtitle_burn: <Loader2 className="w-4 h-4 animate-spin" />,
  upload: <Loader2 className="w-4 h-4 animate-spin" />,
  validate: <Loader2 className="w-4 h-4 animate-spin" />,
  completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
};

export function PipelineProgressPanel({ 
  jobId, 
  onComplete,
  onVideoReady 
}: PipelineProgressPanelProps) {
  const { progress, isLoading, retryVideo, retryAllFailed } = useRealtimePipeline({
    jobId,
    onComplete: onComplete ? () => onComplete() : undefined,
    onVideoReady,
  });

  if (!jobId) {
    return null;
  }

  if (isLoading && !progress) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading pipeline status...</span>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStageColor = (stage: PipelineStage): string => {
    switch (stage) {
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-destructive';
      case 'queued': return 'text-muted-foreground';
      default: return 'text-orange-500';
    }
  };

  const videoStatuses = Object.values(progress.videoStatuses);
  const processingCount = videoStatuses.filter(v => 
    !['completed', 'failed'].includes(v.stage)
  ).length;

  return (
    <div className="space-y-4">
      {/* Overall Progress Header */}
      <Card className={`border-border/50 ${progress.hasErrors ? 'border-destructive/30' : progress.isComplete ? 'border-green-500/30' : ''}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {processingCount > 0 ? (
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
              ) : progress.isComplete && !progress.hasErrors ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : progress.hasErrors ? (
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              <div>
                <h3 className="font-semibold text-foreground">
                  {processingCount > 0 
                    ? `Processing ${processingCount} videos...`
                    : progress.isComplete && !progress.hasErrors
                      ? 'All videos ready'
                      : progress.failedVideos > 0
                        ? `${progress.completedVideos} ready, ${progress.failedVideos} failed`
                        : 'Pipeline ready'
                  }
                </h3>
                <p className="text-sm text-muted-foreground">
                  {progress.completedVideos}/{progress.totalVideos} completed • Stage: {progress.currentStage}
                </p>
              </div>
            </div>
            {progress.failedVideos > 0 && (
              <Button
                onClick={retryAllFailed}
                variant="outline"
                size="sm"
                className="border-orange-500/50 text-orange-500"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Retry Failed ({progress.failedVideos})
              </Button>
            )}
          </div>

          {/* Real progress bar - based on actual completed videos */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Overall Progress</span>
              <span>{progress.overallProgress}%</span>
            </div>
            <Progress value={progress.overallProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Per-Video Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {videoStatuses.map((video) => (
          <VideoStatusCard 
            key={video.id} 
            video={video}
            onRetry={() => retryVideo(video.id)}
            formatTime={formatTime}
            getStageColor={getStageColor}
          />
        ))}
      </div>
    </div>
  );
}

interface VideoStatusCardProps {
  video: VideoJobStatus;
  onRetry: () => void;
  formatTime: (s: number) => string;
  getStageColor: (s: PipelineStage) => string;
}

function VideoStatusCard({ video, onRetry, formatTime, getStageColor }: VideoStatusCardProps) {
  const isActive = !['completed', 'failed'].includes(video.stage);
  const isFailed = video.stage === 'failed';
  const isReady = video.stage === 'completed';

  return (
    <Card className={`border-border/50 ${
      isFailed ? 'border-destructive/30 bg-destructive/5' :
      isReady ? 'border-green-500/30 bg-green-500/5' :
      isActive ? 'border-orange-500/30' : ''
    }`}>
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {STAGE_ICONS[video.stage]}
            <span className={`text-sm font-medium ${getStageColor(video.stage)}`}>
              {STAGE_LABELS[video.stage]}
            </span>
          </div>
          {video.retryCount > 0 && (
            <Badge variant="outline" className="text-xs">
              Retry #{video.retryCount}
            </Badge>
          )}
        </div>

        {/* Progress / Timer */}
        {isActive && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {formatTime(video.elapsedSeconds)}
              </span>
              <span>{video.stageProgress}%</span>
            </div>
            <Progress value={video.stageProgress} className="h-1" />
          </div>
        )}

        {/* Engine info */}
        {video.engineUsed && (
          <div className="text-xs text-muted-foreground">
            Engine: {video.engineUsed}
            {video.fallbackUsed && video.fallbackUsed !== 'original' && (
              <span className="text-orange-500"> (fallback)</span>
            )}
          </div>
        )}

        {/* Error message */}
        {isFailed && video.errorMessage && (
          <div className="text-xs text-destructive truncate" title={video.errorMessage}>
            {video.errorMessage}
          </div>
        )}

        {/* Retry button for failed */}
        {isFailed && video.retryCount < 4 && (
          <Button
            onClick={onRetry}
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs"
          >
            <RotateCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
