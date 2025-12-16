export type JobState =
    | 'queued'
    | 'preparing'
    | 'downloading'
    | 'processing'
    | 'encoding'
    | 'muxing'
    | 'finalizing'
    | 'done'
    | 'failed';

export interface JobInput {
    project_id: string;
    variation_id: string;
    // Flexible payload but usually contains:
    source_url?: string;
    output_format?: {
        width?: number;
        height?: number;
    };
    trim?: {
        start?: number;
        end?: number;
    };
    // Allow any other engine-specific data
    [key: string]: any;
}

export interface JobResult {
    output_url?: string;
    output_path?: string;
    file_size?: number;
    duration_ms?: number;
}

export interface JobError {
    code: string;
    message: string;
    details?: any;
}

export interface Job {
    id: string;
    variation_id: string; // Internal: 1 job = 1 variation
    project_id: string;
    state: JobState;

    // Timestamps (ISO string)
    created_at: string;
    started_at?: string;
    completed_at?: string;

    // Data
    input: JobInput;
    output?: JobResult;
    error?: JobError;

    // Execution Info
    worker_pid?: number;
    progress_pct: number; // 0-100

    // Internal
    logs_path?: string;
}

export const ERROR_CODES = {
    VALIDATION: 'ERR_JOB_VALIDATION',
    DOWNLOAD: 'ERR_ASSET_DOWNLOAD',
    FFMPEG_SPAWN: 'ERR_FFMPEG_SPAWN',
    FFMPEG_EXEC: 'ERR_FFMPEG_EXEC',
    FFMPEG_STALLED: 'ERR_FFMPEG_STALLED',
    UPLOAD: 'ERR_UPLOAD',
    TIMEOUT: 'ERR_TIMEOUT',
    SYSTEM: 'ERR_SYSTEM_CRASH_RECOVERY'
} as const;
