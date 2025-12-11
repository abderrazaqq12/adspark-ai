import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Play, 
  Pause, 
  Download, 
  RefreshCw, 
  Trash2, 
  Loader2,
  Volume2 
} from 'lucide-react';

interface VoiceAudioPlayerProps {
  audioUrl: string | null;
  isGenerating?: boolean;
  isLocked?: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

export const VoiceAudioPlayer = ({
  audioUrl,
  isGenerating = false,
  isLocked = false,
  onGenerate,
  onRegenerate,
  onDelete,
}: VoiceAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fileSize, setFileSize] = useState<string | null>(null);

  useEffect(() => {
    if (audioUrl) {
      // Fetch file size
      fetch(audioUrl, { method: 'HEAD' })
        .then(res => {
          const size = res.headers.get('content-length');
          if (size) {
            const sizeInKB = Math.round(parseInt(size) / 1024);
            setFileSize(sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`);
          }
        })
        .catch(() => setFileSize(null));
    }
  }, [audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `voiceover-${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // No audio generated yet
  if (!audioUrl && !isGenerating) {
    return (
      <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            <span className="text-sm">No audio generated yet</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            disabled={isLocked}
          >
            <Volume2 className="w-3 h-3 mr-1" />
            Generate Voice
          </Button>
        </div>
      </div>
    );
  }

  // Generating state
  if (isGenerating) {
    return (
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
        <div className="flex items-center justify-center gap-2 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm text-primary">Generating voice-over...</span>
        </div>
      </div>
    );
  }

  // Audio player UI
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-3">
      <audio ref={audioRef} src={audioUrl || undefined} preload="metadata" />
      
      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Play/Pause button */}
        <Button
          variant={isPlaying ? "default" : "outline"}
          size="sm"
          className="h-9 w-9 p-0"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>

        {/* Time display */}
        <span className="text-xs text-muted-foreground min-w-[40px]">
          {formatTime(currentTime)}
        </span>

        {/* Seek bar */}
        <div className="flex-1">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
        </div>

        {/* Duration display */}
        <span className="text-xs text-muted-foreground min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>

      {/* Info and actions row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {duration > 0 && (
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3" />
              {formatTime(duration)}
            </span>
          )}
          {fileSize && (
            <span>{fileSize}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleDownload}
            title="Download audio"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          {!isLocked && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onRegenerate}
                title="Regenerate voice"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                title="Delete audio"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceAudioPlayer;
