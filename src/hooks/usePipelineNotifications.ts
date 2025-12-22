/**
 * usePipelineNotifications - Real-time job notification hook
 * 
 * Subscribes to pipeline_jobs table and shows toast notifications
 * when jobs complete or fail. Use in Layout or root component for
 * system-wide notifications across all tools.
 * 
 * Now includes progress notifications for long-running jobs.
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PipelineJobPayload {
  id: string;
  stage_name: string;
  status: string;
  progress: number;
  error_message: string | null;
  project_id: string | null;
  user_id: string | null;
  completed_at: string | null;
  started_at: string | null;
}

interface UsePipelineNotificationsOptions {
  /** Enable notifications (default: true) */
  enabled?: boolean;
  /** Filter by project ID */
  projectId?: string;
  /** Show notifications for these statuses */
  notifyOn?: ('completed' | 'failed' | 'running' | 'progress')[];
  /** Custom notification handler */
  onJobUpdate?: (job: PipelineJobPayload, eventType: string) => void;
  /** Progress update interval in percent (default: 25) */
  progressInterval?: number;
}

const STAGE_LABELS: Record<string, string> = {
  'product-input': 'Product Input',
  'image-generation': 'Image Generation',
  'landing-page': 'Landing Page',
  'voiceover': 'Voiceover',
  'scene-builder': 'Scene Builder',
  'auto-ad-factory': 'Auto-Ad Factory',
  'export': 'Export',
  'analyze': 'Analysis',
  'strategy': 'Strategy',
  'execute': 'Execution',
  'render': 'Rendering',
  'upload': 'Upload',
  'configure': 'Configuration',
  'plan': 'Planning',
  'generate': 'Generation',
  'results': 'Results',
};

const getStageLabel = (stageName: string): string => {
  return STAGE_LABELS[stageName] || stageName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export function usePipelineNotifications({
  enabled = true,
  projectId,
  notifyOn = ['completed', 'failed'],
  onJobUpdate,
  progressInterval = 25
}: UsePipelineNotificationsOptions = {}) {
  // Track seen job IDs to avoid duplicate notifications
  const seenJobsRef = useRef<Set<string>>(new Set());
  const previousStatusRef = useRef<Map<string, string>>(new Map());
  const lastProgressRef = useRef<Map<string, number>>(new Map());
  const progressToastIdsRef = useRef<Map<string, string | number>>(new Map());

  const handleJobChange = useCallback((payload: any, eventType: string) => {
    const job = (eventType === 'DELETE' ? payload.old : payload.new) as PipelineJobPayload;
    
    if (!job) return;

    // Get previous status and progress for this job
    const previousStatus = previousStatusRef.current.get(job.id);
    const lastProgress = lastProgressRef.current.get(job.id) || 0;
    
    // Update status tracking
    if (job.status) {
      previousStatusRef.current.set(job.id, job.status);
    }

    // Call custom handler if provided
    onJobUpdate?.(job, eventType);

    const stageLabel = getStageLabel(job.stage_name);
    const jobKey = `${job.id}-${job.status}`;
    const currentProgress = job.progress || 0;

    // Handle progress updates for running jobs
    if (job.status === 'running' && notifyOn.includes('progress')) {
      const progressMilestone = Math.floor(currentProgress / progressInterval) * progressInterval;
      const lastMilestone = Math.floor(lastProgress / progressInterval) * progressInterval;
      
      // Only notify at progress milestones (25%, 50%, 75%, etc.)
      if (progressMilestone > lastMilestone && progressMilestone > 0 && progressMilestone < 100) {
        lastProgressRef.current.set(job.id, currentProgress);
        
        // Use persistent toast that updates
        const existingToastId = progressToastIdsRef.current.get(job.id);
        const toastId = toast.loading(`${stageLabel}: ${currentProgress}%`, {
          id: existingToastId,
          description: `Processing... ${formatElapsedTime(job.started_at)}`,
          duration: Infinity,
        });
        progressToastIdsRef.current.set(job.id, toastId);
        return;
      }
    }

    // Only notify on status changes (not initial inserts with pending status)
    const isStatusChange = previousStatus && previousStatus !== job.status;
    const isNewCompletion = eventType === 'UPDATE' && 
      (job.status === 'completed' || job.status === 'failed');

    if (!isStatusChange && !isNewCompletion) {
      // For new inserts with running status, show a subtle notification
      if (eventType === 'INSERT' && job.status === 'running' && notifyOn.includes('running')) {
        toast.info(`${stageLabel} started`, {
          description: 'Processing in background...',
          duration: 3000,
        });
        lastProgressRef.current.set(job.id, 0);
      }
      return;
    }

    // Avoid duplicate notifications
    if (seenJobsRef.current.has(jobKey)) return;
    seenJobsRef.current.add(jobKey);

    // Clean up old entries (keep last 100)
    if (seenJobsRef.current.size > 100) {
      const entries = Array.from(seenJobsRef.current);
      seenJobsRef.current = new Set(entries.slice(-50));
    }

    // Dismiss progress toast when job completes/fails
    const progressToastId = progressToastIdsRef.current.get(job.id);
    if (progressToastId) {
      toast.dismiss(progressToastId);
      progressToastIdsRef.current.delete(job.id);
    }

    // Clean up progress tracking
    lastProgressRef.current.delete(job.id);

    // Show appropriate notification based on status
    if (job.status === 'completed' && notifyOn.includes('completed')) {
      toast.success(`${stageLabel} completed`, {
        description: 'Job finished successfully',
        duration: 4000,
      });
    } else if (job.status === 'failed' && notifyOn.includes('failed')) {
      toast.error(`${stageLabel} failed`, {
        description: job.error_message || 'An error occurred',
        duration: 6000,
        action: {
          label: 'Details',
          onClick: () => {
            console.error('[Pipeline Job Failed]', job);
          }
        }
      });
    } else if (job.status === 'running' && notifyOn.includes('running')) {
      toast.info(`${stageLabel} started`, {
        description: `Progress: ${job.progress || 0}%`,
        duration: 3000,
      });
    }
  }, [notifyOn, onJobUpdate, progressInterval]);

  useEffect(() => {
    if (!enabled) return;

    console.log('[PipelineNotifications] Setting up realtime subscription');

    // Build the channel with optional project filter
    const channelConfig: any = {
      event: '*',
      schema: 'public',
      table: 'pipeline_jobs',
    };

    if (projectId) {
      channelConfig.filter = `project_id=eq.${projectId}`;
    }

    const channel = supabase
      .channel('pipeline-notifications')
      .on('postgres_changes', channelConfig, (payload) => {
        console.log('[PipelineNotifications] Received:', payload.eventType, payload);
        handleJobChange(payload, payload.eventType);
      })
      .subscribe((status) => {
        console.log('[PipelineNotifications] Subscription status:', status);
      });

    return () => {
      console.log('[PipelineNotifications] Cleaning up subscription');
      supabase.removeChannel(channel);
      
      // Dismiss all progress toasts on cleanup
      progressToastIdsRef.current.forEach((toastId) => {
        toast.dismiss(toastId);
      });
    };
  }, [enabled, projectId, handleJobChange]);

  return {
    // Expose method to manually clear seen jobs
    clearSeenJobs: () => {
      seenJobsRef.current.clear();
      previousStatusRef.current.clear();
      lastProgressRef.current.clear();
      progressToastIdsRef.current.forEach((toastId) => {
        toast.dismiss(toastId);
      });
      progressToastIdsRef.current.clear();
    }
  };
}

// Helper to format elapsed time
function formatElapsedTime(startedAt: string | null): string {
  if (!startedAt) return '';
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `${seconds}s elapsed`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s elapsed`;
}
