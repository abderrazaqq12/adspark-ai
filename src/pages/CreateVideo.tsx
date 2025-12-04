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
  Save,
  Package,
  Play,
  Pause,
  Volume2,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sceneRouting, videoTypes, exportFormats } from "@/data/aiModels";
import BatchGeneration from "@/components/BatchGeneration";
import AIAssistant from "@/components/AIAssistant";

// ElevenLabs voices - top voices with IDs
const ELEVENLABS_VOICES = [
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria", language: "en" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", language: "en" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", language: "en" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", language: "es" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", language: "en" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", language: "en" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", language: "en" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", language: "en" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", language: "en" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", language: "fr" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", language: "en" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", language: "en" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", language: "en" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", language: "en" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", language: "en" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", language: "en" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", language: "en" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", language: "en" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", language: "ar" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", language: "en" },
];

const ELEVENLABS_MODELS = [
  { id: "eleven_multilingual_v2", name: "Multilingual v2", description: "29 languages, most natural" },
  { id: "eleven_turbo_v2_5", name: "Turbo v2.5", description: "32 languages, low latency" },
  { id: "eleven_turbo_v2", name: "Turbo v2", description: "English only, fastest" },
  { id: "eleven_monolingual_v1", name: "English v1", description: "Legacy English model" },
];

const VOICE_LANGUAGES = [
  { id: "en", name: "English" },
  { id: "ar", name: "Arabic (العربية)" },
  { id: "es", name: "Spanish (Español)" },
  { id: "fr", name: "French (Français)" },
  { id: "de", name: "German (Deutsch)" },
  { id: "it", name: "Italian (Italiano)" },
  { id: "pt", name: "Portuguese (Português)" },
  { id: "pl", name: "Polish (Polski)" },
  { id: "hi", name: "Hindi (हिन्दी)" },
  { id: "ja", name: "Japanese (日本語)" },
  { id: "ko", name: "Korean (한국어)" },
  { id: "zh", name: "Chinese (中文)" },
];

// Production pipeline stages based on roadmap
const pipelineStages = [
  { id: 0, name: "Product Info", icon: Package, description: "Product details for your video" },
  { id: 1, name: "Video Script Text & Audio", icon: Mic, description: "Voice-over scripts and audio" },
  { id: 2, name: "Scene Builder", icon: Wand2, description: "AI breaks down script into visual scenes" },
  { id: 3, name: "Video Generation", icon: Video, description: "AI creates video for each scene" },
  { id: 4, name: "Assembly & Edit", icon: Palette, description: "Combine, sync, add branding" },
  { id: 5, name: "Export", icon: Globe, description: "Multi-format export" },
];

interface ScriptSlot {
  id: number;
  text: string;
  audioFile: File | null;
  audioUrl: string | null;
  generatedAudioUrl: string | null;
  isGenerating: boolean;
}

interface ProductInfo {
  name: string;
  description: string;
  imageUrl: string;
  link: string;
}

export default function CreateVideo() {
  // Product Info state
  const [productInfo, setProductInfo] = useState<ProductInfo>({
    name: "",
    description: "",
    imageUrl: "",
    link: "",
  });
  
  const [scriptSlots, setScriptSlots] = useState<ScriptSlot[]>([
    { id: 1, text: "", audioFile: null, audioUrl: null, generatedAudioUrl: null, isGenerating: false }
  ]);
  
  // Voice settings
  const [selectedVoice, setSelectedVoice] = useState("EXAVITQu4vr4xnSDxMaL"); // Sarah
  const [selectedModel, setSelectedModel] = useState("eleven_multilingual_v2");
  const [voiceLanguage, setVoiceLanguage] = useState("en");
  
  const [currentStage, setCurrentStage] = useState(0);
  const [expandedStage, setExpandedStage] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scenes, setScenes] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["9:16", "16:9", "1:1"]);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<Record<number, HTMLAudioElement>>({});

  // Load existing project if user has one
  useEffect(() => {
    loadLatestProject();
  }, []);

  const loadLatestProject = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, product_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (projects && projects.length > 0) {
      setProjectId(projects[0].id);
      if (projects[0].product_name) {
        setProductInfo(prev => ({ ...prev, name: projects[0].product_name || "" }));
      }
      
      // Load script for this project
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id, raw_text")
        .eq("project_id", projects[0].id)
        .limit(1);

      if (scripts && scripts.length > 0) {
        setScriptId(scripts[0].id);
        if (scripts[0].raw_text) {
          setScriptSlots([{ id: 1, text: scripts[0].raw_text, audioFile: null, audioUrl: null, generatedAudioUrl: null, isGenerating: false }]);
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
    if (scriptSlots.length >= 20) {
      toast.error("Maximum 20 scripts allowed");
      return;
    }
    setScriptSlots([...scriptSlots, { 
      id: scriptSlots.length + 1, 
      text: "", 
      audioFile: null, 
      audioUrl: null,
      generatedAudioUrl: null,
      isGenerating: false
    }]);
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
  };

  const generateVoiceover = async (slotId: number) => {
    const slot = scriptSlots.find(s => s.id === slotId);
    if (!slot || !slot.text.trim()) {
      toast.error("Please enter script text first");
      return;
    }

    updateScriptSlot(slotId, "isGenerating", true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-voiceover", {
        body: {
          text: slot.text,
          language: voiceLanguage,
          voiceId: selectedVoice,
          model: selectedModel,
          scriptId: scriptId,
        },
      });

      if (error) throw error;

      if (data.audio_url) {
        updateScriptSlot(slotId, "generatedAudioUrl", data.audio_url);
        toast.success("Voice-over generated!");
      } else if (data.audio_base64) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        updateScriptSlot(slotId, "generatedAudioUrl", audioUrl);
        toast.success("Voice-over generated!");
      }
    } catch (error: any) {
      console.error("Error generating voiceover:", error);
      toast.error(error.message || "Failed to generate voice-over");
    } finally {
      updateScriptSlot(slotId, "isGenerating", false);
    }
  };

  const playAudio = (slotId: number, url: string) => {
    // Stop any currently playing audio
    if (playingAudio !== null && audioElements[playingAudio]) {
      audioElements[playingAudio].pause();
      audioElements[playingAudio].currentTime = 0;
    }

    if (playingAudio === slotId) {
      setPlayingAudio(null);
      return;
    }

    let audio = audioElements[slotId];
    if (!audio) {
      audio = new Audio(url);
      audio.onended = () => setPlayingAudio(null);
      setAudioElements(prev => ({ ...prev, [slotId]: audio }));
    }
    
    audio.play();
    setPlayingAudio(slotId);
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
      setExpandedStage(2);
      toast.success("Scripts analyzed successfully!");
    } catch (error: any) {
      console.error("Error analyzing script:", error);
      toast.error(error.message || "Failed to analyze scripts");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveProjectAndScenes = async () => {
    if (!productInfo.name.trim()) {
      toast.error("Please enter a product name first");
      setExpandedStage(0);
      return;
    }

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
            name: productInfo.name,
            product_name: productInfo.name,
            language: voiceLanguage,
            status: "draft",
            settings: {
              product_description: productInfo.description,
              product_image_url: productInfo.imageUrl,
              product_link: productInfo.link,
            }
          })
          .select()
          .single();

        if (projectError) throw projectError;
        currentProjectId = project.id;
        setProjectId(project.id);

        // Create Google Drive folder if configured
        const { data: userSettings } = await supabase
          .from("user_settings")
          .select("preferences")
          .eq("user_id", user.id)
          .single();

        if (userSettings?.preferences) {
          const prefs = userSettings.preferences as Record<string, any>;
          if (prefs.google_drive_folder_url) {
            // Trigger Google Drive folder creation (would need a separate edge function)
            console.log("Would create Google Drive folder for:", productInfo.name);
          }
        }
      }

      // Create or update script
      const allScriptsText = scriptSlots.map(s => s.text).filter(t => t.trim()).join("\n\n---\n\n");
      if (!currentScriptId) {
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .insert({
            project_id: currentProjectId,
            raw_text: allScriptsText,
            language: voiceLanguage,
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

  const canProceedFromProductInfo = productInfo.name.trim().length > 0;
  const hasAnyScript = scriptSlots.some(s => s.text.trim() || s.audioUrl || s.generatedAudioUrl);

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
                    : currentStage > stage.id || currentStage === stage.id
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {currentStage > stage.id ? (
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
          {/* Stage 0: Product Info */}
          {expandedStage === 0 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Product Info
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter your product details. Product name will be used as project name.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productName" className="text-foreground">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="productName"
                    placeholder="e.g., Premium Wireless Earbuds"
                    className="bg-muted/50 border-input"
                    value={productInfo.name}
                    onChange={(e) => setProductInfo({ ...productInfo, name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be used as your project name
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productDescription" className="text-foreground">
                    Product Description <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="productDescription"
                    placeholder="Brief description of your product..."
                    className="bg-muted/50 border-input min-h-[80px]"
                    value={productInfo.description}
                    onChange={(e) => setProductInfo({ ...productInfo, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productImageUrl" className="text-foreground">
                      Product Image URL <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="productImageUrl"
                      placeholder="https://..."
                      className="bg-muted/50 border-input"
                      value={productInfo.imageUrl}
                      onChange={(e) => setProductInfo({ ...productInfo, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productLink" className="text-foreground">
                      Product Link <span className="text-muted-foreground">(optional)</span>
                    </Label>
                    <Input
                      id="productLink"
                      placeholder="https://..."
                      className="bg-muted/50 border-input"
                      value={productInfo.link}
                      onChange={(e) => setProductInfo({ ...productInfo, link: e.target.value })}
                    />
                  </div>
                </div>

                {productInfo.imageUrl && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-2">Image Preview:</p>
                    <img 
                      src={productInfo.imageUrl} 
                      alt="Product preview" 
                      className="max-h-32 rounded-lg object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <Button
                  onClick={() => {
                    setExpandedStage(1);
                    setCurrentStage(1);
                  }}
                  disabled={!canProceedFromProductInfo}
                  className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-glow"
                >
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Next: Add Scripts & Audio
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stage 1: Video Script Text & Audio */}
          {expandedStage === 1 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Mic className="w-5 h-5 text-primary" />
                  Step 1: Video Script Text & Audio
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Enter voice-over scripts or upload audio files. Generate AI voice with ElevenLabs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Voice Settings */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-primary" />
                    ElevenLabs Voice Settings
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground text-xs">Voice</Label>
                      <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {ELEVENLABS_VOICES.map((voice) => (
                            <SelectItem key={voice.id} value={voice.id}>
                              {voice.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-xs">Language</Label>
                      <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VOICE_LANGUAGES.map((lang) => (
                            <SelectItem key={lang.id} value={lang.id}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground text-xs">Model</Label>
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger className="bg-muted/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ELEVENLABS_MODELS.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex flex-col">
                                <span>{model.name}</span>
                                <span className="text-xs text-muted-foreground">{model.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Scripts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-foreground">Voice-Over Scripts ({scriptSlots.length}/20)</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addScriptSlot}
                      disabled={scriptSlots.length >= 20}
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
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <Textarea
                        placeholder="Enter your voice-over script here... (~60 words = 30 seconds)"
                        className="min-h-[100px] bg-muted/50 border-input resize-none"
                        value={slot.text}
                        onChange={(e) => updateScriptSlot(slot.id, "text", e.target.value)}
                      />
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {slot.text.split(/\s+/).filter(Boolean).length} words • ~{Math.round(slot.text.split(/\s+/).filter(Boolean).length / 2)}s
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Generate Voice Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateVoiceover(slot.id)}
                            disabled={slot.isGenerating || !slot.text.trim()}
                            className="text-xs"
                          >
                            {slot.isGenerating ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 mr-1" />
                                Generate Voice
                              </>
                            )}
                          </Button>

                          {/* Upload Audio */}
                          {!slot.audioUrl && (
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

                      {/* Audio Player for Uploaded Audio */}
                      {slot.audioUrl && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudio(slot.id, slot.audioUrl!)}
                            className="h-8 w-8 p-0"
                          >
                            {playingAudio === slot.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="text-xs text-primary flex-1">Uploaded audio ready</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateScriptSlot(slot.id, "audioFile", null);
                              updateScriptSlot(slot.id, "audioUrl", null);
                            }}
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      )}

                      {/* Audio Player for Generated Audio */}
                      {slot.generatedAudioUrl && !slot.audioUrl && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudio(slot.id, slot.generatedAudioUrl!)}
                            className="h-8 w-8 p-0"
                          >
                            {playingAudio === slot.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="text-xs text-primary flex-1">AI voice-over ready</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateScriptSlot(slot.id, "generatedAudioUrl", null)}
                            className="h-6 px-2 text-xs text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAnalyzeScript}
                    disabled={isAnalyzing || !hasAnyScript}
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
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stage 2: Scene Builder */}
          {expandedStage === 2 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Step 2: Scene Builder
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Configure video type and review AI-generated scenes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Video Type, Language & Marketing Hooks - Moved here from Step 1 */}
                <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
                  <h4 className="text-sm font-medium text-foreground">Video Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-foreground">Video Type</Label>
                      <Select defaultValue="ugc_review">
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
                      <Label className="text-foreground">Video Language</Label>
                      <Select defaultValue="en">
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

                  <div className="space-y-2">
                    <Label className="text-foreground">Marketing Hooks</Label>
                    <div className="flex gap-2 mb-2">
                      <Button variant="outline" size="sm" className="bg-gradient-primary text-primary-foreground">
                        Automatic (AI Generated)
                      </Button>
                      <Button variant="outline" size="sm">
                        Manual
                      </Button>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <p className="text-sm text-primary">
                        AI will automatically generate attention-grabbing hooks based on your script and product
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scenes */}
                {scenes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Enter a script and click "Analyze & Build Scenes" in Step 1</p>
                    <p className="text-xs mt-2">AI will auto-route each scene to the best model</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    <h4 className="text-sm font-medium text-foreground">
                      Generated Scenes ({scenes.length})
                    </h4>
                    {scenes.map((scene, index) => {
                      const routing = sceneRouting.find(r => 
                        scene.title?.toLowerCase().includes(r.sceneType.replace('_', ' ')) ||
                        scene.description?.toLowerCase().includes(r.sceneType.replace('_', ' '))
                      ) || sceneRouting[5];
                      
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
          )}

          {/* Stage 3: Video Generation */}
          {expandedStage === 3 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary" />
                  Step 3: Video Generation
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Generate video for each scene using AI engines
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {scriptId ? (
                  <BatchGeneration 
                    scriptId={scriptId} 
                    scenesCount={scenes.length}
                    onComplete={() => toast.success("All videos generated!")}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Save your project first to start video generation</p>
                    <p className="text-xs mt-2">Complete Steps 0-2 and save your project</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stage 4: Assembly & Edit */}
          {expandedStage === 4 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Step 4: Assembly & Edit
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Combine scenes, sync audio, and add branding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <Palette className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Timeline editor and assembly tools</p>
                  <p className="text-xs mt-2">Adjust transitions, audio sync, and branding elements</p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-gradient-primary hover:opacity-90 text-primary-foreground">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Auto-Assemble
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Palette className="w-4 h-4 mr-2" />
                    Open Timeline Editor
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stage 5: Export */}
          {expandedStage === 5 && (
            <Card className="bg-gradient-card border-border shadow-card">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Step 5: Export
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
                      toast.success(`Exporting in ${selectedFormats.length} format(s)!`);
                    }}
                    className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Export Videos ({selectedFormats.length} formats)
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Save Button - shown when scenes exist */}
          {scenes.length > 0 && !scriptId && expandedStage <= 2 && (
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
        </div>
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
