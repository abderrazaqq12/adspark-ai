import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  tempFilesDeleted: number;
  expiredFilesDeleted: number;
  logsDeleted: number;
  bytesFreed: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Scheduled Cleanup] Starting automatic cleanup job...');

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const result: CleanupResult = {
    tempFilesDeleted: 0,
    expiredFilesDeleted: 0,
    logsDeleted: 0,
    bytesFreed: 0,
    errors: [],
  };

  try {
    // Calculate cutoff times
    const now = new Date();
    const tempCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
    const logCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago

    console.log(`[Scheduled Cleanup] Temp cutoff: ${tempCutoff.toISOString()}`);
    console.log(`[Scheduled Cleanup] Log cutoff: ${logCutoff.toISOString()}`);

    // 1. Delete temporary files older than 24 hours
    const { data: tempFiles, error: tempError } = await supabase
      .from('file_assets')
      .update({ 
        status: 'deleted', 
        deleted_at: now.toISOString() 
      })
      .in('file_type', ['temp', 'tmp', 'cache', 'partial'])
      .eq('status', 'active')
      .lt('created_at', tempCutoff.toISOString())
      .select('id, file_size');

    if (tempError) {
      console.error('[Scheduled Cleanup] Error deleting temp files:', tempError);
      result.errors.push(`Temp files: ${tempError.message}`);
    } else {
      result.tempFilesDeleted = tempFiles?.length || 0;
      result.bytesFreed += tempFiles?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
      console.log(`[Scheduled Cleanup] Deleted ${result.tempFilesDeleted} temp files`);
    }

    // 2. Delete files that have passed their expiry date
    const { data: expiredFiles, error: expiredError } = await supabase
      .from('file_assets')
      .update({ 
        status: 'deleted', 
        deleted_at: now.toISOString() 
      })
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .lt('expires_at', now.toISOString())
      .select('id, file_size');

    if (expiredError) {
      console.error('[Scheduled Cleanup] Error deleting expired files:', expiredError);
      result.errors.push(`Expired files: ${expiredError.message}`);
    } else {
      result.expiredFilesDeleted = expiredFiles?.length || 0;
      result.bytesFreed += expiredFiles?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
      console.log(`[Scheduled Cleanup] Deleted ${result.expiredFilesDeleted} expired files`);
    }

    // 3. Delete debug/info logs older than 72 hours (keep error logs longer)
    const { data: logs, error: logError } = await supabase
      .from('system_logs')
      .delete()
      .in('severity', ['debug', 'info'])
      .lt('created_at', logCutoff.toISOString())
      .select('id');

    if (logError) {
      console.error('[Scheduled Cleanup] Error deleting logs:', logError);
      result.errors.push(`Logs: ${logError.message}`);
    } else {
      result.logsDeleted = logs?.length || 0;
      result.bytesFreed += (logs?.length || 0) * 1024; // Estimate ~1KB per log
      console.log(`[Scheduled Cleanup] Deleted ${result.logsDeleted} old logs`);
    }

    // 4. Log the cleanup action
    const totalDeleted = result.tempFilesDeleted + result.expiredFilesDeleted + result.logsDeleted;
    
    if (totalDeleted > 0) {
      await supabase
        .from('system_logs')
        .insert({
          tool: 'scheduled_cleanup',
          severity: result.errors.length > 0 ? 'warning' : 'info',
          message: `Scheduled cleanup: ${totalDeleted} items cleaned, ${formatBytes(result.bytesFreed)} freed`,
          details: {
            tempFilesDeleted: result.tempFilesDeleted,
            expiredFilesDeleted: result.expiredFilesDeleted,
            logsDeleted: result.logsDeleted,
            bytesFreed: result.bytesFreed,
            errors: result.errors,
            timestamp: now.toISOString(),
          },
        });
    }

    // 5. Record in cleanup_history (using service role, no user_id required)
    if (totalDeleted > 0) {
      // Get a system user or first admin for audit trail
      const { data: adminUser } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      if (adminUser) {
        await supabase
          .from('cleanup_history')
          .insert({
            user_id: adminUser.id,
            cleanup_type: 'scheduled_auto',
            status: result.errors.length > 0 ? 'completed_with_errors' : 'completed',
            files_deleted: result.tempFilesDeleted + result.expiredFilesDeleted,
            logs_deleted: result.logsDeleted,
            bytes_freed: result.bytesFreed,
            completed_at: now.toISOString(),
            error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          });
      }
    }

    console.log('[Scheduled Cleanup] Cleanup completed successfully');
    console.log(`[Scheduled Cleanup] Summary: ${JSON.stringify(result)}`);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        bytesFreedFormatted: formatBytes(result.bytesFreed),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Scheduled Cleanup] Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...result,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
