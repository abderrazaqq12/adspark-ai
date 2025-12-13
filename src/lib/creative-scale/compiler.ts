/**
 * Creative Scale - Step 4: Compiler
 * Pure translation: VideoAnalysis + CreativeBlueprint → ExecutionPlan
 * NO creative decisions, NO engine hints, NO ambiguity
 */

import type { VideoAnalysis, CreativeBlueprint, VariationIdea, VideoSegment } from './types';
import type { 
  ExecutionPlan, 
  TimelineSegment, 
  AudioSegment, 
  OutputFormat, 
  ValidationResult,
  ResolvedAction,
  CompilerInput,
  CompilerOutput
} from './compiler-types';

// ============================================
// SAFE DEFAULTS
// ============================================

const DEFAULT_OUTPUT_FORMAT: OutputFormat = {
  container: 'mp4',
  width: 1080,
  height: 1920,
  fps: 30,
  bitrate_kbps: 2500,
  audio_bitrate_kbps: 128,
  codec_hint: 'h264'
};

// ============================================
// ACTION RESOLUTION
// ============================================

function resolveAction(
  idea: VariationIdea,
  segments: VideoSegment[]
): ResolvedAction {
  const targetSegments = segments.filter(s => s.type === idea.target_segment_type);
  
  if (targetSegments.length === 0) {
    return {
      action_id: idea.id,
      source_action: idea.action,
      target_segments: [],
      transformation: {},
      resolved: false,
      resolution_error: `No segments of type "${idea.target_segment_type}" found in source`
    };
  }

  const segmentIds = targetSegments.map(s => s.id);
  
  // Translate abstract actions to mathematical transformations
  switch (idea.action) {
    case 'remove_segment':
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: { remove: true },
        resolved: true
      };

    case 'compress_segment':
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: { 
          speed_multiplier: 1.25, // 25% faster = 20% shorter
          trim_percent_start: 0.1, // Trim 10% from start
          trim_percent_end: 0.1    // Trim 10% from end
        },
        resolved: true
      };

    case 'emphasize_segment':
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: { 
          speed_multiplier: 0.9 // 10% slower for emphasis
        },
        resolved: true
      };

    case 'reorder_segments':
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: { 
          timeline_offset_ms: -1 // Marker: requires reordering pass
        },
        resolved: true
      };

    case 'replace_segment':
      // Cannot resolve without external asset - mark for manual resolution
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: {},
        resolved: false,
        resolution_error: 'replace_segment requires external asset reference'
      };

    case 'split_segment':
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: {
          // Split in half - each half becomes a separate timeline entry
          trim_percent_end: 0.5
        },
        resolved: true
      };

    case 'merge_segments':
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: {},
        resolved: targetSegments.length >= 2,
        resolution_error: targetSegments.length < 2 ? 'merge_segments requires at least 2 segments' : undefined
      };

    default:
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: {},
        resolved: false,
        resolution_error: `Unknown action type: ${idea.action}`
      };
  }
}

// ============================================
// TIMELINE CONSTRUCTION
// ============================================

function buildTimeline(
  analysis: VideoAnalysis,
  resolvedActions: ResolvedAction[],
  assetBaseUrl?: string
): { timeline: TimelineSegment[]; warnings: string[] } {
  const warnings: string[] = [];
  const timeline: TimelineSegment[] = [];
  
  // Build removal set
  const removeSet = new Set<string>();
  for (const action of resolvedActions) {
    if (action.transformation.remove) {
      action.target_segments.forEach(id => removeSet.add(id));
    }
  }

  // Build transformation map
  const transformMap = new Map<string, ResolvedAction>();
  for (const action of resolvedActions) {
    if (!action.transformation.remove && action.resolved) {
      for (const segId of action.target_segments) {
        transformMap.set(segId, action);
      }
    }
  }

  // Sort segments by start time
  const sortedSegments = [...analysis.segments].sort((a, b) => a.start_ms - b.start_ms);
  
  let currentTimelineMs = 0;
  let segmentIndex = 0;

  for (const segment of sortedSegments) {
    // Skip removed segments
    if (removeSet.has(segment.id)) {
      warnings.push(`Segment ${segment.id} (${segment.type}) removed by action`);
      continue;
    }

    const action = transformMap.get(segment.id);
    const speedMultiplier = action?.transformation.speed_multiplier ?? 1.0;
    const trimStartPercent = action?.transformation.trim_percent_start ?? 0;
    const trimEndPercent = action?.transformation.trim_percent_end ?? 0;

    const sourceDuration = segment.end_ms - segment.start_ms;
    const trimStartMs = Math.round(sourceDuration * trimStartPercent);
    const trimEndMs = Math.round(sourceDuration * trimEndPercent);
    
    const trimmedDuration = sourceDuration - trimStartMs - trimEndMs;
    const outputDuration = Math.round(trimmedDuration / speedMultiplier);

    const timelineSegment: TimelineSegment = {
      segment_id: `ts_${segmentIndex}`,
      source_video_id: analysis.source_video_id,
      source_segment_id: segment.id,
      asset_url: assetBaseUrl ? `${assetBaseUrl}/${analysis.source_video_id}` : null,
      
      trim_start_ms: segment.start_ms + trimStartMs,
      trim_end_ms: segment.end_ms - trimEndMs,
      source_duration_ms: trimmedDuration,
      
      timeline_start_ms: currentTimelineMs,
      timeline_end_ms: currentTimelineMs + outputDuration,
      output_duration_ms: outputDuration,
      
      speed_multiplier: speedMultiplier,
      
      track: 'video',
      layer: 0
    };

    timeline.push(timelineSegment);
    currentTimelineMs += outputDuration;
    segmentIndex++;
  }

  return { timeline, warnings };
}

// ============================================
// AUDIO TRACK CONSTRUCTION
// ============================================

function buildAudioTracks(
  analysis: VideoAnalysis,
  timeline: TimelineSegment[],
  assetBaseUrl?: string
): AudioSegment[] {
  const audioTracks: AudioSegment[] = [];

  // Only create audio track if source has voiceover
  if (!analysis.audio.has_voiceover) {
    return audioTracks;
  }

  const totalDuration = timeline.length > 0 
    ? timeline[timeline.length - 1].timeline_end_ms 
    : 0;

  if (totalDuration === 0) {
    return audioTracks;
  }

  // Create single audio track synced to video timeline
  const audioSegment: AudioSegment = {
    audio_id: 'audio_0',
    source_video_id: analysis.source_video_id,
    asset_url: assetBaseUrl ? `${assetBaseUrl}/${analysis.source_video_id}` : null,
    
    trim_start_ms: 0,
    trim_end_ms: analysis.metadata.duration_ms,
    
    timeline_start_ms: 0,
    timeline_end_ms: totalDuration,
    
    volume: 1.0,
    fade_in_ms: 0,
    fade_out_ms: Math.min(500, Math.round(totalDuration * 0.05)), // 5% fade or 500ms max
    
    track: 'voiceover'
  };

  audioTracks.push(audioSegment);

  return audioTracks;
}

// ============================================
// VALIDATION
// ============================================

function validateTimeline(
  timeline: TimelineSegment[],
  audioTracks: AudioSegment[]
): ValidationResult {
  const warnings: string[] = [];
  
  const totalDuration = timeline.length > 0 
    ? timeline[timeline.length - 1].timeline_end_ms 
    : 0;

  // Check for gaps
  let hasGaps = false;
  for (let i = 1; i < timeline.length; i++) {
    const prevEnd = timeline[i - 1].timeline_end_ms;
    const currStart = timeline[i].timeline_start_ms;
    if (currStart > prevEnd) {
      hasGaps = true;
      warnings.push(`Gap detected: ${prevEnd}ms to ${currStart}ms (${currStart - prevEnd}ms)`);
    }
  }

  // Check for overlaps
  let hasOverlaps = false;
  for (let i = 1; i < timeline.length; i++) {
    const prevEnd = timeline[i - 1].timeline_end_ms;
    const currStart = timeline[i].timeline_start_ms;
    if (currStart < prevEnd) {
      hasOverlaps = true;
      warnings.push(`Overlap detected: segment ${i} starts at ${currStart}ms but previous ends at ${prevEnd}ms`);
    }
  }

  // Duration sanity check
  if (totalDuration < 1000) {
    warnings.push(`Very short output: ${totalDuration}ms`);
  }
  if (totalDuration > 120000) {
    warnings.push(`Very long output: ${totalDuration}ms (>2 minutes)`);
  }

  return {
    total_duration_ms: totalDuration,
    segment_count: timeline.length,
    audio_track_count: audioTracks.length,
    has_gaps: hasGaps,
    has_overlaps: hasOverlaps,
    warnings
  };
}

// ============================================
// MAIN COMPILER FUNCTION
// ============================================

export function compile(input: CompilerInput): CompilerOutput {
  const { analysis, blueprint, variation_index, asset_base_url } = input;

  // Validate inputs
  if (!analysis || !analysis.segments || analysis.segments.length === 0) {
    return {
      success: false,
      error: 'VideoAnalysis is missing or has no segments'
    };
  }

  if (!blueprint || !blueprint.variation_ideas) {
    return {
      success: false,
      error: 'CreativeBlueprint is missing or has no variation ideas'
    };
  }

  // Get the specific variation to compile
  const variationIdea = blueprint.variation_ideas[variation_index];
  if (!variationIdea) {
    return {
      success: false,
      error: `Variation index ${variation_index} not found in blueprint`
    };
  }

  // Resolve the action for this variation
  const resolvedAction = resolveAction(variationIdea, analysis.segments);
  
  if (!resolvedAction.resolved) {
    const plan: ExecutionPlan = {
      plan_id: `exec_${crypto.randomUUID()}`,
      source_analysis_id: analysis.id,
      source_blueprint_id: blueprint.id,
      variation_id: variationIdea.id,
      created_at: new Date().toISOString(),
      status: 'uncompilable',
      reason: resolvedAction.resolution_error || 'Action could not be resolved',
      output_format: DEFAULT_OUTPUT_FORMAT,
      timeline: [],
      audio_tracks: [],
      validation: {
        total_duration_ms: 0,
        segment_count: 0,
        audio_track_count: 0,
        has_gaps: false,
        has_overlaps: false,
        warnings: []
      }
    };

    return { success: true, plan };
  }

  // Build timeline
  const { timeline, warnings: timelineWarnings } = buildTimeline(
    analysis, 
    [resolvedAction], 
    asset_base_url
  );

  // Build audio tracks
  const audioTracks = buildAudioTracks(analysis, timeline, asset_base_url);

  // Validate
  const validation = validateTimeline(timeline, audioTracks);
  validation.warnings.push(...timelineWarnings);

  // Determine output format based on source
  const outputFormat: OutputFormat = {
    ...DEFAULT_OUTPUT_FORMAT,
    fps: analysis.metadata.fps || 30,
    width: analysis.metadata.aspect_ratio === '16:9' ? 1920 : 1080,
    height: analysis.metadata.aspect_ratio === '16:9' ? 1080 : 1920
  };

  const plan: ExecutionPlan = {
    plan_id: `exec_${crypto.randomUUID()}`,
    source_analysis_id: analysis.id,
    source_blueprint_id: blueprint.id,
    variation_id: variationIdea.id,
    created_at: new Date().toISOString(),
    status: validation.has_overlaps ? 'uncompilable' : 'compilable',
    reason: validation.has_overlaps ? 'Timeline has overlapping segments' : undefined,
    output_format: outputFormat,
    timeline,
    audio_tracks: audioTracks,
    validation
  };

  return { success: true, plan };
}

// ============================================
// BATCH COMPILE ALL VARIATIONS
// ============================================

export function compileAll(
  analysis: VideoAnalysis,
  blueprint: CreativeBlueprint,
  assetBaseUrl?: string
): ExecutionPlan[] {
  const plans: ExecutionPlan[] = [];

  for (let i = 0; i < blueprint.variation_ideas.length; i++) {
    const result = compile({
      analysis,
      blueprint,
      variation_index: i,
      asset_base_url: assetBaseUrl
    });

    if (result.plan) {
      plans.push(result.plan);
    }
  }

  return plans;
}
