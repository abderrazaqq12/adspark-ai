import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Sparkles, 
  Loader2, 
  FileText, 
  Mic, 
  Video, 
  Wand2,
  CheckCircle2,
  Circle,
  ChevronRight,
  Palette,
  Globe
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sceneRouting, videoTypes, exportFormats } from "@/data/aiModels";
import BatchGeneration from "@/components/BatchGeneration";

// Production pipeline stages based on roadmap
const pipelineStages = [
  { id: 1, name: "Script & Hooks", icon: FileText, description: "Input script, hooks, and marketing angles" },
  { id: 2, name: "Scene Builder", icon: Wand2, description: "AI breaks down script into visual scenes" },
  { id: 3, name: "Voice Generation", icon: Mic, description: "Generate or upload voice-over" },
  { id: 4, name: "Video Generation", icon: Video, description: "AI creates video for each scene" },
  { id: 5, name: "Assembly & Edit", icon: Palette, description: "Combine, sync, add branding" },
  { id: 6, name: "Export", icon: Globe, description: "Multi-format export" },
];

export default function CreateVideo() {
  const [script, setScript] = useState("");
  const [hooks, setHooks] = useState("");
  const [videoType, setVideoType] = useState("ugc");
  const [targetLanguage, setTargetLanguage] = useState("ar");
  const [currentStage, setCurrentStage] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scenes, setScenes] = useState<any[]>([]);

  const handleAnalyzeScript = async () => {
    if (!script.trim()) {
      toast.error("Please enter a script first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-script", {
        body: { script },
      });

      if (error) throw error;

      setScenes(data.scenes || []);
      toast.success("Script analyzed successfully!");
    } catch (error: any) {
      console.error("Error analyzing script:", error);
      toast.error(error.message || "Failed to analyze script");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Create AI Video Ad</h1>
        <p className="text-muted-foreground">
          Multi-layer production pipeline for professional video ads
        </p>
      </div>

      {/* Pipeline Progress */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between overflow-x-auto gap-2">
            {pipelineStages.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <div 
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    currentStage === stage.id 
                      ? 'bg-primary/20 text-primary' 
                      : currentStage > stage.id 
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground'
                  }`}
                >
                  {currentStage > stage.id ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : currentStage === stage.id ? (
                    <stage.icon className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4 opacity-50" />
                  )}
                  <span className="text-sm font-medium whitespace-nowrap hidden md:inline">{stage.name}</span>
                </div>
                {index < pipelineStages.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Layer 1: Script & Hooks
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your voice-over script, hooks, and marketing angles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Video Type & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Video Type</Label>
                <Select value={videoType} onValueChange={setVideoType}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {videoTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Language</Label>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">Arabic (العربية)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar-gulf">Arabic (Gulf)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hooks */}
            <div className="space-y-2">
              <Label htmlFor="hooks" className="text-foreground">Marketing Hooks (Optional)</Label>
              <Input
                id="hooks"
                placeholder="Enter attention-grabbing hooks..."
                className="bg-muted/50 border-input"
                value={hooks}
                onChange={(e) => setHooks(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                AI will generate variations based on your hooks
              </p>
            </div>

            {/* Script */}
            <div className="space-y-2">
              <Label htmlFor="script" className="text-foreground">Voice-Over Script</Label>
              <Textarea
                id="script"
                placeholder="Enter your video script here...

Tip: Keep sentences short (under 15 words) for better voice-over. ~60 words = 30 seconds."
                className="min-h-[200px] bg-muted/50 border-input resize-none"
                value={script}
                onChange={(e) => setScript(e.target.value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{script.split(/\s+/).filter(Boolean).length} words</span>
                <span>~{Math.round(script.split(/\s+/).filter(Boolean).length / 2)}s duration</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAnalyzeScript}
                disabled={isAnalyzing || !script.trim()}
                className="flex-1 bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze & Build Scenes
                  </>
                )}
              </Button>
              <Button variant="outline" disabled className="border-border">
                <Upload className="w-4 h-4 mr-2" />
                Audio
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scene Preview */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Layer 2: AI Scene Breakdown
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {scenes.length > 0
                ? `${scenes.length} scenes with auto-routed AI models`
                : "Scenes will appear here after analysis"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scenes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a script and click "Analyze & Build Scenes"</p>
                <p className="text-xs mt-2">AI will auto-route each scene to the best model</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {scenes.map((scene, index) => {
                  // Auto-route based on scene content
                  const routing = sceneRouting.find(r => 
                    scene.title?.toLowerCase().includes(r.sceneType.replace('_', ' ')) ||
                    scene.description?.toLowerCase().includes(r.sceneType.replace('_', ' '))
                  ) || sceneRouting[5]; // Default to B-roll
                  
                  return (
                    <div
                      key={index}
                      className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-foreground">{scene.title}</h4>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary/20 text-primary border-0 text-xs">
                                {routing.recommendedModel}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {scene.duration}s
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{scene.description}</p>
                          {scene.visualPrompt && (
                            <div className="mt-2 p-2 rounded bg-muted/50 border border-border">
                              <p className="text-xs text-muted-foreground">
                                <span className="text-primary font-medium">Visual: </span>
                                {scene.visualPrompt}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {scenes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Batch Generation */}
          <BatchGeneration 
            scriptId="temp-script-id" 
            scenesCount={scenes.length}
            onComplete={() => toast.success("All videos generated!")}
          />

          {/* Export Formats */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Export Formats
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Select output formats for your videos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {exportFormats.map((format) => (
                  <Badge 
                    key={format.id} 
                    variant="outline" 
                    className="px-4 py-2 text-sm cursor-pointer hover:bg-primary/10"
                  >
                    {format.name}
                  </Badge>
                ))}
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground">
                  {scenes.length} scenes • ~{scenes.reduce((acc, s) => acc + (s.duration || 3), 0)}s total duration
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

const VideoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
