import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CreateVideo() {
  const [script, setScript] = useState("");
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
          Transform your script into a stunning video advertisement
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Script Input</CardTitle>
            <CardDescription className="text-muted-foreground">
              Paste your voice-over script or upload an audio file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="script" className="text-foreground">Voice-Over Script</Label>
              <Textarea
                id="script"
                placeholder="Enter your video script here... 

Example:
'Tired of complicated video editing? Meet VideoAI - the platform that turns your ideas into stunning video ads in minutes. Just paste your script, and watch as our AI creates professional scenes, adds visuals, and syncs everything perfectly. No experience needed.'"
                className="min-h-[300px] bg-muted/50 border-input resize-none"
                value={script}
                onChange={(e) => setScript(e.target.value)}
              />
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
                    Analyze Script
                  </>
                )}
              </Button>
              <Button variant="outline" disabled className="border-border">
                <Upload className="w-4 h-4 mr-2" />
                Upload Audio
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scene Preview */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">AI Scene Breakdown</CardTitle>
            <CardDescription className="text-muted-foreground">
              {scenes.length > 0
                ? `${scenes.length} scenes identified`
                : "Scenes will appear here after analysis"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scenes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a script and click "Analyze Script" to see AI-generated scenes</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {scenes.map((scene, index) => (
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
                          <span className="text-xs text-muted-foreground">
                            {scene.duration}s
                          </span>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {scenes.length > 0 && (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Ready to generate video?</h3>
                <p className="text-sm text-muted-foreground">
                  Review your scenes and proceed to video generation
                </p>
              </div>
              <Button size="lg" disabled className="bg-gradient-primary text-primary-foreground shadow-glow">
                <Video className="w-5 h-5 mr-2" />
                Generate Video
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const Video = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
