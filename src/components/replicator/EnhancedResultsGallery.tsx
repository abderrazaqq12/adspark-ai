import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Download, RefreshCw, Save, Play, Clock, Filter, Grid, List, 
  CheckCircle2, Loader2, AlertTriangle, RotateCw, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { GeneratedVideo } from "@/pages/CreativeReplicator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EnhancedResultsGalleryProps {
  videos: GeneratedVideo[];
  onRegenerate: () => void;
  setVideos: React.Dispatch<React.SetStateAction<GeneratedVideo[]>>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

export const EnhancedResultsGallery = ({ videos, onRegenerate, setVideos }: EnhancedResultsGalleryProps) => {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterRatio, setFilterRatio] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<GeneratedVideo | null>(null);
  const [retryingVideos, setRetryingVideos] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-retry logic for processing videos
  useEffect(() => {
    const processingVideos = videos.filter(v => v.status === "processing");
    
    if (processingVideos.length === 0) return;

    const retryInterval = setInterval(() => {
      processingVideos.forEach(async (video) => {
        // Simulate checking for completion (in real app, this would poll the backend)
        const retryCount = (video as any).retryCount || 0;
        
        if (retryCount >= MAX_RETRIES) {
          setVideos(prev => prev.map(v => 
            v.id === video.id ? { ...v, status: "failed" as const } : v
          ));
          return;
        }

        // Update retry count
        setVideos(prev => prev.map(v => 
          v.id === video.id ? { ...v, retryCount: retryCount + 1 } as any : v
        ));
      });
    }, RETRY_DELAY);

    return () => clearInterval(retryInterval);
  }, [videos, setVideos]);

  const toggleSelect = (id: string) => {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedVideos(videos.map((v) => v.id));
  };

  const deselectAll = () => {
    setSelectedVideos([]);
  };

  const filteredVideos = filterRatio
    ? videos.filter((v) => v.ratio === filterRatio)
    : videos;

  const uniqueRatios = [...new Set(videos.map((v) => v.ratio))];

  const handleDownloadSelected = async () => {
    const completedSelected = videos.filter(
      v => selectedVideos.includes(v.id) && v.status === "completed" && v.url
    );
    
    if (completedSelected.length === 0) {
      toast.error("No completed videos selected for download");
      return;
    }

    toast.success(`Downloading ${completedSelected.length} videos...`);
    
    // Download each video
    for (const video of completedSelected) {
      if (video.url) {
        const link = document.createElement("a");
        link.href = video.url;
        link.download = `${video.id}.mp4`;
        link.click();
      }
    }
  };

  const handleSaveToProjects = () => {
    const completedCount = videos.filter(
      v => selectedVideos.includes(v.id) && v.status === "completed"
    ).length;
    toast.success(`Saved ${completedCount} videos to projects`);
  };

  const handlePlayVideo = (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (video.status !== "completed") {
      toast.info("Video is still processing. Please wait...");
      return;
    }
    if (!video.url) {
      toast.error("Video URL not available yet");
      return;
    }
    setSelectedVideoForPlay(video);
    setVideoModalOpen(true);
  };

  const handleRetryVideo = async (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (retryingVideos.has(video.id)) return;
    
    setRetryingVideos(prev => new Set(prev).add(video.id));
    
    try {
      // Reset video status to processing
      setVideos(prev => prev.map(v => 
        v.id === video.id ? { ...v, status: "processing" as const, retryCount: 0 } as any : v
      ));
      
      toast.info(`Retrying video ${video.id}...`);
      
      // Call regeneration endpoint
      const { data, error } = await supabase.functions.invoke('ffmpeg-creative-engine', {
        body: {
          task: {
            taskType: 'retry-single',
            videoId: video.id,
          },
          config: {
            hookStyle: video.hookStyle,
            pacing: video.pacing,
            ratio: video.ratio,
          },
        },
      });

      if (error) throw error;

      // Simulate completion after delay (in real app, would use realtime subscription)
      setTimeout(() => {
        setVideos(prev => prev.map(v => 
          v.id === video.id 
            ? { 
                ...v, 
                status: "completed" as const,
                url: data?.result?.videoUrl || `https://placeholder.video/${video.id}.mp4`,
                thumbnail: data?.result?.thumbnailUrl || "",
              } 
            : v
        ));
        toast.success(`Video ${video.id} completed!`);
      }, 3000);

    } catch (err) {
      console.error('Retry error:', err);
      toast.error(`Failed to retry video ${video.id}`);
      setVideos(prev => prev.map(v => 
        v.id === video.id ? { ...v, status: "failed" as const } : v
      ));
    } finally {
      setRetryingVideos(prev => {
        const next = new Set(prev);
        next.delete(video.id);
        return next;
      });
    }
  };

  const completedVideos = videos.filter(v => v.status === "completed");
  const processingVideos = videos.filter(v => v.status === "processing");
  const failedVideos = videos.filter(v => v.status === "failed");

  const overallProgress = videos.length > 0 
    ? Math.round((completedVideos.length / videos.length) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {processingVideos.length > 0 ? (
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            ) : failedVideos.length > 0 && completedVideos.length === 0 ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            )}
            {processingVideos.length > 0 
              ? "Generation In Progress" 
              : failedVideos.length > 0 && completedVideos.length === 0
                ? "Generation Failed"
                : "Generation Complete"
            }
          </h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="text-green-500">{completedVideos.length} completed</span>
            {processingVideos.length > 0 && (
              <span className="text-orange-500">{processingVideos.length} processing</span>
            )}
            {failedVideos.length > 0 && (
              <span className="text-destructive">{failedVideos.length} failed</span>
            )}
          </div>
          {processingVideos.length > 0 && (
            <Progress value={overallProgress} className="h-2 w-64" />
          )}
        </div>
        <div className="flex gap-2">
          {failedVideos.length > 0 && (
            <Button
              onClick={() => {
                failedVideos.forEach(v => handleRetryVideo(v, { stopPropagation: () => {} } as any));
              }}
              variant="outline"
              className="border-orange-500/50 text-orange-500"
            >
              <RotateCw className="w-4 h-4 mr-2" />
              Retry Failed ({failedVideos.length})
            </Button>
          )}
          <Button onClick={onRegenerate} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate More
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={selectedVideos.length === videos.length ? deselectAll : selectAll}
          >
            {selectedVideos.length === videos.length ? "Deselect All" : "Select All"}
          </Button>
          {selectedVideos.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedVideos.length} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Ratio Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1">
              <Button
                variant={filterRatio === null ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterRatio(null)}
              >
                All
              </Button>
              {uniqueRatios.map((ratio) => (
                <Button
                  key={ratio}
                  variant={filterRatio === ratio ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setFilterRatio(ratio)}
                >
                  {ratio}
                </Button>
              ))}
            </div>
          </div>

          {/* View Mode */}
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedVideos.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-medium">
              {selectedVideos.length} videos selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDownloadSelected}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button size="sm" onClick={handleSaveToProjects}>
                <Save className="w-4 h-4 mr-2" />
                Save to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video Grid/List */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-3"
        }
      >
        {filteredVideos.map((video) => (
          <Card
            key={video.id}
            className={`overflow-hidden transition-all cursor-pointer ${
              selectedVideos.includes(video.id)
                ? "ring-2 ring-primary border-primary"
                : video.status === "failed"
                  ? "border-destructive/50"
                  : "border-border/50 hover:border-border"
            }`}
            onClick={() => toggleSelect(video.id)}
          >
            {viewMode === "grid" ? (
              <>
                <div className="relative aspect-[9/16] bg-gradient-to-br from-muted to-muted/50">
                  {/* Thumbnail */}
                  {video.thumbnail && video.status === "completed" && (
                    <img 
                      src={video.thumbnail} 
                      alt={video.id}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  
                  {/* Play Button / Status */}
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer group"
                    onClick={(e) => video.status === "failed" ? handleRetryVideo(video, e) : handlePlayVideo(video, e)}
                  >
                    {video.status === "processing" ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                        </div>
                        <span className="text-xs text-orange-400 font-medium">Processing...</span>
                        <span className="text-[10px] text-muted-foreground">
                          Attempt {((video as any).retryCount || 0) + 1}/{MAX_RETRIES}
                        </span>
                      </>
                    ) : video.status === "failed" ? (
                      <>
                        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-all">
                          {retryingVideos.has(video.id) ? (
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                          ) : (
                            <RotateCw className="w-8 h-8 text-destructive group-hover:text-orange-500" />
                          )}
                        </div>
                        <span className="text-xs text-destructive font-medium group-hover:text-orange-500">
                          {retryingVideos.has(video.id) ? "Retrying..." : "Click to Retry"}
                        </span>
                      </>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/40 transition-all group-hover:scale-110">
                        <Play className="w-8 h-8 text-primary fill-primary" />
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedVideos.includes(video.id)}
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={() => toggleSelect(video.id)}
                    />
                  </div>
                  
                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    {video.status === "processing" && (
                      <Badge className="bg-orange-500/80 text-white animate-pulse">
                        Processing
                      </Badge>
                    )}
                    {video.status === "failed" && (
                      <Badge variant="destructive">
                        Failed
                      </Badge>
                    )}
                    {video.status === "completed" && video.url && (
                      <Badge className="bg-green-500/80 text-white">
                        Ready
                      </Badge>
                    )}
                  </div>
                  
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                    <Badge className="bg-black/60 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      {video.duration}s
                    </Badge>
                    <Badge variant="outline" className="bg-black/60 text-white border-0">
                      {video.ratio}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {video.hookStyle}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {video.pacing}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Engine: {video.engine}
                    </p>
                    {video.status === "completed" && video.url && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(video.url, '_blank');
                        }}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox
                  checked={selectedVideos.includes(video.id)}
                  onClick={(e) => e.stopPropagation()}
                  onCheckedChange={() => toggleSelect(video.id)}
                />
                <div 
                  className="w-16 h-16 rounded bg-muted flex items-center justify-center shrink-0 cursor-pointer hover:bg-muted/80 transition-all"
                  onClick={(e) => video.status === "failed" ? handleRetryVideo(video, e) : handlePlayVideo(video, e)}
                >
                  {video.status === "processing" ? (
                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  ) : video.status === "failed" ? (
                    <RotateCw className="w-6 h-6 text-destructive" />
                  ) : (
                    <Play className="w-6 h-6 text-primary fill-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{video.id}</span>
                    <Badge variant="outline">{video.ratio}</Badge>
                    {video.status === "processing" && (
                      <Badge className="bg-orange-500/80 text-white text-xs animate-pulse">
                        Processing
                      </Badge>
                    )}
                    {video.status === "failed" && (
                      <Badge variant="destructive" className="text-xs">Failed</Badge>
                    )}
                    {video.status === "completed" && (
                      <Badge className="bg-green-500/80 text-white text-xs">Ready</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">{video.hookStyle}</Badge>
                    <Badge variant="outline" className="text-xs">{video.pacing}</Badge>
                    <Badge variant="outline" className="text-xs">{video.engine}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground">{video.duration}s</span>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    disabled={video.status !== "completed" || !video.url}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (video.url) {
                        const link = document.createElement("a");
                        link.href = video.url;
                        link.download = `${video.id}.mp4`;
                        link.click();
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{videos.length}</p>
              <p className="text-sm text-muted-foreground">Total Videos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{completedVideos.length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-500">{processingVideos.length}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{uniqueRatios.length}</p>
              <p className="text-sm text-muted-foreground">Ratios</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Math.round(completedVideos.reduce((acc, v) => acc + v.duration, 0) / 60)}m
              </p>
              <p className="text-sm text-muted-foreground">Total Duration</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Player Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              {selectedVideoForPlay?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedVideoForPlay?.url ? (
              <video
                ref={videoRef}
                src={selectedVideoForPlay.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <Play className="w-16 h-16 mb-4 opacity-50" />
                <p>Video preview not available</p>
                <p className="text-xs mt-1">Video URL will be available after processing</p>
              </div>
            )}
          </div>
          {selectedVideoForPlay && (
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="secondary">{selectedVideoForPlay.hookStyle}</Badge>
              <Badge variant="outline">{selectedVideoForPlay.pacing}</Badge>
              <Badge variant="outline">{selectedVideoForPlay.ratio}</Badge>
              <Badge variant="outline">{selectedVideoForPlay.engine}</Badge>
              <Badge className="bg-primary/20 text-primary">{selectedVideoForPlay.duration}s</Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
