import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  Rocket, 
  FileText, 
  Mic, 
  Layers, 
  Film, 
  Package,
  CheckCircle2,
  Loader2,
  Clock,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Json } from "@/integrations/supabase/types";

interface AutopilotProgressProps {
  jobId: string;
  onComplete?: () => void;
}

interface ProgressData {
  scripts_generated: number;
  voiceovers_generated: number;
  scenes_broken_down: number;
  videos_generated: number;
  videos_assembled: number;
}

interface AutopilotJob {
  id: string;
  product_name: string;
  status: string;
  scripts_count: number;
  variations_per_scene: number;
  total_videos: number;
  completed_videos: number;
  progress: ProgressData;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

const parseProgress = (progress: Json | null): ProgressData => {
  const defaultProgress: ProgressData = {
    scripts_generated: 0,
    voiceovers_generated: 0,
    scenes_broken_down: 0,
    videos_generated: 0,
    videos_assembled: 0
  };
  
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    return defaultProgress;
  }
  
  const p = progress as Record<string, Json | undefined>;
  return {
    scripts_generated: typeof p.scripts_generated === 'number' ? p.scripts_generated : 0,
    voiceovers_generated: typeof p.voiceovers_generated === 'number' ? p.voiceovers_generated : 0,
    scenes_broken_down: typeof p.scenes_broken_down === 'number' ? p.scenes_broken_down : 0,
    videos_generated: typeof p.videos_generated === 'number' ? p.videos_generated : 0,
    videos_assembled: typeof p.videos_assembled === 'number' ? p.videos_assembled : 0
  };
};

const STEPS = [
  { key: 'scripts_generated', label: 'Scripts Generation', icon: FileText },
  { key: 'voiceovers_generated', label: 'Voiceover Generation', icon: Mic },
  { key: 'scenes_broken_down', label: 'Scene Breakdown', icon: Layers },
  { key: 'videos_generated', label: 'Video Generation', icon: Film },
  { key: 'videos_assembled', label: 'Assembly', icon: Package },
];

export default function AutopilotProgress({ jobId, onComplete }: AutopilotProgressProps) {
  const navigate = useNavigate();
  const [job, setJob] = useState<AutopilotJob | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Fetch initial job data
    const fetchJob = async () => {
      const { data, error } = await supabase
        .from('autopilot_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (data && !error) {
        setJob({
          ...data,
          progress: parseProgress(data.progress)
        } as AutopilotJob);
      }
    };

    fetchJob();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`autopilot-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'autopilot_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          const updatedData = payload.new as Record<string, unknown>;
          const updatedJob: AutopilotJob = {
            id: updatedData.id as string,
            product_name: updatedData.product_name as string,
            status: updatedData.status as string,
            scripts_count: updatedData.scripts_count as number,
            variations_per_scene: updatedData.variations_per_scene as number,
            total_videos: updatedData.total_videos as number,
            completed_videos: updatedData.completed_videos as number,
            progress: parseProgress(updatedData.progress as Json),
            error_message: updatedData.error_message as string | undefined,
            created_at: updatedData.created_at as string,
            started_at: updatedData.started_at as string | undefined,
            completed_at: updatedData.completed_at as string | undefined,
          };
          setJob(updatedJob);
          
          if (updatedJob.status === 'completed' && onComplete) {
            onComplete();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, onComplete]);

  // Elapsed time counter
  useEffect(() => {
    if (!job?.started_at || job.status === 'completed' || job.status === 'failed') return;

    const startTime = new Date(job.started_at).getTime();
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [job?.started_at, job?.status]);

  if (!job) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading job status...</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepProgress = (stepKey: string) => {
    const progressValue = job.progress[stepKey as keyof ProgressData] || 0;
    const maxValue = stepKey === 'videos_generated' || stepKey === 'videos_assembled' 
      ? job.total_videos 
      : job.scripts_count;
    return { current: progressValue, max: maxValue };
  };

  const getStepStatus = (stepKey: string, index: number) => {
    const { current, max } = getStepProgress(stepKey);
    if (current >= max) return 'complete';
    if (current > 0) return 'active';
    
    // Check if previous step is complete
    if (index > 0) {
      const prevStep = STEPS[index - 1];
      const prevProgress = getStepProgress(prevStep.key);
      if (prevProgress.current >= prevProgress.max) return 'pending';
    }
    
    return index === 0 ? 'active' : 'waiting';
  };

  const overallProgress = job.total_videos > 0 
    ? Math.round((job.completed_videos / job.total_videos) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Autopilot Generation</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{job.product_name}</p>
              </div>
            </div>
            <Badge 
              variant={
                job.status === 'completed' ? 'default' :
                job.status === 'failed' ? 'destructive' :
                'secondary'
              }
              className="capitalize"
            >
              {job.status === 'generating' ? 'In Progress' : job.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{job.completed_videos}/{job.total_videos} videos</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-sm pt-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Elapsed: {formatTime(elapsedTime)}</span>
              </div>
              <div className="text-muted-foreground">
                ~{Math.max(0, Math.ceil((job.total_videos - job.completed_videos) * 0.5))} min remaining
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {job.status === 'failed' && job.error_message && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Generation Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{job.error_message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const status = getStepStatus(step.key, index);
              const { current, max } = getStepProgress(step.key);
              const percentage = max > 0 ? Math.round((current / max) * 100) : 0;

              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className={`p-2 rounded-full shrink-0 ${
                    status === 'complete' ? 'bg-green-500/10 text-green-500' :
                    status === 'active' ? 'bg-primary/10 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {status === 'complete' ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : status === 'active' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        status === 'waiting' ? 'text-muted-foreground' : ''
                      }`}>
                        {step.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {current}/{max}
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${status === 'waiting' ? 'opacity-40' : ''}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {job.status === 'completed' && (
        <div className="flex justify-center">
          <Button onClick={() => navigate('/videos')} className="gap-2">
            View Generated Videos
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
