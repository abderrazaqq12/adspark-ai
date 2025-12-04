import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Type, 
  Plus, 
  Trash2, 
  Clock,
  Loader2,
  Wand2,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Subtitle {
  id: string;
  scene_id: string;
  text: string;
  start_time_ms: number;
  end_time_ms: number;
  style: Json | null;
}

interface Scene {
  id: string;
  index: number;
  text: string;
  duration_sec: number;
}

interface SubtitleEditorProps {
  scenes: Scene[];
  onSubtitlesChange?: (subtitles: Subtitle[]) => void;
}

export default function SubtitleEditor({ scenes, onSubtitlesChange }: SubtitleEditorProps) {
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (scenes.length > 0) {
      fetchSubtitles();
    }
  }, [scenes]);

  const fetchSubtitles = async () => {
    try {
      const sceneIds = scenes.map(s => s.id);
      const { data, error } = await supabase
        .from("subtitles")
        .select("*")
        .in("scene_id", sceneIds)
        .order("start_time_ms");

      if (error) throw error;
      setSubtitles((data || []) as Subtitle[]);
      onSubtitlesChange?.((data || []) as Subtitle[]);
    } catch (error) {
      console.error("Error fetching subtitles:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSceneStartTime = (sceneIndex: number) => {
    return scenes.slice(0, sceneIndex).reduce((acc, scene) => acc + scene.duration_sec * 1000, 0);
  };

  const autoGenerateSubtitles = async () => {
    setGenerating(true);
    try {
      // Delete existing subtitles
      const sceneIds = scenes.map(s => s.id);
      await supabase.from("subtitles").delete().in("scene_id", sceneIds);

      const newSubtitles: Array<{
        scene_id: string;
        text: string;
        start_time_ms: number;
        end_time_ms: number;
      }> = [];

      for (const scene of scenes) {
        const sceneStartTime = getSceneStartTime(scene.index);
        const words = scene.text.split(" ");
        const wordsPerSubtitle = 6; // ~6 words per subtitle
        const chunks: string[] = [];

        for (let i = 0; i < words.length; i += wordsPerSubtitle) {
          chunks.push(words.slice(i, i + wordsPerSubtitle).join(" "));
        }

        const durationPerChunk = (scene.duration_sec * 1000) / chunks.length;

        chunks.forEach((chunk, idx) => {
          newSubtitles.push({
            scene_id: scene.id,
            text: chunk,
            start_time_ms: Math.round(sceneStartTime + (idx * durationPerChunk)),
            end_time_ms: Math.round(sceneStartTime + ((idx + 1) * durationPerChunk)),
          });
        });
      }

      const { data, error } = await supabase
        .from("subtitles")
        .insert(newSubtitles)
        .select();

      if (error) throw error;
      setSubtitles((data || []) as Subtitle[]);
      onSubtitlesChange?.((data || []) as Subtitle[]);
      toast.success(`Generated ${data?.length || 0} subtitles`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate subtitles");
    } finally {
      setGenerating(false);
    }
  };

  const addSubtitle = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;

    const sceneStartTime = getSceneStartTime(scene.index);
    const sceneSubs = subtitles.filter(s => s.scene_id === sceneId);
    const lastSub = sceneSubs[sceneSubs.length - 1];
    
    const startTime = lastSub ? lastSub.end_time_ms : sceneStartTime;
    const endTime = startTime + 2000; // 2 second default

    try {
      const { data, error } = await supabase
        .from("subtitles")
        .insert({
          scene_id: sceneId,
          text: "New subtitle",
          start_time_ms: startTime,
          end_time_ms: endTime,
          style: {}
        })
        .select()
        .single();

      if (error) throw error;
      const updated = [...subtitles, data as Subtitle].sort((a, b) => a.start_time_ms - b.start_time_ms);
      setSubtitles(updated);
      onSubtitlesChange?.(updated);
      setEditingId(data.id);
    } catch (error) {
      toast.error("Failed to add subtitle");
    }
  };

  const updateSubtitle = async (id: string, updates: { text?: string; start_time_ms?: number; end_time_ms?: number }) => {
    try {
      const { error } = await supabase
        .from("subtitles")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      const updated = subtitles.map(s => s.id === id ? { ...s, ...updates } : s);
      setSubtitles(updated);
      onSubtitlesChange?.(updated);
    } catch (error) {
      toast.error("Failed to update subtitle");
    }
  };

  const deleteSubtitle = async (id: string) => {
    try {
      const { error } = await supabase.from("subtitles").delete().eq("id", id);
      if (error) throw error;
      const updated = subtitles.filter(s => s.id !== id);
      setSubtitles(updated);
      onSubtitlesChange?.(updated);
    } catch (error) {
      toast.error("Failed to delete subtitle");
    }
  };

  const moveSubtitle = (id: string, direction: "earlier" | "later") => {
    const sub = subtitles.find(s => s.id === id);
    if (!sub) return;

    const shift = direction === "earlier" ? -500 : 500;
    updateSubtitle(id, {
      start_time_ms: Math.max(0, sub.start_time_ms + shift),
      end_time_ms: Math.max(500, sub.end_time_ms + shift)
    });
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Type className="w-5 h-5 text-primary" />
            Subtitles / Captions
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={autoGenerateSubtitles}
            disabled={generating || scenes.length === 0}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Auto Generate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : scenes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Type className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No scenes available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scenes.map((scene) => {
              const sceneSubs = subtitles.filter(s => s.scene_id === scene.id);
              
              return (
                <div key={scene.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-primary/30 text-primary">
                        Scene {scene.index + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {sceneSubs.length} subtitle{sceneSubs.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addSubtitle(scene.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  <div className="space-y-2 pl-4 border-l-2 border-border">
                    {sceneSubs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No subtitles for this scene
                      </p>
                    ) : (
                      sceneSubs.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-muted/30 rounded-lg p-3 space-y-2"
                        >
                          {editingId === sub.id ? (
                            <Textarea
                              value={sub.text}
                              onChange={(e) => updateSubtitle(sub.id, { text: e.target.value })}
                              onBlur={() => setEditingId(null)}
                              className="bg-background border-border min-h-[60px]"
                              autoFocus
                            />
                          ) : (
                            <p
                              className="text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                              onClick={() => setEditingId(sub.id)}
                            >
                              {sub.text}
                            </p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(sub.start_time_ms)}</span>
                              <span>→</span>
                              <span>{formatTime(sub.end_time_ms)}</span>
                              <span className="text-primary">
                                ({((sub.end_time_ms - sub.start_time_ms) / 1000).toFixed(1)}s)
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveSubtitle(sub.id, "earlier")}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => moveSubtitle(sub.id, "later")}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                onClick={() => deleteSubtitle(sub.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* Timing Sliders */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Start</label>
                              <Input
                                type="number"
                                value={sub.start_time_ms}
                                onChange={(e) => updateSubtitle(sub.id, { 
                                  start_time_ms: parseInt(e.target.value) || 0 
                                })}
                                className="h-7 text-xs bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">End</label>
                              <Input
                                type="number"
                                value={sub.end_time_ms}
                                onChange={(e) => updateSubtitle(sub.id, { 
                                  end_time_ms: parseInt(e.target.value) || 0 
                                })}
                                className="h-7 text-xs bg-background"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
