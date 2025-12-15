import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Upload, Settings2, Play, FolderOpen, Brain } from "lucide-react";
import { AdUploader } from "@/components/replicator/AdUploader";
import { SimplifiedVariationSettings } from "@/components/replicator/SimplifiedVariationSettings";
import { GenerationProgress } from "@/components/replicator/GenerationProgress";
import { EnhancedResultsGallery } from "@/components/replicator/EnhancedResultsGallery";
import { ProcessingTimeline } from "@/components/replicator/ProcessingTimeline";
import { PipelineProgressPanel } from "@/components/replicator/PipelineProgressPanel";
import { BackendModeSelector } from "@/components/BackendModeSelector";
import { useBackendMode } from "@/hooks/useBackendMode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EngineRouter } from "@/lib/video-engines/EngineRouter";
import { EngineTask } from "@/lib/video-engines/types";
import { AdvancedEngineRouter, RoutingRequest, RenderingMode } from "@/lib/video-engines/AdvancedRouter";
import { ScenePlan } from "@/lib/video-engines/registry-types";
import { RenderDebugPanel } from "@/components/replicator/RenderDebugPanel";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface UploadedAd {
  id: string;
  file: File;
  url: string;
  duration: number;
  thumbnail?: string;
  analysis?: AdAnalysis;
}

export interface AdAnalysis {
  transcript: string;
  scenes: SceneData[];
  hook: string;
  pacing: string;
  style: string;
  transitions: string[];
  voiceTone: string;
  musicType: string;
  aspectRatio: string;
}

export interface SceneData {
  startTime: number;
  endTime: number;
  description: string;
  type: string;
}

export interface VariationConfig {
  count: number;
  hookStyles: string[];
  pacing: string;
  transitions: string[];
  actors: string[];
  voiceSettings: {
    language: string;
    tone: string;
  };
  ratios: string[];
  engineTier: string;
  useN8nWebhook: boolean;
  randomizeEngines: boolean;
  useAIOperator: boolean;
  adIntelligence: {
    enabled: boolean;
    language: string;
    market: string;
    videoType: string;
    platform: string;
    productCategory: string;
    conversionGoal: string;
    targetAudience: {
      ageRange?: string;
      gender?: string;
      interests?: string[];
    };
    productContext: {
      name?: string;
      description?: string;
      benefits?: string[];
    };
  };
}

export interface GeneratedVideo {
  id: string;
  url: string;
  thumbnail: string;
  hookStyle: string;
  pacing: string;
  engine: string;
  ratio: string;
  duration: number;
  status: "processing" | "completed" | "failed";
}

// Engine selection based on tier - VIDEO MODELS ONLY
const ENGINE_BY_TIER: Record<string, string[]> = {
  free: ["FFMPEG-Motion", "Ken-Burns", "Parallax", "AI-Shake"],
  low: ["Kling-2.5", "MiniMax", "Wan-2.5", "Kie-Luma"],
  medium: ["Runway-Gen3", "Veo-3.1", "Luma-Dream", "Kie-Runway"],
  premium: ["Sora-2", "Sora-2-Pro", "Kie-Veo-3.1"],
};

const CreativeReplicator = () => {
  const [activeStep, setActiveStep] = useState<string>("upload");
  const [projectName, setProjectName] = useState<string>("");
  const [uploadedAds, setUploadedAds] = useState<UploadedAd[]>([]);
  // Default: Arabic (Saudi), Saudi Arabia market
  const [variationConfig, setVariationConfig] = useState<VariationConfig>({
    count: 10,
    hookStyles: ["ai-auto"],
    pacing: "dynamic",
    transitions: ["ai-auto"],
    actors: [],
    voiceSettings: { language: "ar-sa", tone: "ai-auto" },
    ratios: ["9:16"],
    engineTier: "free",
    useN8nWebhook: false,
    randomizeEngines: true,
    useAIOperator: true,
    adIntelligence: {
      enabled: true,
      language: "ar-sa",
      market: "saudi",
      videoType: "ai-auto",
      platform: "tiktok",
      productCategory: "general",
      conversionGoal: "cod",
      targetAudience: {},
      productContext: {}
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Advanced Mode State
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [renderingMode, setRenderingMode] = useState<RenderingMode>('auto');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const { mode: backendMode } = useBackendMode();

  // Real-time subscription for video status updates
  useEffect(() => {
    if (generatedVideos.length === 0) return;

    const channel = supabase
      .channel('video-variations-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_variations',
        },
        (payload) => {
          const updatedVideo = payload.new;
          setGeneratedVideos((prev) =>
            prev.map((video) =>
              video.id === updatedVideo.id
                ? {
                  ...video,
                  status: updatedVideo.status === 'completed' ? 'completed' :
                    updatedVideo.status === 'failed' ? 'failed' : 'processing',
                  url: updatedVideo.video_url || video.url,
                  thumbnail: updatedVideo.thumbnail_url || video.thumbnail,
                }
                : video
            )
          );

          if (updatedVideo.status === 'completed') {
            toast.success(`Video ${updatedVideo.variation_number} completed!`);
          } else if (updatedVideo.status === 'failed') {
            toast.error(`Video ${updatedVideo.variation_number} failed`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [generatedVideos.length]);

  // AI-driven engine selection within tier
  const selectEngineForVariation = (tier: string, index: number): string => {
    const engines = ENGINE_BY_TIER[tier] || ENGINE_BY_TIER.free;
    if (variationConfig.randomizeEngines) {
      return engines[Math.floor(Math.random() * engines.length)];
    }
    return engines[index % engines.length];
  };

  // AI-driven pacing selection based on hook strength and language
  const selectPacing = (hookStyle: string, language: string): string => {
    if (variationConfig.pacing !== "dynamic") return variationConfig.pacing;

    // Arabic markets prefer medium pacing
    if (language.startsWith("ar")) {
      return hookStyle === "emotional" ? "slow" : "medium";
    }
    // Western markets prefer fast pacing
    return hookStyle === "story" ? "medium" : "fast";
  };

  // AI-driven hook selection
  const selectHook = (index: number): string => {
    if (!variationConfig.hookStyles.includes("ai-auto")) {
      return variationConfig.hookStyles[index % variationConfig.hookStyles.length];
    }

    const aiHooks = ["question", "shock", "emotional", "story", "problem-solution", "statistic"];
    const market = variationConfig.adIntelligence?.market || "saudi";

    // Market-specific hook preferences
    const marketHooks: Record<string, string[]> = {
      saudi: ["emotional", "story", "problem-solution"],
      uae: ["emotional", "story", "shock"],
      usa: ["question", "shock", "statistic"],
      europe: ["statistic", "question", "story"],
      latam: ["shock", "emotional", "question"],
    };

    const preferredHooks = marketHooks[market] || aiHooks;
    return preferredHooks[index % preferredHooks.length];
  };





  const handleStartGeneration = async () => {
    if (uploadedAds.length === 0) {
      toast.error("Please upload at least one ad to replicate");
      return;
    }

    setIsGenerating(true);
    setActiveStep("generate");
    setGenerationProgress(0);

    try {
      const currentAd = uploadedAds[0];

      // 1. ANALYZE (AI BRAIN)
      if (!currentAd.analysis) {
        toast.info("Analyzing ad structure first...");
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("User not authenticated");

      const jobId = crypto.randomUUID();

      // CREATE PIPELINE JOB RECORD (Critical for Realtime Progress)
      const { error: jobError } = await supabase
        .from('pipeline_jobs')
        .insert({
          user_id: userId,
          stage_name: 'creative_replicator',
          stage_number: 1,
          status: 'pending',
          progress: 0,
          input_data: {
            totalVideos: variationConfig.count,
            completedVideos: 0,
            currentStage: 'queued'
          }
        });

      if (jobError) {
        console.error("Failed to create pipeline job:", jobError);
        toast.error("Failed to initialize job tracking");
        setIsGenerating(false);
        return;
      }

      setCurrentJobId(jobId);
      const newGeneratedVideos: GeneratedVideo[] = [];

      // 2. EXECUTE (LOOP)
      for (let i = 0; i < variationConfig.count; i++) {
        const variationId = i + 1;
        const hookStyle = selectHook(i);
        const ratio = variationConfig.ratios[i % variationConfig.ratios.length];

        // 2a. CONSTRUCT SCENE PLAN (From AI Brain Analysis)
        const plan: ScenePlan = {
          scenes: currentAd.analysis?.scenes?.map((s: any) => ({
            type: s.type.toUpperCase() as any,
            start: s.startTime,
            end: s.endTime,
            description: s.description
          })) || [],
          totalDuration: currentAd.duration,
          resolution: "1080p", // Default assumption
          requiredCapabilities: ["trim", "merge", "text_overlay"]
        };

        // 2b. ROUTE TO ENGINE
        const routingReq: RoutingRequest = {
          plan,
          userTier: variationConfig.engineTier as any,
          preferLocal: true,
          renderingMode: renderingMode // User override
        };

        const engineSpec = AdvancedEngineRouter.selectEngine(routingReq);
        const engine = AdvancedEngineRouter.getEngineInstance(engineSpec.id);

        // Update Debug Info
        setDebugInfo({
          engine: engineSpec.name,
          executionPath: `Router(${renderingMode}) -> ${engineSpec.id}`,
          status: 'pending',
          logs: ['Selecting engine...', `Chosen: ${engineSpec.name}`],
          payload: routingReq
        });

        // Initialize if first time for this engine type
        await engine.initialize();

        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) throw new Error("User not authenticated");

        const jobId = crypto.randomUUID();
        setCurrentJobId(jobId);
        const newGeneratedVideos: GeneratedVideo[] = [];

        // 3. EXECUTE (LOOP)
        for (let i = 0; i < variationConfig.count; i++) {
          const variationId = i + 1;
          const hookStyle = selectHook(i);
          const ratio = variationConfig.ratios[i % variationConfig.ratios.length];

          // Create DB Record (Processing)
          const { data: insertedVideo, error: insertError } = await supabase
            .from('video_variations')
            .insert({
              user_id: userId,
              variation_number: variationId,
              variation_config: {
                hookStyle,
                ratio,
                engine: engine.name,
                engineTier: variationConfig.engineTier
              },
              status: "processing",
              metadata: { job_id: jobId }
            })
            .select()
            .single();

          if (insertError) {
            console.error("DB Insert Error", insertError);
            continue;
          }

          // Build Task
          const task: EngineTask = {
            id: insertedVideo.id,
            videoUrl: currentAd.url, // Video URL for server-side processing
            outputRatio: ratio,
            config: {
              scenes: currentAd.analysis?.scenes?.map(s => ({
                type: s.type,
                start: s.startTime,
                end: s.endTime,
                description: s.description
              })) || [
                  // Fallback scenes if analysis missing
                  { type: "hook", start: 0, end: 3 },
                  { type: "body", start: 3, end: currentAd.duration }
                ],
              variants: 1,
              market: variationConfig.adIntelligence.market,
              language: variationConfig.adIntelligence.language
            }
          };

          // Process Client-Side
          toast.message(`Generating variation ${variationId}...`);
          const result = await engine.process(task);

          setDebugInfo((prev: any) => ({
            ...prev,
            status: result.success ? 'success' : 'failed',
            logs: [...(prev?.logs || []), ...(result.logs || [])],
            serverJobId: result.jobId
          }));

          if (result.success && result.videoUrl) {
            // UPLOAD RESULT TO STORAGE (Persist)
            const blob = await fetch(result.videoUrl).then(r => r.blob());
            const fileName = `${userId}/${jobId}_${variationId}.mp4`;

            const { error: uploadError } = await supabase.storage
              .from('videos')
              .upload(fileName, blob, { upsert: true });

            let publicUrl = result.videoUrl; // Default to local blob if upload fails

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
              publicUrl = urlData.publicUrl;
            }

            // Update DB Record (Completed)
            await supabase
              .from('video_variations')
              .update({
                status: 'completed',
                video_url: publicUrl,
                thumbnail_url: publicUrl, // Use video as thumb for now
                duration_sec: currentAd.duration // Approximate
              })
              .eq('id', insertedVideo.id);

            newGeneratedVideos.push({
              id: insertedVideo.id,
              url: publicUrl,
              thumbnail: publicUrl,
              hookStyle,
              pacing: "medium",
              engine: engine.name,
              ratio,
              duration: currentAd.duration,
              status: "completed"
            });

            setGeneratedVideos(prev => [...prev, ...newGeneratedVideos]);
            setGenerationProgress(((i + 1) / variationConfig.count) * 100);

          } else {
            // Handle Failure
            await supabase
              .from('video_variations')
              .update({ status: 'failed', error_message: result.error })
              .eq('id', insertedVideo.id);

            toast.error(`Variation ${variationId} failed: ${result.error}`);
          }
        }

      }
      setIsGenerating(false);
      setActiveStep("results");
      toast.success("Generation Complete!");

    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || "Generation failed");
      setIsGenerating(false);
    }
  };

  const steps = [
    { id: "upload", label: "Upload Ads", icon: Upload, count: uploadedAds.length },
    { id: "settings", label: "Configure", icon: Settings2 },
    { id: "generate", label: "Generate", icon: Play },
    { id: "results", label: "Results", icon: FolderOpen, count: generatedVideos.length },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Creative Replicator</h1>
              <p className="text-muted-foreground text-sm">
                Upload ads, AI generates 1-100 optimized variations automatically
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BackendModeSelector compact />

            <div className="flex items-center gap-4 bg-muted/50 p-2 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <Switch
                  id="adv-mode"
                  checked={isAdvancedMode}
                  onCheckedChange={setIsAdvancedMode}
                />
                <Label htmlFor="adv-mode" className="text-xs cursor-pointer">Advanced</Label>
              </div>

              {isAdvancedMode && (
                <Select value={renderingMode} onValueChange={(v: any) => setRenderingMode(v)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Render Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (Smart)</SelectItem>
                    <SelectItem value="server_only">Force Server</SelectItem>
                    <SelectItem value="cloudinary_only">Cloudinary Only</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <Button
              onClick={handleStartGeneration}
              disabled={isGenerating || uploadedAds.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Zap className="w-4 h-4 mr-2" />
              Generate AI Variations
            </Button>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeStep === step.id
                ? "bg-primary text-primary-foreground"
                : "bg-card hover:bg-accent text-muted-foreground"
                }`}
            >
              <step.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{step.label}</span>
              {step.count !== undefined && step.count > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {step.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            {activeStep === "upload" && (
              <AdUploader
                uploadedAds={uploadedAds}
                setUploadedAds={setUploadedAds}
                projectName={projectName}
                setProjectName={setProjectName}
                onContinue={() => setActiveStep("settings")}
              />
            )}

            {activeStep === "settings" && (
              <SimplifiedVariationSettings
                config={variationConfig}
                setConfig={setVariationConfig}
                onBack={() => setActiveStep("upload")}
                onGenerate={handleStartGeneration}
              />
            )}

            {activeStep === "generate" && (
              <div className="space-y-6">
                {/* Real-time pipeline progress - backend-driven, not timer-based */}
                <PipelineProgressPanel
                  jobId={currentJobId}
                  onComplete={() => {
                    setIsGenerating(false);
                    setActiveStep("results");
                    toast.success("Generation complete!");
                  }}
                  onVideoReady={(videoId, url) => {
                    setGeneratedVideos(prev => prev.map(v =>
                      v.id === videoId ? { ...v, url, status: 'completed' as const } : v
                    ));
                  }}
                />
                {/* Legacy processing timeline for compatibility */}
                {currentJobId && (
                  <ProcessingTimeline
                    jobId={currentJobId}
                    totalVideos={variationConfig.count * variationConfig.ratios.length}
                    onComplete={(urls) => {
                      setIsGenerating(false);
                      setActiveStep("results");
                      toast.success(`Generated ${urls.length} videos!`);
                    }}
                    onError={(errors) => {
                      toast.error(errors[0] || "Generation failed");
                    }}
                  />
                )}
              </div>
            )}

            {activeStep === "results" && (
              <EnhancedResultsGallery
                videos={generatedVideos}
                setVideos={setGeneratedVideos}
                jobId={currentJobId || undefined}
                onRegenerate={() => {
                  setActiveStep("settings");
                }}
              />
            )}
          </CardContent>
        </Card>

        {isAdvancedMode && (
          <RenderDebugPanel debugInfo={debugInfo} isOpen={true} />
        )}

      </div>
    </div>
  );
};

export default CreativeReplicator;
