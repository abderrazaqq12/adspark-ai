import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecoveryResult {
  success: boolean;
  orphanedJobsRecovered: number;
  expiredFilesMarked: number;
  expiredLogsDeleted: number;
  staleJobsTimedOut: number;
  errors: string[];
}

// Job timeout thresholds in hours
const JOB_TIMEOUT_HOURS = {
  queued: 2,      // Jobs stuck in queued for 2 hours
  running: 4,     // Jobs stuck running for 4 hours  
  processing: 4,  // Jobs stuck processing for 4 hours
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // This can be called with or without auth (for scheduled runs)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id || null;
    }

    const body = await req.json().catch(() => ({}));
    const { scope = 'all' } = body; // 'all' | 'user' | 'system'

    console.log(`[lifecycle-recovery] Starting recovery, scope: ${scope}, user: ${userId || 'system'}`);

    const result: RecoveryResult = {
      success: true,
      orphanedJobsRecovered: 0,
      expiredFilesMarked: 0,
      expiredLogsDeleted: 0,
      staleJobsTimedOut: 0,
      errors: []
    };

    const now = new Date();

    // 1. Recover orphaned jobs (stuck in running/queued state)
    console.log('[lifecycle-recovery] Checking for orphaned jobs...');
    
    for (const [status, timeoutHours] of Object.entries(JOB_TIMEOUT_HOURS)) {
      const cutoffTime = new Date(now.getTime() - timeoutHours * 60 * 60 * 1000).toISOString();
      
      let query = supabaseAdmin
        .from('pipeline_jobs')
        .select('id, status, stage_name, user_id, created_at, started_at')
        .eq('status', status)
        .lt('updated_at', cutoffTime);
      
      // If user-scoped, only check their jobs
      if (scope === 'user' && userId) {
        query = query.eq('user_id', userId);
      }

      const { data: staleJobs, error: staleError } = await query;

      if (staleError) {
        result.errors.push(`Failed to fetch ${status} jobs: ${staleError.message}`);
        continue;
      }

      if (staleJobs && staleJobs.length > 0) {
        console.log(`[lifecycle-recovery] Found ${staleJobs.length} stale ${status} jobs`);
        
        for (const job of staleJobs) {
          // Update job to failed/expired state
          const { error: updateError } = await supabaseAdmin
            .from('pipeline_jobs')
            .update({
              status: 'failed',
              error_message: `Job timed out after ${timeoutHours} hours in ${status} state`,
              completed_at: now.toISOString()
            })
            .eq('id', job.id);

          if (updateError) {
            result.errors.push(`Failed to recover job ${job.id}: ${updateError.message}`);
          } else {
            result.staleJobsTimedOut++;

            // Record state transition
            await supabaseAdmin
              .from('job_state_history')
              .insert({
                job_id: job.id,
                from_status: status,
                to_status: 'failed',
                triggered_by: 'recovery',
                reason: `Automatic timeout after ${timeoutHours} hours`
              });

            // Mark associated temp files for deletion
            await supabaseAdmin
              .from('file_assets')
              .update({ 
                status: 'pending_deletion',
                expires_at: now.toISOString()
              })
              .eq('job_id', job.id)
              .eq('file_type', 'temp');

            // Log the recovery
            await supabaseAdmin
              .from('system_logs')
              .insert({
                user_id: job.user_id,
                job_id: job.id,
                tool: 'system',
                stage: 'recovery',
                severity: 'warning',
                message: `Job ${job.id} recovered from stale ${status} state`,
                details: {
                  original_status: status,
                  timeout_hours: timeoutHours,
                  stage_name: job.stage_name
                }
              });
          }
        }
      }
    }

    // 2. Mark expired files for deletion
    console.log('[lifecycle-recovery] Checking for expired files...');
    
    let expiredFilesQuery = supabaseAdmin
      .from('file_assets')
      .select('id, file_path, user_id')
      .eq('status', 'active')
      .lt('expires_at', now.toISOString());
    
    if (scope === 'user' && userId) {
      expiredFilesQuery = expiredFilesQuery.eq('user_id', userId);
    }

    const { data: expiredFiles, error: expiredFilesError } = await expiredFilesQuery;

    if (expiredFilesError) {
      result.errors.push(`Failed to fetch expired files: ${expiredFilesError.message}`);
    } else if (expiredFiles && expiredFiles.length > 0) {
      console.log(`[lifecycle-recovery] Found ${expiredFiles.length} expired files`);
      
      const fileIds = expiredFiles.map(f => f.id);
      
      const { error: markError } = await supabaseAdmin
        .from('file_assets')
        .update({ 
          status: 'pending_deletion',
          deleted_at: now.toISOString()
        })
        .in('id', fileIds);

      if (markError) {
        result.errors.push(`Failed to mark expired files: ${markError.message}`);
      } else {
        result.expiredFilesMarked = expiredFiles.length;
      }
    }

    // 3. Delete expired logs
    console.log('[lifecycle-recovery] Checking for expired logs...');
    
    let expiredLogsQuery = supabaseAdmin
      .from('system_logs')
      .select('id')
      .lt('expires_at', now.toISOString());
    
    if (scope === 'user' && userId) {
      expiredLogsQuery = expiredLogsQuery.eq('user_id', userId);
    }

    const { data: expiredLogs, error: expiredLogsError } = await expiredLogsQuery;

    if (expiredLogsError) {
      result.errors.push(`Failed to fetch expired logs: ${expiredLogsError.message}`);
    } else if (expiredLogs && expiredLogs.length > 0) {
      console.log(`[lifecycle-recovery] Found ${expiredLogs.length} expired logs`);
      
      const logIds = expiredLogs.map(l => l.id);
      
      const { error: deleteLogsError } = await supabaseAdmin
        .from('system_logs')
        .delete()
        .in('id', logIds);

      if (deleteLogsError) {
        result.errors.push(`Failed to delete expired logs: ${deleteLogsError.message}`);
      } else {
        result.expiredLogsDeleted = expiredLogs.length;
      }
    }

    // 4. Clean up orphaned file records (files marked for deletion that we can now remove)
    console.log('[lifecycle-recovery] Cleaning up pending deletion files...');
    
    let pendingDeletionQuery = supabaseAdmin
      .from('file_assets')
      .select('id, file_path, file_size, user_id')
      .eq('status', 'pending_deletion');
    
    if (scope === 'user' && userId) {
      pendingDeletionQuery = pendingDeletionQuery.eq('user_id', userId);
    }

    const { data: pendingFiles, error: pendingError } = await pendingDeletionQuery;

    if (!pendingError && pendingFiles && pendingFiles.length > 0) {
      console.log(`[lifecycle-recovery] Processing ${pendingFiles.length} pending deletion files`);
      
      for (const file of pendingFiles) {
        // Try to delete from storage
        if (file.file_path && file.file_path.includes('/')) {
          const pathParts = file.file_path.split('/');
          const bucket = pathParts[0];
          const path = pathParts.slice(1).join('/');
          
          try {
            await supabaseAdmin.storage.from(bucket).remove([path]);
          } catch (e) {
            console.log(`[lifecycle-recovery] Storage delete skipped for ${file.file_path}`);
          }
        }

        // Mark as fully deleted
        await supabaseAdmin
          .from('file_assets')
          .update({ status: 'deleted' })
          .eq('id', file.id);
      }
    }

    result.success = result.errors.length === 0;

    console.log(`[lifecycle-recovery] Recovery complete: ${JSON.stringify(result)}`);

    // Log recovery operation
    await supabaseAdmin
      .from('system_logs')
      .insert({
        user_id: userId,
        tool: 'system',
        stage: 'recovery',
        severity: result.errors.length > 0 ? 'warning' : 'info',
        message: `Lifecycle recovery completed: ${result.staleJobsTimedOut} jobs timed out, ${result.expiredFilesMarked} files expired, ${result.expiredLogsDeleted} logs deleted`,
        details: result
      });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[lifecycle-recovery] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        orphanedJobsRecovered: 0,
        expiredFilesMarked: 0,
        expiredLogsDeleted: 0,
        staleJobsTimedOut: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
