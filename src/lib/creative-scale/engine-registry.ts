/**
 * Creative Scale - Engine Registry
 * Normalized registry of all available video engines
 * Add new engines here - NO code changes required elsewhere
 */

import { EngineEntry } from './router-types';

/**
 * ENGINE_REGISTRY
 * 
 * To add a new engine:
 * 1. Add an entry below with all required fields
 * 2. No other code changes needed
 * 3. Router will automatically consider it for matching
 */
export const ENGINE_REGISTRY: EngineEntry[] = [
  // ========== BROWSER ENGINES (Free) ==========
  {
    engine_id: 'ffmpeg-wasm',
    name: 'FFmpeg WebAssembly',
    location: 'browser',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 120,
      supports_filters: true,
      supports_audio_tracks: true,
      supports_speed_change: true,
      supports_ai_generation: false,
      supports_overlays: true,
      supports_transitions: true,
    },
    cost_profile: 'free',
    reliability_score: 0.85,
    available: true,
    cold_start_ms: 3000,
  },
  {
    engine_id: 'webcodecs',
    name: 'WebCodecs API',
    location: 'browser',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 60,
      supports_filters: false,
      supports_audio_tracks: true,
      supports_speed_change: true,
      supports_ai_generation: false,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'free',
    reliability_score: 0.75,
    available: true,
    cold_start_ms: 500,
  },
  {
    engine_id: 'canvas-recorder',
    name: 'Canvas Recorder',
    location: 'browser',
    capabilities: {
      max_resolution: '720p',
      max_duration_sec: 60,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: false,
      supports_overlays: true,
      supports_transitions: false,
    },
    cost_profile: 'free',
    reliability_score: 0.70,
    available: true,
    cold_start_ms: 100,
  },

  // ========== SERVER ENGINES (Low-Medium) ==========
  {
    engine_id: 'remotion',
    name: 'Remotion',
    location: 'server',
    capabilities: {
      max_resolution: '4k',
      max_duration_sec: 300,
      supports_filters: true,
      supports_audio_tracks: true,
      supports_speed_change: true,
      supports_ai_generation: false,
      supports_overlays: true,
      supports_transitions: true,
    },
    cost_profile: 'low',
    reliability_score: 0.95,
    available: true,
    cold_start_ms: 5000,
  },
  {
    engine_id: 'ffmpeg-server',
    name: 'FFmpeg Server',
    location: 'server',
    capabilities: {
      max_resolution: '4k',
      max_duration_sec: 600,
      supports_filters: true,
      supports_audio_tracks: true,
      supports_speed_change: true,
      supports_ai_generation: false,
      supports_overlays: true,
      supports_transitions: true,
    },
    cost_profile: 'low',
    reliability_score: 0.92,
    available: true,
    cold_start_ms: 2000,
  },

  // ========== CLOUD ENGINES (Medium-High) ==========
  {
    engine_id: 'cloudinary',
    name: 'Cloudinary',
    location: 'cloud',
    capabilities: {
      max_resolution: '4k',
      max_duration_sec: 300,
      supports_filters: true,
      supports_audio_tracks: true,
      supports_speed_change: true,
      supports_ai_generation: false,
      supports_overlays: true,
      supports_transitions: true,
    },
    cost_profile: 'medium',
    reliability_score: 0.98,
    available: true,
    cold_start_ms: 1000,
  },
  {
    engine_id: 'mux',
    name: 'Mux Video',
    location: 'cloud',
    capabilities: {
      max_resolution: '4k',
      max_duration_sec: 600,
      supports_filters: false,
      supports_audio_tracks: true,
      supports_speed_change: true,
      supports_ai_generation: false,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'medium',
    reliability_score: 0.97,
    available: true,
    cold_start_ms: 500,
  },
  {
    engine_id: 'fal-ai',
    name: 'Fal.ai',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 60,
      supports_filters: true,
      supports_audio_tracks: true,
      supports_speed_change: true,
      supports_ai_generation: true,
      supports_overlays: true,
      supports_transitions: true,
    },
    cost_profile: 'medium',
    reliability_score: 0.88,
    available: true,
    cold_start_ms: 3000,
  },

  // ========== PREMIUM AI ENGINES (High) ==========
  {
    engine_id: 'runway-gen3',
    name: 'Runway Gen-3',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 10,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'high',
    reliability_score: 0.85,
    available: true,
    cold_start_ms: 30000,
  },
  {
    engine_id: 'sora',
    name: 'OpenAI Sora',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 20,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'high',
    reliability_score: 0.80,
    available: true,
    cold_start_ms: 60000,
  },
  {
    engine_id: 'veo-3',
    name: 'Google Veo 3',
    location: 'cloud',
    capabilities: {
      max_resolution: '4k',
      max_duration_sec: 30,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'high',
    reliability_score: 0.82,
    available: true,
    cold_start_ms: 45000,
  },
  {
    engine_id: 'pika',
    name: 'Pika Labs',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 4,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'high',
    reliability_score: 0.78,
    available: true,
    cold_start_ms: 20000,
  },
  {
    engine_id: 'luma-dream-machine',
    name: 'Luma Dream Machine',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 5,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'high',
    reliability_score: 0.80,
    available: true,
    cold_start_ms: 25000,
  },
  {
    engine_id: 'kling-ai',
    name: 'Kling AI',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 10,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'medium',
    reliability_score: 0.82,
    available: true,
    cold_start_ms: 30000,
  },
  {
    engine_id: 'minimax',
    name: 'MiniMax Video',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 6,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'medium',
    reliability_score: 0.79,
    available: true,
    cold_start_ms: 20000,
  },
  {
    engine_id: 'hailuo',
    name: 'Hailuo AI',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 5,
      supports_filters: false,
      supports_audio_tracks: false,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'low',
    reliability_score: 0.76,
    available: true,
    cold_start_ms: 15000,
  },

  // ========== AVATAR ENGINES ==========
  {
    engine_id: 'heygen',
    name: 'HeyGen',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 120,
      supports_filters: false,
      supports_audio_tracks: true,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'high',
    reliability_score: 0.90,
    available: true,
    cold_start_ms: 20000,
  },
  {
    engine_id: 'synthesia',
    name: 'Synthesia',
    location: 'cloud',
    capabilities: {
      max_resolution: '1080p',
      max_duration_sec: 180,
      supports_filters: false,
      supports_audio_tracks: true,
      supports_speed_change: false,
      supports_ai_generation: true,
      supports_overlays: false,
      supports_transitions: false,
    },
    cost_profile: 'high',
    reliability_score: 0.92,
    available: true,
    cold_start_ms: 30000,
  },
];

// ============================================
// REGISTRY HELPERS
// ============================================

export function getEngine(engineId: string): EngineEntry | undefined {
  return ENGINE_REGISTRY.find(e => e.engine_id === engineId);
}

export function getAvailableEngines(): EngineEntry[] {
  return ENGINE_REGISTRY.filter(e => e.available);
}

export function getEnginesByLocation(location: EngineEntry['location']): EngineEntry[] {
  return ENGINE_REGISTRY.filter(e => e.available && e.location === location);
}

export function getEnginesByCost(maxCost: EngineEntry['cost_profile']): EngineEntry[] {
  const costOrder = ['free', 'low', 'medium', 'high'];
  const maxIndex = costOrder.indexOf(maxCost);
  return ENGINE_REGISTRY.filter(e => 
    e.available && costOrder.indexOf(e.cost_profile) <= maxIndex
  );
}
