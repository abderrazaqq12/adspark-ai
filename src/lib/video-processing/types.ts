// Unified Video Processing Types

export type ProcessingBackend = 'browser' | 'remotion' | 'cloud-api' | 'auto';
export type EngineTier = 'free' | 'low' | 'medium' | 'premium' | 'ai-chooses';

export interface ProcessingCapabilities {
  supportsFFmpeg: boolean;
  supportsWebCodecs: boolean;
  supportsWasm: boolean;
  maxFileSizeMB: number;
  maxDurationSec: number;
}

export interface VideoProcessingConfig {
  backend: ProcessingBackend;
  tier: EngineTier;
  fallbackEnabled: boolean;
  maxRetries: number;
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

export interface VideoProcessingError {
  code: string;
  message: string;
  stage: string;
  retryable: boolean;
  suggestedFix?: string;
}

// Browser processing specific
export interface BrowserProcessingJob {
  id: string;
  type: 'trim' | 'merge' | 'transcode' | 'effects' | 'assembly';
  inputs: Blob[];
  config: Record<string, any>;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// Cloud API specific
export interface CloudAPIConfig {
  provider: 'cloudinary' | 'mux' | 'fal' | 'replicate';
  apiKey?: string;
  webhookUrl?: string;
}

// Remotion specific
export interface RemotionConfig {
  compositionId: string;
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
  props: Record<string, any>;
}

// Engine registry
export interface VideoProcessingEngine {
  id: string;
  name: string;
  tier: EngineTier;
  backends: ProcessingBackend[];
  capabilities: string[];
  costPerSecond: number;
  maxDuration: number;
  priority: number;
  available: boolean;
}
