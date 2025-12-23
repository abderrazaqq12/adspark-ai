import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StorageCategoryStats, GoogleDriveStatus } from '@/types/storage';

interface StorageStats {
  categories: StorageCategoryStats[];
  totalUsed: number;
  totalUsedFormatted: string;
  lastUpdated: string;
  isLoading: boolean;
  error: string | null;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function useStorageStats() {
  const [stats, setStats] = useState<StorageStats>({
    categories: [],
    totalUsed: 0,
    totalUsedFormatted: '0 B',
    lastUpdated: new Date().toISOString(),
    isLoading: true,
    error: null,
  });

  const [googleDriveStatus, setGoogleDriveStatus] = useState<GoogleDriveStatus>({
    isLinked: false,
    lastBackup: null,
    pendingUploads: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      setStats(prev => ({ ...prev, isLoading: true, error: null }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStats(prev => ({ ...prev, isLoading: false, error: 'Not authenticated' }));
        return;
      }

      // Fetch file assets grouped by type
      const { data: fileAssets, error: fileError } = await supabase
        .from('file_assets')
        .select('file_type, file_size, created_at, tool, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (fileError) throw fileError;

      // Fetch system logs stats
      const { data: logs, error: logError } = await supabase
        .from('system_logs')
        .select('severity, created_at')
        .order('created_at', { ascending: false });

      if (logError) throw logError;

      // Calculate generated outputs (videos, images, audio, etc.)
      const outputFiles = fileAssets?.filter(f => 
        ['output', 'final', 'video', 'image', 'audio'].includes(f.file_type)
      ) || [];
      const outputSize = outputFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
      const outputLastMod = outputFiles[0]?.created_at || null;

      // Calculate temporary files
      const tempFiles = fileAssets?.filter(f => 
        ['temp', 'tmp', 'cache', 'partial'].includes(f.file_type) || f.status === 'expired'
      ) || [];
      const tempSize = tempFiles.reduce((sum, f) => sum + (f.file_size || 0), 0);
      const tempLastMod = tempFiles[0]?.created_at || null;

      // Calculate logs (estimate ~1KB per log entry)
      const logCount = logs?.length || 0;
      const logSize = logCount * 1024; // Rough estimate
      const logLastMod = logs?.[0]?.created_at || null;

      // System files are READ-ONLY, we don't track them in DB
      // Show a static estimate for display purposes only
      const systemSize = 50 * 1024 * 1024; // ~50MB estimate for deps

      const categories: StorageCategoryStats[] = [
        {
          category: 'generated_outputs',
          label: 'Generated Outputs',
          description: 'Videos, images, audio, voiceovers, subtitles, and scripts',
          sizeBytes: outputSize,
          sizeFormatted: formatBytes(outputSize),
          fileCount: outputFiles.length,
          lastModified: outputLastMod,
          isDeletable: true,
          subcategories: [
            { name: 'Videos', sizeBytes: outputFiles.filter(f => f.file_type === 'video').reduce((s, f) => s + (f.file_size || 0), 0), fileCount: outputFiles.filter(f => f.file_type === 'video').length },
            { name: 'Images', sizeBytes: outputFiles.filter(f => f.file_type === 'image').reduce((s, f) => s + (f.file_size || 0), 0), fileCount: outputFiles.filter(f => f.file_type === 'image').length },
            { name: 'Audio', sizeBytes: outputFiles.filter(f => f.file_type === 'audio').reduce((s, f) => s + (f.file_size || 0), 0), fileCount: outputFiles.filter(f => f.file_type === 'audio').length },
          ],
        },
        {
          category: 'temporary',
          label: 'Temporary & Cache',
          description: 'Temp renders, failed jobs, partial exports, orphaned files',
          sizeBytes: tempSize,
          sizeFormatted: formatBytes(tempSize),
          fileCount: tempFiles.length,
          lastModified: tempLastMod,
          isDeletable: true,
        },
        {
          category: 'logs',
          label: 'System Logs',
          description: 'Execution logs, error logs, pipeline traces (keeps last 72h)',
          sizeBytes: logSize,
          sizeFormatted: formatBytes(logSize),
          fileCount: logCount,
          lastModified: logLastMod,
          isDeletable: true,
        },
        {
          category: 'system',
          label: 'System Files',
          description: 'Application code, dependencies, FFmpeg, configs (READ-ONLY)',
          sizeBytes: systemSize,
          sizeFormatted: formatBytes(systemSize),
          fileCount: 0,
          lastModified: null,
          isDeletable: false,
        },
      ];

      const totalUsed = outputSize + tempSize + logSize;

      // Check Google Drive link status
      const { data: projects } = await supabase
        .from('projects')
        .select('google_drive_folder_id')
        .not('google_drive_folder_id', 'is', null)
        .limit(1);

      setGoogleDriveStatus({
        isLinked: (projects?.length || 0) > 0,
        lastBackup: null,
        pendingUploads: 0,
      });

      setStats({
        categories,
        totalUsed,
        totalUsedFormatted: formatBytes(totalUsed),
        lastUpdated: new Date().toISOString(),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching storage stats:', error);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch storage stats',
      }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, googleDriveStatus, refetch: fetchStats };
}
