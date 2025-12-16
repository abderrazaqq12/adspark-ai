import { RenderFlowJobState } from './api';

export const JOB_STATE_LABELS: Record<RenderFlowJobState, string> = {
    queued: 'Queued',
    preparing: 'Initializing',
    downloading: 'Downloading Assets',
    processing: 'Preparing Scene',
    encoding: 'Rendering',
    muxing: 'Finalizing',
    finalizing: 'Uploading',
    done: 'Completed',
    failed: 'Failed'
};

export const JOB_STATE_COLORS: Record<RenderFlowJobState, string> = {
    queued: 'bg-gray-500',
    preparing: 'bg-blue-500',
    downloading: 'bg-blue-600',
    processing: 'bg-blue-700',
    encoding: 'bg-purple-600 animate-pulse',
    muxing: 'bg-purple-700',
    finalizing: 'bg-purple-800',
    done: 'bg-green-500',
    failed: 'bg-red-500'
};
