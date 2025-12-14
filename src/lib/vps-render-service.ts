/**
 * VPS Video Rendering Service
 * Server-only FFmpeg rendering with job queue support
 * 
 * Flow:
 * 1. Upload video to /api/upload → get server path
 * 2. Call /api/execute → get jobId (queued)
 * 3. Poll /api/job/:jobId → get result when complete
 */

// ============================================
// TYPES
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
  status: 'queued' | 'processing' | 'completed' | 'failed';
  queuePosition?: number;
  statusUrl: string;
}

export interface JobStatus {
  ok: boolean;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
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
// API BASE URL
// ============================================

const API_BASE = import.meta.env.VITE_VPS_API_URL || import.meta.env.VITE_API_BASE_URL || '';

// ============================================
// UPLOAD VIDEO
// ============================================

export async function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('video', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(result);
        } else {
          reject(new Error(result.error || `Upload failed: ${xhr.status}`));
        }
      } catch {
        reject(new Error(`Invalid response from server (status ${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('POST', `${API_BASE}/api/upload`);
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
  const response = await fetch(`${API_BASE}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourcePath, ...options }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Queue failed: ${response.status}`);
  }

  return result;
}

// ============================================
// QUEUE PLAN JOB
// ============================================

export async function queuePlanJob(
  sourceVideoPath: string,
  plan: Record<string, unknown>,
  outputName?: string
): Promise<QueuedJob> {
  const response = await fetch(`${API_BASE}/api/execute-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceVideoUrl: sourceVideoPath, plan, outputName }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Queue failed: ${response.status}`);
  }

  return result;
}

// ============================================
// POLL JOB STATUS
// ============================================

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const response = await fetch(`${API_BASE}/api/job/${jobId}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || `Status check failed: ${response.status}`);
  }

  return result;
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

    if (status.status === 'completed') {
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Rendering complete!',
        jobId,
      });
      return status;
    }

    if (status.status === 'failed') {
      const errorMsg = status.error?.message || 'Job failed';
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: errorMsg,
        jobId,
      });
      throw new Error(errorMsg);
    }

    // Update progress
    onProgress?.({
      stage: status.status === 'processing' ? 'processing' : 'queued',
      progress: status.progress || (status.status === 'queued' ? 10 : 50),
      message: status.status === 'queued' 
        ? 'Waiting in queue...' 
        : 'Processing with FFmpeg...',
      jobId,
    });

    // Check timeout
    if (Date.now() - startTime > maxWait) {
      throw new Error('Job timeout exceeded');
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
    uploadResult = await uploadVideo(file, (percent) => {
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
    const error = new Error(uploadResult.error || 'Upload failed');
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
    uploadResult = await uploadVideo(file, (percent) => {
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
    throw new Error(uploadResult.error || 'Upload failed');
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
// LEGACY COMPATIBILITY (Synchronous-style API)
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
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    
    // Check for HTML response (nginx error page)
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      return {
        ok: false,
        ffmpeg: 'unavailable',
        mode: 'unknown',
        queueLength: 0,
        error: 'Server returned non-JSON response (check nginx config)',
      };
    }

    const result = await response.json();
    
    return {
      ok: result.ok === true,
      ffmpeg: result.ffmpeg === 'ready' ? 'ready' : 'unavailable',
      ffmpegPath: result.ffmpegPath,
      ffmpegVersion: result.ffmpegVersion,
      mode: result.mode || 'server-only',
      queueLength: result.queueLength || 0,
      error: result.error,
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

// Legacy alias for backward compatibility
export { checkServerHealth as checkVPSHealth };
