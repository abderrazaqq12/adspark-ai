/**
 * Creative Scale - Capability-Based Engine Router
 * SERVER-ONLY RENDERING - No browser engines
 * 
 * Execution Order:
 * 1. Cloudinary - basic transformations
 * 2. Server FFmpeg (VPS) - all capabilities
 * 3. Plan Export - manual execution fallback
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

export type EngineId = 'cloudinary' | 'server_ffmpeg' | 'plan_export';

export interface EngineCapabilityProfile {
  id: EngineId;
  name: string;
  capabilities: Set<Capability>;
  isPaid: boolean;
  priority: number;
}

// ============================================
// ENGINE CAPABILITY REGISTRY (Server-Only)
// ============================================

export const ENGINE_CAPABILITIES: EngineCapabilityProfile[] = [
  {
    id: 'cloudinary',
    name: 'Cloudinary Video API',
    capabilities: new Set(['trim', 'resize', 'format_convert', 'speed_change']),
    isPaid: false,
    priority: 99, // Downgraded to fallback
  },
  {
    id: 'server_ffmpeg',
    name: 'Server FFmpeg (VPS)',
    capabilities: new Set([
      'trim', 'speed_change', 'resize', 'format_convert',
      'segment_replace', 'audio_mux', 'audio_fade',
      'advanced_filters', 'overlay', 'transition', 'text_overlay'
    ]),
    isPaid: false,
    priority: 1, // Primary (Server Default)
  },
  {
    id: 'plan_export',
    name: 'Plan Export (Manual Render)',
    capabilities: new Set([
      'trim', 'speed_change', 'resize', 'format_convert',
      'segment_replace', 'audio_mux', 'audio_fade',
      'advanced_filters', 'overlay', 'transition', 'text_overlay'
    ]),
    isPaid: false,
    priority: 999,
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

  for (const segment of plan.timeline) {
    if (segment.trim_start_ms > 0 || segment.trim_end_ms < segment.source_duration_ms) {
      capabilities.add('trim');
      reasons.set('trim', 'Timeline has trimmed segments');
    }

    if (segment.speed_multiplier !== 1.0) {
      capabilities.add('speed_change');
      reasons.set('speed_change', `Speed multiplier: ${segment.speed_multiplier}x`);
    }

    if (segment.track === 'overlay') {
      capabilities.add('overlay');
      reasons.set('overlay', 'Contains overlay tracks');
    }
  }

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

  const { width, height } = plan.output_format;
  if (width !== 1080 || height !== 1920) {
    capabilities.add('resize');
    reasons.set('resize', `Output resolution: ${width}x${height}`);
  }

  if (plan.output_format.container !== 'mp4') {
    capabilities.add('format_convert');
    reasons.set('format_convert', `Output format: ${plan.output_format.container}`);
  }

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
// ENGINE SELECTION (Server-Only)
// HARD RULE: server_ffmpeg = VPS only, NO fal.ai fallback
// ============================================

export interface EngineSelectionResult {
  selectedEngine: EngineCapabilityProfile | null;
  selectedEngineId: EngineId;
  canExecute: boolean;
  unsatisfiedCapabilities: Capability[];
  reason: string;
  alternativeEngines: EngineCapabilityProfile[];
  allowCloudFallback: boolean; // Explicit flag - false for server_ffmpeg
}

// ============================================
// RENDERING MODES
// ============================================

export type RenderingMode = 'auto' | 'server_only' | 'cloudinary_only';

export function selectEngine(
  requiredCapabilities: RequiredCapabilities,
  skipEngines: EngineId[] = [],
  mode: RenderingMode = 'auto'
): EngineSelectionResult {
  const required = requiredCapabilities.capabilities;

  // FORCE MODES
  if (mode === 'server_only') {
    const serverFFmpeg = ENGINE_CAPABILITIES.find(e => e.id === 'server_ffmpeg');
    if (serverFFmpeg) {
      return {
        selectedEngine: serverFFmpeg,
        selectedEngineId: 'server_ffmpeg',
        canExecute: true,
        unsatisfiedCapabilities: [],
        reason: 'Forced by User (Server Only) - VPS Execution',
        alternativeEngines: [],
        allowCloudFallback: false
      };
    }
  }

  if (mode === 'cloudinary_only') {
    const cloudinary = ENGINE_CAPABILITIES.find(e => e.id === 'cloudinary');
    if (cloudinary) {
      // Warning: if capabilities missing, it might fail, but user forced it.
      // We will check capabilities but soft-warn? Or just force it.
      // Let's force it but providing unsatisfied info.
      const unsatisfied: Capability[] = [];
      for (const cap of required) {
        if (!cloudinary.capabilities.has(cap)) unsatisfied.push(cap);
      }

      return {
        selectedEngine: cloudinary,
        selectedEngineId: 'cloudinary',
        canExecute: true, // Attempt it
        unsatisfiedCapabilities: unsatisfied,
        reason: unsatisfied.length > 0 ? `Forced Cloudinary (Missing: ${unsatisfied.join(', ')})` : 'Forced by User (Cloudinary Only)',
        alternativeEngines: [],
        allowCloudFallback: true
      };
    }
  }

  // HARD RULE: If native_ffmpeg capability is required, use server_ffmpeg ONLY
  // No cloud fallback allowed for this engine
  if (required.has('advanced_filters') || required.has('segment_replace') ||
    required.has('audio_fade') || required.has('overlay') || required.has('transition')) {
    const serverFFmpeg = ENGINE_CAPABILITIES.find(e => e.id === 'server_ffmpeg');
    if (serverFFmpeg && !skipEngines.includes('server_ffmpeg')) {
      return {
        selectedEngine: serverFFmpeg,
        selectedEngineId: 'server_ffmpeg',
        canExecute: true,
        unsatisfiedCapabilities: [],
        reason: 'Server FFmpeg (VPS) selected for advanced capabilities - VPS only, no cloud fallback',
        alternativeEngines: [],
        allowCloudFallback: false, // CRITICAL: No fal.ai allowed. This prevents fallback to engine adapters.
      };
    }
  }

  const sortedEngines = [...ENGINE_CAPABILITIES]
    .filter(e => !skipEngines.includes(e.id))
    .sort((a, b) => a.priority - b.priority);

  for (const engine of sortedEngines) {
    if (engine.id === 'plan_export') continue;

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
        allowCloudFallback: engine.id !== 'server_ffmpeg', // Only allow cloud fallback for non-server engines
      };
    }
  }

  const planExport = ENGINE_CAPABILITIES.find(e => e.id === 'plan_export')!;

  return {
    selectedEngine: planExport,
    selectedEngineId: 'plan_export',
    canExecute: false,
    unsatisfiedCapabilities: [...required],
    reason: `This variation requires advanced rendering (${[...required].join(', ')}). Exported as plan.`,
    alternativeEngines: [],
    allowCloudFallback: false,
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

export function routePlan(plan: ExecutionPlan, mode: RenderingMode = 'auto'): CapabilityRouterResult {
  const requiredCapabilities = extractRequiredCapabilities(plan);
  const selection = selectEngine(requiredCapabilities, [], mode);

  const executionPath: EngineId[] = [];

  if (selection.canExecute) {
    executionPath.push(selection.selectedEngineId);
    for (const alt of selection.alternativeEngines) {
      if (alt.priority > (selection.selectedEngine?.priority || 0)) {
        executionPath.push(alt.id);
      }
    }
  }

  executionPath.push('plan_export');

  return {
    requiredCapabilities,
    selection,
    executionPath,
  };
}
