import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VideoResult {
  id: string;
  url: string | null;
  thumbnail: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  hookStyle: string;
  pacing: string;
  engine: string;
  ratio: string;
  duration: number | null;
  retryCount: number;
  error?: string;
}

export interface JobPollingResult {
  videos: VideoResult[];
  isPolling: boolean;
  completedCount: number;
  processingCount: number;
  failedCount: number;
  overallProgress: number;
  refreshVideos: () => Promise<void>;
  retryVideo: (videoId: string) => Promise<void>;
  retryAllFailed: () => Promise<void>;
}

const MAX_RETRIES = 5;
const POLL_INTERVAL = 3000;
const URL_VALIDATION_RETRIES = 3;

export function useJobPolling(initialVideos: VideoResult[]): JobPollingResult {
  const [videos, setVideos] = useState<VideoResult[]>(initialVideos);
  const [isPolling, setIsPolling] = useState(false);

  // Update videos when initialVideos change
  useEffect(() => {
    if (initialVideos.length > 0) {
      setVideos(initialVideos);
    }
  }, [initialVideos]);

  // Start/stop polling based on processing videos
  useEffect(() => {
    const processingVideos = videos.filter(v => v.status === "processing" || v.status === "pending");
    
    if (processingVideos.length === 0) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const interval = setInterval(async () => {
      await pollVideoStatuses();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [videos.length]);

  const pollVideoStatuses = useCallback(async () => {
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
          const updated = data.find(d => d.id === video.id);
          if (!updated) return video;

          return {
            ...video,
            status: updated.status as VideoResult["status"],
            url: updated.video_url,
            thumbnail: updated.thumbnail_url,
            duration: updated.duration_sec,
          };
        }));
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, [videos]);

  const validateUrl = async (url: string): Promise<boolean> => {
    for (let i = 0; i < URL_VALIDATION_RETRIES; i++) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) return true;
      } catch {
        // Continue retrying
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
    return false;
  };

  const refreshVideos = useCallback(async () => {
    await pollVideoStatuses();
    
    // Validate URLs for completed videos
    const completedVideos = videos.filter(v => v.status === "completed" && v.url);
    
    for (const video of completedVideos) {
      if (video.url) {
        const isValid = await validateUrl(video.url);
        if (!isValid) {
          setVideos(prev => prev.map(v => 
            v.id === video.id 
              ? { ...v, status: "processing" as const, retryCount: v.retryCount + 1 }
              : v
          ));
        }
      }
    }
  }, [videos, pollVideoStatuses]);

  const retryVideo = useCallback(async (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (!video || video.retryCount >= MAX_RETRIES) {
      console.log('Max retries reached for video', videoId);
      return;
    }

    setVideos(prev => prev.map(v => 
      v.id === videoId 
        ? { ...v, status: "processing" as const, retryCount: v.retryCount + 1, error: undefined }
        : v
    ));

    try {
      await supabase.functions.invoke('ffmpeg-creative-engine', {
        body: {
          task: {
            taskType: 'retry-single',
            videoId,
          },
          config: {
            hookStyle: video.hookStyle,
            pacing: video.pacing,
            ratio: video.ratio,
          },
        },
      });
    } catch (err) {
      console.error('Retry error:', err);
      setVideos(prev => prev.map(v => 
        v.id === videoId 
          ? { ...v, status: "failed" as const, error: 'Retry failed' }
          : v
      ));
    }
  }, [videos]);

  const retryAllFailed = useCallback(async () => {
    const failedVideos = videos.filter(v => v.status === "failed" && v.retryCount < MAX_RETRIES);
    
    for (const video of failedVideos) {
      await retryVideo(video.id);
    }
  }, [videos, retryVideo]);

  const completedCount = videos.filter(v => v.status === "completed" && v.url).length;
  const processingCount = videos.filter(v => v.status === "processing" || v.status === "pending").length;
  const failedCount = videos.filter(v => v.status === "failed").length;
  const overallProgress = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

  return {
    videos,
    isPolling,
    completedCount,
    processingCount,
    failedCount,
    overallProgress,
    refreshVideos,
    retryVideo,
    retryAllFailed,
  };
}
