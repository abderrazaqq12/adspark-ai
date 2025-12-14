/**
 * Video Processing Types
 * SERVER-ONLY ARCHITECTURE - No browser processing
 */

// Backend options - server only
export type ProcessingBackend = 'vps' | 'cloud-api';
export type EngineTier = 'free' | 'low' | 'medium' | 'premium' | 'ai-chooses';

// Error codes for structured error handling
export type VideoErrorCode = 
  | 'VPS_UNREACHABLE'
  | 'FFMPEG_UNAVAILABLE'
  | 'UPLOAD_FAILED'
  | 'EXECUTION_FAILED'
  | 'TIMEOUT'
  | 'INVALID_INPUT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'STORAGE_ERROR'
  | 'UNKNOWN';

// Structured error response - always JSON, never HTML
export interface VideoProcessingError {
  ok: false;
  code: VideoErrorCode;
  message: string;
  stage: 'upload' | 'validation' | 'execution' | 'storage' | 'unknown';
  retryable: boolean;
  details?: Record<string, unknown>;
}

// Success response
export interface VideoProcessingSuccess<T = unknown> {
  ok: true;
  data: T;
}

export type VideoProcessingResult<T = unknown> = 
  | VideoProcessingSuccess<T> 
  | VideoProcessingError;

// VPS Health Check Response
export interface VPSHealthResponse {
  ok: boolean;
  ffmpeg: 'available' | 'unavailable' | string;
  uploadDir?: string;
  outputDir?: string;
  version?: string;
  error?: string;
}

// Scene intelligence types
export interface AISceneDefinition {
  id: string;
  index: number;
  type: 'hook' | 'problem' | 'before' | 'solution' | 'after' | 'benefits' | 'usp' | 'cta' | 'testimonial' | 'demo';
  duration: number;
  startTime: number;
  endTime: number;
  text?: string;
  visualPrompt?: string;
  transition: TransitionType;
  motionStyle: MotionStyle;
  overlay?: OverlayConfig;
}

export type TransitionType = 'cut' | 'fade' | 'zoom' | 'whip' | 'slide' | 'glitch' | 'dissolve';
export type MotionStyle = 'static' | 'ken-burns' | 'parallax' | 'zoom-in' | 'zoom-out' | 'pan' | 'shake' | 'orbit';

export interface OverlayConfig {
  type: 'text' | 'cta' | 'emoji' | 'sticker' | 'progress-bar';
  content: string;
  position: 'top' | 'center' | 'bottom' | 'lower-third';
  style?: Record<string, string>;
}

// Video generation input
export interface VideoCreationInput {
  // Source assets
  sourceVideos?: string[];
  sourceImages?: string[];
  voiceoverUrl?: string;
  script?: string;
  musicUrl?: string;
  
  // Configuration
  variationCount: number;
  aspectRatios: ('9:16' | '16:9' | '1:1' | '4:5')[];
  maxDuration: number;
  
  // User preferences
  tier: EngineTier;
  backend: ProcessingBackend;
  
  // AI settings
  aiAutoMode: boolean;
  hookStyles?: string[];
  pacing?: 'fast' | 'medium' | 'slow' | 'dynamic';
  transitions?: TransitionType[];
  
  // Market/Language
  market: string;
  language: string;
  videoType: string;
  
  // Metadata
  projectName?: string;
  projectId?: string;
  userId?: string;
}

// Video generation output
export interface VideoCreationOutput {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  
  // Metadata
  duration?: number;
  aspectRatio: string;
  engine: string;
  backend: ProcessingBackend;
  
  // Scene breakdown
  scenes?: AISceneDefinition[];
  
  // Cost tracking
  estimatedCost: number;
  actualCost?: number;
  
  // Debug info
  processingLog?: string[];
  error?: VideoProcessingError;
}

// VPS Execution Plan
export interface ExecutionPlan {
  sourcePath: string;
  outputName?: string;
  trim?: { start: number; end: number };
  speed?: number;
  resize?: { width: number; height: number };
  aspectRatio?: string;
  filters?: string[];
}

// Engine registry types
export interface VideoProcessingEngine {
  id: string;
  name: string;
  tier: EngineTier;
  location: 'server' | 'cloud';
  capabilities: string[];
  costPerSecond: number;
  maxDuration: number;
  priority: number;
  available: boolean;
}
