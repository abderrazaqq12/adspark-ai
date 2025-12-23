import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StorageCategory, CleanupResult } from '@/types/storage';
import { toast } from 'sonner';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function useStorageCleanup() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<CleanupResult | null>(null);

  const executeCleanup = async (
    categories: Exclude<StorageCategory, 'system'>[]
  ): Promise<CleanupResult> => {
    setIsProcessing(true);
    setProgress(0);

    const result: CleanupResult = {
      success: false,
      filesDeleted: 0,
      bytesFreed: 0,
      bytesFreedFormatted: '0 B',
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Create cleanup history record
      const { data: cleanupRecord, error: historyError } = await supabase
        .from('cleanup_history')
        .insert({
          user_id: user.id,
          cleanup_type: categories.join(','),
          status: 'processing',
        })
        .select()
        .single();

      if (historyError) throw historyError;

      let totalDeleted = 0;
      let totalBytes = 0;
      const progressStep = 100 / categories.length;

      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        setProgress(Math.round((i + 0.5) * progressStep));

        try {
          if (category === 'generated_outputs') {
            // Mark output files as deleted (soft delete)
            const { data: files, error } = await supabase
              .from('file_assets')
              .update({ status: 'deleted', deleted_at: new Date().toISOString() })
              .in('file_type', ['output', 'final', 'video', 'image', 'audio'])
              .eq('status', 'active')
              .select('file_size');

            if (error) throw error;
            totalDeleted += files?.length || 0;
            totalBytes += files?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;

          } else if (category === 'temporary') {
            // Delete temporary files
            const { data: files, error } = await supabase
              .from('file_assets')
              .update({ status: 'deleted', deleted_at: new Date().toISOString() })
              .in('file_type', ['temp', 'tmp', 'cache', 'partial'])
              .eq('status', 'active')
              .select('file_size');

            if (error) throw error;
            totalDeleted += files?.length || 0;
            totalBytes += files?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;

          } else if (category === 'logs') {
            // Delete logs older than 72 hours (preserve recent)
            const cutoffDate = new Date();
            cutoffDate.setHours(cutoffDate.getHours() - 72);

            const { data: logs, error } = await supabase
              .from('system_logs')
              .delete()
              .lt('created_at', cutoffDate.toISOString())
              .select('id');

            if (error) {
              // Logs might not be deletable due to RLS, log as warning
              result.errors.push(`Logs: ${error.message}`);
            } else {
              totalDeleted += logs?.length || 0;
              totalBytes += (logs?.length || 0) * 1024; // Estimate
            }
          }
        } catch (categoryError) {
          const errorMsg = categoryError instanceof Error ? categoryError.message : 'Unknown error';
          result.errors.push(`${category}: ${errorMsg}`);
        }

        setProgress(Math.round((i + 1) * progressStep));
      }

      result.filesDeleted = totalDeleted;
      result.bytesFreed = totalBytes;
      result.bytesFreedFormatted = formatBytes(totalBytes);
      result.success = result.errors.length === 0;

      // Update cleanup history
      await supabase
        .from('cleanup_history')
        .update({
          status: result.success ? 'completed' : 'completed_with_errors',
          completed_at: new Date().toISOString(),
          files_deleted: totalDeleted,
          bytes_freed: totalBytes,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
        })
        .eq('id', cleanupRecord.id);

      // Log the cleanup action
      await supabase
        .from('system_logs')
        .insert({
          user_id: user.id,
          tool: 'storage_cleanup',
          severity: result.success ? 'info' : 'warning',
          message: `Cleanup completed: ${totalDeleted} files, ${result.bytesFreedFormatted} freed`,
          details: {
            categories,
            filesDeleted: totalDeleted,
            bytesFreed: totalBytes,
            errors: result.errors,
          },
        });

      setLastResult(result);

      if (result.success) {
        toast.success(`Cleanup complete: ${result.bytesFreedFormatted} freed`);
      } else {
        toast.warning(`Cleanup completed with ${result.errors.length} error(s)`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Cleanup failed';
      result.errors.push(errorMsg);
      toast.error(errorMsg);
      setLastResult(result);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }

    return result;
  };

  return {
    executeCleanup,
    isProcessing,
    progress,
    lastResult,
  };
}
