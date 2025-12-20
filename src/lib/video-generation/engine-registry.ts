// Video Engine Registry - All engines defined here, never in UI

import { VideoEngine } from './types';

export const VIDEO_ENGINE_REGISTRY: VideoEngine[] = [
  // === FREE TIER ===
  {
    engine_id: 'nanobanana',
    name: 'NanoBanana',
    type: 'video',
    cost_per_second: 0,
    quality: 'fast',
    supports: ['image-to-video', 'text-to-video'],
    execution: ['agent', 'edge'],
    tier: 'free',
    max_duration_sec: 10,
    priority: 80,
    available: true,
  },
  {
    engine_id: 'ffmpeg_creative',
    name: 'Creative Engine',
    type: 'video',
    cost_per_second: 0,
    quality: 'fast',
    supports: ['image-to-video', 'video-to-video'],
    execution: ['agent', 'edge'],
    tier: 'free',
    max_duration_sec: 60,
    priority: 90,
    available: true,
  },

  // === BUDGET TIER ===
  {
    engine_id: 'kling_standard',
    name: 'Kling Standard',
    type: 'video',
    cost_per_second: 0.05,
    quality: 'balanced',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'budget',
    max_duration_sec: 10,
    priority: 70,
    available: true,
  },
  {
    engine_id: 'minimax',
    name: 'MiniMax',
    type: 'video',
    cost_per_second: 0.04,
    quality: 'balanced',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'budget',
    max_duration_sec: 6,
    priority: 65,
    available: true,
  },
  {
    engine_id: 'wan_2_5',
    name: 'Wan 2.5',
    type: 'video',
    cost_per_second: 0.03,
    quality: 'fast',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'budget',
    max_duration_sec: 8,
    priority: 60,
    available: true,
  },
  {
    engine_id: 'hailuo',
    name: 'Hailuo',
    type: 'video',
    cost_per_second: 0.06,
    quality: 'balanced',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'budget',
    max_duration_sec: 6,
    priority: 55,
    available: true,
  },

  // === PREMIUM TIER ===
  {
    engine_id: 'veo_3',
    name: 'Google Veo 3',
    type: 'video',
    cost_per_second: 0.15,
    quality: 'cinematic',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'premium',
    max_duration_sec: 8,
    priority: 95,
    available: true,
  },
  {
    engine_id: 'runway_gen3',
    name: 'Runway Gen-3',
    type: 'video',
    cost_per_second: 0.12,
    quality: 'cinematic',
    supports: ['text-to-video', 'image-to-video', 'video-to-video'],
    execution: ['agent', 'edge'],
    tier: 'premium',
    max_duration_sec: 10,
    priority: 90,
    available: true,
  },
  {
    engine_id: 'sora',
    name: 'OpenAI Sora',
    type: 'video',
    cost_per_second: 0.20,
    quality: 'cinematic',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'premium',
    max_duration_sec: 20,
    priority: 98,
    available: true,
  },
  {
    engine_id: 'pika',
    name: 'Pika Labs',
    type: 'video',
    cost_per_second: 0.10,
    quality: 'balanced',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'premium',
    max_duration_sec: 4,
    priority: 75,
    available: true,
  },
  {
    engine_id: 'luma',
    name: 'Luma Dream Machine',
    type: 'video',
    cost_per_second: 0.08,
    quality: 'balanced',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'premium',
    max_duration_sec: 5,
    priority: 72,
    available: true,
  },
  {
    engine_id: 'kling_pro',
    name: 'Kling Pro',
    type: 'video',
    cost_per_second: 0.10,
    quality: 'cinematic',
    supports: ['text-to-video', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'premium',
    max_duration_sec: 10,
    priority: 85,
    available: true,
  },

  // === AVATAR ENGINES ===
  {
    engine_id: 'heygen',
    name: 'HeyGen',
    type: 'video',
    cost_per_second: 0.25,
    quality: 'cinematic',
    supports: ['avatar', 'text-to-video'],
    execution: ['agent', 'edge'],
    tier: 'premium',
    max_duration_sec: 120,
    priority: 88,
    available: true,
  },
  {
    engine_id: 'omnihuman',
    name: 'OmniHuman',
    type: 'video',
    cost_per_second: 0.18,
    quality: 'cinematic',
    supports: ['avatar', 'image-to-video'],
    execution: ['agent', 'edge'],
    tier: 'premium',
    max_duration_sec: 60,
    priority: 82,
    available: true,
  },
];

// Get all engines
export function getAllEngines(): VideoEngine[] {
  return VIDEO_ENGINE_REGISTRY.filter(e => e.available);
}

// Get engine by ID
export function getEngineById(engineId: string): VideoEngine | undefined {
  return VIDEO_ENGINE_REGISTRY.find(e => e.engine_id === engineId);
}

// Get engines by tier
export function getEnginesByTier(tier: VideoEngine['tier']): VideoEngine[] {
  return VIDEO_ENGINE_REGISTRY.filter(e => e.tier === tier && e.available);
}

// Get engines supporting a capability
export function getEnginesByCapability(capability: string): VideoEngine[] {
  return VIDEO_ENGINE_REGISTRY.filter(
    e => e.supports.includes(capability as any) && e.available
  );
}
