import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Film, Mic, Scissors, Music, Type, Sparkles } from "lucide-react";
import type { VariationConfig, UploadedAd } from "@/pages/CreativeReplicator";

interface GenerationProgressProps {
  progress: number;
  config: VariationConfig;
  uploadedAds: UploadedAd[];
}

const PIPELINE_STAGES = [
  { id: "deconstruct", label: "AI Deconstruction", icon: Sparkles, description: "Analyzing source ads" },
  { id: "rewrite", label: "Creative Rewriting", icon: Film, description: "Generating new scripts" },
  { id: "voice", label: "Voice Generation", icon: Mic, description: "Creating voiceovers" },
  { id: "video", label: "Video Generation", icon: Film, description: "Generating video clips" },
  { id: "edit", label: "FFMPEG Editing", icon: Scissors, description: "Auto-cutting & transitions" },
  { id: "music", label: "Music Sync", icon: Music, description: "Adding background music" },
  { id: "subtitles", label: "Subtitles", icon: Type, description: "Burning in captions" },
  { id: "export", label: "Export", icon: CheckCircle2, description: "Finalizing videos" },
];

export const GenerationProgress = ({
  progress,
  config,
  uploadedAds,
}: GenerationProgressProps) => {
  const currentStageIndex = Math.floor((progress / 100) * PIPELINE_STAGES.length);
  const completedVideos = Math.floor((progress / 100) * config.count);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Generating Variations</h2>
          <p className="text-muted-foreground">
            Creating {config.count} video variations from {uploadedAds.length} source ads
          </p>
        </div>
      </div>

      {/* Main Progress */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Overall Progress</span>
            <span className="text-2xl font-bold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedVideos} of {config.count} videos
            </span>
            <span className="text-muted-foreground">
              ETA: ~{Math.ceil(((100 - progress) / 100) * config.count * 0.5)} min
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {PIPELINE_STAGES.map((stage, index) => {
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;

          return (
            <Card
              key={stage.id}
              className={`transition-all ${
                isCurrent
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : isCompleted
                  ? "border-green-500/50 bg-green-500/5"
                  : "border-border/50 opacity-50"
              }`}
            >
              <CardContent className="p-4 text-center space-y-2">
                <div
                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <stage.icon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{stage.label}</p>
                  <p className="text-xs text-muted-foreground">{stage.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Task Details */}
      <Card className="border-primary/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <div className="flex-1">
              <p className="font-medium">
                {PIPELINE_STAGES[currentStageIndex]?.label || "Processing..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {PIPELINE_STAGES[currentStageIndex]?.description}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{config.engineTier.toUpperCase()}</Badge>
              {config.useN8nWebhook && <Badge variant="secondary">n8n</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FFMPEG Features Being Applied */}
      {currentStageIndex >= 4 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">FFMPEG Creative Engine</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Smart Auto-Cut</Badge>
              <Badge variant="outline">Dynamic Pacing</Badge>
              <Badge variant="outline">{config.transitions.join(", ")}</Badge>
              <Badge variant="outline">BPM Sync</Badge>
              <Badge variant="outline">Subtitles</Badge>
              <Badge variant="outline">Multi-Ratio Export</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
