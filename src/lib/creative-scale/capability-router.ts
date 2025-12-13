/**
 * Creative Scale - Capability-Based Engine Router
 * Selects FIRST engine that fully satisfies required capabilities
 * 
 * Execution Order (MANDATORY):
 * 1. WebCodecs (browser-native) - trim, speed_change only
 * 2. Cloudinary - trim, resize, format only
 * 3. Server FFmpeg - advanced capabilities
 * 4. Plan Export - always available fallback
 */

import { ExecutionPlan } from './compiler-types';

// ============================================
// CAPABILITY DEFINITIONS
// ============================================

export type Capability = 
  | 'trim'
  | 'speed_change'
  | 'resize'
  | 'format_convert'
  | 'segment_replace'
  | 'audio_mux'
  | 'audio_fade'
  | 'advanced_filters'
  | 'overlay'
  | 'transition'
  | 'text_overlay';

export type EngineId = 'webcodecs' | 'cloudinary' | 'server_ffmpeg' | 'plan_export';

export interface EngineCapabilityProfile {
  id: EngineId;
  name: string;
  capabilities: Set<Capability>;
  requiresCOOP: boolean;
  isPaid: boolean;
  priority: number; // Lower = tried first
}

// ============================================
// ENGINE CAPABILITY REGISTRY
// ============================================

export const ENGINE_CAPABILITIES: EngineCapabilityProfile[] = [
  {
    id: 'webcodecs',
    name: 'WebCodecs (Browser Native)',
    capabilities: new Set(['trim', 'speed_change']),
    requiresCOOP: false,
    isPaid: false,
    priority: 1,
  },
  {
    id: 'cloudinary',
    name: 'Cloudinary Video API',
    capabilities: new Set(['trim', 'resize', 'format_convert', 'speed_change']),
    requiresCOOP: false,
    isPaid: false, // Free tier available
    priority: 2,
  },
  {
    id: 'server_ffmpeg',
    name: 'Server FFmpeg (Advanced)',
    capabilities: new Set([
      'trim', 'speed_change', 'resize', 'format_convert',
      'segment_replace', 'audio_mux', 'audio_fade',
      'advanced_filters', 'overlay', 'transition', 'text_overlay'
    ]),
    requiresCOOP: false,
    isPaid: true,
    priority: 3,
  },
  {
    id: 'plan_export',
    name: 'Plan Export (Manual Render)',
    capabilities: new Set([
      'trim', 'speed_change', 'resize', 'format_convert',
      'segment_replace', 'audio_mux', 'audio_fade',
      'advanced_filters', 'overlay', 'transition', 'text_overlay'
    ]), // Supports everything conceptually
    requiresCOOP: false,
    isPaid: false,
    priority: 999, // Always last
  },
];

// ============================================
// CAPABILITY EXTRACTION
// ============================================

export interface RequiredCapabilities {
  capabilities: Set<Capability>;
  reasons: Map<Capability, string>;
}

export function extractRequiredCapabilities(plan: ExecutionPlan): RequiredCapabilities {
  const capabilities = new Set<Capability>();
  const reasons = new Map<Capability, string>();

  // Check timeline segments
  for (const segment of plan.timeline) {
    // Trim detection
    if (segment.trim_start_ms > 0 || segment.trim_end_ms < segment.source_duration_ms) {
      capabilities.add('trim');
      reasons.set('trim', 'Timeline has trimmed segments');
    }

    // Speed change detection
    if (segment.speed_multiplier !== 1.0) {
      capabilities.add('speed_change');
      reasons.set('speed_change', `Speed multiplier: ${segment.speed_multiplier}x`);
    }

    // Overlay detection
    if (segment.track === 'overlay') {
      capabilities.add('overlay');
      reasons.set('overlay', 'Contains overlay tracks');
    }
  }

  // Check audio tracks
  if (plan.audio_tracks.length > 0) {
    capabilities.add('audio_mux');
    reasons.set('audio_mux', `${plan.audio_tracks.length} audio track(s)`);

    for (const audio of plan.audio_tracks) {
      if (audio.fade_in_ms > 0 || audio.fade_out_ms > 0) {
        capabilities.add('audio_fade');
        reasons.set('audio_fade', 'Audio fade effects');
      }
    }
  }

  // Check output format
  const { width, height } = plan.output_format;
  if (width !== 1080 || height !== 1920) {
    capabilities.add('resize');
    reasons.set('resize', `Output resolution: ${width}x${height}`);
  }

  if (plan.output_format.container !== 'mp4') {
    capabilities.add('format_convert');
    reasons.set('format_convert', `Output format: ${plan.output_format.container}`);
  }

  // Multiple segments = potential segment replacement
  if (plan.timeline.length > 1) {
    const hasReordering = plan.timeline.some((seg, i) => {
      if (i === 0) return false;
      return seg.source_segment_id < plan.timeline[i - 1].source_segment_id;
    });
    if (hasReordering) {
      capabilities.add('segment_replace');
      reasons.set('segment_replace', 'Segment reordering detected');
    }
  }

  return { capabilities, reasons };
}

// ============================================
// ENGINE SELECTION
// ============================================

export interface EngineSelectionResult {
  selectedEngine: EngineCapabilityProfile | null;
  selectedEngineId: EngineId;
  canExecute: boolean;
  unsatisfiedCapabilities: Capability[];
  reason: string;
  alternativeEngines: EngineCapabilityProfile[];
}

export function selectEngine(
  requiredCapabilities: RequiredCapabilities,
  skipEngines: EngineId[] = []
): EngineSelectionResult {
  const required = requiredCapabilities.capabilities;
  
  // Sort by priority
  const sortedEngines = [...ENGINE_CAPABILITIES]
    .filter(e => !skipEngines.includes(e.id))
    .sort((a, b) => a.priority - b.priority);

  // Find first engine that satisfies ALL capabilities
  for (const engine of sortedEngines) {
    if (engine.id === 'plan_export') continue; // Skip plan_export in main selection
    
    const unsatisfied: Capability[] = [];
    for (const cap of required) {
      if (!engine.capabilities.has(cap)) {
        unsatisfied.push(cap);
      }
    }

    if (unsatisfied.length === 0) {
      return {
        selectedEngine: engine,
        selectedEngineId: engine.id,
        canExecute: true,
        unsatisfiedCapabilities: [],
        reason: `${engine.name} satisfies all ${required.size} required capabilities`,
        alternativeEngines: sortedEngines.filter(e => e.id !== engine.id && e.id !== 'plan_export'),
      };
    }
  }

  // No engine can satisfy - check what's missing for each
  const planExport = ENGINE_CAPABILITIES.find(e => e.id === 'plan_export')!;
  
  // Find which capabilities prevented all engines
  const allUnsatisfied = new Set<Capability>();
  for (const cap of required) {
    const anyEngineSupports = sortedEngines
      .filter(e => e.id !== 'plan_export')
      .some(e => e.capabilities.has(cap));
    if (!anyEngineSupports) {
      allUnsatisfied.add(cap);
    }
  }

  return {
    selectedEngine: planExport,
    selectedEngineId: 'plan_export',
    canExecute: false,
    unsatisfiedCapabilities: [...required],
    reason: `This variation requires advanced rendering (${[...required].join(', ')}). Exported as plan.`,
    alternativeEngines: [],
  };
}

// ============================================
// ROUTER RESULT TYPE
// ============================================

export interface CapabilityRouterResult {
  requiredCapabilities: RequiredCapabilities;
  selection: EngineSelectionResult;
  executionPath: EngineId[];
}

export function routePlan(plan: ExecutionPlan): CapabilityRouterResult {
  const requiredCapabilities = extractRequiredCapabilities(plan);
  const selection = selectEngine(requiredCapabilities);

  // Build execution path (engines to try in order)
  const executionPath: EngineId[] = [];
  
  if (selection.canExecute) {
    executionPath.push(selection.selectedEngineId);
    // Add fallback options
    for (const alt of selection.alternativeEngines) {
      if (alt.priority > (selection.selectedEngine?.priority || 0)) {
        executionPath.push(alt.id);
      }
    }
  }
  
  executionPath.push('plan_export'); // Always available

  return {
    requiredCapabilities,
    selection,
    executionPath,
  };
}
