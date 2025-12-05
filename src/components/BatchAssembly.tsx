import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Video,
  Clock,
  Download,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BatchAssemblyProps {
  scriptId: string;
  scenesCount: number;
  videosToGenerate: number;
  transitionStyle: string;
  randomizeOrder: boolean;
  autoAddMusic: boolean;
  onComplete?: () => void;
}

interface AssemblyJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

export default function BatchAssembly({
  scriptId,
  scenesCount,
  videosToGenerate,
  transitionStyle,
  randomizeOrder,
  autoAddMusic,
  onComplete,
}: BatchAssemblyProps) {
  const [isAssembling, setIsAssembling] = useState(false);
  const [jobs, setJobs] = useState<AssemblyJob[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);

  const startBatchAssembly = async () => {
    if (!scriptId || scenesCount === 0) {
      toast.error("No scenes available for assembly");
      return;
    }

    setIsAssembling(true);
    setProgress(0);
    setCurrentJobIndex(0);

    // Initialize job list
    const initialJobs: AssemblyJob[] = Array.from(
      { length: videosToGenerate },
      (_, i) => ({
        id: `job_${i + 1}`,
        status: 'pending',
      })
    );
    setJobs(initialJobs);

    toast.info(`Starting batch assembly of ${videosToGenerate} videos...`);

    try {
      // Process jobs sequentially
      for (let i = 0; i < videosToGenerate; i++) {
        setCurrentJobIndex(i);
        
        // Update job status to processing
        setJobs(prev => prev.map((job, idx) => 
          idx === i ? { ...job, status: 'processing' } : job
        ));

        // Determine transition type for this video
        const transitions = ['fade', 'slide', 'zoom', 'cut'];
        const transition = transitionStyle === 'mixed' 
          ? transitions[Math.floor(Math.random() * transitions.length)]
          : transitionStyle;

        try {
          const { data, error } = await supabase.functions.invoke("assemble-video", {
            body: {
              scriptId,
              outputFormat: 'mp4',
              addSubtitles: true,
              addWatermark: false,
              transitionType: transition,
              transitionDuration: 0.5,
              randomizeSceneOrder: randomizeOrder,
              addBackgroundMusic: autoAddMusic,
              variationIndex: i + 1,
            },
          });

          if (error) throw error;

          // Update job as completed
          setJobs(prev => prev.map((job, idx) => 
            idx === i ? { 
              ...job, 
              status: 'completed',
              videoUrl: data.finalVideoUrl,
            } : job
          ));

          toast.success(`Video ${i + 1}/${videosToGenerate} assembled`);
        } catch (err: any) {
          // Update job as failed
          setJobs(prev => prev.map((job, idx) => 
            idx === i ? { 
              ...job, 
              status: 'failed',
              error: err.message,
            } : job
          ));

          toast.error(`Video ${i + 1} failed: ${err.message}`);
        }

        // Update progress
        setProgress(((i + 1) / videosToGenerate) * 100);

        // Small delay between jobs to avoid overwhelming the server
        if (i < videosToGenerate - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const completedCount = jobs.filter(j => j.status === 'completed').length + 1;
      toast.success(`Batch assembly complete! ${completedCount}/${videosToGenerate} videos created.`);
      onComplete?.();
    } catch (error: any) {
      console.error("Batch assembly error:", error);
      toast.error("Batch assembly failed");
    } finally {
      setIsAssembling(false);
    }
  };

  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;

  return (
    <div className="space-y-4">
      {/* Start Button */}
      {!isAssembling && jobs.length === 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  onClick={startBatchAssembly}
                  disabled={!scriptId || scenesCount === 0}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-Assemble All ({videosToGenerate} videos)
                  {(!scriptId || scenesCount === 0) && (
                    <Info className="w-3 h-3 ml-2 opacity-70" />
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            {(!scriptId || scenesCount === 0) && (
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">
                  {!scriptId 
                    ? "Save your project first to enable assembly" 
                    : scenesCount === 0 
                    ? "Generate scenes in Step 2 before assembly"
                    : "Ready to assemble"}
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Progress Section */}
      {(isAssembling || jobs.length > 0) && (
        <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAssembling ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
              <span className="text-sm font-medium text-foreground">
                {isAssembling 
                  ? `Assembling video ${currentJobIndex + 1} of ${videosToGenerate}...`
                  : 'Assembly Complete'
                }
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {completedJobs}/{videosToGenerate}
            </Badge>
          </div>

          <Progress value={progress} className="h-2" />

          {/* Job Status Grid */}
          <div className="grid grid-cols-5 gap-2">
            {jobs.slice(0, 10).map((job, idx) => (
              <div
                key={job.id}
                className={`p-2 rounded border text-center text-xs ${
                  job.status === 'completed'
                    ? 'bg-green-500/10 border-green-500/30 text-green-600'
                    : job.status === 'failed'
                    ? 'bg-destructive/10 border-destructive/30 text-destructive'
                    : job.status === 'processing'
                    ? 'bg-primary/10 border-primary/30 text-primary animate-pulse'
                    : 'bg-muted/20 border-border text-muted-foreground'
                }`}
              >
                {job.status === 'completed' && <CheckCircle2 className="w-3 h-3 mx-auto mb-1" />}
                {job.status === 'failed' && <XCircle className="w-3 h-3 mx-auto mb-1" />}
                {job.status === 'processing' && <Loader2 className="w-3 h-3 mx-auto mb-1 animate-spin" />}
                {job.status === 'pending' && <Clock className="w-3 h-3 mx-auto mb-1" />}
                #{idx + 1}
              </div>
            ))}
            {jobs.length > 10 && (
              <div className="p-2 rounded border border-border text-center text-xs text-muted-foreground">
                +{jobs.length - 10} more
              </div>
            )}
          </div>

          {/* Summary */}
          {!isAssembling && jobs.length > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-green-600">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" />
                  {completedJobs} completed
                </span>
                {failedJobs > 0 && (
                  <span className="text-destructive">
                    <XCircle className="w-3 h-3 inline mr-1" />
                    {failedJobs} failed
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setJobs([]);
                  setProgress(0);
                }}
              >
                Reset
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
