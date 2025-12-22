import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequest {
  type: 'project' | 'job' | 'user' | 'expired' | 'orphaned';
  targetId?: string;
  options?: {
    deleteFiles?: boolean;
    deleteLogs?: boolean;
    updateJobs?: boolean;
    dryRun?: boolean;
  };
}

interface CleanupResult {
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for cleanup operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const body: CleanupRequest = await req.json();
    const { type, targetId, options = {} } = body;
    const { deleteFiles = true, deleteLogs = true, updateJobs = true, dryRun = false } = options;

    console.log(`[lifecycle-cleanup] Starting ${type} cleanup for user ${userId}, target: ${targetId || 'all'}, dryRun: ${dryRun}`);

    const result: CleanupResult = {
      success: true,
      cleanupId: crypto.randomUUID(),
      filesDeleted: 0,
      logsDeleted: 0,
      jobsUpdated: 0,
      bytesFreed: 0,
      errors: [],
      details: { files: [], logs: [], jobs: [] }
    };

    // Create cleanup history record
    let cleanupHistoryId: string | null = null;
    if (!dryRun) {
      const { data: cleanupRecord, error: historyError } = await supabaseAdmin
        .from('cleanup_history')
        .insert({
          user_id: userId,
          cleanup_type: type,
          target_id: targetId || null,
          status: 'running'
        })
        .select('id')
        .single();
      
      if (!historyError && cleanupRecord) {
        cleanupHistoryId = cleanupRecord.id;
        result.cleanupId = cleanupRecord.id;
      }
    }

    // Build query filters based on cleanup type
    let fileQuery = supabaseAdmin
      .from('file_assets')
      .select('id, file_path, file_size, file_name')
      .eq('user_id', userId)
      .eq('status', 'active');

    let logQuery = supabaseAdmin
      .from('system_logs')
      .select('id')
      .eq('user_id', userId);

    let jobQuery = supabaseAdmin
      .from('pipeline_jobs')
      .select('id, status')
      .eq('user_id', userId);

    switch (type) {
      case 'project':
        if (!targetId) {
          throw new Error('Project ID required for project cleanup');
        }
        fileQuery = fileQuery.eq('project_id', targetId);
        logQuery = logQuery.eq('project_id', targetId);
        jobQuery = jobQuery.eq('project_id', targetId);
        break;

      case 'job':
        if (!targetId) {
          throw new Error('Job ID required for job cleanup');
        }
        fileQuery = fileQuery.eq('job_id', targetId);
        logQuery = logQuery.eq('job_id', targetId);
        jobQuery = jobQuery.eq('id', targetId);
        break;

      case 'user':
        // All user data - already filtered by user_id
        break;

      case 'expired':
        // Only get expired files and logs
        const now = new Date().toISOString();
        fileQuery = fileQuery.lt('expires_at', now);
        logQuery = logQuery.lt('expires_at', now);
        // Don't touch jobs for expired cleanup
        jobQuery = jobQuery.eq('status', 'nonexistent_status_to_match_nothing');
        break;

      case 'orphaned':
        // Files without valid job reference that are temp type
        fileQuery = fileQuery.is('job_id', null).eq('file_type', 'temp');
        // Logs without valid job reference
        logQuery = logQuery.is('job_id', null);
        jobQuery = jobQuery.eq('status', 'nonexistent_status_to_match_nothing');
        break;
    }

    // Get files to delete
    if (deleteFiles) {
      const { data: files, error: filesError } = await fileQuery;
      
      if (filesError) {
        result.errors.push(`Failed to fetch files: ${filesError.message}`);
      } else if (files && files.length > 0) {
        console.log(`[lifecycle-cleanup] Found ${files.length} files to delete`);
        
        for (const file of files) {
          result.details.files.push(file.file_name);
          result.bytesFreed += file.file_size || 0;
          
          if (!dryRun) {
            // Mark file as deleted in database
            const { error: updateError } = await supabaseAdmin
              .from('file_assets')
              .update({ 
                status: 'deleted',
                deleted_at: new Date().toISOString()
              })
              .eq('id', file.id);
            
            if (updateError) {
              result.errors.push(`Failed to mark file ${file.id} as deleted: ${updateError.message}`);
            } else {
              result.filesDeleted++;
            }

            // Try to delete from storage if it's a storage path
            if (file.file_path && file.file_path.includes('/')) {
              const pathParts = file.file_path.split('/');
              const bucket = pathParts[0];
              const path = pathParts.slice(1).join('/');
              
              try {
                const { error: storageError } = await supabaseAdmin.storage
                  .from(bucket)
                  .remove([path]);
                
                if (storageError) {
                  console.log(`[lifecycle-cleanup] Storage delete warning: ${storageError.message}`);
                }
              } catch (e) {
                console.log(`[lifecycle-cleanup] Storage delete skipped: ${e}`);
              }
            }
          }
        }
      }
    }

    // Delete logs
    if (deleteLogs) {
      const { data: logs, error: logsError } = await logQuery;
      
      if (logsError) {
        result.errors.push(`Failed to fetch logs: ${logsError.message}`);
      } else if (logs && logs.length > 0) {
        console.log(`[lifecycle-cleanup] Found ${logs.length} logs to delete`);
        result.details.logs = logs.map(l => l.id);
        
        if (!dryRun) {
          const logIds = logs.map(l => l.id);
          const { error: deleteLogsError } = await supabaseAdmin
            .from('system_logs')
            .delete()
            .in('id', logIds);
          
          if (deleteLogsError) {
            result.errors.push(`Failed to delete logs: ${deleteLogsError.message}`);
          } else {
            result.logsDeleted = logs.length;
          }
        }
      }
    }

    // Update jobs - mark failed/stale jobs
    if (updateJobs && type !== 'expired' && type !== 'orphaned') {
      const { data: jobs, error: jobsError } = await jobQuery;
      
      if (jobsError) {
        result.errors.push(`Failed to fetch jobs: ${jobsError.message}`);
      } else if (jobs && jobs.length > 0) {
        console.log(`[lifecycle-cleanup] Found ${jobs.length} jobs to process`);
        
        for (const job of jobs) {
          result.details.jobs.push(job.id);
          
          if (!dryRun && job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled') {
            // Mark incomplete jobs as cancelled during cleanup
            const { error: updateJobError } = await supabaseAdmin
              .from('pipeline_jobs')
              .update({ 
                status: 'cancelled',
                completed_at: new Date().toISOString(),
                error_message: `Cancelled during ${type} cleanup`
              })
              .eq('id', job.id);
            
            if (updateJobError) {
              result.errors.push(`Failed to update job ${job.id}: ${updateJobError.message}`);
            } else {
              result.jobsUpdated++;
              
              // Record state change
              await supabaseAdmin
                .from('job_state_history')
                .insert({
                  job_id: job.id,
                  from_status: job.status,
                  to_status: 'cancelled',
                  triggered_by: 'user',
                  reason: `${type} cleanup requested`
                });
            }
          }
        }
      }
    }

    // Update cleanup history record
    if (cleanupHistoryId && !dryRun) {
      await supabaseAdmin
        .from('cleanup_history')
        .update({
          status: result.errors.length > 0 ? 'failed' : 'completed',
          files_deleted: result.filesDeleted,
          logs_deleted: result.logsDeleted,
          jobs_updated: result.jobsUpdated,
          bytes_freed: result.bytesFreed,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          completed_at: new Date().toISOString()
        })
        .eq('id', cleanupHistoryId);
    }

    // Log the cleanup operation
    if (!dryRun) {
      await supabaseAdmin
        .from('system_logs')
        .insert({
          user_id: userId,
          tool: 'system',
          stage: 'cleanup',
          severity: result.errors.length > 0 ? 'warning' : 'info',
          message: `${type} cleanup completed: ${result.filesDeleted} files, ${result.logsDeleted} logs, ${result.jobsUpdated} jobs`,
          details: {
            type,
            targetId,
            result,
            dryRun
          }
        });
    }

    console.log(`[lifecycle-cleanup] Cleanup complete: ${JSON.stringify(result)}`);

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[lifecycle-cleanup] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        cleanupId: null,
        filesDeleted: 0,
        logsDeleted: 0,
        jobsUpdated: 0,
        bytesFreed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        details: { files: [], logs: [], jobs: [] }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
