import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CleanupType = 'project' | 'job' | 'user' | 'expired' | 'orphaned';
export type FileType = 'upload' | 'temp' | 'output' | 'final';
export type Tool = 'studio' | 'replicator' | 'ai-editor' | 'ai-tools' | 'system';
export type LogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface CleanupOptions {
  deleteFiles?: boolean;
  deleteLogs?: boolean;
  updateJobs?: boolean;
  dryRun?: boolean;
}

export interface CleanupResult {
  success: boolean;
  cleanupId: string;
  filesDeleted: number;
  logsDeleted: number;
  jobsUpdated: number;
  bytesFreed: number;
  errors: string[];
  details: {
    files: string[];
    logs: string[];
    jobs: string[];
  };
}

export interface CleanupPreview {
  filesCount: number;
  logsCount: number;
  jobsCount: number;
  estimatedBytesFreed: number;
  files: Array<{ id: string; name: string; type: string; size: number }>;
}

export interface RecoveryResult {
  success: boolean;
  orphanedJobsRecovered: number;
  expiredFilesMarked: number;
  expiredLogsDeleted: number;
  staleJobsTimedOut: number;
  errors: string[];
}

export interface FileAsset {
  id: string;
  fileName: string;
  filePath: string;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  fileType: FileType;
  tool: Tool;
  projectId: string | null;
  jobId: string | null;
  status: 'active' | 'pending_deletion' | 'deleted';
  expiresAt: string | null;
  createdAt: string;
  lastAccessedAt: string;
}

export interface SystemLog {
  id: string;
  tool: string;
  stage: string | null;
  severity: LogSeverity;
  message: string;
  details: Record<string, unknown> | null;
  projectId: string | null;
  jobId: string | null;
  createdAt: string;
}

export interface CleanupHistoryEntry {
  id: string;
  cleanupType: CleanupType;
  targetId: string | null;
  filesDeleted: number;
  logsDeleted: number;
  jobsUpdated: number;
  bytesFreed: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export function useLifecycleManagement() {
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Get cleanup preview (dry run)
  const getCleanupPreview = useCallback(async (
    type: CleanupType,
    targetId?: string
  ): Promise<CleanupPreview | null> => {
    setIsPreviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lifecycle-cleanup', {
        body: {
          type,
          targetId,
          options: { dryRun: true }
        }
      });

      if (error) throw error;

      // Get file details for preview
      let filesQuery = supabase
        .from('file_assets')
        .select('id, file_name, file_type, file_size')
        .eq('status', 'active');

      if (type === 'project' && targetId) {
        filesQuery = filesQuery.eq('project_id', targetId);
      } else if (type === 'job' && targetId) {
        filesQuery = filesQuery.eq('job_id', targetId);
      } else if (type === 'expired') {
        filesQuery = filesQuery.lt('expires_at', new Date().toISOString());
      } else if (type === 'orphaned') {
        filesQuery = filesQuery.is('job_id', null).eq('file_type', 'temp');
      }

      const { data: files } = await filesQuery.limit(50);

      return {
        filesCount: data?.details?.files?.length || 0,
        logsCount: data?.details?.logs?.length || 0,
        jobsCount: data?.details?.jobs?.length || 0,
        estimatedBytesFreed: data?.bytesFreed || 0,
        files: (files || []).map((f: any) => ({
          id: f.id,
          name: f.file_name,
          type: f.file_type,
          size: f.file_size || 0
        }))
      };
    } catch (error) {
      console.error('[useLifecycleManagement] Preview error:', error);
      return null;
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  // Execute cleanup
  const executeCleanup = useCallback(async (
    type: CleanupType,
    targetId?: string,
    options: CleanupOptions = {}
  ): Promise<CleanupResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lifecycle-cleanup', {
        body: {
          type,
          targetId,
          options: {
            deleteFiles: options.deleteFiles ?? true,
            deleteLogs: options.deleteLogs ?? true,
            updateJobs: options.updateJobs ?? true,
            dryRun: false
          }
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Cleanup completed', {
          description: `Deleted ${data.filesDeleted} files, ${data.logsDeleted} logs, updated ${data.jobsUpdated} jobs`
        });
      } else {
        toast.warning('Cleanup completed with errors', {
          description: data.errors?.[0] || 'Some items could not be cleaned up'
        });
      }

      return data;
    } catch (error) {
      console.error('[useLifecycleManagement] Cleanup error:', error);
      toast.error('Cleanup failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Run recovery process
  const runRecovery = useCallback(async (
    scope: 'all' | 'user' | 'system' = 'user'
  ): Promise<RecoveryResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('lifecycle-recovery', {
        body: { scope }
      });

      if (error) throw error;

      if (data.success) {
        const total = data.staleJobsTimedOut + data.expiredFilesMarked + data.expiredLogsDeleted;
        if (total > 0) {
          toast.success('Recovery completed', {
            description: `Recovered ${data.staleJobsTimedOut} jobs, marked ${data.expiredFilesMarked} expired files`
          });
        } else {
          toast.info('No items needed recovery');
        }
      }

      return data;
    } catch (error) {
      console.error('[useLifecycleManagement] Recovery error:', error);
      toast.error('Recovery failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register a file in the lifecycle system
  const registerFile = useCallback(async (
    file: {
      fileName: string;
      filePath: string;
      fileUrl?: string;
      fileSize?: number;
      mimeType?: string;
      fileType: FileType;
      tool: Tool;
      projectId?: string;
      jobId?: string;
    }
  ): Promise<{ id: string; expiresAt: string } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('lifecycle-register-file', {
        body: file
      });

      if (error) throw error;

      return data.files?.[0] || null;
    } catch (error) {
      console.error('[useLifecycleManagement] Register file error:', error);
      return null;
    }
  }, []);

  // Log a system event
  const logEvent = useCallback(async (
    log: {
      tool: string;
      stage?: string;
      severity: LogSeverity;
      message: string;
      projectId?: string;
      jobId?: string;
      details?: Record<string, unknown>;
    }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.functions.invoke('lifecycle-log', {
        body: log
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[useLifecycleManagement] Log error:', error);
      return false;
    }
  }, []);

  // Get file assets
  const getFileAssets = useCallback(async (
    filters?: {
      projectId?: string;
      jobId?: string;
      fileType?: FileType;
      tool?: Tool;
      status?: 'active' | 'pending_deletion' | 'deleted';
    }
  ): Promise<FileAsset[]> => {
    try {
      let query = supabase
        .from('file_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.projectId) query = query.eq('project_id', filters.projectId);
      if (filters?.jobId) query = query.eq('job_id', filters.jobId);
      if (filters?.fileType) query = query.eq('file_type', filters.fileType);
      if (filters?.tool) query = query.eq('tool', filters.tool);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query.limit(100);

      if (error) throw error;

      return (data || []).map((f: any) => ({
        id: f.id,
        fileName: f.file_name,
        filePath: f.file_path,
        fileUrl: f.file_url,
        fileSize: f.file_size,
        mimeType: f.mime_type,
        fileType: f.file_type,
        tool: f.tool,
        projectId: f.project_id,
        jobId: f.job_id,
        status: f.status,
        expiresAt: f.expires_at,
        createdAt: f.created_at,
        lastAccessedAt: f.last_accessed_at
      }));
    } catch (error) {
      console.error('[useLifecycleManagement] Get files error:', error);
      return [];
    }
  }, []);

  // Get system logs
  const getSystemLogs = useCallback(async (
    filters?: {
      projectId?: string;
      jobId?: string;
      tool?: string;
      severity?: LogSeverity;
      limit?: number;
    }
  ): Promise<SystemLog[]> => {
    try {
      let query = supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.projectId) query = query.eq('project_id', filters.projectId);
      if (filters?.jobId) query = query.eq('job_id', filters.jobId);
      if (filters?.tool) query = query.eq('tool', filters.tool);
      if (filters?.severity) query = query.eq('severity', filters.severity);

      const { data, error } = await query.limit(filters?.limit || 100);

      if (error) throw error;

      return (data || []).map((l: any) => ({
        id: l.id,
        tool: l.tool,
        stage: l.stage,
        severity: l.severity,
        message: l.message,
        details: l.details,
        projectId: l.project_id,
        jobId: l.job_id,
        createdAt: l.created_at
      }));
    } catch (error) {
      console.error('[useLifecycleManagement] Get logs error:', error);
      return [];
    }
  }, []);

  // Get cleanup history
  const getCleanupHistory = useCallback(async (
    limit: number = 20
  ): Promise<CleanupHistoryEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('cleanup_history')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((h: any) => ({
        id: h.id,
        cleanupType: h.cleanup_type,
        targetId: h.target_id,
        filesDeleted: h.files_deleted,
        logsDeleted: h.logs_deleted,
        jobsUpdated: h.jobs_updated,
        bytesFreed: h.bytes_freed,
        status: h.status,
        errorMessage: h.error_message,
        startedAt: h.started_at,
        completedAt: h.completed_at
      }));
    } catch (error) {
      console.error('[useLifecycleManagement] Get history error:', error);
      return [];
    }
  }, []);

  return {
    isLoading,
    isPreviewLoading,
    getCleanupPreview,
    executeCleanup,
    runRecovery,
    registerFile,
    logEvent,
    getFileAssets,
    getSystemLogs,
    getCleanupHistory
  };
}
