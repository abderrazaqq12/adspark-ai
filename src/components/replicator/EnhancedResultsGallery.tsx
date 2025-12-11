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
const URL_VALIDATION_RETRIES = 5;
const URL_VALIDATION_DELAY = 2000;

// Video status type that tracks the true state
type VideoReadyState = 'pending' | 'processing' | 'validating' | 'ready' | 'failed';

interface VideoWithValidation extends GeneratedVideo {
  readyState: VideoReadyState;
  urlValidated: boolean;
  validationAttempts: number;
}

export const EnhancedResultsGallery = ({ videos, onRegenerate, setVideos, jobId }: EnhancedResultsGalleryProps) => {
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterRatio, setFilterRatio] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoForPlay, setSelectedVideoForPlay] = useState<GeneratedVideo | null>(null);
  const [retryingVideos, setRetryingVideos] = useState<Set<string>>(new Set());
  const [isPolling, setIsPolling] = useState(false);
  const [videoValidationState, setVideoValidationState] = useState<Record<string, VideoWithValidation>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize validation state from videos
  useEffect(() => {
    const initialState: Record<string, VideoWithValidation> = {};
    videos.forEach(video => {
      if (!videoValidationState[video.id]) {
        initialState[video.id] = {
          ...video,
          readyState: video.status === 'completed' ? 'validating' : 
                      video.status === 'failed' ? 'failed' : 'processing',
          urlValidated: false,
          validationAttempts: 0,
        };
      }
    });
    
    if (Object.keys(initialState).length > 0) {
      setVideoValidationState(prev => ({ ...prev, ...initialState }));
    }
  }, [videos]);

  // Validate video URL is accessible
  const validateVideoUrl = useCallback(async (videoId: string, url: string): Promise<boolean> => {
    const currentState = videoValidationState[videoId];
    if (!currentState || currentState.validationAttempts >= URL_VALIDATION_RETRIES) {
      return false;
    }

    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        // Accept video content types or storage URLs
        if ((contentType && contentType.includes('video')) || 
            url.includes('/storage/') ||
            response.ok) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [videoValidationState]);

  // Validate all completed videos
  const validateCompletedVideos = useCallback(async () => {
    const videosToValidate = videos.filter(v => 
      v.status === 'completed' && 
      v.url && 
      (!videoValidationState[v.id]?.urlValidated)
    );

    for (const video of videosToValidate) {
      if (!video.url) continue;
      
      const currentState = videoValidationState[video.id];
      if (currentState?.validationAttempts >= URL_VALIDATION_RETRIES) continue;

      setVideoValidationState(prev => ({
        ...prev,
        [video.id]: {
          ...prev[video.id],
          ...video,
          readyState: 'validating',
          validationAttempts: (prev[video.id]?.validationAttempts || 0) + 1,
        }
      }));

      const isValid = await validateVideoUrl(video.id, video.url);

      setVideoValidationState(prev => ({
        ...prev,
        [video.id]: {
          ...prev[video.id],
          readyState: isValid ? 'ready' : 
                      (prev[video.id]?.validationAttempts || 0) >= URL_VALIDATION_RETRIES ? 'failed' : 'validating',
          urlValidated: isValid,
        }
      }));

      // If not valid and haven't exceeded retries, schedule another attempt
      if (!isValid && (currentState?.validationAttempts || 0) < URL_VALIDATION_RETRIES - 1) {
        setTimeout(() => {
          validateCompletedVideos();
        }, URL_VALIDATION_DELAY * ((currentState?.validationAttempts || 0) + 1));
      }
    }
  }, [videos, videoValidationState, validateVideoUrl]);

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
          
          // Update the video in state
          setVideos((prev) =>
            prev.map((video) =>
              video.id === updated.id
                ? {
                    ...video,
                    status: updated.status,
                    url: updated.video_url || video.url,
                    thumbnail: updated.thumbnail_url || video.thumbnail,
                    duration: updated.duration_sec || video.duration,
                  }
                : video
            )
          );

          // If completed with URL, trigger validation
          if (updated.status === 'completed' && updated.video_url) {
            setVideoValidationState(prev => ({
              ...prev,
              [updated.id]: {
                ...prev[updated.id],
                url: updated.video_url,
                status: 'completed',
                readyState: 'validating',
                urlValidated: false,
                validationAttempts: 0,
              } as VideoWithValidation
            }));
            
            // Trigger validation
            setTimeout(() => validateCompletedVideos(), 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videos.length, validateCompletedVideos]);

  // Polling for processing videos
  useEffect(() => {
    const processingVideos = videos.filter(v => 
      v.status === "processing" || 
      (v.status === "completed" && !videoValidationState[v.id]?.urlValidated)
    );
    
    if (processingVideos.length === 0) {
      setIsPolling(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    setIsPolling(true);

    pollingRef.current = setInterval(async () => {
      await pollVideoStatuses();
    }, POLL_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [videos, videoValidationState]);

  // Validate videos when they complete
  useEffect(() => {
    validateCompletedVideos();
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

          return {
            ...video,
            status: updated.status as GeneratedVideo['status'],
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

  const handleRefreshResults = async () => {
    toast.info("Refreshing results...");
    await pollVideoStatuses();
    
    // Reset validation state for incomplete validations
    setVideoValidationState(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        if (!updated[id].urlValidated) {
          updated[id].validationAttempts = 0;
          updated[id].readyState = 'validating';
        }
      });
      return updated;
    });
    
    // Re-validate
    setTimeout(() => validateCompletedVideos(), 500);
    
    toast.success("Results refreshed");
  };

  const toggleSelect = (id: string) => {
    setSelectedVideos((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const readyVideos = videos.filter(v => 
      videoValidationState[v.id]?.readyState === 'ready'
    );
    setSelectedVideos(readyVideos.map((v) => v.id));
  };

  const deselectAll = () => {
    setSelectedVideos([]);
  };

  const filteredVideos = filterRatio
    ? videos.filter((v) => v.ratio === filterRatio)
    : videos;

  const uniqueRatios = [...new Set(videos.map((v) => v.ratio))];

  const handleDownloadSelected = async () => {
    const readySelected = videos.filter(
      v => selectedVideos.includes(v.id) && 
           videoValidationState[v.id]?.readyState === 'ready' && 
           v.url
    );
    
    if (readySelected.length === 0) {
      toast.error("No ready videos selected for download");
      return;
    }

    toast.success(`Downloading ${readySelected.length} videos...`);
    
    for (const video of readySelected) {
      if (video.url) {
        const link = document.createElement("a");
        link.href = video.url;
        link.download = `${video.id}.mp4`;
        link.click();
      }
    }
  };

  const handleSaveToProjects = () => {
    const readyCount = videos.filter(
      v => selectedVideos.includes(v.id) && 
           videoValidationState[v.id]?.readyState === 'ready'
    ).length;
    toast.success(`Saved ${readyCount} videos to projects`);
  };

  const handlePlayVideo = (video: GeneratedVideo, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const validationState = videoValidationState[video.id];
    
    if (validationState?.readyState !== 'ready') {
      if (validationState?.readyState === 'validating') {
        toast.info("Video is being validated. Please wait...");
      } else if (validationState?.readyState === 'processing') {
        toast.info("Video is still processing. Please wait...");
      } else {
        toast.error("Video is not available yet. Try refreshing.");
      }
      return;
    }
    
    if (!video.url) {
      toast.error("Video URL not available. Try refreshing.");
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
      // Reset validation state
      setVideoValidationState(prev => ({
        ...prev,
        [video.id]: {
          ...prev[video.id],
          readyState: 'processing',
          urlValidated: false,
          validationAttempts: 0,
        } as VideoWithValidation
      }));
      
      setVideos(prev => prev.map(v => 
        v.id === video.id 
          ? { ...v, status: "processing" as const } 
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
      
      setVideoValidationState(prev => ({
        ...prev,
        [video.id]: {
          ...prev[video.id],
          readyState: 'failed',
        } as VideoWithValidation
      }));
      
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
    const failedVideos = videos.filter(v => 
      videoValidationState[v.id]?.readyState === 'failed' || 
      v.status === "failed"
    );
    for (const video of failedVideos) {
      await handleRetryVideo(video, { stopPropagation: () => {} } as any);
    }
  };

  // Calculate counts based on VALIDATED state, not just status
  const readyVideos = videos.filter(v => videoValidationState[v.id]?.readyState === 'ready');
  const processingVideos = videos.filter(v => 
    videoValidationState[v.id]?.readyState === 'processing' || 
    videoValidationState[v.id]?.readyState === 'validating' ||
    v.status === 'processing'
  );
  const failedVideos = videos.filter(v => 
    videoValidationState[v.id]?.readyState === 'failed' || 
    v.status === 'failed'
  );

  // ONLY show complete when ALL videos are truly ready (validated)
  const isFullyComplete = readyVideos.length === videos.length && videos.length > 0;
  const overallProgress = videos.length > 0 
    ? Math.round((readyVideos.length / videos.length) * 100) 
    : 0;

  const getVideoReadyState = (video: GeneratedVideo): VideoReadyState => {
    return videoValidationState[video.id]?.readyState || 
           (video.status === 'failed' ? 'failed' : 'processing');
  };

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {processingVideos.length > 0 ? (
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            ) : failedVideos.length > 0 && readyVideos.length === 0 ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : isFullyComplete ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : readyVideos.length > 0 ? (
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            ) : (
              <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
            )}
            {processingVideos.length > 0 
              ? "Generation In Progress" 
              : failedVideos.length > 0 && readyVideos.length === 0
                ? "Generation Failed"
                : isFullyComplete
                  ? "Generation Complete"
                  : readyVideos.length > 0
                    ? `${readyVideos.length} of ${videos.length} Ready`
                    : "Initializing..."
            }
          </h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {readyVideos.length > 0 && (
              <span className="text-green-500">{readyVideos.length} ready</span>
            )}
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
            onClick={selectedVideos.length === readyVideos.length ? deselectAll : selectAll}
          >
            {selectedVideos.length === readyVideos.length && readyVideos.length > 0 ? "Deselect All" : "Select All Ready"}
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

      {/* Bulk Actions - Only show when ready videos are selected */}
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
          const readyState = getVideoReadyState(video);
          const isReady = readyState === 'ready';
          const isValidating = readyState === 'validating';
          const isProcessing = readyState === 'processing';
          const isFailed = readyState === 'failed';
          
          return (
            <Card
              key={video.id}
              className={`overflow-hidden transition-all cursor-pointer ${
                selectedVideos.includes(video.id)
                  ? "ring-2 ring-primary border-primary"
                  : isFailed
                    ? "border-destructive/50"
                    : isReady
                      ? "border-green-500/50"
                      : "border-border/50 hover:border-border"
              }`}
              onClick={() => isReady && toggleSelect(video.id)}
            >
              {viewMode === "grid" ? (
                <div className="relative">
                  {/* Thumbnail / Placeholder */}
                  <div className="aspect-[9/16] bg-muted flex items-center justify-center relative overflow-hidden">
                    {isReady && video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={`Variation ${video.id}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                        {isValidating ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                            <span className="text-xs text-center">Validating URL...</span>
                          </>
                        ) : isProcessing ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-xs text-center">Processing...</span>
                          </>
                        ) : isFailed ? (
                          <>
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                            <span className="text-xs text-center text-destructive">Failed</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <span className="text-xs text-center">Initializing...</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Selection Checkbox - Only for ready videos */}
                    {isReady && (
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedVideos.includes(video.id)}
                          onCheckedChange={() => toggleSelect(video.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-background/80"
                        />
                      </div>
                    )}

                    {/* Play Button - Only for ready videos */}
                    {isReady && (
                      <button
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                        onClick={(e) => handlePlayVideo(video, e)}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white ml-1" />
                        </div>
                      </button>
                    )}

                    {/* Retry Button for Failed */}
                    {isFailed && (
                      <button
                        className="absolute bottom-2 right-2 z-10"
                        onClick={(e) => handleRetryVideo(video, e)}
                      >
                        <Button size="sm" variant="destructive">
                          <RotateCw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                      </button>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant={isReady ? "default" : isFailed ? "destructive" : "secondary"}
                        className={isReady ? "bg-green-500" : ""}
                      >
                        {isReady ? "Ready" : 
                         isValidating ? "Validating" :
                         isProcessing ? "Processing" : 
                         isFailed ? "Failed" : "Pending"}
                      </Badge>
                    </div>
                  </div>

                  {/* Info Footer */}
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <Badge variant="outline">{video.ratio}</Badge>
                      {isReady && video.duration && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {video.duration}s
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {video.hookStyle}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {video.pacing}
                      </Badge>
                    </div>
                  </CardContent>
                </div>
              ) : (
                // List View
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-36 bg-muted rounded flex items-center justify-center shrink-0">
                      {isReady && video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={`Variation ${video.id}`}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : isProcessing || isValidating ? (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      ) : isFailed ? (
                        <AlertTriangle className="w-6 h-6 text-destructive" />
                      ) : (
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={isReady ? "default" : isFailed ? "destructive" : "secondary"}
                          className={isReady ? "bg-green-500" : ""}
                        >
                          {isReady ? "Ready" : 
                           isValidating ? "Validating" :
                           isProcessing ? "Processing" : 
                           isFailed ? "Failed" : "Pending"}
                        </Badge>
                        <Badge variant="outline">{video.ratio}</Badge>
                        {isReady && video.duration && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {video.duration}s
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {video.hookStyle}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {video.pacing}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {video.engine}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isReady && (
                        <>
                          <Checkbox
                            checked={selectedVideos.includes(video.id)}
                            onCheckedChange={() => toggleSelect(video.id)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handlePlayVideo(video, e)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {isFailed && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => handleRetryVideo(video, e)}
                        >
                          <RotateCw className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Video Playback Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Video Preview
            </DialogTitle>
          </DialogHeader>
          {selectedVideoForPlay && selectedVideoForPlay.url && (
            <div className="space-y-4">
              <div className="aspect-[9/16] max-h-[70vh] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={selectedVideoForPlay.url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Badge variant="outline">{selectedVideoForPlay.ratio}</Badge>
                  <Badge variant="secondary">{selectedVideoForPlay.hookStyle}</Badge>
                  <Badge variant="secondary">{selectedVideoForPlay.pacing}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedVideoForPlay.url!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedVideoForPlay.url!;
                      link.download = `${selectedVideoForPlay.id}.mp4`;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
