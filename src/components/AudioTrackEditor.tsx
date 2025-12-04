import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Music, 
  Plus, 
  Trash2, 
  Volume2, 
  VolumeX,
  Upload,
  Play,
  Pause,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AudioTrack {
  id: string;
  script_id: string;
  name: string;
  file_url: string;
  duration_sec: number | null;
  volume: number;
  fade_in_ms: number;
  fade_out_ms: number;
  start_time_sec: number;
  track_type: string;
}

interface AudioTrackEditorProps {
  scriptId: string;
  totalDuration: number;
}

export default function AudioTrackEditor({ scriptId, totalDuration }: AudioTrackEditorProps) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    fetchTracks();
  }, [scriptId]);

  const fetchTracks = async () => {
    try {
      const { data, error } = await supabase
        .from("audio_tracks")
        .select("*")
        .eq("script_id", scriptId)
        .order("created_at");

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error("Error fetching tracks:", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadAudio = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${scriptId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("audio")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("audio")
        .getPublicUrl(fileName);

      // Get audio duration
      const audio = new Audio(publicUrl);
      await new Promise((resolve) => {
        audio.onloadedmetadata = resolve;
      });
      const duration = audio.duration;

      const { data: track, error: insertError } = await supabase
        .from("audio_tracks")
        .insert({
          script_id: scriptId,
          name: file.name,
          file_url: publicUrl,
          duration_sec: duration,
          volume: 1.0,
          fade_in_ms: 0,
          fade_out_ms: 0,
          start_time_sec: 0,
          track_type: "background"
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setTracks([...tracks, track]);
      toast.success("Audio track added");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload audio");
    } finally {
      setUploading(false);
    }
  };

  const updateTrack = async (trackId: string, updates: Partial<AudioTrack>) => {
    try {
      const { error } = await supabase
        .from("audio_tracks")
        .update(updates)
        .eq("id", trackId);

      if (error) throw error;
      setTracks(tracks.map(t => t.id === trackId ? { ...t, ...updates } : t));
    } catch (error) {
      toast.error("Failed to update track");
    }
  };

  const deleteTrack = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from("audio_tracks")
        .delete()
        .eq("id", trackId);

      if (error) throw error;
      setTracks(tracks.filter(t => t.id !== trackId));
      toast.success("Track deleted");
    } catch (error) {
      toast.error("Failed to delete track");
    }
  };

  const togglePlayback = (track: AudioTrack) => {
    const audio = audioRefs.current.get(track.id);
    if (!audio) {
      const newAudio = new Audio(track.file_url);
      newAudio.volume = track.volume;
      audioRefs.current.set(track.id, newAudio);
      newAudio.play();
      setPlayingTrackId(track.id);
      newAudio.onended = () => setPlayingTrackId(null);
    } else {
      if (playingTrackId === track.id) {
        audio.pause();
        setPlayingTrackId(null);
      } else {
        audio.currentTime = 0;
        audio.volume = track.volume;
        audio.play();
        setPlayingTrackId(track.id);
      }
    }
  };

  return (
    <Card className="bg-gradient-card border-border shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Music className="w-5 h-5 text-primary" />
            Audio Tracks
          </CardTitle>
          <label className="cursor-pointer">
            <Input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAudio(file);
              }}
              disabled={uploading}
            />
            <Button variant="outline" size="sm" className="border-border" asChild>
              <span>
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Add Audio
              </span>
            </Button>
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No audio tracks yet</p>
            <p className="text-sm">Add background music or sound effects</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="bg-muted/30 rounded-lg p-4 space-y-3"
              >
                {/* Track Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => togglePlayback(track)}
                    >
                      {playingTrackId === track.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <span className="font-medium text-sm truncate max-w-[200px]">
                      {track.name}
                    </span>
                    <Badge variant="outline" className="border-border text-xs">
                      {track.duration_sec ? `${Math.round(track.duration_sec)}s` : "Unknown"}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => deleteTrack(track.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-3">
                  {track.volume > 0 ? (
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Slider
                    value={[track.volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={([value]) => updateTrack(track.id, { volume: value / 100 })}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(track.volume * 100)}%
                  </span>
                </div>

                {/* Fade Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fade In (ms)</label>
                    <Slider
                      value={[track.fade_in_ms]}
                      max={5000}
                      step={100}
                      onValueChange={([value]) => updateTrack(track.id, { fade_in_ms: value })}
                    />
                    <span className="text-xs text-muted-foreground">{track.fade_in_ms}ms</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Fade Out (ms)</label>
                    <Slider
                      value={[track.fade_out_ms]}
                      max={5000}
                      step={100}
                      onValueChange={([value]) => updateTrack(track.id, { fade_out_ms: value })}
                    />
                    <span className="text-xs text-muted-foreground">{track.fade_out_ms}ms</span>
                  </div>
                </div>

                {/* Start Time */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Start Time (seconds)</label>
                  <Slider
                    value={[track.start_time_sec]}
                    max={totalDuration}
                    step={0.5}
                    onValueChange={([value]) => updateTrack(track.id, { start_time_sec: value })}
                  />
                  <span className="text-xs text-muted-foreground">{track.start_time_sec}s</span>
                </div>

                {/* Timeline Visualization */}
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full"
                    style={{
                      marginLeft: `${(track.start_time_sec / totalDuration) * 100}%`,
                      width: `${((track.duration_sec || 0) / totalDuration) * 100}%`,
                      maxWidth: `${100 - (track.start_time_sec / totalDuration) * 100}%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
