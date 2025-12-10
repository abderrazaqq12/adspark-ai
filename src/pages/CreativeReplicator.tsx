import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Zap, Upload, Settings2, Play, FolderOpen } from "lucide-react";
import { AdUploader } from "@/components/replicator/AdUploader";
import { VariationSettings } from "@/components/replicator/VariationSettings";
import { GenerationProgress } from "@/components/replicator/GenerationProgress";
import { ResultsGallery } from "@/components/replicator/ResultsGallery";
import { toast } from "sonner";

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
}

const CreativeReplicator = () => {
  const [activeStep, setActiveStep] = useState<string>("upload");
  const [uploadedAds, setUploadedAds] = useState<UploadedAd[]>([]);
  const [variationConfig, setVariationConfig] = useState<VariationConfig>({
    count: 10,
    hookStyles: ["question"],
    pacing: "fast",
    transitions: ["hard-cut"],
    actors: [],
    voiceSettings: { language: "en", tone: "energetic" },
    ratios: ["9:16"],
    engineTier: "low",
    useN8nWebhook: false,
    randomizeEngines: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);

  const handleStartGeneration = async () => {
    if (uploadedAds.length === 0) {
      toast.error("Please upload at least one ad to replicate");
      return;
    }

    setIsGenerating(true);
    setActiveStep("generate");
    setGenerationProgress(0);

    // Simulate generation progress
    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setActiveStep("results");
          // Generate mock results
          const mockResults: GeneratedVideo[] = Array.from(
            { length: variationConfig.count },
            (_, i) => ({
              id: `video-${i + 1}`,
              url: "",
              thumbnail: "",
              hookStyle: variationConfig.hookStyles[i % variationConfig.hookStyles.length],
              pacing: variationConfig.pacing,
              engine: variationConfig.engineTier,
              ratio: variationConfig.ratios[i % variationConfig.ratios.length],
              duration: Math.floor(Math.random() * 15) + 15,
            })
          );
          setGeneratedVideos(mockResults);
          toast.success(`Generated ${variationConfig.count} video variations!`);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const steps = [
    { id: "upload", label: "Upload Ads", icon: Upload, count: uploadedAds.length },
    { id: "settings", label: "Variation Settings", icon: Settings2 },
    { id: "generate", label: "Generate", icon: Play },
    { id: "results", label: "Results", icon: FolderOpen, count: generatedVideos.length },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <span className="text-2xl">🎛️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Creative Replicator</h1>
              <p className="text-muted-foreground text-sm">
                Upload existing ads and generate 1-100 performance-optimized variations
              </p>
            </div>
          </div>
          <Button
            onClick={handleStartGeneration}
            disabled={isGenerating || uploadedAds.length === 0}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
          >
            <Zap className="w-4 h-4 mr-2" />
            Generate All Variations
          </Button>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
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
                onContinue={() => setActiveStep("settings")}
              />
            )}

            {activeStep === "settings" && (
              <VariationSettings
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
              <ResultsGallery
                videos={generatedVideos}
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
