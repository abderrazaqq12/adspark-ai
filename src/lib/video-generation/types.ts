// Unified Video Generation Types

export type CostMode = 'free' | 'budget' | 'premium' | 'ai-chooses';
export type QualityPreference = 'fast' | 'balanced' | 'cinematic';
export type ExecutionMode = 'agent' | 'edge';
export type EngineCapability = 'text-to-video' | 'image-to-video' | 'video-to-video' | 'avatar';

export interface VideoEngine {
  engine_id: string;
  name: string;
  type: 'video';
  cost_per_second: number;
  quality: QualityPreference;
  supports: EngineCapability[];
  execution: ExecutionMode[];
  tier: 'free' | 'budget' | 'premium';
  max_duration_sec: number;
  priority: number; // Higher = preferred when multiple options
  available: boolean;
}

export interface VideoGenerationInput {
  // Content inputs
  script?: string;
  voiceoverUrl?: string;
  scenes?: SceneInput[];
  images?: string[];
  
  // Configuration
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
  duration: number; // seconds
  
  // User preferences (NOT engine selection)
  costMode: CostMode;
  qualityPreference: QualityPreference;
  executionMode: ExecutionMode;
  
  // Context
  projectId?: string;
  userId?: string;
  locale?: string;
}

export interface SceneInput {
  id: string;
  index: number;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  duration: number;
  visualPrompt?: string;
}

export interface EngineSelection {
  engine: VideoEngine;
  reason: string;
  alternativeEngines: VideoEngine[];
  estimatedCost: number;
  estimatedDuration: number;
}

export interface VideoGenerationOutput {
  status: 'success' | 'processing' | 'error';
  videoUrl?: string;
  thumbnailUrl?: string;
  
  // Metadata
  meta: {
    engine: string;
    engineName: string;
    executionMode: ExecutionMode;
    selectionReason: string;
    estimatedCost: number;
    actualCost?: number;
    latencyMs?: number;
    duration?: number;
  };
  
  // Debug info
  debug?: {
    availableEngines: string[];
    filteredBy: string[];
    selectionScore: number;
  };
  
  error?: string;
}

export interface VideoGenerationJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  input: VideoGenerationInput;
  selection: EngineSelection;
  output?: VideoGenerationOutput;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}
