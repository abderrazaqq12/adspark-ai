import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Explicit pipeline stages with no ambiguity
export type PipelineStage = 
  | 'queued'
  | 'analyzing'
  | 'rewriting'
  | 'voice'
  | 'assembling'
  | 'ffmpeg_render'
  | 'subtitle_burn'
  | 'upload'
  | 'validate'
  | 'completed'
  | 'failed';

export interface VideoJobStatus {
  id: string;
  stage: PipelineStage;
  stageProgress: number;
  startedAt: number;
  updatedAt: number;
  elapsedSeconds: number;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  engineUsed?: string;
  fallbackUsed?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
}

export interface PipelineProgress {
  jobId: string;
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
  processingVideos: number;
  overallProgress: number;
  currentStage: string;
  stages: Record<string, 'pending' | 'running' | 'completed' | 'error'>;
  videoStatuses: Record<string, VideoJobStatus>;
  isComplete: boolean;
  hasErrors: boolean;
  lastUpdate: number;
}

interface UseRealtimePipelineOptions {
  jobId: string | null;
  onComplete?: (progress: PipelineProgress) => void;
  onError?: (error: string) => void;
  onVideoReady?: (videoId: string, url: string) => void;
}

const STAGE_WEIGHTS: Record<string, number> = {
  'queued': 0,
  'analyzing': 10,
  'rewriting': 20,
  'voice': 30,
  'assembling': 50,
  'ffmpeg_render': 70,
  'subtitle_burn': 80,
  'upload': 90,
  'validate': 95,
  'completed': 100,
  'failed': 0,
};

export function useRealtimePipeline({
  jobId,
  onComplete,
  onError,
  onVideoReady,
}: UseRealtimePipelineOptions) {
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update elapsed time for all active videos
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (!prev) return prev;
        
        const now = Date.now();
        const updatedStatuses = { ...prev.videoStatuses };
        let hasChanges = false;
        
        Object.keys(updatedStatuses).forEach(id => {
          const status = updatedStatuses[id];
          if (status.stage !== 'completed' && status.stage !== 'failed') {
            hasChanges = true;
            updatedStatuses[id] = {
              ...status,
              elapsedSeconds: Math.floor((now - status.startedAt) / 1000),
            };
          }
        });
        
        if (!hasChanges) return prev;
        
        return {
          ...prev,
          videoStatuses: updatedStatuses,
          lastUpdate: now,
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Subscribe to realtime updates from pipeline_jobs
  useEffect(() => {
    if (!jobId) return;

    setIsLoading(true);

    // Initial fetch
    const fetchInitialState = async () => {
      try {
        const { data: jobData, error: jobError } = await supabase
          .from('pipeline_jobs')
          .select('*')
          .eq('id', jobId)
          .single();

        if (jobError) throw jobError;
        if (jobData) {
          updateProgressFromJob(jobData);
        }
      } catch (err) {
        console.error('[useRealtimePipeline] Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialState();

    // Subscribe to pipeline_jobs updates
    const jobChannel = supabase
      .channel(`pipeline-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pipeline_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          updateProgressFromJob(payload.new as any);
        }
      )
      .subscribe();

    // Subscribe to video_variations updates
    const videoChannel = supabase
      .channel(`video-variations-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_variations',
        },
        (payload) => {
          const video = payload.new as any;
          if (!video) return;
          
          updateVideoStatus(video);
          
          // Trigger callback when video is ready
          if (video.status === 'completed' && video.video_url && onVideoReady) {
            onVideoReady(video.id, video.video_url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(videoChannel);
    };
  }, [jobId]);

  const updateProgressFromJob = useCallback((job: any) => {
    const progressData = job.progress as any || {};
    const videoStatuses: Record<string, VideoJobStatus> = {};
    
    // Convert raw statuses to VideoJobStatus
    const rawStatuses = progressData.videoStatuses || {};
    Object.entries(rawStatuses).forEach(([id, status]) => {
      const statusStr = typeof status === 'string' ? status : (status as any)?.stage || 'queued';
      videoStatuses[id] = {
        id,
        stage: statusStr as PipelineStage,
        stageProgress: STAGE_WEIGHTS[statusStr] || 0,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        elapsedSeconds: 0,
        retryCount: 0,
      };
    });

    const totalVideos = progressData.totalVideos || 0;
    const completedVideos = progressData.completedVideos || 0;
    const validatedVideos = progressData.validatedVideos || 0;
    const failedCount = Object.values(rawStatuses).filter(s => {
      if (typeof s === 'string') return s === 'failed';
      if (typeof s === 'object' && s !== null) return (s as Record<string, unknown>).stage === 'failed';
      return false;
    }).length;
    const processingCount = Object.values(rawStatuses).filter(s => {
      if (typeof s === 'string') return s !== 'completed' && s !== 'failed' && s !== 'ready';
      if (typeof s === 'object' && s !== null) {
        const stage = (s as Record<string, unknown>).stage;
        return stage !== 'completed' && stage !== 'failed';
      }
      return false;
    }).length;

    // Calculate overall progress based on ACTUAL completed stages
    const overallProgress = totalVideos > 0 
      ? Math.round(((validatedVideos + completedVideos) / 2 / totalVideos) * 100)
      : 0;

    const isComplete = job.status === 'completed' || job.status === 'partial';
    const hasErrors = job.status === 'failed' || failedCount > 0;

    const newProgress: PipelineProgress = {
      jobId: job.id,
      totalVideos,
      completedVideos: validatedVideos || completedVideos,
      failedVideos: failedCount,
      processingVideos: processingCount,
      overallProgress,
      currentStage: progressData.currentStage || 'queued',
      stages: progressData.completedStages?.reduce((acc: any, s: string) => ({ ...acc, [s]: 'completed' }), {}) || {},
      videoStatuses,
      isComplete,
      hasErrors,
      lastUpdate: Date.now(),
    };

    setProgress(newProgress);

    if (isComplete && onComplete) {
      onComplete(newProgress);
    }

    if (job.status === 'failed' && onError) {
      onError(job.error_message || 'Pipeline failed');
    }
  }, [onComplete, onError]);

  const updateVideoStatus = useCallback((video: any) => {
    setProgress(prev => {
      if (!prev) return prev;

      const metadata = video.metadata as any || {};
      const pipelineStatus = metadata.pipeline_status || {};
      
      // Determine current stage from pipeline_status
      let currentStage: PipelineStage = 'queued';
      const stageOrder = ['deconstruction', 'rewriting', 'voice_generation', 'video_generation', 'ffmpeg', 'export', 'upload', 'url_validation'];
      
      for (const stage of stageOrder) {
        if (pipelineStatus[stage] === 'running') {
          currentStage = stageToEnum(stage);
          break;
        } else if (pipelineStatus[stage] === 'success') {
          currentStage = stageToEnum(stage);
        }
      }

      if (video.status === 'completed') currentStage = 'completed';
      if (video.status === 'failed') currentStage = 'failed';

      const newStatus: VideoJobStatus = {
        id: video.id,
        stage: currentStage,
        stageProgress: STAGE_WEIGHTS[currentStage] || 0,
        startedAt: prev.videoStatuses[video.id]?.startedAt || Date.now(),
        updatedAt: Date.now(),
        elapsedSeconds: prev.videoStatuses[video.id]?.elapsedSeconds || 0,
        errorCode: metadata.error_code,
        errorMessage: metadata.error || metadata.pipeline_error?.message,
        retryCount: metadata.retry_count || 0,
        engineUsed: metadata.engine_used,
        fallbackUsed: metadata.fallback_mode,
        videoUrl: video.video_url,
        thumbnailUrl: video.thumbnail_url,
        duration: video.duration_sec,
      };

      const updatedStatuses = {
        ...prev.videoStatuses,
        [video.id]: newStatus,
      };

      // Recalculate counts
      const statusValues = Object.values(updatedStatuses) as VideoJobStatus[];
      const completed = statusValues.filter(s => s.stage === 'completed').length;
      const failed = statusValues.filter(s => s.stage === 'failed').length;
      const processing = statusValues.filter(s => 
        s.stage !== 'completed' && s.stage !== 'failed'
      ).length;

      return {
        ...prev,
        videoStatuses: updatedStatuses,
        completedVideos: completed,
        failedVideos: failed,
        processingVideos: processing,
        overallProgress: Math.round((completed / prev.totalVideos) * 100),
        isComplete: completed + failed === prev.totalVideos && prev.totalVideos > 0,
        hasErrors: failed > 0,
        lastUpdate: Date.now(),
      };
    });
  }, []);

  const retryVideo = useCallback(async (videoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ffmpeg-creative-engine', {
        body: {
          task: { taskType: 'retry-single', videoId },
          config: {},
        },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[useRealtimePipeline] Retry error:', err);
      throw err;
    }
  }, []);

  const retryAllFailed = useCallback(async () => {
    if (!progress) return;

    const failedIds = Object.entries(progress.videoStatuses)
      .filter(([, status]) => status.stage === 'failed')
      .map(([id]) => id);

    for (const id of failedIds) {
      await retryVideo(id);
    }
  }, [progress, retryVideo]);

  return {
    progress,
    isLoading,
    retryVideo,
    retryAllFailed,
  };
}

function stageToEnum(stage: string): PipelineStage {
  const mapping: Record<string, PipelineStage> = {
    'deconstruction': 'analyzing',
    'rewriting': 'rewriting',
    'voice_generation': 'voice',
    'video_generation': 'assembling',
    'ffmpeg': 'ffmpeg_render',
    'export': 'subtitle_burn',
    'upload': 'upload',
    'url_validation': 'validate',
  };
  return mapping[stage] || 'queued';
}
