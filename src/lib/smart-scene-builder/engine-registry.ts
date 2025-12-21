// Smart Scene Builder - Engine Registry
// All video engines defined here with adapter pattern support

import { VideoEngineSpec, EngineCapability } from './types';

export const SMART_ENGINE_REGISTRY: VideoEngineSpec[] = [
  // === FREE TIER ===
  {
    engineId: 'nanobanana',
    name: 'NanoBanana',
    tier: 'free',
    costPerSecond: 0,
    maxDurationSec: 10,
    quality: 'fast',
    capabilities: ['image-to-video', 'text-to-video', 'zoom-pan'],
    priority: 80,
    available: true,
  },
  {
    engineId: 'ffmpeg_creative',
    name: 'Creative Engine (FFmpeg)',
    tier: 'free',
    costPerSecond: 0,
    maxDurationSec: 60,
    quality: 'fast',
    capabilities: ['image-to-video', 'video-to-video', 'zoom-pan', 'transitions'],
    priority: 90,
    available: true,
  },
  {
    engineId: 'gemini_image',
    name: 'Gemini Image',
    tier: 'free',
    costPerSecond: 0,
    maxDurationSec: 5,
    quality: 'balanced',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 75,
    available: true,
  },

  // === BUDGET TIER (Low Cost) ===
  {
    engineId: 'kling_standard',
    name: 'Kling 2.5',
    tier: 'budget',
    costPerSecond: 0.05,
    maxDurationSec: 10,
    quality: 'balanced',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 70,
    available: true,
  },
  {
    engineId: 'minimax',
    name: 'MiniMax',
    tier: 'budget',
    costPerSecond: 0.04,
    maxDurationSec: 6,
    quality: 'balanced',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 65,
    available: true,
  },
  {
    engineId: 'wan_2_5',
    name: 'Wan 2.5',
    tier: 'budget',
    costPerSecond: 0.03,
    maxDurationSec: 8,
    quality: 'fast',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 60,
    available: true,
  },
  {
    engineId: 'hailuo',
    name: 'Hailuo',
    tier: 'budget',
    costPerSecond: 0.06,
    maxDurationSec: 6,
    quality: 'balanced',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 55,
    available: true,
  },
  {
    engineId: 'haiper',
    name: 'Haiper',
    tier: 'budget',
    costPerSecond: 0.035,
    maxDurationSec: 4,
    quality: 'fast',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 50,
    available: true,
  },
  {
    engineId: 'flux_video',
    name: 'Flux Video',
    tier: 'budget',
    costPerSecond: 0.045,
    maxDurationSec: 5,
    quality: 'balanced',
    capabilities: ['image-to-video'],
    priority: 52,
    available: true,
  },

  // === PREMIUM TIER ===
  {
    engineId: 'veo_3',
    name: 'Google Veo 3',
    tier: 'premium',
    costPerSecond: 0.15,
    maxDurationSec: 8,
    quality: 'cinematic',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 95,
    available: true,
  },
  {
    engineId: 'runway_gen3',
    name: 'Runway Gen-3',
    tier: 'premium',
    costPerSecond: 0.12,
    maxDurationSec: 10,
    quality: 'cinematic',
    capabilities: ['text-to-video', 'image-to-video', 'video-to-video'],
    priority: 90,
    available: true,
  },
  {
    engineId: 'sora',
    name: 'OpenAI Sora',
    tier: 'premium',
    costPerSecond: 0.20,
    maxDurationSec: 20,
    quality: 'cinematic',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 98,
    available: true,
  },
  {
    engineId: 'pika_2_1',
    name: 'Pika 2.1',
    tier: 'premium',
    costPerSecond: 0.10,
    maxDurationSec: 4,
    quality: 'balanced',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 75,
    available: true,
  },
  {
    engineId: 'luma',
    name: 'Luma Dream Machine',
    tier: 'premium',
    costPerSecond: 0.08,
    maxDurationSec: 5,
    quality: 'balanced',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 72,
    available: true,
  },
  {
    engineId: 'kling_pro',
    name: 'Kling 2.6 Pro',
    tier: 'premium',
    costPerSecond: 0.10,
    maxDurationSec: 10,
    quality: 'cinematic',
    capabilities: ['text-to-video', 'image-to-video'],
    priority: 85,
    available: true,
  },
  {
    engineId: 'stable_video',
    name: 'Stable Video',
    tier: 'premium',
    costPerSecond: 0.09,
    maxDurationSec: 4,
    quality: 'balanced',
    capabilities: ['image-to-video'],
    priority: 68,
    available: true,
  },

  // === AVATAR ENGINES ===
  {
    engineId: 'heygen',
    name: 'HeyGen',
    tier: 'premium',
    costPerSecond: 0.25,
    maxDurationSec: 120,
    quality: 'cinematic',
    capabilities: ['avatar', 'text-to-video'],
    priority: 88,
    available: true,
  },
  {
    engineId: 'omnihuman',
    name: 'OmniHuman',
    tier: 'premium',
    costPerSecond: 0.18,
    maxDurationSec: 60,
    quality: 'cinematic',
    capabilities: ['avatar', 'image-to-video'],
    priority: 82,
    available: true,
  },
];

// Get all available engines
export function getAllEngines(): VideoEngineSpec[] {
  return SMART_ENGINE_REGISTRY.filter(e => e.available);
}

// Get engine by ID
export function getEngineById(engineId: string): VideoEngineSpec | undefined {
  return SMART_ENGINE_REGISTRY.find(e => e.engineId === engineId);
}

// Get engines by tier
export function getEnginesByTier(tier: VideoEngineSpec['tier']): VideoEngineSpec[] {
  return SMART_ENGINE_REGISTRY.filter(e => e.tier === tier && e.available);
}

// Get engines by capability
export function getEnginesByCapability(capability: EngineCapability): VideoEngineSpec[] {
  return SMART_ENGINE_REGISTRY.filter(
    e => e.capabilities.includes(capability) && e.available
  );
}

// Get engines within budget
export function getEnginesWithinBudget(
  maxCostPerSecond: number,
  duration: number
): VideoEngineSpec[] {
  return SMART_ENGINE_REGISTRY.filter(
    e => e.costPerSecond <= maxCostPerSecond && 
         e.maxDurationSec >= duration && 
         e.available
  ).sort((a, b) => b.priority - a.priority);
}

// Get tier budget limits
export function getTierBudgetLimit(tier: string): number {
  switch (tier) {
    case 'free': return 0;
    case 'low': return 0.06;
    case 'balanced': return 0.12;
    case 'premium': return Infinity;
    case 'auto': return Infinity;
    default: return 0.06;
  }
}
