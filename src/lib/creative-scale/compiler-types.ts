/**
 * Creative Scale - Step 4: Compiler Types
 * Engine-agnostic ExecutionPlan
 * NO creative decisions, NO engine hints
 */

// ============================================
// EXECUTION PLAN OUTPUT TYPES
// ============================================

export type CompilationStatus = 'compilable' | 'uncompilable';

export interface OutputFormat {
  container: 'mp4' | 'webm' | 'mov';
  width: number;
  height: number;
  fps: number;
  bitrate_kbps: number;
  audio_bitrate_kbps: number;
  codec_hint: 'h264' | 'h265' | 'vp9' | 'av1';
}

export interface TimelineSegment {
  segment_id: string;
  source_video_id: string;
  source_segment_id: string;
  asset_url: string | null;

  // Source timing (what to extract)
  trim_start_ms: number;
  trim_end_ms: number;
  source_duration_ms: number;

  // Output timing (where to place)
  timeline_start_ms: number;
  timeline_end_ms: number;
  output_duration_ms: number;

  // Transformations (numbers only)
  speed_multiplier: number;

  // Track assignment
  track: 'video' | 'overlay';
  layer: number;
}

export interface AudioSegment {
  audio_id: string;
  source_video_id: string;
  asset_url: string | null;

  // Source timing
  trim_start_ms: number;
  trim_end_ms: number;

  // Output timing
  timeline_start_ms: number;
  timeline_end_ms: number;

  // Audio parameters (numbers only)
  volume: number; // 0.0 - 1.0
  fade_in_ms: number;
  fade_out_ms: number;

  // Track assignment
  track: 'voiceover' | 'music' | 'sfx';
}

export interface TextOverlay {
  text_id: string;
  content: string;

  // Timing
  timeline_start_ms: number;
  timeline_end_ms: number;

  // Style
  font_size: number;
  color: string; // hex
  x: string; // ffmpeg expression e.g. "(w-text_w)/2"
  y: string;
  box?: boolean;
  box_color?: string;
  font_file?: string; // Optional custom font
}

export interface ValidationResult {
  total_duration_ms: number;
  segment_count: number;
  audio_track_count: number;
  has_gaps: boolean;
  has_overlaps: boolean;
  warnings: string[];
}

export interface ExecutionPlan {
  plan_id: string;
  source_analysis_id: string;
  source_blueprint_id: string;
  variation_id: string;
  created_at: string;

  status: CompilationStatus;
  reason?: string; // Only if uncompilable

  output_format: OutputFormat;

  timeline: TimelineSegment[];
  audio_tracks: AudioSegment[];
  text_overlays?: TextOverlay[]; // Optional for backward capability

  validation: ValidationResult;
}

// ============================================
// COMPILER INPUT TYPES
// ============================================

export interface CompilerInput {
  analysis: import('./types').VideoAnalysis;
  blueprint: import('./types').CreativeBlueprint;
  variation_index: number;
  asset_base_url?: string;
}

export interface CompilerOutput {
  success: boolean;
  plan?: ExecutionPlan;
  error?: string;
}

// ============================================
// ACTION RESOLUTION MAPPING
// ============================================

export interface ResolvedAction {
  action_id: string;
  source_action: import('./types').AbstractAction;
  target_segments: string[]; // segment IDs from VideoAnalysis
  transformation: {
    speed_multiplier?: number;
    trim_percent_start?: number;
    trim_percent_end?: number;
    timeline_offset_ms?: number;
    remove?: boolean;
  };
  resolved: boolean;
  resolution_error?: string;
}
