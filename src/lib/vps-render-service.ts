/**
 * VPS Video Rendering Service
 * Handles upload → execute chain for server-side FFmpeg rendering
 * 
 * Flow:
 * 1. Upload video to /api/upload → get server path
 * 2. Call /api/execute with path → get rendered output
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

export interface ExecuteResult {
  success: boolean;
  jobId: string;
  outputUrl: string;
  size: number;
  processingTimeMs: number;
  error?: string;
}

export interface RenderProgress {
  stage: 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

export type ProgressCallback = (progress: RenderProgress) => void;

// ============================================
// API BASE URL
// ============================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
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
// EXECUTE FFMPEG
// ============================================

export async function executeFFmpeg(
  sourcePath: string,
  options: ExecuteOptions = {}
): Promise<ExecuteResult> {
  const response = await fetch(`${API_BASE}/api/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourcePath,
      ...options,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'FFmpeg execution failed');
  }

  return result;
}

// ============================================
// EXECUTE PLAN (Full ExecutionPlan)
// ============================================

export async function executePlan(
  sourceVideoPath: string,
  plan: Record<string, unknown>,
  outputName?: string
): Promise<ExecuteResult> {
  const response = await fetch(`${API_BASE}/api/execute-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sourceVideoUrl: sourceVideoPath,
      plan,
      outputName,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || 'Plan execution failed');
  }

  return result;
}

// ============================================
// UPLOAD + EXECUTE CHAIN
// ============================================

export async function uploadAndRender(
  file: File,
  options: ExecuteOptions = {},
  onProgress?: ProgressCallback
): Promise<ExecuteResult> {
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
        progress: percent * 0.5, // Upload is 50% of total
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

  // Stage 2: Execute FFmpeg
  onProgress?.({
    stage: 'processing',
    progress: 50,
    message: 'Processing video with FFmpeg...',
  });

  try {
    const result = await executeFFmpeg(uploadResult.path, options);
    
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Rendering complete!',
    });

    return result;
  } catch (error) {
    onProgress?.({
      stage: 'error',
      progress: 50,
      message: error instanceof Error ? error.message : 'Rendering failed',
    });
    throw error;
  }
}

// ============================================
// UPLOAD + EXECUTE PLAN CHAIN
// ============================================

export async function uploadAndExecutePlan(
  file: File,
  plan: Record<string, unknown>,
  outputName?: string,
  onProgress?: ProgressCallback
): Promise<ExecuteResult> {
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
        progress: percent * 0.5,
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

  // Stage 2: Execute Plan
  onProgress?.({
    stage: 'processing',
    progress: 50,
    message: 'Executing render plan...',
  });

  try {
    const result = await executePlan(uploadResult.path, plan, outputName);
    
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Rendering complete!',
    });

    return result;
  } catch (error) {
    onProgress?.({
      stage: 'error',
      progress: 50,
      message: error instanceof Error ? error.message : 'Rendering failed',
    });
    throw error;
  }
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkServerHealth(): Promise<{
  healthy: boolean;
  ffmpeg: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const result = await response.json();
    
    return {
      healthy: result.status === 'healthy',
      ffmpeg: result.ffmpeg || 'unknown',
    };
  } catch (error) {
    return {
      healthy: false,
      ffmpeg: 'unavailable',
      error: error instanceof Error ? error.message : 'Health check failed',
    };
  }
}
