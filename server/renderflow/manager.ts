import { RenderFlowDB } from './db';
import { Job, JobInput } from './types';
import { generateId } from './utils';

export const JobManager = {
    createJob: (input: JobInput): Job => {
        try {
            console.log('[JobManager] Creating job for project:', input.project_id);

            // Ensure inputs are valid strings
            const pid = input.project_id || 'anonymous';
            const vid = input.variation_id || generateId('var');
            const newId = generateId('job');

            const job: Job = {
                id: newId,
                variation_id: vid,
                project_id: pid,
                state: 'queued',
                created_at: new Date().toISOString(),
                input: input, // DB will stringify this
                progress_pct: 0
            };

            // FAIL-FAST: Strict Insert
            try {
                RenderFlowDB.insertJob(job);
            } catch (dbErr) {
                console.error('[JobManager] FATAL: DB Insert Failed', dbErr);
                throw new Error('FATAL_DB_INSERT_FAILED');
            }

            // INVARIANT: Verify Existence
            const verification = RenderFlowDB.getJob(newId);
            if (!verification) {
                console.error('[JobManager] FATAL: Job not found after insert', newId);
                throw new Error('FATAL_INVARIANT_VIOLATION: Job lost immediately after insert');
            }

            return job;
        } catch (err) {
            console.error('[JobManager] Create Job Aborted:', err);
            throw err;
        }
    },

    getJob: (id: string): Job | undefined => {
        return RenderFlowDB.getJob(id);
    },

    getJobStatus: (id: string) => {
        const job = RenderFlowDB.getJob(id);
        if (!job) return null;
        return {
            id: job.id,
            state: job.state,
            progress: job.progress_pct,
            error: job.error,
            output: job.output
        };
    }
};
