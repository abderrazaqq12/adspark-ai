import { RenderFlowDB } from './db';
import { Job, JobInput } from './types';
import { generateId } from './utils';

// The Manager is the Public Interface for the API and the Guardian of State
export const JobManager = {

    createJob: (input: JobInput): Job => {
        const job: Job = {
            id: generateId(),
            variation_id: input.variation_id || generateId('var'),
            project_id: input.project_id,
            state: 'queued',
            created_at: new Date().toISOString(),
            input,
            progress_pct: 0
        };

        RenderFlowDB.insertJob(job);
        return job;
    },

    getJob: (id: string): Job | undefined => {
        return RenderFlowDB.getJob(id);
    },

    // Used by API for polling
    getJobStatus: (id: string) => {
        const job = RenderFlowDB.getJob(id);
        if (!job) return null;
        return {
            id: job.id,
            state: job.state,
            progress: job.progress_pct, // Simple integer % as requested
            error: job.error,
            output: job.output
        };
    }
};
