import { useState, useRef, useEffect, useCallback } from "react";
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
  jobId?: string;
}

const MAX_RETRIES = 5;
const POLL_INTERVAL = 3000;
const URL_VALIDATION_RETRIES = 3;

export const EnhancedResultsGallery = ({ videos, onRegenerate, setVideos, jobId }: EnhancedResultsGalleryProps) => {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterRatio, setFilterRatio] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<GeneratedVideo | null>(null);
  const [retryingVideos, setRetryingVideos] = useState<Set<string>>(new Set());
  const [isPolling, setIsPolling] = useState(false);
  const [urlValidationRetries, setUrlValidationRetries] = useState<Record<string, number>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  // Realtime subscription for video updates
  useEffect(() => {
    if (videos.length === 0) return;

    const channel = supabase
      .channel('video-variations-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_variations',
        },
        (payload) => {
          const updated = payload.new as any;
          setVideos((prev) =>
            prev.map((video) =>
              video.id === updated.id
                ? {
                    ...video,
                    status: updated.status === 'completed' && updated.video_url ? 'completed' : 
                            updated.status === 'failed' ? 'failed' : 'processing',
                    url: updated.video_url || video.url,
                    thumbnail: updated.thumbnail_url || video.thumbnail,
                    duration: updated.duration_sec || video.duration,
                  }
                : video
            )
          );

          if (updated.status === 'completed' && updated.video_url) {
            validateVideoUrl(updated.id, updated.video_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videos.length]);

  // Polling for processing videos
  useEffect(() => {
    const processingVideos = videos.filter(v => v.status === "processing");
    
    if (processingVideos.length === 0) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const interval = setInterval(async () => {
      await pollVideoStatuses();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [videos]);

  const pollVideoStatuses = async () => {
    const videoIds = videos.map(v => v.id);
    
    try {
      const { data, error } = await supabase
        .from('video_variations')
        .select('*')
        .in('id', videoIds);

      if (error) {
        console.error('Poll error:', error);
        return;
      }

      if (data) {
        setVideos(prev => prev.map(video => {
          const updated = data.find((d: any) => d.id === video.id);
          if (!updated) return video;

          // Only mark as completed if URL is valid
          const hasValidUrl = updated.video_url && updated.video_url.startsWith('http');
          
          return {
            ...video,
            status: updated.status === 'completed' && hasValidUrl ? 'completed' : 
                    updated.status === 'failed' ? 'failed' : 'processing',
            url: updated.video_url || video.url,
            thumbnail: updated.thumbnail_url || video.thumbnail,
            duration: updated.duration_sec || video.duration,
          };
        }));
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  };

  const validateVideoUrl = useCallback(async (videoId: string, url: string) => {
    const currentRetries = urlValidationRetries[videoId] || 0;
    
    if (currentRetries >= URL_VALIDATION_RETRIES) {
      console.log(`Max URL validation retries reached for ${videoId}`);
      return;
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('URL not accessible');
      }
    } catch {
      // URL not ready, retry
      setUrlValidationRetries(prev => ({ ...prev, [videoId]: currentRetries + 1 }));
      
      setTimeout(() => {
        validateVideoUrl(videoId, url);
      }, 2000 * (currentRetries + 1));

      // Keep as processing until URL is validated
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, status: 'processing' } : v
      ));
    }
  }, [urlValidationRetries, setVideos]);

  const handleRefreshResults = async () => {
    toast.info("Refreshing results...");
    await pollVideoStatuses();
    
    // Re-validate URLs for completed videos without valid URLs
    const videosToValidate = videos.filter(v => v.status === "completed" && v.url);
    for (const video of videosToValidate) {
      if (video.url) {
        try {
          const response = await fetch(video.url, { method: 'HEAD' });
          if (!response.ok) {
            setVideos(prev => prev.map(v => 
              v.id === video.id ? { ...v, status: 'processing' } : v
            ));
          }
        } catch {
          setVideos(prev => prev.map(v => 
            v.id === video.id ? { ...v, status: 'processing' } : v
          ));
        }
      }
    }
    
    toast.success("Results refreshed");
  };

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
      toast.error("Video URL not available yet. Try refreshing.");
      return;
    }
    setSelectedVideoForPlay(video);
    setVideoModalOpen(true);
  };

  const handleRetryVideo = async (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const retryCount = (video as any).retryCount || 0;
    if (retryCount >= MAX_RETRIES) {
      toast.error("Maximum retries reached for this video");
      return;
    }
    
    if (retryingVideos.has(video.id)) return;
    
    setRetryingVideos(prev => new Set(prev).add(video.id));
    
    try {
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { ...v, status: "processing" as const, retryCount: retryCount + 1 } as any 
          : v
      ));
      
      toast.info(`Retrying video generation...`);
      
      const { error } = await supabase.functions.invoke('ffmpeg-creative-engine', {
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

    } catch (err) {
      console.error('Retry error:', err);
      toast.error(`Failed to retry video`);
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

  const handleRetryAllFailed = async () => {
    const failedVideos = videos.filter(v => v.status === "failed");
    for (const video of failedVideos) {
      await handleRetryVideo(video, { stopPropagation: () => {} } as any);
    }
  };

  const completedVideos = videos.filter(v => v.status === "completed" && v.url);
  const processingVideos = videos.filter(v => v.status === "processing");
  const failedVideos = videos.filter(v => v.status === "failed");

  // Only show completion when ALL videos are done AND have valid URLs
  const isFullyComplete = processingVideos.length === 0 && failedVideos.length === 0 && completedVideos.length === videos.length;
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
            ) : isFullyComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            )}
            {processingVideos.length > 0 
              ? "Generation In Progress" 
              : failedVideos.length > 0 && completedVideos.length === 0
                ? "Generation Failed"
                : isFullyComplete
                  ? "Generation Complete"
                  : "Finalizing..."
            }
          </h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="text-green-500">{completedVideos.length} ready</span>
            {processingVideos.length > 0 && (
              <span className="text-orange-500">{processingVideos.length} processing</span>
            )}
            {failedVideos.length > 0 && (
              <span className="text-destructive">{failedVideos.length} failed</span>
            )}
            {isPolling && (
              <span className="text-muted-foreground text-xs animate-pulse">Auto-refreshing...</span>
            )}
          </div>
          {!isFullyComplete && (
            <Progress value={overallProgress} className="h-2 w-64" />
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefreshResults}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Results
          </Button>
          {failedVideos.length > 0 && (
            <Button
              onClick={handleRetryAllFailed}
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

      {/* Video Grid */}
      <div
        className={
          viewMode === "grid"
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            : "space-y-3"
        }
      >
        {filteredVideos.map((video) => {
          const retryCount = (video as any).retryCount || 0;
          const hasValidUrl = video.url && video.url.startsWith('http');
          const isReady = video.status === "completed" && hasValidUrl;
          
          return (
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
                    {/* Thumbnail - only show if completed and has valid URL */}
                    {isReady && video.thumbnail && (
                      <img 
                        src={video.thumbnail} 
                        alt={video.id}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    
                    {/* Status overlay */}
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
                          {retryCount > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              Retry {retryCount}/{MAX_RETRIES}
                            </span>
                          )}
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
                      ) : isReady ? (
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/40 transition-all group-hover:scale-110">
                          <Play className="w-8 h-8 text-primary fill-primary" />
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                          </div>
                          <span className="text-xs text-orange-400 font-medium">Validating URL...</span>
                        </>
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
                      {isReady && (
                        <Badge className="bg-green-500/80 text-white">
                          Ready
                        </Badge>
                      )}
                    </div>
                    
                    {/* Duration - only show if we have valid metadata */}
                    <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                      {video.duration && video.duration > 0 && isReady ? (
                        <Badge className="bg-black/60 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          {video.duration}s
                        </Badge>
                      ) : (
                        <div />
                      )}
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
                      {isReady && (
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
                  <div className="w-16 h-24 rounded bg-muted flex items-center justify-center">
                    {isReady ? (
                      <Play className="w-6 h-6 text-primary" />
                    ) : video.status === "processing" ? (
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{video.hookStyle}</Badge>
                      <Badge variant="outline">{video.pacing}</Badge>
                      <Badge variant="outline">{video.ratio}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Engine: {video.engine}
                      {video.duration && isReady && ` • ${video.duration}s`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {isReady && (
                      <>
                        <Button size="sm" variant="outline" onClick={(e) => handlePlayVideo(video, e)}>
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
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
                      </>
                    )}
                    {video.status === "failed" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-orange-500"
                        onClick={(e) => handleRetryVideo(video, e)}
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Video Playback Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Video Preview
              {selectedVideoForPlay && (
                <div className="flex gap-2">
                  <Badge variant="secondary">{selectedVideoForPlay.hookStyle}</Badge>
                  <Badge variant="outline">{selectedVideoForPlay.ratio}</Badge>
                </div>
              )}
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
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No video URL available
              </div>
            )}
          </div>
          {selectedVideoForPlay && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Engine: {selectedVideoForPlay.engine} • {selectedVideoForPlay.pacing} pacing
                {selectedVideoForPlay.duration && ` • ${selectedVideoForPlay.duration}s`}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedVideoForPlay.url) {
                      const link = document.createElement("a");
                      link.href = selectedVideoForPlay.url;
                      link.download = `${selectedVideoForPlay.id}.mp4`;
                      link.click();
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button onClick={() => toast.success("Saved to projects")}>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Project
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
