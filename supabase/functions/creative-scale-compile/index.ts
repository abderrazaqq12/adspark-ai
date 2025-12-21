import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// SAFE DEFAULTS
// ============================================

const DEFAULT_OUTPUT_FORMAT = {
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

function resolveAction(idea: any, segments: any[]): any {
  const targetSegments = segments.filter((s: any) => s.type === idea.target_segment_type);

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

  const segmentIds = targetSegments.map((s: any) => s.id);

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
          speed_multiplier: 1.25,
          trim_percent_start: 0.1,
          trim_percent_end: 0.1
        },
        resolved: true
      };

    case 'emphasize_segment':
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: {
          speed_multiplier: 0.9
        },
        resolved: true
      };

    case 'reorder_segments':
      return {
        action_id: idea.id,
        source_action: idea.action,
        target_segments: segmentIds,
        transformation: {
          timeline_offset_ms: -1
        },
        resolved: true
      };

    case 'replace_segment':
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
  analysis: any,
  resolvedActions: any[],
  sourceVideoUrl?: string
): { timeline: any[]; warnings: string[] } {
  const warnings: string[] = [];
  const timeline: any[] = [];

  const removeSet = new Set<string>();
  for (const action of resolvedActions) {
    if (action.transformation.remove) {
      action.target_segments.forEach((id: string) => removeSet.add(id));
    }
  }

  const transformMap = new Map<string, any>();
  for (const action of resolvedActions) {
    if (!action.transformation.remove && action.resolved) {
      for (const segId of action.target_segments) {
        transformMap.set(segId, action);
      }
    }
  }

  const sortedSegments = [...analysis.segments].sort((a: any, b: any) => a.start_ms - b.start_ms);

  let currentTimelineMs = 0;
  let segmentIndex = 0;

  for (const segment of sortedSegments) {
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

    // Use the source video URL directly (blob URL or HTTP URL)
    const timelineSegment = {
      segment_id: `ts_${segmentIndex}`,
      source_video_id: analysis.source_video_id,
      source_segment_id: segment.id,
      asset_url: sourceVideoUrl || null,

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
  analysis: any,
  timeline: any[],
  sourceVideoUrl?: string
): any[] {
  const audioTracks: any[] = [];

  if (!analysis.audio?.has_voiceover) {
    return audioTracks;
  }

  const totalDuration = timeline.length > 0
    ? timeline[timeline.length - 1].timeline_end_ms
    : 0;

  if (totalDuration === 0) {
    return audioTracks;
  }

  // Use the source video URL directly for audio extraction
  const audioSegment = {
    audio_id: 'audio_0',
    source_video_id: analysis.source_video_id,
    asset_url: sourceVideoUrl || null,

    trim_start_ms: 0,
    trim_end_ms: analysis.metadata.duration_ms,

    timeline_start_ms: 0,
    timeline_end_ms: totalDuration,

    volume: 1.0,
    fade_in_ms: 0,
    fade_out_ms: Math.min(500, Math.round(totalDuration * 0.05)),

    track: 'voiceover'
  };

  audioTracks.push(audioSegment);

  return audioTracks;
}

// ============================================
// VALIDATION
// ============================================

function validateTimeline(timeline: any[], audioTracks: any[]): any {
  const warnings: string[] = [];

  const totalDuration = timeline.length > 0
    ? timeline[timeline.length - 1].timeline_end_ms
    : 0;

  let hasGaps = false;
  for (let i = 1; i < timeline.length; i++) {
    const prevEnd = timeline[i - 1].timeline_end_ms;
    const currStart = timeline[i].timeline_start_ms;
    if (currStart > prevEnd) {
      hasGaps = true;
      warnings.push(`Gap detected: ${prevEnd}ms to ${currStart}ms (${currStart - prevEnd}ms)`);
    }
  }

  let hasOverlaps = false;
  for (let i = 1; i < timeline.length; i++) {
    const prevEnd = timeline[i - 1].timeline_end_ms;
    const currStart = timeline[i].timeline_start_ms;
    if (currStart < prevEnd) {
      hasOverlaps = true;
      warnings.push(`Overlap detected: segment ${i} starts at ${currStart}ms but previous ends at ${prevEnd}ms`);
    }
  }

  if (totalDuration < 15000) {
    warnings.push(`Very short output: ${totalDuration}ms (min 15s)`);
  }
  if (totalDuration > 30000) {
    warnings.push(`Very long output: ${totalDuration}ms (>30s)`);
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
// MAIN COMPILER
// ============================================

function compile(analysis: any, blueprint: any, variationIndex: number, sourceVideoUrl?: string): any {
  if (!analysis || !analysis.segments || analysis.segments.length === 0) {
    return {
      plan_id: `exec_${crypto.randomUUID()}`,
      status: 'uncompilable',
      reason: 'VideoAnalysis is missing or has no segments'
    };
  }

  if (!blueprint || !blueprint.variation_ideas) {
    return {
      plan_id: `exec_${crypto.randomUUID()}`,
      status: 'uncompilable',
      reason: 'CreativeBlueprint is missing or has no variation ideas'
    };
  }

  const variationIdea = blueprint.variation_ideas[variationIndex];
  if (!variationIdea) {
    return {
      plan_id: `exec_${crypto.randomUUID()}`,
      status: 'uncompilable',
      reason: `Variation index ${variationIndex} not found in blueprint`
    };
  }

  const resolvedAction = resolveAction(variationIdea, analysis.segments);

  if (!resolvedAction.resolved) {
    return {
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
  }

  const { timeline, warnings: timelineWarnings } = buildTimeline(
    analysis,
    [resolvedAction],
    sourceVideoUrl
  );

  const audioTracks = buildAudioTracks(analysis, timeline, sourceVideoUrl);
  const validation = validateTimeline(timeline, audioTracks);
  validation.warnings.push(...timelineWarnings);

  const outputFormat = {
    ...DEFAULT_OUTPUT_FORMAT,
    fps: analysis.metadata?.fps || 30,
    width: analysis.metadata?.aspect_ratio === '16:9' ? 1920 : 1080,
    height: analysis.metadata?.aspect_ratio === '16:9' ? 1080 : 1920
  };

  return {
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
}

// ============================================
// EDGE FUNCTION HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      analysis,
      blueprint,
      variation_index,
      compile_all = false,
      asset_base_url,
      source_video_url
    } = await req.json();

    // Support both old parameter name (asset_base_url) and new (source_video_url)
    const videoUrl = source_video_url || asset_base_url;

    if (!analysis || !blueprint) {
      return new Response(
        JSON.stringify({ error: 'analysis and blueprint are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[creative-scale-compile] Compiling: analysis=${analysis.id}, blueprint=${blueprint.id}, videoUrl=${videoUrl ? 'provided' : 'missing'}`);

    let plans: any[];

    if (compile_all) {
      // Compile all variations
      plans = [];
      for (let i = 0; i < (blueprint.variation_ideas?.length || 0); i++) {
        const plan = compile(analysis, blueprint, i, videoUrl);
        plans.push(plan);
      }
    } else {
      // Compile single variation
      const idx = variation_index ?? 0;
      const plan = compile(analysis, blueprint, idx, videoUrl);
      plans = [plan];
    }

    const compilableCount = plans.filter(p => p.status === 'compilable').length;
    const uncompilableCount = plans.filter(p => p.status === 'uncompilable').length;

    console.log(`[creative-scale-compile] Complete: ${compilableCount} compilable, ${uncompilableCount} uncompilable`);

    return new Response(
      JSON.stringify({
        success: true,
        plans,
        meta: {
          total: plans.length,
          compilable: compilableCount,
          uncompilable: uncompilableCount,
          compiled_at: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[creative-scale-compile] Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Compilation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
