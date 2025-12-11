import { useEffect, useState } from "react";
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
  status: "pending" | "processing" | "completed" | "failed";
  currentStage: string;
  stages: PipelineStage[];
  totalProgress: number;
  completedVideos: number;
  totalVideos: number;
  errors: string[];
  videoUrls: string[];
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
  { id: "url", label: "Generate Public URL", description: "Creating download links", icon: Link },
  { id: "complete", label: "Mark Complete", description: "Finalizing job", icon: CheckCheck },
];

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
    totalVideos,
    errors: [],
    videoUrls: [],
  });
  
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;
  const POLL_INTERVAL = 2000;

  // Start polling on mount
  useEffect(() => {
    const interval = setInterval(() => {
      pollJobStatus();
    }, POLL_INTERVAL);
    
    setPollingInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
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
      totalVideos,
      errors: Object.values(stageErrors) as string[],
      videoUrls: progress?.videoUrls || [],
    };

    setJobStatus(newStatus);

    // Check for completion
    if (job.status === 'completed' && newStatus.videoUrls.length > 0) {
      // Validate URLs before marking complete
      validateAndComplete(newStatus.videoUrls);
    } else if (job.status === 'failed') {
      onError(newStatus.errors);
      if (pollingInterval) clearInterval(pollingInterval);
    }
  };

  const validateAndComplete = async (urls: string[]) => {
    const validUrls: string[] = [];
    const invalidUrls: string[] = [];

    for (const url of urls) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          validUrls.push(url);
        } else {
          invalidUrls.push(url);
        }
      } catch {
        invalidUrls.push(url);
      }
    }

    if (invalidUrls.length > 0 && retryCount < MAX_RETRIES) {
      // Retry fetching invalid URLs
      setRetryCount(prev => prev + 1);
      console.log(`Retrying URL validation, attempt ${retryCount + 1}/${MAX_RETRIES}`);
      setTimeout(() => validateAndComplete(urls), 3000);
      return;
    }

    if (validUrls.length > 0) {
      onComplete(validUrls);
      if (pollingInterval) clearInterval(pollingInterval);
    } else if (retryCount >= MAX_RETRIES) {
      onError(['Failed to validate video URLs after multiple retries']);
      if (pollingInterval) clearInterval(pollingInterval);
    }
  };

  const handleManualRefresh = () => {
    pollJobStatus();
  };

  const getStageIcon = (stage: PipelineStage) => {
    const IconComponent = stage.icon;
    
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {jobStatus.status === "processing" ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : jobStatus.status === "completed" ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : jobStatus.status === "failed" ? (
              <AlertCircle className="w-5 h-5 text-destructive" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground" />
            )}
            Processing Pipeline
          </h3>
          <p className="text-sm text-muted-foreground">
            {completedStages}/{DEFAULT_STAGES.length} stages • {jobStatus.completedVideos}/{totalVideos} videos
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
          {retryCount > 0 && (
            <p className="text-xs text-orange-500 mt-2">
              URL validation retry {retryCount}/{MAX_RETRIES}...
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
