/**
 * CREATIVE REPLICATOR - Production AI Video Replication System
 * 
 * ARCHITECTURAL CONTRACTS:
 * 1. Audience inherited from Settings → Preferences (no manual selection)
 * 2. Duration hard-locked: 20-35 seconds
 * 3. VPS-First execution: FFmpeg only when VPS available
 * 4. AI Planning Layer: Plan must be generated/validated before Generate
 * 5. Generate blocked until plan is validated and locked
 * 6. Unified left-side pipeline layout (matches Creative AI Editor)
 */

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Zap, Upload, Settings2, Play, FolderOpen, Brain, Server,
  Cloud, Loader2, Lock, AlertTriangle, FileText
} from "lucide-react";
import { UnifiedStepSidebar, CREATIVE_REPLICATOR_STEPS } from "@/components/unified/UnifiedStepSidebar";
import { AdUploader } from "@/components/replicator/AdUploader";
import { AICreativeConfigPanel } from "@/components/replicator/AICreativeConfigPanel";
import { PlanPreviewPanel } from "@/components/replicator/PlanPreviewPanel";
import { type BrainOutput } from "@/lib/replicator/ai-creative-brain";
import { EnhancedResultsGallery } from "@/components/replicator/EnhancedResultsGallery";
import { ProcessingTimeline } from "@/components/replicator/ProcessingTimeline";
import { PipelineProgressPanel } from "@/components/replicator/PipelineProgressPanel";
import { RenderDebugPanel } from "@/components/replicator/RenderDebugPanel";
import { ProjectContextBanner, DriveSyncIndicator } from "@/components/project";
import { useGlobalProject } from "@/contexts/GlobalProjectContext";
import { useAssetUpload } from "@/hooks/useAssetUpload";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdvancedEngineRouter, RoutingRequest, RenderingMode } from "@/lib/video-engines/AdvancedRouter";
import { ScenePlan } from "@/lib/video-engines/registry-types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRenderBackendStatus } from "@/hooks/useRenderBackendStatus";
import { useSecureApiKeys } from "@/hooks/useSecureApiKeys";
import { useAudience } from "@/contexts/AudienceContext";
import {
  CreativePlan,
  isAudienceConfigured,
  DURATION_MIN,
  DURATION_MAX
} from "@/lib/replicator/creative-plan-types";
import {
  generateCreativePlan,
  lockPlan,
  PlanGeneratorInput
} from "@/lib/replicator/plan-generator";

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

const CreativeReplicator = () => {
  // Global project context
  const { activeProject, hasActiveProject } = useGlobalProject();

  // Asset upload hook for auto-uploading generated videos to Google Drive
  const { uploadVideo, isUploadAvailable } = useAssetUpload();

  // Global audience context (inherited from Settings)
  const { resolved: audience, isLoading: audienceLoading } = useAudience();

  // Check if audience is configured
  const audienceConfigured = useMemo(() =>
    isAudienceConfigured(audience.language, audience.country),
    [audience.language, audience.country]
  );

  // Auto-detect available backends
  const backendStatus = useRenderBackendStatus();

  // Fetch user's configured API keys for AI Brain engine selection
  const { providers: apiKeyProviders, loading: apiKeysLoading } = useSecureApiKeys();

  // Extract active provider names for AI Brain
  const availableApiKeys = useMemo(() => {
    return apiKeyProviders
      .filter(p => p.is_active)
      .map(p => p.provider);
  }, [apiKeyProviders]);

  // Step state - using numeric IDs for UnifiedStepSidebar
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const [projectName, setProjectName] = useState<string>("");
  const [uploadedAds, setUploadedAds] = useState<UploadedAd[]>([]);

  // Initialize variation config with global audience defaults
  const [variationConfig, setVariationConfig] = useState<VariationConfig>({
    count: 10,
    hookStyles: ["ai-auto"],
    pacing: "dynamic",
    transitions: ["ai-auto"],
    actors: [],
    voiceSettings: { language: audience.language, tone: "ai-auto" },
    ratios: ["9:16"],
    engineTier: "free",
    randomizeEngines: true,
    useAIOperator: true,
    adIntelligence: {
      enabled: true,
      language: audience.language,
      market: audience.country,
      videoType: "ai-auto",
      platform: "tiktok",
      productCategory: "general",
      conversionGoal: "cod",
      targetAudience: {},
      productContext: {}
    }
  });

  // Creative Plan state (AI Planning Layer)
  const [creativePlan, setCreativePlan] = useState<CreativePlan | null>(null);
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planValidationErrors, setPlanValidationErrors] = useState<string[]>([]);
  const [planValidationWarnings, setPlanValidationWarnings] = useState<string[]>([]);

  // Brain output for legacy compatibility
  const [currentBrainOutput, setCurrentBrainOutput] = useState<BrainOutput | null>(null);

  // Sync variation config when audience changes
  useEffect(() => {
    if (!audienceLoading) {
      setVariationConfig(prev => ({
        ...prev,
        voiceSettings: { ...prev.voiceSettings, language: audience.language },
        adIntelligence: {
          ...prev.adIntelligence,
          language: audience.language,
          market: audience.country
        }
      }));
    }
  }, [audience.language, audience.country, audienceLoading]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Real-time updates handled via generation loop and dashboard refresh
  useEffect(() => {
    // Subscription removed - using local state sync
  }, [generatedVideos.length]);

  // Step navigation helpers
  const goToStep = (step: number) => {
    // Validate step transitions
    if (step === 3 && !creativePlan) return;
    if (step === 4 && (!creativePlan || creativePlan.status !== 'locked')) return;
    setCurrentStep(step);
  };

  const completeStep = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
  };

  /**
   * Generate Creative Plan (Step 2 -> Step 3)
   */
  const handleGeneratePlan = async () => {
    // Block if audience not configured
    if (!audienceConfigured) {
      toast.error("Default Audience not configured. Go to Settings → Preferences.");
      return;
    }

    setPlanGenerating(true);
    setPlanValidationErrors([]);
    setPlanValidationWarnings([]);

    try {
      const input: PlanGeneratorInput = {
        language: audience.language,
        country: audience.country,
        variationCount: variationConfig.count,
        platform: variationConfig.adIntelligence?.platform || 'tiktok',
        aspectRatio: variationConfig.ratios[0] || '9:16',
        sourceVideoDuration: uploadedAds[0]?.duration || 30,
        vpsAvailable: backendStatus.vpsServer.available,
        availableApiKeys,
      };

      const result = generateCreativePlan(input);

      setCreativePlan(result.plan);
      setCurrentBrainOutput(result.brainOutput);
      setPlanValidationErrors(result.validation.errors);
      setPlanValidationWarnings(result.validation.warnings);

      if (result.plan) {
        toast.success("Creative Plan generated successfully");
        completeStep(2);
        setCurrentStep(3);
      } else {
        toast.error("Plan validation failed");
      }
    } catch (err: any) {
      console.error('Plan generation error:', err);
      toast.error(err.message || "Failed to generate plan");
      setPlanValidationErrors([err.message || "Unknown error"]);
    } finally {
      setPlanGenerating(false);
    }
  };

  /**
   * Lock plan and start generation
   */
  const handleLockAndGenerate = async () => {
    if (!creativePlan || creativePlan.status !== 'validated') {
      toast.error("Plan must be validated before generation");
      return;
    }

    if (uploadedAds.length === 0) {
      toast.error("Please upload at least one ad to replicate");
      return;
    }

    try {
      // Lock the plan
      const lockedPlan = lockPlan(creativePlan);
      setCreativePlan(lockedPlan);

      setIsGenerating(true);
      completeStep(3);
      setCurrentStep(4);
      setGenerationProgress(0);

      const currentAd = uploadedAds[0];

      // Log execution strategy
      console.log("🔒 Locked Plan:", lockedPlan.id);
      console.log("📊 Strategy:", lockedPlan.executionStrategy.description);
      toast.info(`Executing: ${lockedPlan.executionStrategy.description}`);

      const userId = '170d6fb1-4e4f-4704-ab9a-a917dc86cba5'; // VPS Bypassed Auth
      const jobId = crypto.randomUUID();

      // Mute Supabase writes - everything is tracked via local VPS API
      console.log(`[Replicator] Initializing job ${jobId} for user ${userId}`);
      toast.info(`Initializing: ${lockedPlan.executionStrategy.description}`);


      setCurrentJobId(jobId);
      const newGeneratedVideos: GeneratedVideo[] = [];

      // EXECUTE LOOP - Using locked plan variations
      for (let i = 0; i < lockedPlan.variations.length; i++) {
        const variation = lockedPlan.variations[i];
        const variationId = i + 1;

        // Log variation execution
        console.log(`📹 Variation ${variationId}:`, {
          framework: variation.framework,
          hook: variation.hookType,
          engine: variation.engineProvider,
          duration: variation.targetDuration,
          vps: variation.useVPS,
        });

        // Get ratio from plan
        const ratio = lockedPlan.globalSettings.aspectRatio;

        // CONSTRUCT SCENE PLAN with locked duration
        const plan: ScenePlan = {
          scenes: currentAd.analysis?.scenes?.map((s: any) => ({
            type: s.type.toUpperCase() as any,
            start: s.startTime,
            end: s.endTime,
            description: s.description
          })) || [],
          totalDuration: variation.targetDuration,
          resolution: "1080p",
          requiredCapabilities: ["trim", "merge", "text_overlay", "resize"] as any
        };

        // VPS-First routing (Architectural Contract #3)
        const renderingMode: RenderingMode = 'server_only';

        const routingReq: RoutingRequest = {
          plan,
          userTier: 'free', // Always try free tier first with VPS
          preferLocal: variation.useVPS,
          renderingMode,
        };

        const engineSpec = AdvancedEngineRouter.selectEngine(routingReq);
        const engine = AdvancedEngineRouter.getEngineInstance(engineSpec.id);

        // Update Debug Info
        setDebugInfo({
          engine: variation.engineProvider,
          engineId: variation.engineId,
          framework: variation.framework,
          hookType: variation.hookType,
          targetDuration: variation.targetDuration,
          estimatedCost: variation.estimatedCost,
          useVPS: variation.useVPS,
          executionPath: `Plan[${lockedPlan.id}] -> ${variation.engineId} -> ${variation.engineProvider}`,
          status: 'pending',
          logs: [
            `🔒 Locked Plan Execution for Variation ${variationId}:`,
            `  Framework: ${variation.framework} - ${variation.reasoning.framework}`,
            `  Engine: ${variation.engineProvider} - ${variation.reasoning.engine}`,
            `  Duration: ${variation.targetDuration}s (${DURATION_MIN}-${DURATION_MAX}s enforced)`,
            `  VPS: ${variation.useVPS ? 'Yes' : 'No'}`,
            `  Cost: $${variation.estimatedCost.toFixed(3)}`,
          ],
          payload: routingReq
        });

        // Initialize engine
        await engine.initialize();

        // Create DB Record with plan metadata
        const variationRecord = {
          user_id: userId,
          variation_number: variationId,
          variation_config: {
            planId: lockedPlan.id,
            hookStyle: variation.hookType,
            framework: variation.framework,
            pacing: variation.pacing,
            transitions: variation.transitions,
            ratio,
            engine: variation.engineProvider,
            engineId: variation.engineId,
            targetDuration: variation.targetDuration,
            useVPS: variation.useVPS,
            reasoning: variation.reasoning,
          },
          status: "processing",
          cost_usd: variation.estimatedCost,
          metadata: {
            job_id: jobId,
            plan_id: lockedPlan.id,
            audience: {
              language: lockedPlan.audience.language,
              country: lockedPlan.audience.country,
              market: lockedPlan.audience.market,
            },
          }
        };

        const variationIdStr = `${jobId}_v${variationId}`;

        // Build Task
        const task = {
          id: variationIdStr,
          projectId: activeProject?.id,
          tool: 'replicator',
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
                { type: "body", start: 3, end: variation.targetDuration }
              ],
            variants: 1,
            market: lockedPlan.audience.market,
            language: lockedPlan.audience.language,
            strategy: {
              framework: variation.framework,
              hookType: variation.hookType,
              pacing: variation.pacing,
              transitions: variation.transitions,
              targetDuration: variation.targetDuration
            }
          }
        };

        // Process with selected engine
        toast.message(`Generating variation ${variationId} (${variation.framework}, ${variation.hookType})...`);
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
          const publicUrl = result.videoUrl;

          // Note: Backend registerArtifact already committed this result to DB

          const newVideo: GeneratedVideo = {
            id: variationIdStr,
            url: publicUrl,
            thumbnail: publicUrl,
            hookStyle: variation.hookType,
            pacing: variation.pacing,
            engine: variation.engineProvider,
            ratio,
            duration: variation.targetDuration,
            status: "completed"
          };

          setGeneratedVideos(prev => [...prev, newVideo]);
          setGenerationProgress(((i + 1) / lockedPlan.variations.length) * 100);

        } else if (result.success && result.outputType === 'plan') {
          toast.info(`Variation ${variationId}: Plan compiled (${variation.framework})`);
        } else {
          toast.error(`Variation ${variationId} failed: ${result.error}`);
        }
      }

      setIsGenerating(false);
      completeStep(4);
      setCurrentStep(5);
      toast.success(`Generation Complete! Total cost: $${lockedPlan.costEstimate.optimized.toFixed(2)}`);

    } catch (err: any) {
      console.error('Generation error:', err);
      toast.error(err.message || "Generation failed");
      setIsGenerating(false);
    }
  };

  // Handle history cleared
  const handleHistoryCleared = () => {
    setCreativePlan(null);
    setCompletedSteps([]);
    setCurrentStep(1);
    setGeneratedVideos([]);
    setCurrentJobId(null);
    setDebugInfo(null);
    toast.success("History cleared");
  };

  // Get backend status display
  const getBackendStatus = () => {
    if (backendStatus.loading) {
      return { label: "Detecting...", status: "default" as const, icon: Loader2 };
    }
    if (backendStatus.vpsServer.available) {
      return { label: "VPS Active", status: "success" as const, icon: Server };
    }
    if (backendStatus.edgeFunctions.available) {
      return { label: "Edge Functions", status: "info" as const, icon: Cloud };
    }
    return { label: "Cloud Only", status: "warning" as const, icon: Cloud };
  };

  const backend = getBackendStatus();

  // Generate button disabled conditions - also requires active project
  const generateDisabled = !creativePlan || creativePlan.status !== 'validated' || isGenerating || !hasActiveProject;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Sidebar - Unified Step Sidebar */}
      <UnifiedStepSidebar
        tool="creative-replicator"
        toolName="AI Creative Replicator"
        toolDescription="Generate 1-100 ad variations"
        steps={CREATIVE_REPLICATOR_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
        onClearHistory={handleHistoryCleared}
        projectId={activeProject?.id}
      >
        {/* Backend Status in sidebar */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-xs">
            {backendStatus.loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
            ) : (
              <backend.icon className={`w-3.5 h-3.5 ${backend.status === 'success' ? 'text-green-500' :
                backend.status === 'info' ? 'text-primary' : 'text-yellow-500'
                }`} />
            )}
            <span className={`font-medium ${backend.status === 'success' ? 'text-green-500' :
              backend.status === 'info' ? 'text-primary' : 'text-yellow-500'
              }`}>
              {backend.label}
            </span>
          </div>

          {/* Audience Badge */}
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs ${audienceConfigured
            ? 'bg-muted/50 border-border'
            : 'bg-destructive/10 border-destructive/50'
            }`}>
            <span className="font-medium">
              {audience.language.toUpperCase()} / {audience.country}
            </span>
          </div>
        </div>
      </UnifiedStepSidebar>

      {/* Main Content Area */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Project Context Banner - REQUIRED */}
        <ProjectContextBanner toolName="Creative Replicator" />

        {/* Audience Warning Banner */}
        {!audienceLoading && !audienceConfigured && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Default Audience Not Configured</AlertTitle>
            <AlertDescription>
              Go to <strong>Settings → Preferences</strong> to set your default language and country.
              Generation is blocked until audience is configured.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">AI Creative Replicator</h1>
              <p className="text-sm text-muted-foreground">
                Upload ads, AI generates 1-100 optimized variations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Drive Sync Status */}
            <DriveSyncIndicator />

            <Button
              onClick={handleLockAndGenerate}
              disabled={generateDisabled || !audienceConfigured}
              className="gap-2"
            >
              {creativePlan?.status === 'locked' ? (
                <><Lock className="w-4 h-4" /> Locked</>
              ) : (
                <><Zap className="w-4 h-4" /> Generate Variations</>
              )}
            </Button>
          </div>
        </div>

        {/* Content */}
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            {currentStep === 1 && (
              <AdUploader
                uploadedAds={uploadedAds}
                setUploadedAds={setUploadedAds}
                projectName={projectName}
                setProjectName={setProjectName}
                onContinue={() => {
                  if (uploadedAds.length > 0) {
                    completeStep(1);
                    setCurrentStep(2);
                  }
                }}
              />
            )}

            {currentStep === 2 && (
              <AICreativeConfigPanel
                config={variationConfig}
                setConfig={setVariationConfig}
                sourceVideoDuration={uploadedAds[0]?.duration || 30}
                availableApiKeys={availableApiKeys}
                onBack={() => setCurrentStep(1)}
                onGenerate={() => handleGeneratePlan()}
              />
            )}

            {currentStep === 3 && (
              <PlanPreviewPanel
                plan={creativePlan}
                isGenerating={isGenerating}
                validationErrors={planValidationErrors}
                validationWarnings={planValidationWarnings}
                onBack={() => setCurrentStep(2)}
                onLockAndGenerate={handleLockAndGenerate}
              />
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                {/* Plan Lock Status */}
                {creativePlan && (
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <Lock className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-500">Plan Locked</AlertTitle>
                    <AlertDescription className="text-green-500/80">
                      Executing {creativePlan.variations.length} variations using {creativePlan.executionStrategy.description}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Real-time pipeline progress */}
                <PipelineProgressPanel
                  jobId={currentJobId}
                  onComplete={() => {
                    setIsGenerating(false);
                    completeStep(4);
                    setCurrentStep(5);
                    toast.success("Generation complete!");
                  }}
                  onVideoReady={(videoId, url) => {
                    setGeneratedVideos(prev => prev.map(v =>
                      v.id === videoId ? { ...v, url, status: 'completed' as const } : v
                    ));
                    // Auto-upload completed video to Google Drive
                    if (url && isUploadAvailable) {
                      const videoName = `replicator_${videoId}`;
                      uploadVideo(url, videoName, {
                        jobId: currentJobId,
                        videoId,
                        source: 'creative-replicator',
                      });
                      console.log(`[CreativeReplicator] Auto-uploading video ${videoId} to Google Drive`);
                    }
                  }}
                />
                {/* Legacy processing timeline for compatibility */}
                {currentJobId && (
                  <ProcessingTimeline
                    jobId={currentJobId}
                    totalVideos={variationConfig.count * variationConfig.ratios.length}
                    onComplete={(urls) => {
                      setIsGenerating(false);
                      completeStep(4);
                      setCurrentStep(5);
                      toast.success(`Generated ${urls.length} videos!`);
                    }}
                    onError={(errors) => {
                      toast.error(errors[0] || "Generation failed");
                    }}
                  />
                )}
              </div>
            )}

            {currentStep === 5 && (
              <EnhancedResultsGallery
                videos={generatedVideos}
                setVideos={setGeneratedVideos}
                jobId={currentJobId || undefined}
                onRegenerate={() => {
                  setCreativePlan(null);
                  setCurrentStep(2);
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
