// RenderFlow API Client - STRICT, NO ABSTRACTION
// All responses returned raw. No normalization. No retries.

const getBaseUrl = () => {
    // Use relative paths in production, localhost in development
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
        return '/api/render';
    }
    return 'http://localhost:3001/render';
};

export type RenderFlowJobState =
    | 'queued'
    | 'preparing'
    | 'downloading'
    | 'processing'
    | 'encoding'
    | 'muxing'
    | 'finalizing'
    | 'done'
    | 'failed';

export interface RenderFlowJob {
    id: string;
    variation_id: string;
    project_id: string;
    state: RenderFlowJobState;
    progress_pct: number;
    created_at: string;
    completed_at?: string;
    output?: {
        output_url: string;
        file_size: number;
        duration_ms: number;
    };
    error?: {
        code: string;
        message: string;
    };
}

export interface UploadResponse {
    url: string;
    size: number;
}

export interface SubmitJobResponse {
    ids: string[];
}

export interface HistoryResponse {
    jobs: RenderFlowJob[];
}

export interface HealthResponse {
    ok: boolean;
    ffmpeg: 'ready' | 'unavailable';
    error?: string;
}

// RAW FETCH - No wrappers, no helpers, explicit error handling
export const RenderFlowApi = {

    // Health Check - GET /render/health
    checkHealth: async (): Promise<HealthResponse> => {
        const res = await fetch(`${getBaseUrl()}/health`);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Health check failed: ${res.status} - ${text}`);
        }
        return res.json();
    },

    // Upload File - POST /render/upload (FormData, no chunking, no retry)
    uploadAsset: async (file: File): Promise<UploadResponse> => {
        const fd = new FormData();
        fd.append('file', file);

        const res = await fetch(`${getBaseUrl()}/upload`, {
            method: 'POST',
            body: fd
        });

        // Handle specific errors explicitly
        if (res.status === 413) {
            throw new Error('413 Request Entity Too Large: File exceeds maximum size (500MB)');
        }
        if (res.status === 415) {
            throw new Error('415 Unsupported Media Type: Only video files allowed');
        }
        if (!res.ok) {
            const text = await res.text();
            let errorMsg: string;
            try {
                const json = JSON.parse(text);
                errorMsg = json.error || json.message || text;
            } catch {
                errorMsg = text || `Upload failed: ${res.status}`;
            }
            throw new Error(errorMsg);
        }

        return res.json();
    },

    // Submit Job - POST /render/jobs
    submitJob: async (projectId: string, sourceUrl: string, variations: number): Promise<SubmitJobResponse> => {
        if (!sourceUrl) throw new Error('Source URL required');
        if (variations < 1) throw new Error('Variations must be >= 1');

        const variationList = Array(variations).fill(0).map((_, i) => ({
            id: `var_${Date.now()}_${i}`,
            data: { source_url: sourceUrl }
        }));

        const res = await fetch(`${getBaseUrl()}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                variations: variationList
            })
        });

        if (!res.ok) {
            const text = await res.text();
            let errorMsg: string;
            try {
                const json = JSON.parse(text);
                errorMsg = json.error || json.message || text;
            } catch {
                errorMsg = text || `Submission failed: ${res.status}`;
            }
            throw new Error(errorMsg);
        }

        return res.json();
    },

    // Poll Job Status - GET /render/jobs/:id
    getJobStatus: async (jobId: string): Promise<RenderFlowJob> => {
        const res = await fetch(`${getBaseUrl()}/jobs/${jobId}`);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Poll failed: ${res.status} - ${text}`);
        }
        return res.json();
    },

    // List Jobs - GET /render/jobs
    getHistory: async (): Promise<HistoryResponse> => {
        const res = await fetch(`${getBaseUrl()}/jobs?limit=20`);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Failed to fetch history: ${res.status} - ${text}`);
        }
        return res.json();
    }
};
