import { useState, useEffect } from "react";
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
  Globe,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sceneRouting, videoTypes, exportFormats } from "@/data/aiModels";
import BatchGeneration from "@/components/BatchGeneration";
import AIAssistant from "@/components/AIAssistant";

// Production pipeline stages based on roadmap
const pipelineStages = [
  { id: 1, name: "Script & Hooks", icon: FileText, description: "Input script, hooks, and marketing angles" },
  { id: 2, name: "Scene Builder", icon: Wand2, description: "AI breaks down script into visual scenes" },
  { id: 3, name: "Voice Generation", icon: Mic, description: "Generate or upload voice-over" },
  { id: 4, name: "Video Generation", icon: Video, description: "AI creates video for each scene" },
  { id: 5, name: "Assembly & Edit", icon: Palette, description: "Combine, sync, add branding" },
  { id: 6, name: "Export", icon: Globe, description: "Multi-format export" },
];

interface ScriptSlot {
  id: number;
  text: string;
  audioFile: File | null;
  audioUrl: string | null;
}

export default function CreateVideo() {
  const [scriptSlots, setScriptSlots] = useState<ScriptSlot[]>([
    { id: 1, text: "", audioFile: null, audioUrl: null }
  ]);
  const [hooks, setHooks] = useState("");
  const [hooksMode, setHooksMode] = useState<"automatic" | "manual">("automatic");
  const [videoType, setVideoType] = useState("ugc_review");
  const [targetLanguage, setTargetLanguage] = useState("ar");
  const [currentStage, setCurrentStage] = useState(1);
  const [expandedStage, setExpandedStage] = useState(1);
  const [voiceGenerationDone, setVoiceGenerationDone] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scenes, setScenes] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["9:16", "16:9", "1:1"]);
  // Load existing project if user has one
  useEffect(() => {
    loadLatestProject();
  }, []);

  const loadLatestProject = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (projects && projects.length > 0) {
      setProjectId(projects[0].id);
      
      // Load script for this project
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id, raw_text")
        .eq("project_id", projects[0].id)
        .limit(1);

      if (scripts && scripts.length > 0) {
        setScriptId(scripts[0].id);
        if (scripts[0].raw_text) {
          setScriptSlots([{ id: 1, text: scripts[0].raw_text, audioFile: null, audioUrl: null }]);
        }
        
        // Load scenes
        const { data: scenesData } = await supabase
          .from("scenes")
          .select("*")
          .eq("script_id", scripts[0].id)
          .order("index");

        if (scenesData && scenesData.length > 0) {
          setScenes(scenesData.map(s => ({
            title: `Scene ${s.index + 1}`,
            description: s.text,
            duration: s.duration_sec,
            visualPrompt: s.visual_prompt,
          })));
          setCurrentStage(2);
        }
      }
    }
  };

  const addScriptSlot = () => {
    if (scriptSlots.length >= 10) {
      toast.error("Maximum 10 scripts allowed");
      return;
    }
    setScriptSlots([...scriptSlots, { id: scriptSlots.length + 1, text: "", audioFile: null, audioUrl: null }]);
  };

  const removeScriptSlot = (id: number) => {
    if (scriptSlots.length <= 1) return;
    setScriptSlots(scriptSlots.filter(slot => slot.id !== id));
  };

  const updateScriptSlot = (id: number, field: keyof ScriptSlot, value: any) => {
    setScriptSlots(scriptSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  const handleAudioUpload = (id: number, file: File) => {
    const url = URL.createObjectURL(file);
    updateScriptSlot(id, "audioFile", file);
    updateScriptSlot(id, "audioUrl", url);
    
    // Check if any slot has audio uploaded
    const hasAudio = scriptSlots.some(s => s.audioFile !== null) || file !== null;
    if (hasAudio) {
      setVoiceGenerationDone(true);
    }
  };

  const handleAnalyzeScript = async () => {
    const allScripts = scriptSlots.map(s => s.text).filter(t => t.trim()).join("\n\n---\n\n");
    if (!allScripts.trim()) {
      toast.error("Please enter at least one script");
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-script", {
        body: { script: allScripts },
      });

      if (error) throw error;

      setScenes(data.scenes || []);
      setCurrentStage(2);
      toast.success("Scripts analyzed successfully!");
    } catch (error: any) {
      console.error("Error analyzing script:", error);
      toast.error(error.message || "Failed to analyze scripts");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveProjectAndScenes = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save");
        return;
      }

      let currentProjectId = projectId;
      let currentScriptId = scriptId;

      // Create project if needed
      if (!currentProjectId) {
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .insert({
            user_id: user.id,
            name: `Video Project ${new Date().toLocaleDateString()}`,
            language: targetLanguage,
            status: "draft",
          })
          .select()
          .single();

        if (projectError) throw projectError;
        currentProjectId = project.id;
        setProjectId(project.id);
      }

      // Create or update script
      const allScriptsText = scriptSlots.map(s => s.text).filter(t => t.trim()).join("\n\n---\n\n");
      if (!currentScriptId) {
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .insert({
            project_id: currentProjectId,
            raw_text: allScriptsText,
            hooks: hooks.split(",").map(h => h.trim()).filter(Boolean),
            language: targetLanguage,
            status: "analyzed",
          })
          .select()
          .single();

        if (scriptError) throw scriptError;
        currentScriptId = scriptData.id;
        setScriptId(scriptData.id);
      } else {
        await supabase
          .from("scripts")
          .update({ raw_text: allScriptsText })
          .eq("id", currentScriptId);
      }

      // Delete existing scenes for this script
      await supabase.from("scenes").delete().eq("script_id", currentScriptId);

      // Insert new scenes
      const scenesToInsert = scenes.map((scene, index) => ({
        script_id: currentScriptId,
        index,
        text: scene.description || scene.title,
        scene_type: "broll",
        visual_prompt: scene.visualPrompt || null,
        duration_sec: scene.duration || 5,
        status: "pending",
      }));

      const { error: scenesError } = await supabase
        .from("scenes")
        .insert(scenesToInsert);

      if (scenesError) throw scenesError;

      toast.success("Project and scenes saved!");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Failed to save project");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen animate-in fade-in duration-500">
      {/* Vertical Pipeline Sidebar */}
      <div className="w-64 shrink-0 border-r border-border bg-gradient-card p-4">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
          <p className="text-xs text-muted-foreground">Production stages</p>
        </div>
        <div className="flex flex-col gap-1">
          {pipelineStages.map((stage, index) => (
            <div key={stage.id} className="flex flex-col">
                <button
                  onClick={() => {
                    setExpandedStage(stage.id);
                    setCurrentStage(stage.id);
                  }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left w-full cursor-pointer ${
                    expandedStage === stage.id 
                      ? 'bg-primary/20 text-primary' 
                      : currentStage > stage.id || currentStage === stage.id || (stage.id === 3 && voiceGenerationDone)
                        ? 'bg-primary/10 text-primary hover:bg-primary/20'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {currentStage > stage.id || (stage.id === 3 && voiceGenerationDone) ? (
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  ) : expandedStage === stage.id ? (
                    <stage.icon className="w-5 h-5 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 opacity-50 shrink-0" />
                  )}
                  <span className="text-sm font-medium">{stage.name}</span>
                </button>
              {index < pipelineStages.length - 1 && (
                <div className="ml-6 h-4 border-l-2 border-muted-foreground/20" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 space-y-8 overflow-auto">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Create AI Video Ad</h1>
          <p className="text-muted-foreground">
            Multi-step production pipeline for professional video ads
          </p>
        </div>

        <div className="flex flex-col gap-6">
        {/* Input Section */}
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Step 1: Script & Hooks
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
                  <SelectContent className="max-h-[300px]">
                    {["UGC & Social Proof", "Product & Educational", "Creative & Engagement"].map(category => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">{category}</div>
                        {videoTypes.filter(t => t.category === category).map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </div>
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
                    <SelectItem value="es">Spanish (Español)</SelectItem>
                    <SelectItem value="fr">French (Français)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hooks Mode Selection */}
            <div className="space-y-2">
              <Label className="text-foreground">Marketing Hooks Mode</Label>
              <div className="flex gap-2">
                <Button
                  variant={hooksMode === "automatic" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHooksMode("automatic")}
                  className={hooksMode === "automatic" ? "bg-gradient-primary" : ""}
                >
                  Automatic (AI Generated)
                </Button>
                <Button
                  variant={hooksMode === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHooksMode("manual")}
                  className={hooksMode === "manual" ? "bg-gradient-primary" : ""}
                >
                  Manual
                </Button>
              </div>
            </div>

            {/* Hooks Input */}
            {hooksMode === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="hooks" className="text-foreground">Marketing Hooks</Label>
                <Input
                  id="hooks"
                  placeholder="Enter your attention-grabbing hooks..."
                  className="bg-muted/50 border-input"
                  value={hooks}
                  onChange={(e) => setHooks(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter multiple hooks separated by commas
                </p>
              </div>
            )}
            {hooksMode === "automatic" && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-sm text-primary">
                  AI will automatically generate attention-grabbing hooks based on your script and product
                </p>
              </div>
            )}

            {/* Scripts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground">Voice-Over Scripts ({scriptSlots.length}/10)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addScriptSlot}
                  disabled={scriptSlots.length >= 10}
                  className="text-xs"
                >
                  + Add Script
                </Button>
              </div>
              
              {scriptSlots.map((slot, idx) => (
                <div key={slot.id} className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Script {idx + 1}</span>
                    {scriptSlots.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScriptSlot(slot.id)}
                        className="text-destructive hover:text-destructive h-6 px-2"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <Textarea
                    placeholder="Enter your video script here... (~60 words = 30 seconds)"
                    className="min-h-[120px] bg-muted/50 border-input resize-none"
                    value={slot.text}
                    onChange={(e) => updateScriptSlot(slot.id, "text", e.target.value)}
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {slot.text.split(/\s+/).filter(Boolean).length} words • ~{Math.round(slot.text.split(/\s+/).filter(Boolean).length / 2)}s
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {slot.audioUrl ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Audio uploaded
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateScriptSlot(slot.id, "audioFile", null);
                              updateScriptSlot(slot.id, "audioUrl", null);
                              // Check if any other slots have audio
                              const otherHasAudio = scriptSlots.filter(s => s.id !== slot.id).some(s => s.audioFile !== null);
                              setVoiceGenerationDone(otherHasAudio);
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleAudioUpload(slot.id, file);
                            }}
                          />
                          <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                            <Upload className="w-3 h-3 mr-1" />
                            Upload Audio
                          </Badge>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAnalyzeScript}
                disabled={isAnalyzing || scriptSlots.every(s => !s.text.trim())}
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
              {voiceGenerationDone && (
                <Badge className="bg-primary/20 text-primary border-0 self-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Voice Ready
                </Badge>
              )}
              <Button variant="outline" disabled className="border-border" title="Coming soon">
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
              Step 2: AI Scene Breakdown
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
        <div className="flex flex-col gap-6">
          {/* Save & Batch Generation */}
          <div className="space-y-4">
            {!scriptId && (
              <Button
                onClick={saveProjectAndScenes}
                disabled={isSaving}
                className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Project & Scenes
                  </>
                )}
              </Button>
            )}
            {scriptId && (
              <BatchGeneration 
                scriptId={scriptId} 
                scenesCount={scenes.length}
                onComplete={() => toast.success("All videos generated!")}
              />
            )}
          </div>

          {/* Export Formats */}
          <Card className="bg-gradient-card border-border shadow-card">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Export Formats
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Select output formats for your videos (select all that apply)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                {exportFormats.map((format) => {
                  const isSelected = selectedFormats.includes(format.id);
                  return (
                    <button
                      key={format.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedFormats(selectedFormats.filter(f => f !== format.id));
                        } else {
                          setSelectedFormats([...selectedFormats, format.id]);
                        }
                      }}
                      className={`px-4 py-3 rounded-lg border transition-all flex flex-col items-center gap-1 min-w-[140px] ${
                        isSelected 
                          ? 'bg-primary/20 border-primary ring-2 ring-primary/50 shadow-glow' 
                          : 'bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/50'
                      }`}
                    >
                      <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {format.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format.width}×{format.height}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-primary mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-border flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {scenes.length} scenes • ~{scenes.reduce((acc, s) => acc + (s.duration || 3), 0)}s total duration
                </p>
                <Badge variant="secondary" className="text-primary">
                  {selectedFormats.length} format{selectedFormats.length !== 1 ? 's' : ''} selected
                </Badge>
              </div>
              
              {selectedFormats.length === 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-500">Please select at least one export format</p>
                </div>
              )}
              
              {selectedFormats.length > 0 && (
                <Button
                  onClick={() => {
                    setCurrentStage(6);
                    setExpandedStage(6);
                    toast.success(`Ready to export in ${selectedFormats.length} format(s)!`);
                  }}
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Proceed to Export ({selectedFormats.length} formats)
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>

      {/* AI Assistant */}
      <AIAssistant 
        context="video ad creation with scripts, hooks, and marketing copy"
        onSuggestion={(suggestion) => {
          // Auto-fill script with AI suggestion
          if (suggestion && scriptSlots.length > 0) {
            const updatedSlots = [...scriptSlots];
            updatedSlots[0] = { ...updatedSlots[0], text: suggestion };
            setScriptSlots(updatedSlots);
            toast.success("AI suggestion applied to script!");
          }
        }}
      />
    </div>
  );
}

const VideoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
