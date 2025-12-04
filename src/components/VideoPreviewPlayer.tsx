import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipBack, 
  SkipForward,
  Download,
  X
} from "lucide-react";

interface VideoPreviewPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoUrl: string;
  title?: string;
  sceneIndex?: number;
  engineName?: string;
  onDownload?: () => void;
}

export default function VideoPreviewPlayer({
  open,
  onOpenChange,
  videoUrl,
  title,
  sceneIndex,
  engineName,
  onDownload
}: VideoPreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0];
      setVolume(value[0]);
      setIsMuted(value[0] === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-foreground">
                {title || `Scene ${(sceneIndex ?? 0) + 1}`}
              </DialogTitle>
              {engineName && (
                <Badge variant="outline" className="text-xs">
                  {engineName}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onClick={togglePlay}
          />
          
          {/* Play overlay */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:bg-primary transition-colors">
                <Play className="w-10 h-10 text-primary-foreground ml-1" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 space-y-3 bg-muted/30">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-12">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => skip(-10)}>
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={togglePlay}
                className="h-10 w-10"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => skip(10)}>
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute}>
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                />
              </div>

              {/* Actions */}
              {onDownload && (
                <Button variant="ghost" size="icon" onClick={onDownload}>
                  <Download className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
