import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Wand2, 
  GripVertical, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Upload, 
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  Video,
  Loader2,
  Save,
  Sparkles,
  Download,
  Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ExportVideoModal from "@/components/ExportVideoModal";
import VideoPreviewPlayer from "@/components/VideoPreviewPlayer";

interface Scene {
  id: string;
  index: number;
  text: string;
  scene_type: string | null;
  visual_prompt: string | null;
  engine_name: string | null;
  engine_id: string | null;
  status: string;
  video_url: string | null;
  duration_sec: number;
}

interface Engine {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function SceneBuilder() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingScene, setGeneratingScene] = useState<string | null>(null);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [scriptId, setScriptId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewScene, setPreviewScene] = useState<Scene | null>(null);

  useEffect(() => {
    fetchEngines();
    if (projectId) {
      fetchScenes();
    } else {
      setLoading(false);
    }
  }, [projectId]);

  const fetchEngines = async () => {
    const { data } = await supabase
      .from("ai_engines")
      .select("id, name, type, status")
      .eq("status", "active");
    setEngines(data || []);
  };

  const fetchScenes = async () => {
    try {
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id")
        .eq("project_id", projectId)
        .limit(1)
        .single();

      if (scripts) {
        setScriptId(scripts.id);
        const { data: scenesData, error } = await supabase
          .from("scenes")
          .select("*")
          .eq("script_id", scripts.id)
          .order("index");

        if (error) throw error;
        setScenes(scenesData || []);
      }
    } catch (error) {
      console.error("Error fetching scenes:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateScene = async (sceneId: string, updates: Partial<Scene>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("scenes")
        .update(updates)
        .eq("id", sceneId);

      if (error) throw error;
      setScenes(scenes.map(s => s.id === sceneId ? { ...s, ...updates } : s));
      toast.success("Scene updated");
    } catch (error) {
      toast.error("Failed to update scene");
    } finally {
      setSaving(false);
    }
  };

  const deleteScene = async (sceneId: string) => {
    try {
      const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
      if (error) throw error;
      setScenes(scenes.filter(s => s.id !== sceneId));
      toast.success("Scene deleted");
    } catch (error) {
      toast.error("Failed to delete scene");
    }
  };

  const moveScene = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= scenes.length) return;

    const newScenes = [...scenes];
    [newScenes[index], newScenes[newIndex]] = [newScenes[newIndex], newScenes[index]];
    
    // Update indexes
    newScenes.forEach((scene, i) => {
      scene.index = i;
    });
    
    setScenes(newScenes);

    // Persist to DB
    for (const scene of newScenes) {
      await supabase.from("scenes").update({ index: scene.index }).eq("id", scene.id);
    }
  };

  const regenerateScene = async (scene: Scene) => {
    setGeneratingScene(scene.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-scene-video", {
        body: {
          sceneId: scene.id,
          engineName: scene.engine_name,
          prompt: scene.visual_prompt || scene.text,
        },
      });

      if (error) throw error;
      
      if (data.videoUrl) {
        setScenes(scenes.map(s => 
          s.id === scene.id ? { ...s, video_url: data.videoUrl, status: "completed" } : s
        ));
        toast.success("Scene regenerated!");
      } else if (data.taskId) {
        toast.info("Video generation started. Check back soon.");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to regenerate scene");
    } finally {
      setGeneratingScene(null);
    }
  };

  const addNewScene = async () => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }

    try {
      const { data: scripts } = await supabase
        .from("scripts")
        .select("id")
        .eq("project_id", projectId)
        .limit(1)
        .single();

      if (!scripts) {
        toast.error("No script found for this project");
        return;
      }

      const newScene = {
        script_id: scripts.id,
        index: scenes.length,
        text: "New scene",
        scene_type: "broll",
        status: "pending",
        duration_sec: 5,
      };

      const { data, error } = await supabase
        .from("scenes")
        .insert(newScene)
        .select()
        .single();

      if (error) throw error;
      setScenes([...scenes, data]);
      toast.success("Scene added");
    } catch (error) {
      toast.error("Failed to add scene");
    }
  };

  const getEnginesByType = (type: string) => engines.filter(e => e.type === type);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-primary/20 text-primary">Completed</Badge>;
      case "generating": return <Badge className="bg-secondary/20 text-secondary">Generating</Badge>;
      case "failed": return <Badge className="bg-destructive/20 text-destructive">Failed</Badge>;
      default: return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
    }
  };

  if (!projectId) {
    return (
      <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Scene Builder</h1>
          <p className="text-muted-foreground">
            Select a project to edit scenes
          </p>
        </div>
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="py-16 text-center">
            <Wand2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Project Selected</h3>
            <p className="text-muted-foreground mb-4">
              Go to Projects and select one to edit its scenes
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = "/projects"}
              className="border-border"
            >
              View Projects
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Scene Builder</h1>
          <p className="text-muted-foreground">
            Edit, reorder, and customize your video scenes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addNewScene} className="border-border">
            <Plus className="w-4 h-4 mr-2" />
            Add Scene
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setExportOpen(true)}
            disabled={scenes.length === 0 || !scriptId}
            className="border-border"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Video
          </Button>
          <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate All Videos
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-gradient-card border-border animate-pulse">
              <CardContent className="py-8">
                <div className="h-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : scenes.length === 0 ? (
        <Card className="bg-gradient-card border-border shadow-card">
          <CardContent className="py-16 text-center">
            <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Scenes Yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate scenes from your script or add them manually
            </p>
            <Button onClick={addNewScene} className="bg-gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              Add First Scene
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scenes.map((scene, index) => (
            <Card 
              key={scene.id} 
              className="bg-gradient-card border-border shadow-card hover:border-primary/30 transition-colors"
            >
              <CardContent className="py-4">
                <div className="flex gap-4">
                  {/* Drag Handle & Index */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => moveScene(index, "up")}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => moveScene(index, "down")}
                        disabled={index === scenes.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Video Preview */}
                  <div className="w-40 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                    {scene.video_url ? (
                      <>
                        <video 
                          src={scene.video_url} 
                          className="w-full h-full object-cover"
                        />
                        <div 
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          onClick={() => setPreviewScene(scene)}
                        >
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <Video className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Scene Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-border">
                          {scene.scene_type || "Scene"}
                        </Badge>
                        {getStatusBadge(scene.status)}
                        <span className="text-xs text-muted-foreground">
                          {scene.duration_sec}s
                        </span>
                      </div>
                    </div>

                    {editingScene === scene.id ? (
                      <div className="space-y-3">
                        <Textarea
                          defaultValue={scene.text}
                          className="bg-muted/50 border-border min-h-[60px]"
                          onBlur={(e) => updateScene(scene.id, { text: e.target.value })}
                        />
                        <Input
                          defaultValue={scene.visual_prompt || ""}
                          placeholder="Visual prompt..."
                          className="bg-muted/50 border-border"
                          onBlur={(e) => updateScene(scene.id, { visual_prompt: e.target.value })}
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingScene(null)}
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-muted/30 p-2 rounded -m-2"
                        onClick={() => setEditingScene(scene.id)}
                      >
                        <p className="text-sm text-foreground">{scene.text}</p>
                        {scene.visual_prompt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="text-primary">Visual:</span> {scene.visual_prompt}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Engine Selection & Actions */}
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <Select
                      value={scene.engine_id || ""}
                      onValueChange={(value) => {
                        const engine = engines.find(e => e.id === value);
                        updateScene(scene.id, { 
                          engine_id: value, 
                          engine_name: engine?.name 
                        });
                      }}
                    >
                      <SelectTrigger className="bg-muted/50 border-border">
                        <SelectValue placeholder="Select engine" />
                      </SelectTrigger>
                      <SelectContent>
                        {engines.map((engine) => (
                          <SelectItem key={engine.id} value={engine.id}>
                            {engine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-border"
                        onClick={() => regenerateScene(scene)}
                        disabled={generatingScene === scene.id}
                      >
                        {generatingScene === scene.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-border">
                            <Upload className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Upload Custom Video</DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <Input type="file" accept="video/*" />
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border text-destructive hover:bg-destructive/10"
                        onClick={() => deleteScene(scene.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Export Video Modal */}
      {scriptId && (
        <ExportVideoModal
          open={exportOpen}
          onOpenChange={setExportOpen}
          scriptId={scriptId}
          projectId={projectId || undefined}
          scenesCount={scenes.length}
        />
      )}

      {/* Video Preview Player */}
      {previewScene && previewScene.video_url && (
        <VideoPreviewPlayer
          open={!!previewScene}
          onOpenChange={(open) => !open && setPreviewScene(null)}
          videoUrl={previewScene.video_url}
          title={previewScene.text}
          sceneIndex={previewScene.index}
          engineName={previewScene.engine_name || undefined}
          onDownload={() => {
            if (previewScene.video_url) {
              window.open(previewScene.video_url, '_blank');
            }
          }}
        />
      )}
    </div>
  );
}
