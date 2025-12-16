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
    // Submit Job via Backend Adapter
    submitJob: async (projectId: string, sourceUrl: string, variations: number) => {
        // Correct Payload for new Adapter (variations list)
        const variationList = Array(variations).fill(0).map((_, i) => ({
            id: `var_ui_${Date.now()}_${i}`,
            data: {
                source_url: sourceUrl,
                trim: null
            }
        }));

        const res = await fetch('/api/render/renderflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                variations: variationList
            })
        });

        if (!res.ok) throw new Error(`Submission failed: ${res.statusText}`);
        return res.json();
    },

    // Upload Asset (Strict Pipeline)
    uploadAsset: async (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/render/renderflow/upload', {
            method: 'POST',
            body: fd
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        return res.json();
    },

    // Poll Job Status
    getJobStatus: async (jobId: string): Promise<RenderFlowJob> => {
        const res = await fetch(`/api/render/renderflow/jobs/${jobId}`);
        if (!res.ok) throw new Error(`Poll failed: ${res.statusText}`);
        return res.json();
    }
};
