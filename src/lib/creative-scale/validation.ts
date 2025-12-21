/**
 * Creative Scale - Schema Validation
 * Zod schemas for AI response validation
 */

import { z } from 'zod';

// ============================================
// CONSTANTS
// ============================================

export const LIMITS = {
  MAX_FILE_SIZE_MB: 200,
  MAX_FILE_SIZE_BYTES: 200 * 1024 * 1024,
  MAX_DURATION_SEC: 60,
  MAX_VIDEOS: 20,
  MAX_VARIATIONS: 20,
  MIN_VARIATIONS: 1,
  REQUEST_TIMEOUT_MS: 30000,
  MAX_SPEED_MULTIPLIER: 10,
  MIN_SPEED_MULTIPLIER: 0.1,
} as const;

// ============================================
// SEGMENT VALIDATION
// ============================================

const SegmentTypeSchema = z.enum([
  'hook', 'problem', 'solution', 'benefit', 'proof', 'cta', 'filler'
]);

const VisualTagSchema = z.enum([
  'face', 'product', 'screen', 'hands', 'text', 'lifestyle',
  'before_after', 'demo', 'testimonial', 'environment', 'graphic', 'logo'
]);

const VideoSegmentSchema = z.object({
  id: z.string().min(1),
  type: SegmentTypeSchema,
  start_ms: z.number().int().min(0),
  end_ms: z.number().int().min(0),
  transcript: z.string().nullable(),
  visual_tags: z.array(VisualTagSchema).default([]),
  pacing_score: z.number().min(0).max(1),
  clarity_score: z.number().min(0).max(1),
  attention_score: z.number().min(0).max(1),
});

// ============================================
// VIDEO ANALYSIS VALIDATION
// ============================================

const AudioAnalysisSchema = z.object({
  has_voiceover: z.boolean(),
  has_music: z.boolean(),
  music_energy: z.enum(['low', 'medium', 'high']).nullable(),
  voice_tone: z.enum(['casual', 'professional', 'urgent', 'friendly']).nullable(),
  silence_ratio: z.number().min(0).max(1),
});

const VideoMetadataSchema = z.object({
  duration_ms: z.number().int().min(0),
  aspect_ratio: z.enum(['9:16', '1:1', '16:9', '4:5']),
  resolution: z.string(),
  fps: z.number().min(1).max(120),
});

const OverallScoresSchema = z.object({
  hook_strength: z.number().min(0).max(1),
  message_clarity: z.number().min(0).max(1),
  pacing_consistency: z.number().min(0).max(1),
  cta_effectiveness: z.number().min(0).max(1),
});

export const VideoAnalysisSchema = z.object({
  id: z.string().min(1),
  source_video_id: z.string().min(1),
  analyzed_at: z.string(),
  metadata: VideoMetadataSchema,
  segments: z.array(VideoSegmentSchema).min(1, 'At least one segment is required'),
  audio: AudioAnalysisSchema,
  overall_scores: OverallScoresSchema,
  detected_style: z.enum(['ugc', 'professional', 'animated', 'mixed']),
  detected_language: z.string(),
});

// ============================================
// BLUEPRINT VALIDATION
// ============================================

const MarketingFrameworkSchema = z.enum([
  'AIDA', 'PAS', 'BAB', 'FAB', 'ACCA', 'QUEST', 'STAR', 'UGC', 'OFFER_STACK'
]);

const AbstractActionSchema = z.enum([
  'replace_segment', 'remove_segment', 'compress_segment',
  'reorder_segments', 'emphasize_segment', 'split_segment', 'merge_segments'
]);

const VariationIdeaSchema = z.object({
  id: z.string().min(1),
  action: AbstractActionSchema,
  target_segment_type: SegmentTypeSchema,
  intent: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']),
  reasoning: z.string(),
});

const BlueprintObjectiveSchema = z.object({
  primary_goal: z.string().min(1),
  target_emotion: z.string().min(1),
  key_message: z.string().min(1),
});

export const CreativeBlueprintSchema = z.object({
  id: z.string().min(1),
  source_analysis_id: z.string().min(1),
  created_at: z.string(),
  framework: MarketingFrameworkSchema,
  framework_rationale: z.string(),
  objective: BlueprintObjectiveSchema,
  strategic_insights: z.array(z.string()),
  variation_ideas: z.array(VariationIdeaSchema).min(1).max(LIMITS.MAX_VARIATIONS),
  recommended_duration_range: z.object({
    min_ms: z.number().int().min(0),
    max_ms: z.number().int().min(0),
  }),
  target_formats: z.array(z.enum(['9:16', '1:1', '16:9', '4:5'])),
});

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateVideoAnalysis(data: unknown): {
  success: boolean;
  data?: z.infer<typeof VideoAnalysisSchema>;
  error?: string;
} {
  const result = VideoAnalysisSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0];
  return {
    success: false,
    error: `Invalid analysis: ${firstError?.path.join('.')} - ${firstError?.message}`
  };
}

export function validateCreativeBlueprint(data: unknown): {
  success: boolean;
  data?: z.infer<typeof CreativeBlueprintSchema>;
  error?: string;
} {
  const result = CreativeBlueprintSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.errors[0];
  return {
    success: false,
    error: `Invalid blueprint: ${firstError?.path.join('.')} - ${firstError?.message}`
  };
}

// ============================================
// FILE VALIDATION
// ============================================

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > LIMITS.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is ${LIMITS.MAX_FILE_SIZE_MB}MB.`
    };
  }

  // Check MIME type
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid format: ${file.type || 'unknown'}. Use MP4, WebM, or MOV.`
    };
  }

  return { valid: true };
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/\.\./g, '')           // Remove ..
    .replace(/[\/\\]/g, '_')        // Replace slashes
    .replace(/[<>:"|?*]/g, '_')     // Remove Windows forbidden chars
    .replace(/\x00/g, '')           // Remove null bytes
    .trim()
    .slice(0, 255);                 // Limit length
}

// ============================================
// NUMERIC CLAMPING
// ============================================

export function clampSpeedMultiplier(speed: number): number {
  return Math.max(LIMITS.MIN_SPEED_MULTIPLIER, Math.min(LIMITS.MAX_SPEED_MULTIPLIER, speed));
}

export function clampVariationCount(count: number): number {
  return Math.max(LIMITS.MIN_VARIATIONS, Math.min(LIMITS.MAX_VARIATIONS, count));
}
