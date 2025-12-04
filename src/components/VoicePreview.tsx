import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoicePreviewProps {
  voiceId: string;
  voiceName: string;
  previewUrl?: string;
}

export default function VoicePreview({ voiceId, voiceName, previewUrl }: VoicePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playPreview = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // If we have a preview URL, use it directly
    if (previewUrl) {
      playAudioUrl(previewUrl);
      return;
    }

    // Otherwise, generate a preview using ElevenLabs
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-voiceover", {
        body: {
          text: `Hello! This is ${voiceName}. I can help you create professional voice-overs for your videos.`,
          voiceId: voiceId,
          model: "eleven_flash_v2_5",
          preview: true,
        },
      });

      if (error) throw error;

      if (data.audio_base64) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);
        playAudioUrl(audioUrl);
      }
    } catch (error: any) {
      console.error("Error playing preview:", error);
      toast.error("Failed to play voice preview");
    } finally {
      setIsLoading(false);
    }
  };

  const playAudioUrl = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      toast.error("Failed to play audio");
    };

    audio.play();
    setIsPlaying(true);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={(e) => {
        e.stopPropagation();
        playPreview();
      }}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <Pause className="h-4 w-4 text-primary" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </Button>
  );
}
