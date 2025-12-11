import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, Loader2, AlertCircle, Circle, RefreshCw,
  Sparkles, FileText, Mic, Film, Scissors, Music, Type, Upload, Link, CheckCheck
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface PipelineStage {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "pending" | "running" | "completed" | "error";
  progress?: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JobStatus {
  jobId: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  currentStage: string;
  stages: PipelineStage[];
  totalProgress: number;
  completedVideos: number;
  validatedVideos: number;
  totalVideos: number;
  errors: string[];
  videoUrls: string[];
  videoStatuses: Record<string, string>;
}

interface ProcessingTimelineProps {
  jobId: string;
  totalVideos: number;
  onComplete: (urls: string[]) => void;
  onError: (errors: string[]) => void;
}

const DEFAULT_STAGES: Omit<PipelineStage, "status">[] = [
  { id: "deconstruct", label: "AI Deconstruction", description: "Analyzing source ads", icon: Sparkles },
  { id: "rewrite", label: "Creative Rewrite", description: "New structure, hooks, pacing", icon: FileText },
  { id: "voice", label: "Voice Generation", description: "Creating voiceovers (optional)", icon: Mic },
  { id: "video", label: "Video Generation", description: "AI or FFMPEG processing", icon: Film },
  { id: "ffmpeg", label: "FFMPEG Editing", description: "Transitions, pacing, animation", icon: Scissors },
  { id: "music", label: "Music Sync", description: "Background music alignment", icon: Music },
  { id: "subtitles", label: "Subtitles / OCR", description: "Burning in captions", icon: Type },
  { id: "export", label: "Export", description: "Rendering final video", icon: Film },
  { id: "upload", label: "Upload to Storage", description: "Saving to cloud", icon: Upload },
  { id: "url", label: "URL Validation", description: "Verifying file accessibility", icon: Link },
  { id: "complete", label: "Mark Complete", description: "Finalizing job", icon: CheckCheck },
];

const POLL_INTERVAL = 2000;
const MAX_URL_VALIDATION_RETRIES = 5;
const URL_VALIDATION_DELAY = 3000;

export const ProcessingTimeline = ({ 
  jobId, 
  totalVideos, 
  onComplete, 
  onError 
}: ProcessingTimelineProps) => {
  const [jobStatus, setJobStatus] = useState<JobStatus>({
    jobId,
    status: "pending",
    currentStage: "deconstruct",
    stages: DEFAULT_STAGES.map(s => ({ ...s, status: "pending" as const })),
    totalProgress: 0,
    completedVideos: 0,
    validatedVideos: 0,
    totalVideos,
    errors: [],
    videoUrls: [],
    videoStatuses: {},
  });
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [urlValidationRetries, setUrlValidationRetries] = useState(0);
  const [isValidatingUrls, setIsValidatingUrls] = useState(false);
  const completionHandledRef = useRef(false);

  // Start polling on mount
  useEffect(() => {
    pollJobStatus();
    
    pollingIntervalRef.current = setInterval(() => {
      pollJobStatus();
    }, POLL_INTERVAL);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [jobId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pipeline_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const job = payload.new as any;
          if (job) {
            updateJobFromPayload(job);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const pollJobStatus = async () => {
    try {
      const { data: jobData, error } = await supabase
        .from('pipeline_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (error) {
        console.error('Poll error:', error);
        return;
      }

      if (jobData) {
        updateJobFromPayload(jobData);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const updateJobFromPayload = (job: any) => {
    const progress = job.progress as any;
    const currentStage = progress?.currentStage || "deconstruct";
    const completedStages = progress?.completedStages || [];
    const stageErrors = progress?.errors || {};
    const videoStatuses = progress?.videoStatuses || {};
    
    const updatedStages = DEFAULT_STAGES.map(stage => {
      let status: PipelineStage["status"] = "pending";
      
      if (completedStages.includes(stage.id)) {
        status = "completed";
      } else if (stageErrors[stage.id]) {
        status = "error";
      } else if (stage.id === currentStage) {
        status = "running";
      }
      
      return {
        ...stage,
        status,
        error: stageErrors[stage.id],
        progress: status === "running" ? (progress?.stageProgress || 0) : undefined,
      };
    });

    const completedCount = completedStages.length;
    const totalProgress = Math.round((completedCount / DEFAULT_STAGES.length) * 100);
    
    const newStatus: JobStatus = {
      jobId,
      status: job.status as any,
      currentStage,
      stages: updatedStages,
      totalProgress,
      completedVideos: progress?.completedVideos || 0,
      validatedVideos: progress?.validatedVideos || 0,
      totalVideos,
      errors: Object.values(stageErrors) as string[],
      videoUrls: progress?.videoUrls || [],
      videoStatuses,
    };

    setJobStatus(newStatus);

    // Handle job completion - ONLY when truly complete with validated URLs
    if (!completionHandledRef.current) {
      if ((job.status === 'completed' || job.status === 'partial') && newStatus.videoUrls.length > 0) {
        // Verify URLs before marking complete
        verifyAndComplete(newStatus.videoUrls);
      } else if (job.status === 'failed') {
        completionHandledRef.current = true;
        onError(newStatus.errors.length > 0 ? newStatus.errors : ['Pipeline failed']);
        stopPolling();
      }
    }
  };

  const verifyAndComplete = useCallback(async (urls: string[]) => {
    if (isValidatingUrls || completionHandledRef.current) return;
    
    setIsValidatingUrls(true);
    
    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          // Accept video content or storage URLs
          if ((contentType && contentType.includes('video')) || 
              url.includes('/storage/') ||
              response.ok) {
            validUrls.push(url);
            continue;
          }
        }
        invalidUrls.push(url);
      } catch {
        invalidUrls.push(url);
      }
    }

    // If we have invalid URLs and haven't exceeded retries, try again
    if (invalidUrls.length > 0 && urlValidationRetries < MAX_URL_VALIDATION_RETRIES) {
      console.log(`[ProcessingTimeline] URL validation: ${validUrls.length} valid, ${invalidUrls.length} invalid. Retry ${urlValidationRetries + 1}/${MAX_URL_VALIDATION_RETRIES}`);
      setUrlValidationRetries(prev => prev + 1);
      setIsValidatingUrls(false);
      
      // Wait and retry
      setTimeout(() => {
        verifyAndComplete(urls);
      }, URL_VALIDATION_DELAY);
      return;
    }

    setIsValidatingUrls(false);

    // Complete if we have at least some valid URLs
    if (validUrls.length > 0) {
      completionHandledRef.current = true;
      console.log(`[ProcessingTimeline] Generation complete: ${validUrls.length} valid videos`);
      onComplete(validUrls);
      stopPolling();
    } else if (urlValidationRetries >= MAX_URL_VALIDATION_RETRIES) {
      completionHandledRef.current = true;
      onError(['Failed to validate video URLs after multiple retries']);
      stopPolling();
    }
  }, [isValidatingUrls, urlValidationRetries, onComplete, onError]);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleManualRefresh = () => {
    pollJobStatus();
  };

  const getStageIcon = (stage: PipelineStage) => {
    switch (stage.status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const completedStages = jobStatus.stages.filter(s => s.status === "completed").length;
  
  // Calculate validated video count for display
  const validatedVideoCount = jobStatus.validatedVideos || jobStatus.videoUrls.length;
  const processingVideoCount = Object.values(jobStatus.videoStatuses).filter(
    s => s === 'processing' || s === 'validating' || s === 'uploading' || s === 'exporting'
  ).length;
  const failedVideoCount = Object.values(jobStatus.videoStatuses).filter(s => s === 'failed').length;

  // Determine overall status display
  const isProcessing = jobStatus.status === 'pending' || jobStatus.status === 'processing' || isValidatingUrls;
  const isComplete = (jobStatus.status === 'completed' || jobStatus.status === 'partial') && 
                     validatedVideoCount > 0 && 
                     !isValidatingUrls;
  const isFailed = jobStatus.status === 'failed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : isComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : isFailed ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
            {isProcessing 
              ? isValidatingUrls 
                ? "Validating Video URLs..." 
                : "Processing Pipeline"
              : isComplete
                ? "Generation Complete"
                : isFailed
                  ? "Generation Failed"
                  : "Initializing..."
            }
          </h3>
          <p className="text-sm text-muted-foreground">
            {completedStages}/{DEFAULT_STAGES.length} stages • 
            {validatedVideoCount > 0 && (
              <span className="text-green-500 ml-1">{validatedVideoCount} validated</span>
            )}
            {processingVideoCount > 0 && (
              <span className="text-orange-500 ml-1">{processingVideoCount} processing</span>
            )}
            {failedVideoCount > 0 && (
              <span className="text-destructive ml-1">{failedVideoCount} failed</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleManualRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-lg font-bold text-primary">{jobStatus.totalProgress}%</span>
          </div>
          <Progress value={jobStatus.totalProgress} className="h-2" />
          {isValidatingUrls && (
            <p className="text-xs text-orange-500 mt-2 animate-pulse">
              Validating URLs... Attempt {urlValidationRetries + 1}/{MAX_URL_VALIDATION_RETRIES}
            </p>
          )}
          {validatedVideoCount > 0 && validatedVideoCount < totalVideos && !isValidatingUrls && (
            <p className="text-xs text-muted-foreground mt-2">
              {validatedVideoCount} of {totalVideos} videos ready
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stage Timeline */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {jobStatus.stages.map((stage, index) => (
              <div 
                key={stage.id}
                className={`flex items-center gap-4 p-3 rounded-lg transition-all ${
                  stage.status === "running" 
                    ? "bg-primary/10 border border-primary/30" 
                    : stage.status === "completed"
                      ? "bg-green-500/10"
                      : stage.status === "error"
                        ? "bg-destructive/10"
                        : "bg-muted/30"
                }`}
              >
                {/* Timeline Connector */}
                <div className="flex flex-col items-center">
                  {getStageIcon(stage)}
                  {index < jobStatus.stages.length - 1 && (
                    <div className={`w-0.5 h-6 mt-1 ${
                      stage.status === "completed" ? "bg-green-500" : "bg-muted"
                    }`} />
                  )}
                </div>

                {/* Stage Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium text-sm ${
                      stage.status === "running" ? "text-primary" : ""
                    }`}>
                      {stage.label}
                    </p>
                    {stage.status === "completed" && (
                      <Badge variant="outline" className="text-green-500 border-green-500/50 text-xs">
                        Done
                      </Badge>
                    )}
                    {stage.status === "running" && (
                      <Badge className="bg-primary/20 text-primary text-xs animate-pulse">
                        Running
                      </Badge>
                    )}
                    {stage.status === "error" && (
                      <Badge variant="destructive" className="text-xs">
                        Error
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {stage.error || stage.description}
                  </p>
                  {stage.progress !== undefined && stage.status === "running" && (
                    <Progress value={stage.progress} className="h-1 mt-2" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {jobStatus.errors.length > 0 && (
        <Card className="border-destructive/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive mb-2">Errors</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {jobStatus.errors.map((error, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                  {error}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
