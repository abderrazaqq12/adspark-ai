import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Layers, 
  Shuffle, 
  Zap, 
  Clock, 
  Play, 
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SceneProgressTracker from "./SceneProgressTracker";
import BatchCostPreview from "./BatchCostPreview";

interface BatchGenerationProps {
  scriptId: string;
  scenesCount: number;
  onComplete?: () => void;
}

interface QueueItem {
  id: string;
  status: string;
  scene_id: string;
  engine_id: string;
  attempts: number;
  error_message: string | null;
  created_at: string;
}

export default function BatchGeneration({ scriptId, scenesCount, onComplete }: BatchGenerationProps) {
  const [variationsPerScene, setVariationsPerScene] = useState(3);
  const [randomEngines, setRandomEngines] = useState(true);
  const [randomPacing, setRandomPacing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [queueStatus, setQueueStatus] = useState<{
    total: number;
    completed: number;
    failed: number;
    processing: number;
    queued: number;
  } | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);

  const totalVariations = scenesCount * variationsPerScene;
  const estimatedMinutes = Math.ceil(totalVariations * 0.5);

  // Subscribe to queue updates
  useEffect(() => {
    if (!isGenerating) return;

    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generation_queue",
        },
        (payload) => {
          console.log("Queue update:", payload);
          fetchQueueStatus();
        }
      )
      .subscribe();

    // Initial fetch
    fetchQueueStatus();

    // Poll every 5 seconds as backup
    const interval = setInterval(fetchQueueStatus, 5000);

    return () => {
      channel.unsubscribe();
      clearInterval(interval);
    };
  }, [isGenerating, scriptId]);

  const fetchQueueStatus = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from("generation_queue")
      .select("*")
      .eq("user_id", user.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching queue:", error);
      return;
    }

    setQueueItems(data || []);

    const status = {
      total: data?.length || 0,
      completed: data?.filter(i => i.status === "completed").length || 0,
      failed: data?.filter(i => i.status === "failed").length || 0,
      processing: data?.filter(i => i.status === "processing").length || 0,
      queued: data?.filter(i => i.status === "queued").length || 0,
    };

    setQueueStatus(status);

    // Check if all done
    if (status.total > 0 && status.queued === 0 && status.processing === 0) {
      setIsGenerating(false);
      if (status.failed === 0) {
        toast.success("Batch generation completed!");
      } else {
        toast.warning(`Completed with ${status.failed} failures`);
      }
      onComplete?.();
    }
  };

  const startBatchGeneration = async () => {
    setIsGenerating(true);
    setIsPaused(false);

    try {
      const { data, error } = await supabase.functions.invoke("batch-generate", {
        body: {
          scriptId,
          variationsPerScene,
          randomEngines,
          randomPacing,
        },
      });

      if (error) throw error;

      toast.success(`Queued ${data.batch.totalVariations} video variations`);
      
      // Start processing
      processQueue();

    } catch (error: any) {
      console.error("Batch generation error:", error);
      toast.error(error.message || "Failed to start batch generation");
      setIsGenerating(false);
    }
  };

  const processQueue = async () => {
    if (isPaused) return;

    try {
      const { data, error } = await supabase.functions.invoke("process-queue", {
        body: { limit: 3 },
      });

      if (error) throw error;

      if (data.remainingInQueue > 0 && !isPaused) {
        // Continue processing after a short delay
        setTimeout(processQueue, 2000);
      }
    } catch (error: any) {
      console.error("Queue processing error:", error);
      // Retry after delay
      setTimeout(processQueue, 5000);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      processQueue();
    }
  };

  const retryFailed = async () => {
    const failedItems = queueItems.filter(i => i.status === "failed");
    
    for (const item of failedItems) {
      await supabase
        .from("generation_queue")
        .update({ status: "queued", attempts: 0, error_message: null })
        .eq("id", item.id);
    }

    toast.success("Retrying failed items");
    processQueue();
  };

  const progress = queueStatus 
    ? Math.round(((queueStatus.completed + queueStatus.failed) / queueStatus.total) * 100)
    : 0;

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Batch Video Generation
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Generate multiple video variations with different engines and styles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isGenerating ? (
          <>
            {/* Configuration */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-foreground">Variations per Scene</Label>
                  <Badge variant="outline" className="text-primary">
                    {variationsPerScene} variations
                  </Badge>
                </div>
                <Slider
                  value={[variationsPerScene]}
                  onValueChange={(v) => setVariationsPerScene(v[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {scenesCount} scenes × {variationsPerScene} = {totalVariations} total videos
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-foreground flex items-center gap-2">
                    <Shuffle className="w-4 h-4" />
                    Random Engine Selection
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use different AI engines for variety
                  </p>
                </div>
                <Switch checked={randomEngines} onCheckedChange={setRandomEngines} />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Random Pacing & Transitions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Vary speed and transition styles
                  </p>
                </div>
                <Switch checked={randomPacing} onCheckedChange={setRandomPacing} />
              </div>
            </div>

            {/* Cost Preview */}
            <BatchCostPreview 
              scenesCount={scenesCount} 
              variationsPerScene={variationsPerScene} 
            />

            {/* Estimate */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Estimated time: ~{estimatedMinutes} minutes</span>
              </div>
            </div>

            {/* Start Button */}
            <Button
              onClick={startBatchGeneration}
              className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Batch Generation ({totalVariations} videos)
            </Button>
          </>
        ) : (
          <>
            {/* Real-time Scene Progress Tracker */}
            <SceneProgressTracker 
              scriptId={scriptId} 
              onComplete={() => {
                setIsGenerating(false);
                onComplete?.();
              }}
            />

            {/* Queue Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Queue Progress</span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {queueStatus && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {queueStatus.completed} completed
                  </Badge>
                  {queueStatus.processing > 0 && (
                    <Badge variant="outline" className="text-primary border-primary/30">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      {queueStatus.processing} processing
                    </Badge>
                  )}
                  {queueStatus.queued > 0 && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      {queueStatus.queued} queued
                    </Badge>
                  )}
                  {queueStatus.failed > 0 && (
                    <Badge variant="outline" className="text-red-500 border-red-500/30">
                      <XCircle className="w-3 h-3 mr-1" />
                      {queueStatus.failed} failed
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={togglePause}
                className="flex-1"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
              {queueStatus && queueStatus.failed > 0 && (
                <Button variant="outline" onClick={retryFailed}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Failed
                </Button>
              )}
            </div>

            {/* Recent Activity */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Recent Activity</Label>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {queueItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs p-2 rounded bg-muted/20"
                  >
                    <span className="text-muted-foreground truncate">
                      Scene {item.scene_id.slice(0, 8)}...
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        item.status === "completed"
                          ? "text-green-500 border-green-500/30"
                          : item.status === "failed"
                          ? "text-red-500 border-red-500/30"
                          : item.status === "processing"
                          ? "text-primary border-primary/30"
                          : "text-muted-foreground"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
