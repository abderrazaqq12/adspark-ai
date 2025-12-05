import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward,
  Film,
  Clock,
  Wand2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize2
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
  engine_id: string | null;
  status: string;
  video_url: string | null;
  duration_sec: number;
  transition_type: string;
  transition_duration_ms: number;
}

interface VideoTimelineEditorProps {
  scenes: Scene[];
  onScenesUpdate: (scenes: Scene[]) => void;
}

const TRANSITION_TYPES = [
  { value: "cut", label: "Cut" },
  { value: "fade", label: "Fade" },
  { value: "dissolve", label: "Dissolve" },
  { value: "wipe-left", label: "Wipe Left" },
  { value: "wipe-right", label: "Wipe Right" },
  { value: "zoom", label: "Zoom" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
];

export default function VideoTimelineEditor({ scenes, onScenesUpdate }: VideoTimelineEditorProps) {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalDuration = scenes.reduce((acc, scene) => acc + scene.duration_sec, 0);
  const selectedScene = scenes.find(s => s.id === selectedSceneId);
  
  // Get the current scene based on currentTime
  const getCurrentScene = () => {
    let accTime = 0;
    for (const scene of scenes) {
      if (currentTime >= accTime && currentTime < accTime + scene.duration_sec) {
        return scene;
      }
      accTime += scene.duration_sec;
    }
    return scenes[scenes.length - 1];
  };
  
  const currentScene = getCurrentScene();

  // Sync video with timeline scrubber
  useEffect(() => {
    if (videoRef.current && currentScene?.video_url) {
      const sceneStart = getSceneStartTime(currentScene.index);
      const videoTime = currentTime - sceneStart;
      if (Math.abs(videoRef.current.currentTime - videoTime) > 0.5) {
        videoRef.current.currentTime = Math.max(0, videoTime);
      }
    }
  }, [currentTime, currentScene]);

  const getSceneStartTime = (index: number) => {
    return scenes.slice(0, index).reduce((acc, scene) => acc + scene.duration_sec, 0);
  };

  const updateSceneProperty = async (sceneId: string, updates: Partial<Scene>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("scenes")
        .update(updates)
        .eq("id", sceneId);

      if (error) throw error;

      const updatedScenes = scenes.map(s => 
        s.id === sceneId ? { ...s, ...updates } : s
      );
      onScenesUpdate(updatedScenes);
      toast.success("Scene updated");
    } catch (error) {
      toast.error("Failed to update scene");
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("sceneIndex", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("sceneIndex"));
    
    if (dragIndex === dropIndex) return;

    const newScenes = [...scenes];
    const [removed] = newScenes.splice(dragIndex, 1);
    newScenes.splice(dropIndex, 0, removed);

    // Update indexes
    newScenes.forEach((scene, i) => {
      scene.index = i;
    });

    onScenesUpdate(newScenes);

    // Persist to DB
    for (const scene of newScenes) {
      await supabase.from("scenes").update({ index: scene.index }).eq("id", scene.id);
    }
  };

  const playPause = () => {
    setIsPlaying(!isPlaying);
  };

  const skipToScene = (direction: "prev" | "next") => {
    const currentSceneIndex = scenes.findIndex(s => {
      const start = getSceneStartTime(s.index);
      const end = start + s.duration_sec;
      return currentTime >= start && currentTime < end;
    });

    if (direction === "prev" && currentSceneIndex > 0) {
      setCurrentTime(getSceneStartTime(currentSceneIndex - 1));
    } else if (direction === "next" && currentSceneIndex < scenes.length - 1) {
      setCurrentTime(getSceneStartTime(currentSceneIndex + 1));
    }
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Film className="w-5 h-5 text-primary" />
          Timeline Editor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Preview Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                Preview
              </h4>
              <Badge variant="outline" className="text-xs">
                Scene {currentScene ? currentScene.index + 1 : 1}
              </Badge>
            </div>
            <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg overflow-hidden border border-border">
              {currentScene?.video_url ? (
                <video
                  ref={videoRef}
                  src={currentScene.video_url}
                  className="w-full h-full object-cover"
                  muted={isMuted}
                  playsInline
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Film className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">No video for current scene</p>
                  <p className="text-xs opacity-70">Generate videos in Step 3</p>
                </div>
              )}
            </AspectRatio>
            
            {/* Video Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => skipToScene("prev")}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10"
                onClick={() => {
                  if (videoRef.current) {
                    if (isPlaying) {
                      videoRef.current.pause();
                    } else {
                      videoRef.current.play();
                    }
                  }
                  playPause();
                }}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => skipToScene("next")}>
                <SkipForward className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 ml-2"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Current Scene Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">Current Scene Details</h4>
            {currentScene ? (
              <div className="space-y-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Transition</span>
                  <Badge variant="secondary" className="text-xs">
                    {currentScene.transition_type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{currentScene.duration_sec}s</span>
                </div>
                {currentScene.transition_type !== "cut" && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Transition Duration</span>
                    <span className="text-sm font-medium">{currentScene.transition_duration_ms}ms</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">Script</span>
                  <p className="text-sm text-foreground mt-1 line-clamp-3">
                    {currentScene.text}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-muted-foreground">
                No scene selected
              </div>
            )}
          </div>
        </div>

        {/* Timeline Time Display */}
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 mr-2" />
          {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, "0")} / {Math.floor(totalDuration / 60)}:{Math.floor(totalDuration % 60).toString().padStart(2, "0")}
        </div>

        {/* Timeline Scrubber */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={totalDuration}
            step={0.1}
            onValueChange={([value]) => setCurrentTime(value)}
            className="cursor-pointer"
          />
        </div>

        {/* Timeline Track */}
        <div className="relative">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {scenes.map((scene, index) => {
              const widthPercent = (scene.duration_sec / totalDuration) * 100;
              const isSelected = selectedSceneId === scene.id;
              
              return (
                <div
                  key={scene.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onClick={() => setSelectedSceneId(scene.id)}
                  className={`
                    relative flex-shrink-0 h-20 rounded-lg cursor-pointer
                    transition-all duration-200 overflow-hidden
                    ${isSelected 
                      ? "ring-2 ring-primary shadow-glow" 
                      : "hover:ring-1 hover:ring-primary/50"
                    }
                  `}
                  style={{ 
                    minWidth: `${Math.max(widthPercent * 3, 80)}px`,
                    backgroundColor: scene.video_url ? "transparent" : "hsl(var(--muted))"
                  }}
                >
                  {scene.video_url ? (
                    <video 
                      src={scene.video_url} 
                      className="w-full h-full object-cover"
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  {/* Scene overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <div className="flex items-center gap-1 w-full">
                      <GripVertical className="w-3 h-3 text-white/70 cursor-grab" />
                      <span className="text-xs text-white font-medium truncate flex-1">
                        Scene {index + 1}
                      </span>
                      <span className="text-xs text-white/70">{scene.duration_sec}s</span>
                    </div>
                  </div>

                  {/* Transition indicator */}
                  {index < scenes.length - 1 && scene.transition_type !== "cut" && (
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Wand2 className="w-2 h-2 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scene Properties Panel */}
        {selectedScene && (
          <Card className="bg-muted/30 border-border">
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-foreground">Scene {selectedScene.index + 1} Properties</h4>
                <Badge variant="outline" className="border-border">
                  {selectedScene.transition_type}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Duration (seconds)
                  </label>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => updateSceneProperty(selectedScene.id, { 
                        duration_sec: Math.max(1, selectedScene.duration_sec - 1) 
                      })}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{selectedScene.duration_sec}s</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => updateSceneProperty(selectedScene.id, { 
                        duration_sec: selectedScene.duration_sec + 1 
                      })}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Transition Type */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-1">
                    <Wand2 className="w-3 h-3" />
                    Transition
                  </label>
                  <Select
                    value={selectedScene.transition_type}
                    onValueChange={(value) => updateSceneProperty(selectedScene.id, { transition_type: value })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSITION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Transition Duration (only for non-cut transitions) */}
              {selectedScene.transition_type !== "cut" && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Transition Duration: {selectedScene.transition_duration_ms}ms
                  </label>
                  <Slider
                    value={[selectedScene.transition_duration_ms]}
                    min={100}
                    max={2000}
                    step={100}
                    onValueChange={([value]) => updateSceneProperty(selectedScene.id, { 
                      transition_duration_ms: value 
                    })}
                  />
                </div>
              )}

              {/* Scene Text Preview */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Script Text</label>
                <p className="text-sm text-foreground bg-background/50 p-2 rounded border border-border">
                  {selectedScene.text}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {scenes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No scenes to display</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
