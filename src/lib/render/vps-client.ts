/**
 * VPS RENDER CLIENT
 * 
 * SINGLE RENDER CONTRACT:
 * POST /render/jobs   - Submit job
 * GET  /render/jobs/:id - Get status
 * 
 * NO OTHER ENDPOINTS ALLOWED.
 * All rendering goes through this client.
 */

import type {
  RenderJobRequest,
  RenderJobResponse,
  RenderJobStatusResponse,
  VPSCapabilities,
  RenderEnvironmentStatus,
} from './contracts';

// ============================================
// API BASE URL (Server-side only)
// ============================================

function getApiBaseUrl(): string {
  // Production: relative paths
  if (typeof window !== 'undefined' && window.location.hostname === 'flowscale.cloud') {
    return '';
  }
  
  // Development: Vite proxy
  if (import.meta.env.DEV) {
    return '';
  }
  
  // Environment override
  if (import.meta.env.VITE_VPS_API_URL) {
    return import.meta.env.VITE_VPS_API_URL;
  }
  
  return '';
}

// ============================================
// HEALTH & CAPABILITY DETECTION
// ============================================

export async function detectVPSCapabilities(): Promise<VPSCapabilities> {
  const apiBase = getApiBaseUrl();
  const startTime = Date.now();

  try {
    const response = await fetch(`${apiBase}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return createUnavailableStatus('VPS not responding');
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return createUnavailableStatus('Invalid response from VPS');
    }

    const data = await response.json();
    
    return {
      available: data.ok === true,
      ffmpeg: {
        ready: data.ffmpeg?.available === true,
        version: data.ffmpeg?.version,
        path: data.ffmpeg?.path,
      },
      hardware: {
        cpuCores: data.hardware?.cpuCores || 1,
        ramMB: data.hardware?.ramMB || 1024,
        gpuType: data.hardware?.gpuType || 'none',
        nvencAvailable: data.hardware?.nvencAvailable || false,
        vaapiAvailable: data.hardware?.vaapiAvailable || false,
      },
      queue: {
        length: data.queueLength || 0,
        currentJob: data.currentJob || undefined,
      },
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    return createUnavailableStatus(
      error instanceof Error ? error.message : 'Connection failed'
    );
  }
}

function createUnavailableStatus(reason: string): VPSCapabilities {
  console.warn('[VPS] Unavailable:', reason);
  return {
    available: false,
    ffmpeg: { ready: false },
    hardware: {
      cpuCores: 0,
      ramMB: 0,
      nvencAvailable: false,
      vaapiAvailable: false,
    },
    queue: { length: 0 },
  };
}

// ============================================
// SINGLE RENDER CONTRACT IMPLEMENTATION
// ============================================

/**
 * Submit a render job
 * POST /render/jobs
 */
export async function submitRenderJob(
  request: RenderJobRequest
): Promise<RenderJobResponse> {
  const apiBase = getApiBaseUrl();

  const response = await fetch(`${apiBase}/render/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Submit failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get job status
 * GET /render/jobs/:id
 */
export async function getJobStatus(
  jobId: string
): Promise<RenderJobStatusResponse> {
  const apiBase = getApiBaseUrl();

  const response = await fetch(`${apiBase}/render/jobs/${jobId}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job not found');
    }
    throw new Error(`Status check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Wait for job completion with polling
 */
export async function waitForJobCompletion(
  jobId: string,
  options: {
    pollIntervalMs?: number;
    maxWaitMs?: number;
    onProgress?: (status: RenderJobStatusResponse) => void;
  } = {}
): Promise<RenderJobStatusResponse> {
  const {
    pollIntervalMs = 2000,
    maxWaitMs = 600000, // 10 minutes
    onProgress,
  } = options;

  const startTime = Date.now();

  while (true) {
    const status = await getJobStatus(jobId);
    
    onProgress?.(status);

    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Job failed');
    }

    // Check timeout
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error('Job timeout exceeded');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Upload video to VPS temp storage
 */
export async function uploadToVPS(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ path: string; url: string }> {
  const apiBase = getApiBaseUrl();
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve({ path: result.filePath, url: result.publicUrl || result.filePath });
        } catch {
          reject(new Error('Invalid upload response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${apiBase}/api/upload`);
    xhr.send(formData);
  });
}

/**
 * Full render flow: upload + submit + wait
 */
export async function renderVideo(
  file: File,
  options: Omit<RenderJobRequest, 'source_url'>,
  callbacks?: {
    onUploadProgress?: (percent: number) => void;
    onRenderProgress?: (status: RenderJobStatusResponse) => void;
  }
): Promise<RenderJobStatusResponse> {
  // 1. Upload
  const upload = await uploadToVPS(file, callbacks?.onUploadProgress);
  
  // 2. Submit job
  const job = await submitRenderJob({
    source_url: upload.url,
    ...options,
  });
  
  // 3. Wait for completion
  return waitForJobCompletion(job.id, {
    onProgress: callbacks?.onRenderProgress,
  });
}
