/**
 * VPS Render Gateway API Contract
 * Shared TypeScript types for frontend/backend communication
 * 
 * All endpoints return JSON only. Never HTML.
 * Use these types for type-safe API calls.
 */

// ============================================
// ERROR STRUCTURE (All endpoints)
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  ok: false;
  error: ApiError;
}

// ============================================
// GET /api/health
// ============================================

export interface HealthResponse {
  ok: boolean;
  ffmpeg: {
    available: boolean;
    path: string | null;
    version: string | null;
  };
  outputsDir: string;
  uploadsDir: string;
  queueLength: number;
  currentJob: string | null;
  uptime: number;
  time: string;
  error?: string;
}

// ============================================
// POST /api/upload
// ============================================

export interface UploadResponse {
  ok: true;
  fileId: string;
  filePath: string;
  publicUrl: string;
  filename: string;
  size: number;
  mimetype: string;
}

// ============================================
// POST /api/execute
// ============================================

export interface ExecuteRequest {
  sourcePath: string;
  projectId?: string;
  outputName?: string;
  // Video processing options
  trim?: {
    start: number; // seconds
    end: number;   // seconds
  };
  speed?: number; // 0.5 = half speed, 2.0 = double speed
  resize?: {
    width: number;
    height: number;
  };
  filters?: string[]; // FFmpeg filter expressions
  // Audio options
  audio?: {
    volume?: number; // 0-2, 1.0 = normal
    fadeIn?: number; // seconds
    fadeOut?: number; // seconds
    mute?: boolean;
  };
  // Output options
  format?: 'mp4' | 'webm' | 'mov';
  quality?: 'low' | 'medium' | 'high' | 'lossless';
}

export interface ExecuteResponse {
  ok: true;
  jobId: string;
  status: 'queued';
  queuePosition: number;
  statusUrl: string;
  estimatedWaitMs?: number;
}

// ============================================
// POST /api/execute-plan
// ============================================

export interface TimelineSegment {
  segment_id: string;
  source_start_ms: number;
  source_end_ms: number;
  output_start_ms: number;
  output_end_ms: number;
  trim_start_ms: number;
  trim_end_ms: number;
  source_duration_ms: number;
  speed_multiplier?: number;
  filters?: string[];
}

export interface ExecutionPlanSpec {
  plan_id: string;
  source_video_id: string;
  timeline: TimelineSegment[];
  output_format: {
    width: number;
    height: number;
    fps: number;
    codec: string;
  };
  audio?: {
    preserve: boolean;
    volume?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface ExecutePlanRequest {
  sourceVideoUrl: string;
  plan: ExecutionPlanSpec;
  projectId?: string;
  outputName?: string;
}

export interface ExecutePlanResponse {
  ok: true;
  jobId: string;
  status: 'queued';
  queuePosition: number;
  statusUrl: string;
}

// ============================================
// GET /api/jobs/:id
// ============================================

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface JobStatusResponse {
  ok: true;
  jobId: string;
  status: JobStatus;
  progressPct: number;
  logsTail: string;
  // Present when status === 'done'
  outputUrl?: string;
  outputSize?: number;
  durationMs?: number;
  // Present when status === 'error'
  error?: ApiError;
  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ============================================
// UNION TYPES FOR RESPONSE HANDLING
// ============================================

export type HealthResult = HealthResponse | ApiErrorResponse;
export type UploadResult = UploadResponse | ApiErrorResponse;
export type ExecuteResult = ExecuteResponse | ApiErrorResponse;
export type ExecutePlanResult = ExecutePlanResponse | ApiErrorResponse;
export type JobResult = JobStatusResponse | ApiErrorResponse;

// ============================================
// TYPE GUARDS
// ============================================

export function isApiError(response: unknown): response is ApiErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'ok' in response &&
    (response as { ok: unknown }).ok === false
  );
}

export function isHealthResponse(response: unknown): response is HealthResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'ok' in response &&
    'ffmpeg' in response
  );
}

export function isUploadResponse(response: unknown): response is UploadResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'ok' in response &&
    (response as { ok: unknown }).ok === true &&
    'fileId' in response
  );
}

export function isJobStatusResponse(response: unknown): response is JobStatusResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'ok' in response &&
    'jobId' in response &&
    'status' in response
  );
}

// ============================================
// API CLIENT HELPER
// ============================================

export class RenderGatewayError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RenderGatewayError';
  }
}

/**
 * Parse API response, ensuring JSON and handling errors
 */
export async function parseApiResponse<T>(
  response: Response,
  expectedOk = true
): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  
  // Check for HTML response (misconfigured nginx)
  if (!contentType.includes('application/json')) {
    throw new RenderGatewayError(
      'API routing misconfigured. Check Nginx /api proxy.',
      'INVALID_CONTENT_TYPE',
      { contentType, status: response.status }
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new RenderGatewayError(
      'Invalid JSON response from server',
      'INVALID_JSON',
      { status: response.status }
    );
  }

  // Check for API error response
  if (isApiError(data)) {
    throw new RenderGatewayError(
      data.error.message,
      data.error.code,
      data.error.details
    );
  }

  // Check HTTP status if expected to succeed
  if (expectedOk && !response.ok) {
    throw new RenderGatewayError(
      `Request failed with status ${response.status}`,
      'HTTP_ERROR',
      { status: response.status }
    );
  }

  return data as T;
}
