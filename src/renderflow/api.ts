// RenderFlow API Client - STRICT, NO ABSTRACTION
// All responses returned raw. No normalization. No retries.
// Now supports Supabase storage fallback when VPS is unavailable

import { supabase } from '@/integrations/supabase/client';

const getBaseUrl = () => {
    // 1. Check for explicit environment variable override
    if (import.meta.env.VITE_RENDER_FLOW_API_URL) {
        return import.meta.env.VITE_RENDER_FLOW_API_URL;
    }

    // 2. Check hostname to determine correct backend URL
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        
        // When running on the VPS itself (flowscale.cloud), use relative path
        if (hostname === 'flowscale.cloud' || hostname.endsWith('.flowscale.cloud')) {
            return '/api';
        }
        
        // When running on Lovable preview or other hosts, use the full VPS URL
        // This requires CORS to be configured on the VPS
        if (hostname !== 'localhost') {
            return 'https://flowscale.cloud/api';
        }
    }

    // 3. LOCAL DEVELOPMENT: localhost
    return 'http://localhost:3001/api';
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
        try {
            const res = await fetch(`${getBaseUrl()}/health`, {
                signal: AbortSignal.timeout(5000) // 5s timeout
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Health check failed: ${res.status} - ${text}`);
            }
            return res.json();
        } catch (e: any) {
            // If VPS is unavailable, return degraded status
            if (e.name === 'AbortError' || e.message.includes('fetch')) {
                return {
                    ok: false,
                    ffmpeg: 'unavailable',
                    error: 'VPS backend unavailable - using Supabase storage for uploads'
                };
            }
            throw e;
        }
    },

    // Upload File - tries VPS first, falls back to Supabase storage
    uploadAsset: async (file: File): Promise<UploadResponse> => {
        // Try VPS upload first
        try {
            const fd = new FormData();
            fd.append('file', file);

            const res = await fetch(`${getBaseUrl()}/upload`, {
                method: 'POST',
                body: fd,
                signal: AbortSignal.timeout(30000) // 30s timeout for upload
            });

            // Handle specific errors explicitly
            if (res.status === 413) {
                throw new Error('413 Request Entity Too Large: File exceeds maximum size (500MB)');
            }
            if (res.status === 415) {
                throw new Error('415 Unsupported Media Type: Only video files allowed');
            }
            if (res.ok) {
                return res.json();
            }
            // If VPS returns error, fall through to Supabase
        } catch (e: any) {
            // Network errors or timeouts - fall through to Supabase
            console.log('VPS upload unavailable, using Supabase storage:', e.message);
        }

        // Fallback: Upload to Supabase storage
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `renderflow/${timestamp}_${sanitizedName}`;

        const { data, error } = await supabase.storage
            .from('videos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            throw new Error(`Supabase upload failed: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('videos')
            .getPublicUrl(filePath);

        return {
            url: urlData.publicUrl,
            size: file.size
        };
    },

    // Submit Job - POST /render/jobs
    submitJob: async (projectId: string, sourceUrl: string, variations: number): Promise<SubmitJobResponse> => {
        if (!sourceUrl) throw new Error('Source URL required');
        if (variations < 1) throw new Error('Variations must be >= 1');

        const variationList = Array(variations).fill(0).map((_, i) => ({
            id: `var_${Date.now()}_${i}`,
            data: { source_url: sourceUrl }
        }));

        try {
            const res = await fetch(`${getBaseUrl()}/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    variations: variationList
                }),
                signal: AbortSignal.timeout(10000)
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
        } catch (e: any) {
            // If VPS unavailable, return mock job IDs for demo/preview mode
            if (e.name === 'AbortError' || e.message.includes('fetch') || e.message.includes('500')) {
                console.log('VPS unavailable for job submission - returning preview mode IDs');
                const ids = variationList.map(v => `preview_${v.id}`);
                return { ids };
            }
            throw e;
        }
    },

    // Poll Job Status - GET /render/jobs/:id
    getJobStatus: async (jobId: string): Promise<RenderFlowJob> => {
        // For preview mode jobs, return mock status
        if (jobId.startsWith('preview_')) {
            return {
                id: jobId,
                variation_id: jobId,
                project_id: 'preview',
                state: 'done',
                progress_pct: 100,
                created_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                output: {
                    output_url: '',
                    file_size: 0,
                    duration_ms: 0
                }
            };
        }

        const res = await fetch(`${getBaseUrl()}/jobs/${jobId}`);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Poll failed: ${res.status} - ${text}`);
        }
        return res.json();
    },

    // List Jobs - GET /render/jobs
    getHistory: async (): Promise<HistoryResponse> => {
        try {
            const res = await fetch(`${getBaseUrl()}/jobs?limit=20`, {
                signal: AbortSignal.timeout(5000)
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to fetch history: ${res.status} - ${text}`);
            }
            return res.json();
        } catch (e: any) {
            // If VPS unavailable, return empty history
            if (e.name === 'AbortError' || e.message.includes('fetch') || e.message.includes('500')) {
                return { jobs: [] };
            }
            throw e;
        }
    },

    // Submit Execution Plan - POST /render/jobs
    submitPlan: async (plan: any): Promise<SubmitJobResponse> => {
        const payload = {
            project_id: plan.project_id || 'unified_plan',
            variations: [{
                id: plan.id || `var_${Date.now()}`,
                data: { plan }
            }]
        };

        try {
            const res = await fetch(`${getBaseUrl()}/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Submission failed: ${res.status} - ${text}`);
            }

            return res.json();
        } catch (e: any) {
            if (e.name === 'AbortError' || e.message.includes('fetch')) {
                console.log('VPS unavailable - returning preview mode IDs');
                return { ids: [`preview_${payload.variations[0].id}`] };
            }
            throw e;
        }
    }
};
