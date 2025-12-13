/**
 * Creative Scale - Phase A Types
 * AI Marketing Analysis Layer
 * NO execution, NO rendering, NO engine references
 */

// ============================================
// STEP 2: VideoAnalysis (Understanding Only)
// ============================================

export type SegmentType = 
  | 'hook' 
  | 'problem' 
  | 'solution' 
  | 'benefit' 
  | 'proof' 
  | 'cta' 
  | 'filler';

export type VisualTag = 
  | 'face' 
  | 'product' 
  | 'screen' 
  | 'hands' 
  | 'text' 
  | 'lifestyle' 
  | 'before_after' 
  | 'demo' 
  | 'testimonial'
  | 'environment'
  | 'graphic'
  | 'logo';

export interface VideoSegment {
  id: string;
  type: SegmentType;
  start_ms: number;
  end_ms: number;
  transcript: string | null;
  visual_tags: VisualTag[];
  pacing_score: number;    // 0-1: slow to fast
  clarity_score: number;   // 0-1: confusing to clear
  attention_score: number; // 0-1: weak to strong
}

export interface AudioAnalysis {
  has_voiceover: boolean;
  has_music: boolean;
  music_energy: 'low' | 'medium' | 'high' | null;
  voice_tone: 'casual' | 'professional' | 'urgent' | 'friendly' | null;
  silence_ratio: number; // 0-1: percentage of silence
}

export interface VideoMetadata {
  duration_ms: number;
  aspect_ratio: '9:16' | '1:1' | '16:9' | '4:5';
  resolution: string;
  fps: number;
}

export interface VideoAnalysis {
  id: string;
  source_video_id: string;
  analyzed_at: string;
  metadata: VideoMetadata;
  segments: VideoSegment[];
  audio: AudioAnalysis;
  overall_scores: {
    hook_strength: number;      // 0-1
    message_clarity: number;    // 0-1
    pacing_consistency: number; // 0-1
    cta_effectiveness: number;  // 0-1
  };
  detected_style: 'ugc' | 'professional' | 'animated' | 'mixed';
  detected_language: string;
}

// ============================================
// STEP 3: CreativeBlueprint (Strategy Only)
// ============================================

export type MarketingFramework = 
  | 'AIDA'      // Attention, Interest, Desire, Action
  | 'PAS'       // Problem, Agitate, Solution
  | 'BAB'       // Before, After, Bridge
  | 'FAB'       // Features, Advantages, Benefits
  | 'ACCA'      // Awareness, Comprehension, Conviction, Action
  | 'QUEST'     // Qualify, Understand, Educate, Stimulate, Transition
  | 'STAR'      // Situation, Task, Action, Result
  | 'UGC'       // User Generated Content style
  | 'OFFER_STACK';

export type AbstractAction = 
  | 'replace_segment'
  | 'remove_segment'
  | 'compress_segment'
  | 'reorder_segments'
  | 'emphasize_segment'
  | 'split_segment'
  | 'merge_segments';

export interface VariationIdea {
  id: string;
  action: AbstractAction;
  target_segment_type: SegmentType;
  intent: string; // Human-readable intent, e.g., "strengthen opening hook"
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface BlueprintObjective {
  primary_goal: string;
  target_emotion: string;
  key_message: string;
}

export interface CreativeBlueprint {
  id: string;
  source_analysis_id: string;
  created_at: string;
  framework: MarketingFramework;
  framework_rationale: string;
  objective: BlueprintObjective;
  strategic_insights: string[];
  variation_ideas: VariationIdea[];
  recommended_duration_range: {
    min_ms: number;
    max_ms: number;
  };
  target_formats: ('9:16' | '1:1' | '16:9' | '4:5')[];
}

// ============================================
// Phase A Combined Output
// ============================================

export interface PhaseAOutput {
  analysis: VideoAnalysis;
  blueprint: CreativeBlueprint;
  processing_time_ms: number;
}

// ============================================
// API Request/Response Types
// ============================================

export interface AnalyzeVideoRequest {
  video_url: string;
  video_id: string;
  language?: string;
  market?: string;
}

export interface GenerateBlueprintRequest {
  analysis: VideoAnalysis;
  target_framework?: MarketingFramework;
  variation_count?: number;
}
