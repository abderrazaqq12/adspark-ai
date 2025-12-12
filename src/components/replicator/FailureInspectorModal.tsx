import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  RefreshCw, 
  FileVideo, 
  Settings2,
  Clock,
  Server,
  Zap,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

interface PipelineError {
  stage: string;
  errorType: 'engine_error' | 'ffmpeg_error' | 'upload_error' | 'url_error' | 'timeout_error' | 'validation_error' | 'file_missing' | 'permission_denied';
  message: string;
  code?: string;
  details?: string;
  retryable: boolean;
  suggestedFix?: string;
}

interface PipelineStatus {
  deconstruction?: 'pending' | 'running' | 'success' | 'failed';
  rewriting?: 'pending' | 'running' | 'success' | 'failed';
  voice_generation?: 'pending' | 'running' | 'success' | 'failed';
  video_generation?: 'pending' | 'running' | 'success' | 'failed';
  ffmpeg?: 'pending' | 'running' | 'success' | 'failed';
  export?: 'pending' | 'running' | 'success' | 'failed';
  upload?: 'pending' | 'running' | 'success' | 'failed';
  url_validation?: 'pending' | 'running' | 'success' | 'failed';
}

interface VideoMetadata {
  retry_count?: number;
  fallback_mode?: string;
  engine_used?: string;
  last_error_at?: string;
  pipeline_error?: PipelineError;
  pipeline_status?: PipelineStatus;
}

interface FailedVideoInfo {
  id: string;
  hookStyle: string;
  pacing: string;
  ratio: string;
  engine: string;
  duration?: number;
  metadata?: VideoMetadata;
}

interface FailureInspectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: FailedVideoInfo | null;
  onRetry: () => void;
  isRetrying?: boolean;
}

const STAGE_LABELS: Record<string, string> = {
  deconstruction: 'AI Deconstruction',
  rewriting: 'Creative Rewrite',
  voice_generation: 'Voice Generation',
  video_generation: 'Video Generation',
  ffmpeg: 'FFMPEG Editing',
  export: 'Export',
  upload: 'Upload to Storage',
  url_validation: 'URL Validation',
};

const ERROR_TYPE_LABELS: Record<string, { label: string; icon: typeof AlertTriangle }> = {
  engine_error: { label: 'Video Engine Error', icon: Server },
  ffmpeg_error: { label: 'FFMPEG Processing Error', icon: Settings2 },
  upload_error: { label: 'Upload Error', icon: FileVideo },
  url_error: { label: 'URL Validation Error', icon: Zap },
  timeout_error: { label: 'Timeout Error', icon: Clock },
  validation_error: { label: 'Validation Error', icon: HelpCircle },
};

const HUMAN_READABLE_ERRORS: Record<string, string> = {
  'Video engine did not return output frames': 'The AI video engine failed to generate video frames. This may be due to unsupported input format or engine overload.',
  'FFMPEG export crashed during encoding': 'Video encoding failed during FFMPEG processing. Input video may have incompatible codec.',
  'Upload failed: network timeout': 'Could not upload video to storage due to network issues.',
  'Invalid or missing public URL': 'Storage returned invalid URL. File may still be processing.',
  'Pipeline exceeded maximum time allowed': 'Video generation took longer than the allowed timeout.',
  'Engine returned unsupported format': 'AI engine returned video in an unsupported format.',
  'Audio track missing in input file': 'Input video has no audio track. Voice-over step failed.',
  'Resolution mismatch detected': 'Input video resolution does not match expected dimensions.',
  'Out of memory in upscale step': 'Ran out of memory during video upscaling.',
  'No input videos provided': 'No source video was provided for processing.',
};

function getHumanReadableError(message: string): string {
  // Check exact matches first
  if (HUMAN_READABLE_ERRORS[message]) {
    return HUMAN_READABLE_ERRORS[message];
  }
  
  // Check partial matches
  for (const [key, value] of Object.entries(HUMAN_READABLE_ERRORS)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  // Return the original message if no match
  return message;
}

export function FailureInspectorModal({ 
  open, 
  onOpenChange, 
  video, 
  onRetry,
  isRetrying = false,
}: FailureInspectorModalProps) {
  if (!video) return null;

  const metadata = video.metadata || {};
  const pipelineError = metadata.pipeline_error;
  const pipelineStatus = metadata.pipeline_status || {};
  const retryCount = metadata.retry_count || 0;
  const fallbackMode = metadata.fallback_mode;
  const engineUsed = metadata.engine_used || video.engine;

  const errorTypeInfo = pipelineError?.errorType 
    ? ERROR_TYPE_LABELS[pipelineError.errorType] 
    : null;
  const ErrorIcon = errorTypeInfo?.icon || AlertTriangle;

  // Determine the failed stage
  const failedStage = Object.entries(pipelineStatus).find(([_, status]) => status === 'failed')?.[0];

  // Get suggested solutions based on error type
  const getSuggestedSolutions = (): string[] => {
    const solutions: string[] = [];
    
    if (pipelineError?.suggestedFix) {
      solutions.push(pipelineError.suggestedFix);
    }

    if (pipelineError?.errorType === 'engine_error') {
      solutions.push('Enable "FFMPEG Only" mode to bypass AI engine');
      solutions.push('Try a different video engine tier');
    }

    if (pipelineError?.errorType === 'ffmpeg_error') {
      solutions.push('Convert input video to MP4 H.264 format');
      solutions.push('Ensure video has at least one audio track');
    }

    if (pipelineError?.errorType === 'url_error') {
      solutions.push('Wait 30-60 seconds and refresh results');
      solutions.push('File may still be processing in storage');
    }

    if (pipelineError?.errorType === 'timeout_error') {
      solutions.push('Use a shorter input video (under 30 seconds)');
      solutions.push('Reduce number of variations');
    }

    if (solutions.length === 0) {
      solutions.push('Click Retry to attempt generation again');
      solutions.push('System will automatically try fallback modes');
    }

    return solutions;
  };

  const getStageStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Failure Details
          </DialogTitle>
          <DialogDescription>
            Understanding what went wrong with this video variation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Summary */}
          <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
            <div className="flex items-start gap-3">
              <ErrorIcon className="w-5 h-5 text-destructive mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-medium text-sm">
                  {errorTypeInfo?.label || 'Unknown Error'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pipelineError?.message 
                    ? getHumanReadableError(pipelineError.message)
                    : 'No specific error message available. The generation process may have been interrupted.'}
                </p>
                {failedStage && (
                  <Badge variant="destructive" className="mt-2">
                    Failed at: {STAGE_LABELS[failedStage] || failedStage}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Pipeline Status */}
          {Object.keys(pipelineStatus).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Pipeline Status
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <div 
                    key={key} 
                    className={`flex items-center gap-2 p-2 rounded ${
                      pipelineStatus[key as keyof PipelineStatus] === 'failed' 
                        ? 'bg-destructive/10' 
                        : pipelineStatus[key as keyof PipelineStatus] === 'success'
                          ? 'bg-green-500/10'
                          : 'bg-muted/50'
                    }`}
                  >
                    {getStageStatusIcon(pipelineStatus[key as keyof PipelineStatus])}
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Video Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Video Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ratio:</span>
                <Badge variant="outline">{video.ratio}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hook Style:</span>
                <Badge variant="secondary">{video.hookStyle}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pacing:</span>
                <Badge variant="secondary">{video.pacing}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Engine:</span>
                <Badge variant="outline">{engineUsed}</Badge>
              </div>
              {retryCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retry Attempts:</span>
                  <span>{retryCount}</span>
                </div>
              )}
              {fallbackMode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fallback Mode:</span>
                  <Badge variant="outline">{fallbackMode.replace('_', ' ')}</Badge>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Suggested Solutions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Suggested Solutions
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {getSuggestedSolutions().map((solution, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {solution}
                </li>
              ))}
            </ul>
          </div>

          {/* Retry Info */}
          {retryCount < 4 && (
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="text-muted-foreground">
                <strong>Next retry will use:</strong>{' '}
                {retryCount === 0 && 'Same engine (attempt 1)'}
                {retryCount === 1 && 'Same engine (attempt 2)'}
                {retryCount === 2 && 'FFMPEG-only mode (no AI engine)'}
                {retryCount === 3 && 'Safe mode (minimal processing)'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={onRetry}
              disabled={isRetrying || retryCount >= 4}
              className="flex-1"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : retryCount >= 4 ? (
                'Max Retries Reached'
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Generation
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}