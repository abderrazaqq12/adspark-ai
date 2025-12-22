import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Upload, Settings2, Play, FolderOpen, Brain, Server, Cloud, CheckCircle2, Loader2 } from "lucide-react";
import { AdUploader } from "@/components/replicator/AdUploader";
import { AICreativeConfigPanel } from "@/components/replicator/AICreativeConfigPanel";
import { AICreativeBrain, type BrainOutput, type AIVariationDecision, ENGINE_TIERS } from "@/lib/replicator/ai-creative-brain";
import { GenerationProgress } from "@/components/replicator/GenerationProgress";
import { EnhancedResultsGallery } from "@/components/replicator/EnhancedResultsGallery";
import { ProcessingTimeline } from "@/components/replicator/ProcessingTimeline";
import { PipelineProgressPanel } from "@/components/replicator/PipelineProgressPanel";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EngineRouter } from "@/lib/video-engines/EngineRouter";
import { EngineTask } from "@/lib/video-engines/types";
import { AdvancedEngineRouter, RoutingRequest, RenderingMode } from "@/lib/video-engines/AdvancedRouter";
import { ScenePlan } from "@/lib/video-engines/registry-types";
import { RenderDebugPanel } from "@/components/replicator/RenderDebugPanel";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRenderBackendStatus } from "@/hooks/useRenderBackendStatus";

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
  // Auto-detect available backends
  const backendStatus = useRenderBackendStatus();
  
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
    voiceSettings: { language: "ar", tone: "ai-auto" },
    ratios: ["9:16"],
    engineTier: "free",
    randomizeEngines: true,
    useAIOperator: true,
    adIntelligence: {
      enabled: true,
      language: "ar",
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

  // Debug state
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // AI Brain output - stores all decisions for the generation run
  const [currentBrainOutput, setCurrentBrainOutput] = useState<BrainOutput | null>(null);

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





  /**
   * AI Brain-driven generation handler
   * Uses BrainOutput decisions for each variation
   */
  const handleStartGenerationWithBrain = async (brainOutput: BrainOutput) => {
    if (uploadedAds.length === 0) {
      toast.error("Please upload at least one ad to replicate");
      return;
    }

    // Store brain output for reference
    setCurrentBrainOutput(brainOutput);
    setIsGenerating(true);
    setActiveStep("generate");
    setGenerationProgress(0);

    try {
      const currentAd = uploadedAds[0];
      const { decisions, costEstimate, optimizationStrategy } = brainOutput;

      // Log AI Brain strategy
      console.log("🧠 AI Brain Strategy:", optimizationStrategy);
      console.log("💰 Estimated Cost:", costEstimate);
      toast.info(`AI Brain: ${optimizationStrategy}`);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("User not authenticated");

      const jobId = crypto.randomUUID();

      // CREATE PIPELINE JOB RECORD with AI Brain metadata
      const { error: jobError } = await supabase
        .from('pipeline_jobs')
        .insert({
          user_id: userId,
          stage_name: 'creative_replicator_v2',
          stage_number: 1,
          status: 'pending',
          progress: 0,
          estimated_cost: costEstimate.optimized,
          input_data: {
            totalVideos: decisions.length,
            completedVideos: 0,
            currentStage: 'queued',
            aiStrategy: optimizationStrategy,
            brainDecisions: decisions.map(d => ({
              framework: d.framework,
              engineTier: d.engineTier,
              duration: d.targetDuration,
              cost: d.estimatedCost
            }))
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

      // EXECUTE LOOP - Using AI Brain decisions
      for (let i = 0; i < decisions.length; i++) {
        const decision = decisions[i];
        const variationId = i + 1;

        // Log decision for this variation
        console.log(`📹 Variation ${variationId}:`, {
          framework: decision.framework,
          hook: decision.hookType,
          engine: decision.selectedProvider,
          duration: decision.targetDuration,
          cost: decision.estimatedCost
        });

        // Get ratio from config (platform-based)
        const ratio = variationConfig.ratios[0] || "9:16";

        // CONSTRUCT SCENE PLAN with AI Brain duration
        const plan: ScenePlan = {
          scenes: currentAd.analysis?.scenes?.map((s: any) => ({
            type: s.type.toUpperCase() as any,
            start: s.startTime,
            end: s.endTime,
            description: s.description
          })) || [],
          totalDuration: decision.targetDuration, // AI Brain enforced duration (20-35s)
          resolution: "1080p",
          requiredCapabilities: ["trim", "merge", "text_overlay", "resize"] as any
        };

        // ROUTE TO ENGINE based on AI Brain decision
        const autoRenderingMode: RenderingMode = decision.useFFMPEGOnly
          ? 'server_only'
          : backendStatus.vpsServer.available 
            ? 'server_only' 
            : backendStatus.edgeFunctions.available 
              ? 'auto' 
              : 'cloudinary_only';

        const routingReq: RoutingRequest = {
          plan,
          userTier: decision.engineTier as any, // AI Brain selected tier
          preferLocal: backendStatus.vpsServer.available,
          renderingMode: autoRenderingMode
        };

        const engineSpec = AdvancedEngineRouter.selectEngine(routingReq);
        const engine = AdvancedEngineRouter.getEngineInstance(engineSpec.id);

        // Update Debug Info with AI Brain reasoning
        setDebugInfo({
          engine: decision.selectedProvider,
          engineTier: decision.engineTier,
          framework: decision.framework,
          hookType: decision.hookType,
          targetDuration: decision.targetDuration,
          estimatedCost: decision.estimatedCost,
          useFFMPEG: decision.useFFMPEGOnly,
          executionPath: `AIBrain -> ${decision.engineTier} -> ${decision.selectedProvider}`,
          status: 'pending',
          logs: [
            `🧠 AI Brain Decision for Variation ${variationId}:`,
            `  Framework: ${decision.framework} - ${decision.reasoning.frameworkReason}`,
            `  Engine: ${decision.selectedProvider} - ${decision.reasoning.engineReason}`,
            `  Duration: ${decision.targetDuration}s - ${decision.reasoning.durationReason}`,
            `  Pacing: ${decision.pacing}`,
            `  Transitions: ${decision.transitions.join(', ')}`,
            `  Cost: $${decision.estimatedCost.toFixed(3)}`
          ],
          payload: routingReq
        });

        // Initialize engine
        await engine.initialize();

        // Create DB Record with AI Brain metadata
        const { data: insertedVideo, error: insertError } = await supabase
          .from('video_variations')
          .insert({
            user_id: userId,
            variation_number: variationId,
            variation_config: {
              hookStyle: decision.hookType,
              framework: decision.framework,
              pacing: decision.pacing,
              transitions: decision.transitions,
              ratio,
              engine: decision.selectedProvider,
              engineTier: decision.engineTier,
              targetDuration: decision.targetDuration,
              useFFMPEG: decision.useFFMPEGOnly,
              aiReasoning: decision.reasoning
            },
            status: "processing",
            cost_usd: decision.estimatedCost,
            metadata: { 
              job_id: jobId,
              ai_brain_decision: {
                framework: decision.framework,
                videoType: decision.videoType,
                engineTier: decision.engineTier
              }
            }
          })
          .select()
          .single();

        if (insertError) {
          console.error("DB Insert Error", insertError);
          continue;
        }

        // Build Task with AI Brain parameters
        const task: EngineTask = {
          id: insertedVideo.id,
          videoUrl: currentAd.url,
          outputRatio: ratio,
          config: {
            scenes: currentAd.analysis?.scenes?.map(s => ({
              type: s.type,
              start: s.startTime,
              end: s.endTime,
              description: s.description
            })) || [
              { type: "hook", start: 0, end: 3 },
              { type: "body", start: 3, end: decision.targetDuration }
            ],
            variants: 1,
            market: variationConfig.adIntelligence.market,
            language: variationConfig.adIntelligence.language,
            // AI Brain parameters stored in strategy
            strategy: {
              framework: decision.framework,
              hookType: decision.hookType,
              pacing: decision.pacing,
              transitions: decision.transitions,
              targetDuration: decision.targetDuration
            }
          }
        };

        // Process with selected engine
        toast.message(`Generating variation ${variationId} (${decision.framework}, ${decision.hookType})...`);
        const result = await engine.process(task);

        setDebugInfo((prev: any) => ({
          ...prev,
          status: result.success ? 'success' : 'failed',
          logs: [...(prev?.logs || []), ...(result.logs || [])],
          serverJobId: result.jobId,
          outputType: result.outputType
        }));

        // Handle success
        if (result.success && result.outputType === 'video' && result.videoUrl) {
          const blob = await fetch(result.videoUrl).then(r => r.blob());
          const fileName = `${userId}/${jobId}_${variationId}.mp4`;

          const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(fileName, blob, { upsert: true });

          let publicUrl = result.videoUrl;

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('videos').getPublicUrl(fileName);
            publicUrl = urlData.publicUrl;
          }

          // Update DB Record with actual cost
          await supabase
            .from('video_variations')
            .update({
              status: 'completed',
              video_url: publicUrl,
              thumbnail_url: publicUrl,
              duration_sec: decision.targetDuration,
              cost_usd: decision.estimatedCost
            })
            .eq('id', insertedVideo.id);

          newGeneratedVideos.push({
            id: insertedVideo.id,
            url: publicUrl,
            thumbnail: publicUrl,
            hookStyle: decision.hookType,
            pacing: decision.pacing,
            engine: decision.selectedProvider,
            ratio,
            duration: decision.targetDuration,
            status: "completed"
          });

          setGeneratedVideos(prev => [...prev, ...newGeneratedVideos]);
          setGenerationProgress(((i + 1) / decisions.length) * 100);

        } else if (result.success && result.outputType === 'plan') {
          toast.info(`Variation ${variationId}: Plan compiled (${decision.framework})`);
          await supabase
            .from('video_variations')
            .update({
              status: 'pending_render',
              error_message: "Plan compiled, awaiting render"
            })
            .eq('id', insertedVideo.id);

        } else {
          await supabase
            .from('video_variations')
            .update({ status: 'failed', error_message: result.error })
            .eq('id', insertedVideo.id);

          toast.error(`Variation ${variationId} failed: ${result.error}`);
        }
      }

      setIsGenerating(false);
      setActiveStep("results");
      toast.success(`Generation Complete! Total cost: $${costEstimate.optimized.toFixed(2)}`);

    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || "Generation failed");
      setIsGenerating(false);
    }
  };

  // Legacy handler (fallback)
  const handleStartGeneration = async () => {
    // Generate brain output on-the-fly if not using new flow
    const brain = new AICreativeBrain({
      numberOfVideos: variationConfig.count,
      language: variationConfig.adIntelligence?.language || 'ar',
      market: variationConfig.adIntelligence?.market || 'saudi',
      platform: variationConfig.adIntelligence?.platform || 'tiktok',
      sourceVideoDuration: uploadedAds[0]?.duration || 30,
      availableApiKeys: ['fal_ai', 'runway'], // Default fallback
    });
    const output = brain.generateDecisions();
    await handleStartGenerationWithBrain(output);
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
            {/* Auto-detected Backend Status */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                    {backendStatus.loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : backendStatus.vpsServer.available ? (
                      <>
                        <Server className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-500 font-medium">VPS Active</span>
                        {backendStatus.vpsServer.latency && (
                          <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
                            {backendStatus.vpsServer.latency}ms
                          </Badge>
                        )}
                      </>
                    ) : backendStatus.edgeFunctions.available ? (
                      <>
                        <Cloud className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-blue-500 font-medium">Edge Functions</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-amber-500 font-medium">Cloud Only</span>
                      </>
                    )}
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <p className="font-medium">Auto-detected Render Backends</p>
                    <div className="flex items-center gap-2">
                      <span className={backendStatus.vpsServer.available ? 'text-green-500' : 'text-muted-foreground'}>
                        VPS Server: {backendStatus.vpsServer.available ? '✓ Online' : '✗ Offline'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={backendStatus.edgeFunctions.available ? 'text-green-500' : 'text-muted-foreground'}>
                        Edge Functions: {backendStatus.edgeFunctions.available ? '✓ Ready' : '✗ Unavailable'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={backendStatus.cloudinaryApi.available ? 'text-green-500' : 'text-muted-foreground'}>
                        Cloudinary: {backendStatus.cloudinaryApi.configured ? '✓ Configured' : '✗ Not configured'}
                      </span>
                    </div>
                    <p className="text-muted-foreground pt-1">
                      Using: <span className="font-medium capitalize">{backendStatus.recommended}</span> (auto-selected)
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

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
              <AICreativeConfigPanel
                config={variationConfig}
                setConfig={setVariationConfig}
                sourceVideoDuration={uploadedAds[0]?.duration || 30}
                onBack={() => setActiveStep("upload")}
                onGenerate={(brainOutput: BrainOutput) => {
                  console.log("AI Brain decisions:", brainOutput);
                  handleStartGenerationWithBrain(brainOutput);
                }}
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

        {debugInfo && (
          <RenderDebugPanel debugInfo={debugInfo} isOpen={true} />
        )}

      </div>
    </div>
  );
};

export default CreativeReplicator;
