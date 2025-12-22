/**
 * usePipelineNotifications - Real-time job notification hook
 * 
 * Subscribes to pipeline_jobs table and shows toast notifications
 * when jobs complete or fail. Use in Layout or root component for
 * system-wide notifications across all tools.
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
}

interface UsePipelineNotificationsOptions {
  /** Enable notifications (default: true) */
  enabled?: boolean;
  /** Filter by project ID */
  projectId?: string;
  /** Show notifications for these statuses */
  notifyOn?: ('completed' | 'failed' | 'running')[];
  /** Custom notification handler */
  onJobUpdate?: (job: PipelineJobPayload, eventType: string) => void;
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
  onJobUpdate
}: UsePipelineNotificationsOptions = {}) {
  // Track seen job IDs to avoid duplicate notifications
  const seenJobsRef = useRef<Set<string>>(new Set());
  const previousStatusRef = useRef<Map<string, string>>(new Map());

  const handleJobChange = useCallback((payload: any, eventType: string) => {
    const job = (eventType === 'DELETE' ? payload.old : payload.new) as PipelineJobPayload;
    
    if (!job) return;

    // Get previous status for this job
    const previousStatus = previousStatusRef.current.get(job.id);
    
    // Update status tracking
    if (job.status) {
      previousStatusRef.current.set(job.id, job.status);
    }

    // Call custom handler if provided
    onJobUpdate?.(job, eventType);

    // Only notify on status changes (not initial inserts with pending status)
    const isStatusChange = previousStatus && previousStatus !== job.status;
    const isNewCompletion = eventType === 'UPDATE' && 
      (job.status === 'completed' || job.status === 'failed');

    if (!isStatusChange && !isNewCompletion) {
      // For new inserts with running status, show a subtle notification
      if (eventType === 'INSERT' && job.status === 'running' && notifyOn.includes('running')) {
        const stageLabel = getStageLabel(job.stage_name);
        toast.info(`${stageLabel} started`, {
          description: 'Processing in background...',
          duration: 3000,
        });
      }
      return;
    }

    const stageLabel = getStageLabel(job.stage_name);
    const jobKey = `${job.id}-${job.status}`;

    // Avoid duplicate notifications
    if (seenJobsRef.current.has(jobKey)) return;
    seenJobsRef.current.add(jobKey);

    // Clean up old entries (keep last 100)
    if (seenJobsRef.current.size > 100) {
      const entries = Array.from(seenJobsRef.current);
      seenJobsRef.current = new Set(entries.slice(-50));
    }

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
  }, [notifyOn, onJobUpdate]);

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
    };
  }, [enabled, projectId, handleJobChange]);

  return {
    // Expose method to manually clear seen jobs
    clearSeenJobs: () => {
      seenJobsRef.current.clear();
      previousStatusRef.current.clear();
    }
  };
}
