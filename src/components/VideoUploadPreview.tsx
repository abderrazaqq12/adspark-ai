import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Play, Pause, Video, FileText } from "lucide-react";

interface UploadedVideo {
  id: string;
  file: File;
  url: string;
  thumbnail: string | null;
  type: 'scene' | 'broll';
  duration: number | null;
}

interface VideoUploadPreviewProps {
  videos: UploadedVideo[];
  onRemove: (id: string) => void;
  type: 'scene' | 'broll';
}

export function VideoUploadPreview({ videos, onRemove, type }: VideoUploadPreviewProps) {
  const filteredVideos = videos.filter(v => v.type === type);

  if (filteredVideos.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">
        {type === 'scene' ? 'Scene Videos' : 'B-Roll Footage'} ({filteredVideos.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {filteredVideos.map((video) => (
          <VideoThumbnail
            key={video.id}
            video={video}
            onRemove={() => onRemove(video.id)}
          />
        ))}
      </div>
    </div>
  );
}

function VideoThumbnail({ video, onRemove }: { video: UploadedVideo; onRemove: () => void }) {
  const [thumbnail, setThumbnail] = useState<string | null>(video.thumbnail);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(video.duration);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Generate thumbnail from video
    const videoEl = document.createElement('video');
    videoEl.src = video.url;
    videoEl.crossOrigin = 'anonymous';
    videoEl.preload = 'metadata';

    videoEl.onloadedmetadata = () => {
      setDuration(Math.round(videoEl.duration));
      videoEl.currentTime = 1; // Seek to 1 second for thumbnail
    };

    videoEl.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 90;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL('image/jpeg', 0.7));
      }
    };

    return () => {
      videoEl.src = '';
    };
  }, [video.url]);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative group w-[120px]">
      <div className="relative aspect-video rounded-lg overflow-hidden border border-border bg-muted">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={video.file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-6 h-6 text-muted-foreground" />
          </div>
        )}

        {/* Play overlay */}
        <div
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Duration badge */}
        {duration && (
          <Badge
            variant="secondary"
            className="absolute bottom-1 right-1 text-[10px] px-1 py-0 bg-black/70 text-white border-0"
          >
            {formatDuration(duration)}
          </Badge>
        )}

        {/* Remove button */}
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-1 right-1 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="w-3 h-3" />
        </Button>

        {/* Hidden video for playback */}
        <video
          ref={videoRef}
          src={video.url}
          className={`absolute inset-0 w-full h-full object-cover ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      {/* File name */}
      <p className="text-[10px] text-muted-foreground truncate mt-1 px-0.5">
        {video.file.name}
      </p>
    </div>
  );
}

export function generateVideoId(): string {
  return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
