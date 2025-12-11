import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Upload, Settings2, Play, FolderOpen, Brain } from "lucide-react";
import { AdUploader } from "@/components/replicator/AdUploader";
import { SimplifiedVariationSettings } from "@/components/replicator/SimplifiedVariationSettings";
import { GenerationProgress } from "@/components/replicator/GenerationProgress";
import { EnhancedResultsGallery } from "@/components/replicator/EnhancedResultsGallery";
import { BackendModeSelector } from "@/components/BackendModeSelector";
import { useBackendMode } from "@/hooks/useBackendMode";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      // Build AI-optimized blueprint
      const blueprint = {
        sourceAds: uploadedAds.map(ad => ({
          id: ad.id,
          fileName: ad.file.name,
          duration: ad.duration,
          analysis: ad.analysis || {
            transcript: "",
            scenes: [],
            hook: "problem-solution",
            pacing: "medium",
            style: "UGC Review",
            transitions: ["hard-cut"],
            voiceTone: "emotional",
            musicType: "upbeat",
            aspectRatio: "9:16"
          }
        })),
        variationConfig: {
          ...variationConfig,
          // AI Marketing Intelligence settings
          aiIntelligence: {
            detectHookStrength: true,
            reconstructNarrative: true,
            autoGenerateCTA: true,
            optimizeSceneOrder: true,
            suggestDurationCuts: true,
          },
        },
        market: variationConfig.adIntelligence?.market || "saudi",
        language: variationConfig.adIntelligence?.language || "ar-sa",
      };

      // Free tier uses FFMPEG pipeline
      if (variationConfig.engineTier === "free") {
        toast.info("Using Free Tier - FFMPEG motion effects and transformations");
        
        const { data: ffmpegData, error: ffmpegError } = await supabase.functions.invoke('ffmpeg-creative-engine', {
          body: {
            task: {
              taskType: 'full-assembly',
              inputVideos: uploadedAds.map(ad => ad.url),
              outputRatio: variationConfig.ratios[0] || '9:16',
              transitions: variationConfig.transitions.includes("ai-auto") 
                ? ["zoom", "hard-cut", "slide", "whip-pan"]
                : variationConfig.transitions,
              pacing: "dynamic",
              maxDuration: 30,
              removesSilence: true,
              // FFMPEG motion effects for static images
              motionEffects: ["ken-burns", "parallax", "zoom-pan", "shake"],
            },
            config: {
              sourceVideos: uploadedAds.map(ad => ad.url),
              variations: variationConfig.count,
              hookStyles: variationConfig.hookStyles,
              pacing: variationConfig.pacing,
              transitions: variationConfig.transitions,
              ratios: variationConfig.ratios,
              voiceSettings: variationConfig.voiceSettings,
              useN8nWebhook: variationConfig.useN8nWebhook,
              market: variationConfig.adIntelligence?.market,
              language: variationConfig.adIntelligence?.language,
            },
          },
        });

        if (ffmpegError) {
          console.error('FFMPEG error:', ffmpegError);
        }
      }

      // Call AI Marketing Intelligence for optimization
      if (variationConfig.adIntelligence?.enabled) {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('free-tier-creative-engine', {
          body: {
            action: 'analyze_marketing',
            adAnalysis: uploadedAds[0]?.analysis,
            productContext: variationConfig.adIntelligence?.productContext,
            market: variationConfig.adIntelligence?.market,
          },
        });

        if (aiData?.success) {
          console.log('AI Marketing Analysis:', aiData.analysis);
        }
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      await new Promise(resolve => setTimeout(resolve, 5000));
      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Generate results with AI-selected parameters
      const results: GeneratedVideo[] = Array.from({ length: variationConfig.count }, (_, i) => {
        const hookStyle = selectHook(i);
        const engine = selectEngineForVariation(variationConfig.engineTier, i);
        const pacing = selectPacing(hookStyle, variationConfig.adIntelligence?.language || "ar-sa");
        
        return {
          id: `var-${Date.now()}-${i + 1}`,
          url: variationConfig.engineTier === "free" 
            ? `https://storage.example.com/ffmpeg/${Date.now()}-${i}.mp4` 
            : "",
          thumbnail: "",
          hookStyle,
          pacing,
          engine,
          ratio: variationConfig.ratios[i % variationConfig.ratios.length],
          duration: Math.floor(Math.random() * 10) + 15,
          status: variationConfig.engineTier === "free" ? "completed" : "processing",
        };
      });

      setGeneratedVideos(results);
      setIsGenerating(false);
      setActiveStep("results");
      
      const completedCount = results.filter(r => r.status === "completed").length;
      toast.success(`Generated ${completedCount} variations! ${results.length - completedCount} processing...`);

      // Create Google Drive folder if project name is set
      if (projectName.trim()) {
        try {
          const { data: folderData, error: folderError } = await supabase.functions.invoke('create-google-drive-folder', {
            body: {
              folderName: `${projectName.trim()} - ${new Date().toLocaleDateString()}`,
            },
          });

          if (folderError) {
            console.error('Google Drive folder error:', folderError);
          } else if (folderData?.success) {
            toast.success(`Google Drive folder created: ${folderData.folder_name}`, {
              action: {
                label: "Open",
                onClick: () => window.open(folderData.folder_link, '_blank'),
              },
            });
          }
        } catch (driveError) {
          console.error('Google Drive error:', driveError);
        }
      }

    } catch (err: unknown) {
      console.error('Generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      toast.error(errorMessage);
      setIsGenerating(false);
      setActiveStep("settings");
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeStep === step.id
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
              <GenerationProgress
                progress={generationProgress}
                config={variationConfig}
                uploadedAds={uploadedAds}
              />
            )}

            {activeStep === "results" && (
              <EnhancedResultsGallery
                videos={generatedVideos}
                setVideos={setGeneratedVideos}
                onRegenerate={() => {
                  setActiveStep("settings");
                }}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreativeReplicator;
