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

            const job: Job = {
                id: generateId('job'),
                variation_id: vid,
                project_id: pid,
                state: 'queued',
                created_at: new Date().toISOString(),
                input: input, // DB will stringify this
                progress_pct: 0
            };

            RenderFlowDB.insertJob(job);
            return job;
        } catch (err) {
            console.error('[JobManager] Create Failed:', err);
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
