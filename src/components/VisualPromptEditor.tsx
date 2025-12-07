import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  Wand2, 
  Sparkles, 
  Eye, 
  Edit3, 
  Save, 
  RefreshCw,
  Loader2,
  Image,
  Palette,
  Film,
  Zap,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Scene {
  id: string;
  index: number;
  text: string;
  scene_type: string | null;
  visual_prompt: string | null;
  engine_name: string | null;
  thumbnail_url: string | null;
  status: string;
}

interface VisualPromptEditorProps {
  scenes: Scene[];
  onScenesUpdate: (scenes: Scene[]) => void;
  projectId?: string;
}

const VISUAL_STYLES = [
  { value: "cinematic", label: "Cinematic", description: "Film-like quality with dramatic lighting" },
  { value: "product", label: "Product Shot", description: "Clean, professional product focus" },
  { value: "lifestyle", label: "Lifestyle", description: "Natural, everyday settings" },
  { value: "minimal", label: "Minimal", description: "Simple, clean backgrounds" },
  { value: "vibrant", label: "Vibrant", description: "Bold colors and high energy" },
  { value: "luxury", label: "Luxury", description: "Premium, high-end aesthetic" },
  { value: "urban", label: "Urban", description: "City and street vibes" },
  { value: "nature", label: "Nature", description: "Outdoor, organic settings" },
];

const MOTION_TYPES = [
  { value: "static", label: "Static" },
  { value: "slow_pan", label: "Slow Pan" },
  { value: "zoom_in", label: "Zoom In" },
  { value: "zoom_out", label: "Zoom Out" },
  { value: "orbit", label: "Orbit" },
  { value: "tracking", label: "Tracking" },
  { value: "dynamic", label: "Dynamic" },
];

export default function VisualPromptEditor({ scenes, onScenesUpdate, projectId }: VisualPromptEditorProps) {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("cinematic");
  const [selectedMotion, setSelectedMotion] = useState("dynamic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const currentScene = scenes[selectedSceneIndex];

  useEffect(() => {
    if (currentScene) {
      setEditedPrompt(currentScene.visual_prompt || "");
      setPreviewUrl(currentScene.thumbnail_url);
    }
  }, [selectedSceneIndex, currentScene]);

  const generatePrompt = async () => {
    if (!currentScene) return;

    setIsGenerating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call AI to generate visual prompt based on scene text
      const { data, error } = await supabase.functions.invoke('ai-operator', {
        body: {
          action: 'generate_visual_prompt',
          sceneId: currentScene.id,
          sceneText: currentScene.text,
          style: selectedStyle,
          motion: selectedMotion,
          userId: user.id
        }
      });

      if (error) throw error;

      const generatedPrompt = data.visual_prompt || buildPromptFromInputs();
      setEditedPrompt(generatedPrompt);
      toast.success('Visual prompt generated');
    } catch (error: any) {
      // Fallback to local generation if edge function fails
      const fallbackPrompt = buildPromptFromInputs();
      setEditedPrompt(fallbackPrompt);
      toast.info('Generated prompt locally');
    } finally {
      setIsGenerating(false);
    }
  };

  const buildPromptFromInputs = () => {
    const styleInfo = VISUAL_STYLES.find(s => s.value === selectedStyle);
    const motionInfo = MOTION_TYPES.find(m => m.value === selectedMotion);
    
    return `${styleInfo?.description || ''}, ${currentScene?.text || ''}, ${motionInfo?.label?.toLowerCase() || 'dynamic'} camera movement, high quality, professional lighting, 4K`;
  };

  const enhancePrompt = async () => {
    if (!editedPrompt) return;

    setIsGenerating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-operator', {
        body: {
          action: 'enhance_prompt',
          prompt: editedPrompt,
          style: selectedStyle,
          userId: user.id
        }
      });

      if (error) throw error;

      setEditedPrompt(data.enhanced_prompt || editedPrompt);
      toast.success('Prompt enhanced');
    } catch (error: any) {
      // Simple local enhancement
      const enhanced = `${editedPrompt}, ultra detailed, professional quality, perfect composition, cinematic lighting`;
      setEditedPrompt(enhanced);
      toast.info('Enhanced locally');
    } finally {
      setIsGenerating(false);
    }
  };

  const savePrompt = async () => {
    if (!currentScene) return;

    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('scenes')
        .update({ visual_prompt: editedPrompt })
        .eq('id', currentScene.id);

      if (error) throw error;

      const updatedScenes = scenes.map(s => 
        s.id === currentScene.id ? { ...s, visual_prompt: editedPrompt } : s
      );
      onScenesUpdate(updatedScenes);
      toast.success('Prompt saved');
    } catch (error: any) {
      toast.error('Failed to save prompt');
    } finally {
      setIsSaving(false);
    }
  };

  const generatePreview = async () => {
    if (!editedPrompt || !currentScene) return;

    setIsGenerating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-image-generator', {
        body: {
          projectId,
          prompt: editedPrompt,
          imageType: 'thumbnail',
          userId: user.id
        }
      });

      if (error) throw error;

      if (data.imageUrl) {
        setPreviewUrl(data.imageUrl);
        
        // Save thumbnail to scene
        await supabase
          .from('scenes')
          .update({ thumbnail_url: data.imageUrl })
          .eq('id', currentScene.id);

        toast.success('Preview generated');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate preview');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(editedPrompt);
    toast.success('Prompt copied');
  };

  const applyToAllScenes = async () => {
    if (!editedPrompt) return;

    setIsSaving(true);
    
    try {
      // Apply style settings to all scenes
      for (const scene of scenes) {
        const styleInfo = VISUAL_STYLES.find(s => s.value === selectedStyle);
        const scenePrompt = `${styleInfo?.description || ''}, ${scene.text}, ${selectedMotion} camera, high quality`;
        
        await supabase
          .from('scenes')
          .update({ visual_prompt: scenePrompt })
          .eq('id', scene.id);
      }

      toast.success('Style applied to all scenes');
    } catch (error) {
      toast.error('Failed to apply to all scenes');
    } finally {
      setIsSaving(false);
    }
  };

  if (scenes.length === 0) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardContent className="py-12 text-center">
          <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No scenes available. Create scenes first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wand2 className="w-5 h-5 text-primary" />
            Visual Prompt Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSceneIndex(Math.max(0, selectedSceneIndex - 1))}
              disabled={selectedSceneIndex === 0}
              className="border-border"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Badge variant="outline" className="border-border">
              Scene {selectedSceneIndex + 1} / {scenes.length}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSceneIndex(Math.min(scenes.length - 1, selectedSceneIndex + 1))}
              disabled={selectedSceneIndex === scenes.length - 1}
              className="border-border"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Preview & Scene Info */}
          <div className="space-y-4">
            {/* Preview Image */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Preview</Label>
              <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden border border-border">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="Scene preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Image className="w-12 h-12 mb-2 opacity-50" />
                    <p className="text-sm">No preview yet</p>
                    <p className="text-xs opacity-70">Generate a preview below</p>
                  </div>
                )}
              </AspectRatio>
              <Button
                onClick={generatePreview}
                disabled={isGenerating || !editedPrompt}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Generate Preview
              </Button>
            </div>

            {/* Scene Text */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Scene Script</Label>
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-foreground">{currentScene?.text || 'No script text'}</p>
              </div>
            </div>

            {/* Scene Thumbnails */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">All Scenes</Label>
              <ScrollArea className="h-[100px]">
                <div className="flex gap-2">
                  {scenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      onClick={() => setSelectedSceneIndex(index)}
                      className={`flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                        index === selectedSceneIndex 
                          ? 'border-primary shadow-glow' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {scene.thumbnail_url ? (
                        <img 
                          src={scene.thumbnail_url} 
                          alt={`Scene ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">{index + 1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Right: Prompt Editor */}
          <div className="space-y-4">
            {/* Style Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Visual Style
                </Label>
                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VISUAL_STYLES.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Film className="w-3 h-3" />
                  Camera Motion
                </Label>
                <Select value={selectedMotion} onValueChange={setSelectedMotion}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTION_TYPES.map((motion) => (
                      <SelectItem key={motion.value} value={motion.value}>
                        {motion.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generatePrompt}
                disabled={isGenerating}
                className="flex-1 border-border"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={enhancePrompt}
                disabled={isGenerating || !editedPrompt}
                className="flex-1 border-border"
              >
                <Zap className="w-4 h-4 mr-2" />
                Enhance
              </Button>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />
                  Visual Prompt
                </Label>
                <Button variant="ghost" size="sm" onClick={copyPrompt} className="h-6 text-xs">
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
              </div>
              <Textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                placeholder="Describe the visual style, scene elements, lighting, camera angles..."
                className="h-[150px] bg-background border-border resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {editedPrompt.length} characters
              </p>
            </div>

            {/* Save Actions */}
            <div className="flex gap-2">
              <Button
                onClick={savePrompt}
                disabled={isSaving}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Prompt
              </Button>
              <Button
                variant="outline"
                onClick={applyToAllScenes}
                disabled={isSaving}
                className="border-border"
              >
                <Check className="w-4 h-4 mr-2" />
                Apply to All
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
