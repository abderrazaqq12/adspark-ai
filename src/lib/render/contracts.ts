/**
 * UNIFIED RENDER API CONTRACT
 * Single source of truth for all rendering operations
 * 
 * ARCHITECTURAL LAW: VPS-First, FFmpeg-First
 * All video rendering MUST go through this contract.
 * No duplicate endpoints. No exceptions.
 */

// ============================================
// SINGLE RENDER CONTRACT
// POST /render/jobs - Submit job
// GET  /render/jobs/:id - Get status
// ============================================

export interface RenderJobRequest {
  /** Source video URL (must be accessible from VPS) */
  source_url: string;
  /** Output format */
  output_format: 'mp4' | 'webm' | 'gif';
  /** Target resolution (WxH) */
  resolution: string;
  /** Optional webhook for async notification */
  webhook_url?: string;
  /** Metadata for tracking */
  metadata?: Record<string, unknown>;
  /** FFmpeg operations to perform */
  operations?: RenderOperation[];
}

export interface RenderOperation {
  type: 'trim' | 'concat' | 'overlay' | 'audio_mix' | 'resize' | 'speed' | 'filter';
  params: Record<string, unknown>;
}

export interface RenderJobResponse {
  id: string;
  status: RenderJobStatus;
  message: string;
}

export type RenderJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface RenderJobStatusResponse {
  id: string;
  status: RenderJobStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  output_path?: string;
  output_url?: string;
  progress?: number;
  error?: string;
}

// ============================================
// VPS HARDWARE DETECTION (Server-Side Only)
// ============================================

export interface VPSCapabilities {
  available: boolean;
  ffmpeg: {
    ready: boolean;
    version?: string;
    path?: string;
  };
  hardware: {
    cpuCores: number;
    ramMB: number;
    gpuType?: 'nvidia' | 'amd' | 'intel' | 'none';
    nvencAvailable: boolean;
    vaapiAvailable: boolean;
  };
  queue: {
    length: number;
    currentJob?: string;
  };
  latencyMs?: number;
}

export interface RenderEnvironmentStatus {
  vps: VPSCapabilities;
  recommended: 'vps' | 'fallback';
  loading: boolean;
  lastChecked?: string;
}

// ============================================
// DECISION SCORING SYSTEM
// ============================================

export interface DecisionFactors {
  cost: number;      // 0-100 (lower is better)
  quality: number;   // 0-100 (higher is better)
  latency: number;   // 0-100 (lower is better)
  platform: string;
  market: string;
  hasGPU: boolean;
}

export interface EngineDecision {
  engineId: 'ffmpeg-native' | 'ffmpeg-gpu' | 'cloud-fallback';
  score: number;
  reason: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isValidRenderRequest(req: unknown): req is RenderJobRequest {
  if (!req || typeof req !== 'object') return false;
  const r = req as Record<string, unknown>;
  return (
    typeof r.source_url === 'string' &&
    ['mp4', 'webm', 'gif'].includes(r.output_format as string) &&
    typeof r.resolution === 'string'
  );
}

export function isJobStatusResponse(res: unknown): res is RenderJobStatusResponse {
  if (!res || typeof res !== 'object') return false;
  const r = res as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.status === 'string';
}
