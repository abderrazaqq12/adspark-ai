// Smart Scene Builder - Core Types & Schema

export type AspectRatio = '1:1' | '9:16' | '16:9';
export type Resolution = 'auto' | '720p' | '1080p';
export type SceneDuration = 3 | 5 | 7 | 10;
export type BudgetPreference = 'free' | 'low' | 'balanced' | 'premium' | 'auto';
export type SceneGoal = 'hook' | 'explain' | 'proof' | 'cta' | 'transition';
export type MotionIntensity = 'low' | 'medium' | 'high';
export type SceneStatus = 'pending' | 'generating' | 'completed' | 'failed';

// Visual Input Analysis
export interface VisualAsset {
  id: string;
  type: 'image' | 'video' | 'broll';
  url: string;
  filename: string;
  analysis?: VisualAnalysis;
}

export interface VisualAnalysis {
  productType?: string;
  context?: string;
  motionSuitability: 'static' | 'subtle' | 'dynamic';
  dominantColors?: string[];
  suggestedSceneTypes: SceneStructure[];
  confidence: number;
}

// Scene Structure Types
export type SceneStructure = 
  | 'product_closeup'
  | 'problem_visualization'
  | 'lifestyle_usage'
  | 'social_proof'
  | 'cta_background'
  | 'before_after'
  | 'unboxing'
  | 'testimonial'
  | 'feature_highlight'
  | 'comparison';

// Core Scene Definition
export interface SmartScenePlan {
  id: string;
  index: number;
  structure: SceneStructure;
  goal: SceneGoal;
  visualIntent: string;
  motionIntensity: MotionIntensity;
  textSafeArea: boolean;
  duration: SceneDuration;
  
  // Visual inputs (optional)
  sourceAsset?: VisualAsset;
  productImageUrl?: string;
  
  // AI-Selected Engine
  selectedEngine: EngineDecision;
  
  // Generation state
  status: SceneStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  
  // Debug info
  debug?: SceneDebugInfo;
}

// Engine Selection Types
export interface EngineDecision {
  engineId: string;
  engineName: string;
  tier: 'free' | 'budget' | 'premium';
  costPerSecond: number;
  estimatedCost: number;
  reason: string;
  alternatives: AlternativeEngine[];
}

export interface AlternativeEngine {
  engineId: string;
  engineName: string;
  tier: string;
  costPerSecond: number;
  rejectionReason: string;
}

// Scene Complexity Analysis
export interface SceneComplexity {
  motionRequirement: 'static' | 'simple' | 'complex' | 'dynamic';
  visualRealism: 'stylized' | 'realistic' | 'hyperreal';
  hasAvatar: boolean;
  requiresImageInput: boolean;
  estimatedDifficulty: number; // 0-100
}

// Debug & Transparency
export interface SceneDebugInfo {
  analysisTime: number;
  engineSelectionReason: string;
  complexityScore: number;
  qualityTierMatch: boolean;
  costEfficiencyScore: number;
  alternativesConsidered: number;
  fallbacksAvailable: string[];
}

// Video Configuration
export interface VideoConfig {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  defaultSceneDuration: SceneDuration;
  budgetPreference: BudgetPreference;
  enableTextOverlays: boolean;
}

// Builder Input
export interface SceneBuilderInput {
  projectId: string;
  scriptId?: string;
  script?: string;
  config: VideoConfig;
  assets: VisualAsset[];
}

// Scene Plan JSON Output (Final Output Contract)
export interface ScenePlanOutput {
  version: '1.0';
  projectId: string;
  createdAt: string;
  config: VideoConfig;
  scenes: SmartScenePlan[];
  metadata: {
    totalDuration: number;
    totalEstimatedCost: number;
    enginesUsed: string[];
    scenesCount: number;
    completedCount: number;
  };
}

// Engine Registry Types
export interface VideoEngineSpec {
  engineId: string;
  name: string;
  tier: 'free' | 'budget' | 'premium';
  costPerSecond: number;
  maxDurationSec: number;
  quality: 'fast' | 'balanced' | 'cinematic';
  capabilities: EngineCapability[];
  priority: number;
  available: boolean;
}

export type EngineCapability = 
  | 'text-to-video'
  | 'image-to-video'
  | 'video-to-video'
  | 'avatar'
  | 'zoom-pan'
  | 'transitions';

// AI Selection Context
export interface EngineSelectionContext {
  scene: Partial<SmartScenePlan>;
  complexity: SceneComplexity;
  budgetPreference: BudgetPreference;
  previousEngines?: string[];
}
