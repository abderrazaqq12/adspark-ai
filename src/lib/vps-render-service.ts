/**
 * VPS Render Gateway Client
 * Server-only FFmpeg rendering with job queue support
 * 
 * Uses types from @/lib/contracts/renderGateway
 * All API calls return JSON only (never HTML)
 */

import {
  type HealthResponse,
  type UploadResponse,
  type ExecuteRequest,
  type ExecuteResponse,
  type JobStatusResponse,
  parseApiResponse,
  RenderGatewayError,
} from '@/lib/contracts/renderGateway';

// ============================================
// API BASE URL
// ============================================

/**
 * Get the API base URL for VPS calls.
 * In production (same origin), this returns empty string for relative paths.
 * For development/testing with external VPS, check localStorage or env vars.
 */
function getApiBaseUrl(): string {
  // In production on same origin, always use relative paths
  if (typeof window !== 'undefined' && window.location.hostname === 'flowscale.cloud') {
    return ''; // Always relative paths on production domain
  }

  // DEVELOPMENT SECURITY: Force relative path to use Vite Proxy
  // This prevents accidentally connecting to external APIs or stale localStorage values
  if (import.meta.env.DEV) {
    console.log('[VPS] Dev mode detected: forcing Vite proxy for /api');
    return '';
  }

  // Check localStorage for custom URL (dev/testing bypass ONLY if explicitly needed)
  // Commented out to enforce hard isolation for now
  /*
  const stored = localStorage.getItem('vps_api_url');
  if (stored && stored.trim()) return stored.trim();
  */

  // Check environment variables
  if (import.meta.env.VITE_VPS_API_URL) return import.meta.env.VITE_VPS_API_URL;
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;

  // Default to relative paths (same origin)
  return '';
}

// ============================================
// LEGACY TYPES (for backward compatibility)
// ============================================

export interface UploadResult {
  ok: boolean;
  path: string;
  filename: string;
  size: number;
  mimetype: string;
  error?: string;
}

export interface ExecuteOptions {
  trim?: { start: number; end: number };
  speed?: number;
  resize?: { width: number; height: number };
  outputName?: string;
}

export interface QueuedJob {
  ok: boolean;
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'error';
  queuePosition?: number;
  statusUrl: string;
}

export interface JobStatus {
  ok: boolean;
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  output?: {
    outputPath: string;
    outputUrl: string;
    size: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface ExecuteResult {
  success: boolean;
  jobId: string;
  outputUrl: string;
  size: number;
  processingTimeMs: number;
  error?: string;
}

export interface RenderProgress {
  stage: 'uploading' | 'queued' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
  jobId?: string;
}

export type ProgressCallback = (progress: RenderProgress) => void;

// ============================================
// HEALTH CHECK
// ============================================

export interface VPSHealthStatus {
  ok: boolean;
  ffmpeg: 'ready' | 'unavailable';
  ffmpegPath?: string;
  ffmpegVersion?: string;
  mode: string;
  queueLength: number;
  error?: string;
}

export async function checkServerHealth(): Promise<VPSHealthStatus> {
  const apiBase = getApiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    // Check for HTML response (nginx error page)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        ffmpeg: 'unavailable',
        mode: 'unknown',
        queueLength: 0,
        error: 'API routing misconfigured. Check Nginx /api proxy. Received non-JSON response.',
      };
    }

    const data = await response.json() as HealthResponse;

    return {
      ok: data.ok === true,
      ffmpeg: data.ffmpeg?.available ? 'ready' : 'unavailable',
      ffmpegPath: data.ffmpeg?.path || undefined,
      ffmpegVersion: data.ffmpeg?.version || undefined,
      mode: 'server-only',
      queueLength: data.queueLength || 0,
      error: data.error,
    };
  } catch (error) {
    return {
      ok: false,
      ffmpeg: 'unavailable',
      mode: 'unknown',
      queueLength: 0,
      error: error instanceof Error ? error.message : 'Health check failed',
    };
  }
}

// Legacy alias
export { checkServerHealth as checkVPSHealth };

// ============================================
// UPLOAD VIDEO
// ============================================

export async function uploadVideo(
  file: File,
  projectId?: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const apiBase = getApiBaseUrl();
  const formData = new FormData();
  formData.append('file', file);
  if (projectId) {
    formData.append('projectId', projectId);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      // Check for non-JSON response
      const contentType = xhr.getResponseHeader('content-type') || '';
      if (!contentType.includes('application/json')) {
        reject(new RenderGatewayError(
          'API routing misconfigured. Check Nginx /api proxy.',
          'INVALID_CONTENT_TYPE',
          { contentType, status: xhr.status }
        ));
        return;
      }

      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && result.ok) {
          resolve({
            ok: true,
            path: result.filePath,
            filename: result.filename,
            size: result.size,
            mimetype: result.mimetype,
          });
        } else {
          reject(new RenderGatewayError(
            result.error?.message || `Upload failed: ${xhr.status}`,
            result.error?.code || 'UPLOAD_ERROR'
          ));
        }
      } catch {
        reject(new RenderGatewayError(
          `Invalid JSON response from server (status ${xhr.status})`,
          'INVALID_JSON'
        ));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new RenderGatewayError('Network error during upload', 'NETWORK_ERROR'));
    });

    xhr.addEventListener('abort', () => {
      reject(new RenderGatewayError('Upload cancelled', 'UPLOAD_CANCELLED'));
    });

    xhr.open('POST', `${apiBase}/api/upload`);
    xhr.send(formData);
  });
}

// ============================================
// QUEUE FFMPEG JOB
// ============================================

export async function queueFFmpegJob(
  sourcePath: string,
  options: ExecuteOptions = {}
): Promise<QueuedJob> {
  const apiBase = getApiBaseUrl();

  const response = await fetch(`${apiBase}/api/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ sourcePath, ...options }),
  });

  const data = await parseApiResponse<ExecuteResponse>(response);

  return {
    ok: true,
    jobId: data.jobId,
    status: 'queued',
    queuePosition: data.queuePosition,
    statusUrl: data.statusUrl,
  };
}

// ============================================
// QUEUE PLAN JOB
// ============================================

export async function queuePlanJob(
  sourceVideoPath: string,
  plan: Record<string, unknown>,
  outputName?: string
): Promise<QueuedJob> {
  const apiBase = getApiBaseUrl();

  const response = await fetch(`${apiBase}/api/execute-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ sourceVideoUrl: sourceVideoPath, plan, outputName }),
  });

  const data = await parseApiResponse<ExecuteResponse>(response);

  return {
    ok: true,
    jobId: data.jobId,
    status: 'queued',
    queuePosition: data.queuePosition,
    statusUrl: data.statusUrl,
  };
}

// ============================================
// GET JOB STATUS
// ============================================

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const apiBase = getApiBaseUrl();

  const response = await fetch(`${apiBase}/api/jobs/${jobId}`, {
    headers: { 'Accept': 'application/json' },
  });

  const data = await parseApiResponse<JobStatusResponse>(response);

  // Map to legacy format
  const status: JobStatus = {
    ok: true,
    jobId: data.jobId,
    status: data.status,
    progress: data.progressPct,
  };

  if (data.status === 'done' && data.outputUrl) {
    status.output = {
      outputPath: data.outputUrl,
      outputUrl: data.outputUrl,
      size: data.outputSize || 0,
    };
  }

  if (data.error) {
    status.error = data.error;
  }

  return status;
}

// ============================================
// WAIT FOR JOB COMPLETION
// ============================================

export async function waitForJob(
  jobId: string,
  onProgress?: ProgressCallback,
  pollInterval = 1000,
  maxWait = 600000 // 10 minutes
): Promise<JobStatus> {
  const startTime = Date.now();

  while (true) {
    const status = await getJobStatus(jobId);

    if (status.status === 'done') {
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Rendering complete!',
        jobId,
      });
      return status;
    }

    if (status.status === 'error') {
      const errorMsg = status.error?.message || 'Job failed';
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: errorMsg,
        jobId,
      });
      throw new RenderGatewayError(errorMsg, status.error?.code || 'JOB_FAILED');
    }

    // Update progress
    onProgress?.({
      stage: status.status === 'running' ? 'processing' : 'queued',
      progress: status.progress || (status.status === 'queued' ? 10 : 50),
      message: status.status === 'queued'
        ? 'Waiting in queue...'
        : 'Processing with FFmpeg...',
      jobId,
    });

    // Check timeout
    if (Date.now() - startTime > maxWait) {
      throw new RenderGatewayError('Job timeout exceeded', 'TIMEOUT');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
}

// ============================================
// UPLOAD + EXECUTE (Full Flow)
// ============================================

export async function uploadAndRender(
  file: File,
  options: ExecuteOptions = {},
  onProgress?: ProgressCallback
): Promise<ExecuteResult> {
  const startTime = Date.now();

  // Stage 1: Upload
  onProgress?.({
    stage: 'uploading',
    progress: 0,
    message: 'Uploading video to server...',
  });

  let uploadResult: UploadResult;
  try {
    uploadResult = await uploadVideo(file, undefined, (percent) => {
      onProgress?.({
        stage: 'uploading',
        progress: percent * 0.3, // Upload is 30% of total
        message: `Uploading: ${percent}%`,
      });
    });
  } catch (error) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Upload failed',
    });
    throw error;
  }

  if (!uploadResult.ok || !uploadResult.path) {
    const error = new RenderGatewayError(uploadResult.error || 'Upload failed', 'UPLOAD_FAILED');
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: error.message,
    });
    throw error;
  }

  // Stage 2: Queue job
  onProgress?.({
    stage: 'queued',
    progress: 30,
    message: 'Queueing render job...',
  });

  const queueResult = await queueFFmpegJob(uploadResult.path, options);

  // Stage 3: Wait for completion
  const finalStatus = await waitForJob(queueResult.jobId, (progress) => {
    // Remap progress to 30-100 range
    const mappedProgress = 30 + (progress.progress * 0.7);
    onProgress?.({
      ...progress,
      progress: mappedProgress,
    });
  });

  return {
    success: true,
    jobId: queueResult.jobId,
    outputUrl: finalStatus.output?.outputUrl || '',
    size: finalStatus.output?.size || 0,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================
// UPLOAD + EXECUTE PLAN (Full Flow)
// ============================================

export async function uploadAndExecutePlan(
  file: File,
  plan: Record<string, unknown>,
  outputName?: string,
  onProgress?: ProgressCallback
): Promise<ExecuteResult> {
  const startTime = Date.now();

  // Stage 1: Upload
  onProgress?.({
    stage: 'uploading',
    progress: 0,
    message: 'Uploading video to server...',
  });

  let uploadResult: UploadResult;
  try {
    uploadResult = await uploadVideo(file, undefined, (percent) => {
      onProgress?.({
        stage: 'uploading',
        progress: percent * 0.3,
        message: `Uploading: ${percent}%`,
      });
    });
  } catch (error) {
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: error instanceof Error ? error.message : 'Upload failed',
    });
    throw error;
  }

  if (!uploadResult.ok || !uploadResult.path) {
    throw new RenderGatewayError(uploadResult.error || 'Upload failed', 'UPLOAD_FAILED');
  }

  // Stage 2: Queue plan job
  onProgress?.({
    stage: 'queued',
    progress: 30,
    message: 'Queueing render plan...',
  });

  const queueResult = await queuePlanJob(uploadResult.path, plan, outputName);

  // Stage 3: Wait for completion
  const finalStatus = await waitForJob(queueResult.jobId, (progress) => {
    const mappedProgress = 30 + (progress.progress * 0.7);
    onProgress?.({
      ...progress,
      progress: mappedProgress,
    });
  });

  return {
    success: true,
    jobId: queueResult.jobId,
    outputUrl: finalStatus.output?.outputUrl || '',
    size: finalStatus.output?.size || 0,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

export async function executeFFmpeg(
  sourcePath: string,
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const queueResult = await queueFFmpegJob(sourcePath, options);
  const finalStatus = await waitForJob(queueResult.jobId);

  return {
    success: true,
    jobId: queueResult.jobId,
    outputUrl: finalStatus.output?.outputUrl || '',
    size: finalStatus.output?.size || 0,
    processingTimeMs: 0,
  };
}

export async function executePlan(
  sourceVideoPath: string,
  plan: Record<string, unknown>,
  outputName?: string
): Promise<ExecuteResult> {
  const queueResult = await queuePlanJob(sourceVideoPath, plan, outputName);
  const finalStatus = await waitForJob(queueResult.jobId);

  return {
    success: true,
    jobId: queueResult.jobId,
    outputUrl: finalStatus.output?.outputUrl || '',
    size: finalStatus.output?.size || 0,
    processingTimeMs: 0,
  };
}
