// Independent RenderFlow API Client
const RENDERFLOW_BASE_URL = 'http://localhost:3001/render'; // Env var in real app

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

export const RenderFlowApi = {

    // Global Health Check
    checkHealth: async (): Promise<boolean> => {
        try {
            const res = await fetch(`${RENDERFLOW_BASE_URL}/health`);
            return res.ok;
        } catch (e) {
            return false;
        }
    },

    // Strict Upload (FormData)
    uploadAsset: async (file: File): Promise<{ url: string, size: number }> => {
        const fd = new FormData();
        fd.append('file', file);

        const res = await fetch(`${RENDERFLOW_BASE_URL}/upload`, {
            method: 'POST',
            body: fd
        });

        if (!res.ok) {
            // Handle 413 or other errors explicitly
            if (res.status === 413) throw new Error('File too large (Max 500MB)');
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Upload failed');
        }

        return res.json();
    },

    // Submit Job
    submitJob: async (projectId: string, sourceUrl: string, variations: number): Promise<{ ids: string[] }> => {
        // Strict Validation
        if (!sourceUrl) throw new Error('Source URL required');
        if (variations < 1) throw new Error('Variations must be >= 1');

        const variationList = Array(variations).fill(0).map((_, i) => ({
            id: `var_ui_${Date.now()}_${i}`,
            data: {
                source_url: sourceUrl
            }
        }));

        const res = await fetch(`${RENDERFLOW_BASE_URL}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project_id: projectId,
                variations: variationList
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Submission failed');
        }

        return res.json();
    },

    // Poll Job Status
    getJobStatus: async (jobId: string): Promise<RenderFlowJob> => {
        const res = await fetch(`${RENDERFLOW_BASE_URL}/jobs/${jobId}`);
        if (!res.ok) throw new Error(`Poll failed: ${res.statusText}`);
        return res.json();
    },

    // History
    getHistory: async (): Promise<{ jobs: RenderFlowJob[] }> => {
        const res = await fetch(`${RENDERFLOW_BASE_URL}/jobs?limit=20`);
        if (!res.ok) throw new Error('Failed to fetch history');
        return res.json();
    }
};
