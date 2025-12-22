/**
 * State Persistence Module
 * 
 * Manages execution state for job resume capability
 */

import { supabase } from './supabase.js';

/**
 * Save execution state checkpoint
 * @param {string} jobId - Job ID
 * @param {object} state - State data
 */
export async function saveExecutionState(jobId, state) {
    const {
        projectId,
        userId,
        status,
        stage,
        progress,
        checkpointData,
        partialOutputs,
        jobConfig
    } = state;

    try {
        const { error } = await supabase
            .from('execution_state')
            .upsert({
                job_id: jobId,
                project_id: projectId,
                user_id: userId,
                status,
                stage,
                progress_percent: progress || 0,
                checkpoint_data: checkpointData || {},
                partial_outputs: partialOutputs || [],
                job_config: jobConfig,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'job_id'
            });

        if (error) {
            console.error('[StateManager] Failed to save state:', error);
            return false;
        }

        console.log(`[StateManager] ✅ Saved checkpoint for job ${jobId} (${status})`);
        return true;
    } catch (err) {
        console.error('[StateManager] Exception saving state:', err);
        return false;
    }
}

/**
 * Load execution state for resume
 * @param {string} jobId - Job ID
 * @returns {Promise<object|null>} Saved state or null
 */
export async function loadExecutionState(jobId) {
    try {
        const { data, error } = await supabase
            .from('execution_state')
            .select('*')
            .eq('job_id', jobId)
            .single();

        if (error || !data) {
            return null;
        }

        console.log(`[StateManager] ✅ Loaded state for job ${jobId}`);
        return data;
    } catch (err) {
        console.error('[StateManager] Exception loading state:', err);
        return null;
    }
}

/**
 * Mark job as completed
 * @param {string} jobId - Job ID
 */
export async function markJobCompleted(jobId) {
    try {
        await supabase
            .from('execution_state')
            .update({
                status: 'completed',
                progress_percent: 100,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('job_id', jobId);

        console.log(`[StateManager] ✅ Marked job ${jobId} as completed`);
    } catch (err) {
        console.error('[StateManager] Failed to mark completed:', err);
    }
}

/**
 * Mark job as failed
 * @param {string} jobId - Job ID
 * @param {string} errorId - Error record ID
 */
export async function markJobFailed(jobId, errorId) {
    try {
        await supabase
            .from('execution_state')
            .update({
                status: 'failed',
                last_error_id: errorId,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('job_id', jobId);

        console.log(`[StateManager] ✅ Marked job ${jobId} as failed`);
    } catch (err) {
        console.error('[StateManager] Failed to mark failed:', err);
    }
}

/**
 * Get jobs pending retry
 * @returns {Promise<Array>} Jobs ready to retry
 */
export async function getJobsPendingRetry() {
    try {
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('execution_state')
            .select('*')
            .eq('status', 'paused')
            .lte('next_retry_at', now)
            .order('next_retry_at', { ascending: true })
            .limit(10);

        if (error) {
            console.error('[StateManager] Failed to get retry jobs:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('[StateManager] Exception getting retry jobs:', err);
        return [];
    }
}

/**
 * Update retry count
 * @param {string} jobId - Job ID
 */
export async function incrementRetryCount(jobId) {
    try {
        await supabase.rpc('increment_retry_count', { p_job_id: jobId });
    } catch (err) {
        // Fallback: manual increment
        const { data } = await supabase
            .from('execution_state')
            .select('retry_count')
            .eq('job_id', jobId)
            .single();

        if (data) {
            await supabase
                .from('execution_state')
                .update({ retry_count: (data.retry_count || 0) + 1 })
                .eq('job_id', jobId);
        }
    }
}
