/**
 * Video Processing Engine Registry
 * SERVER-ONLY ARCHITECTURE
 * 
 * All video processing happens on VPS or cloud APIs.
 * Browser-side engines have been intentionally removed.
 */

import { VideoProcessingEngine, EngineTier, ProcessingBackend } from './types';

/**
 * ENGINE_REGISTRY
 * Only server and cloud engines - no browser engines
 */
export const VIDEO_PROCESSING_ENGINES: VideoProcessingEngine[] = [
  // ========== VPS SERVER ENGINE (Primary) ==========
  {
    id: 'vps-ffmpeg',
    name: 'VPS FFmpeg',
    tier: 'free',
    location: 'server',
    capabilities: [
      'trim', 'merge', 'transcode', 'resize', 'speed-change',
      'filters', 'audio-tracks', 'overlays', 'transitions',
      'ken-burns', 'parallax', 'zoom-pan'
    ],
    costPerSecond: 0,
    maxDuration: 600,
    priority: 100,
    available: true,
  },

  // ========== CLOUD ENGINES (Low-Medium) ==========
  {
    id: 'cloudinary',
    name: 'Cloudinary',
    tier: 'medium',
    location: 'cloud',
    capabilities: ['trim', 'resize', 'transcode', 'overlays', 'transitions'],
    costPerSecond: 0.001,
    maxDuration: 300,
    priority: 80,
    available: true,
  },
  {
    id: 'mux',
    name: 'Mux Video',
    tier: 'medium',
    location: 'cloud',
    capabilities: ['transcode', 'resize', 'streaming'],
    costPerSecond: 0.002,
    maxDuration: 600,
    priority: 75,
    available: true,
  },

  // ========== LOW COST AI ENGINES ==========
  {
    id: 'hailuo',
    name: 'Hailuo AI',
    tier: 'low',
    location: 'cloud',
    capabilities: ['ai-generation', 'text-to-video'],
    costPerSecond: 0.015,
    maxDuration: 5,
    priority: 70,
    available: true,
  },
  {
    id: 'kling-2.5',
    name: 'Kling 2.5',
    tier: 'low',
    location: 'cloud',
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.03,
    maxDuration: 10,
    priority: 75,
    available: true,
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    tier: 'low',
    location: 'cloud',
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.04,
    maxDuration: 6,
    priority: 70,
    available: true,
  },
  {
    id: 'wan-2.5',
    name: 'Wan 2.5',
    tier: 'low',
    location: 'cloud',
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.03,
    maxDuration: 8,
    priority: 65,
    available: true,
  },

  // ========== MEDIUM COST AI ENGINES ==========
  {
    id: 'runway-gen3',
    name: 'Runway Gen-3',
    tier: 'medium',
    location: 'cloud',
    capabilities: ['text-to-video', 'image-to-video', 'video-to-video'],
    costPerSecond: 0.12,
    maxDuration: 10,
    priority: 85,
    available: true,
  },
  {
    id: 'veo-3',
    name: 'Google Veo 3',
    tier: 'medium',
    location: 'cloud',
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.15,
    maxDuration: 8,
    priority: 90,
    available: true,
  },
  {
    id: 'luma-dream',
    name: 'Luma Dream Machine',
    tier: 'medium',
    location: 'cloud',
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.08,
    maxDuration: 5,
    priority: 75,
    available: true,
  },

  // ========== PREMIUM AI ENGINES ==========
  {
    id: 'sora',
    name: 'OpenAI Sora',
    tier: 'premium',
    location: 'cloud',
    capabilities: ['text-to-video', 'image-to-video', 'cinematic'],
    costPerSecond: 0.20,
    maxDuration: 20,
    priority: 98,
    available: true,
  },
  {
    id: 'sora-pro',
    name: 'OpenAI Sora Pro',
    tier: 'premium',
    location: 'cloud',
    capabilities: ['text-to-video', 'image-to-video', 'cinematic', '4k'],
    costPerSecond: 0.35,
    maxDuration: 60,
    priority: 100,
    available: true,
  },

  // ========== AVATAR ENGINES ==========
  {
    id: 'heygen',
    name: 'HeyGen',
    tier: 'premium',
    location: 'cloud',
    capabilities: ['avatar', 'lip-sync', 'talking-head'],
    costPerSecond: 0.04,
    maxDuration: 120,
    priority: 50,
    available: true,
  },
  {
    id: 'synthesia',
    name: 'Synthesia',
    tier: 'premium',
    location: 'cloud',
    capabilities: ['avatar', 'lip-sync', 'multi-language'],
    costPerSecond: 0.045,
    maxDuration: 180,
    priority: 48,
    available: true,
  },
  {
    id: 'omnihuman',
    name: 'OmniHuman',
    tier: 'premium',
    location: 'cloud',
    capabilities: ['avatar', 'lip-sync', 'talking-head'],
    costPerSecond: 0.18,
    maxDuration: 60,
    priority: 88,
    available: true,
  },
];

// ============================================
// REGISTRY HELPERS
// ============================================

export function getEngineById(id: string): VideoProcessingEngine | undefined {
  return VIDEO_PROCESSING_ENGINES.find(e => e.id === id);
}

export function getAvailableEngines(): VideoProcessingEngine[] {
  return VIDEO_PROCESSING_ENGINES.filter(e => e.available);
}

export function getEnginesByLocation(location: 'server' | 'cloud'): VideoProcessingEngine[] {
  return VIDEO_PROCESSING_ENGINES.filter(e => e.available && e.location === location);
}

export function getEnginesByTier(tier: EngineTier): VideoProcessingEngine[] {
  if (tier === 'ai-chooses') {
    return VIDEO_PROCESSING_ENGINES.filter(e => e.available);
  }
  return VIDEO_PROCESSING_ENGINES.filter(e => e.tier === tier && e.available);
}

export function getEnginesByBackend(backend: ProcessingBackend): VideoProcessingEngine[] {
  const location = backend === 'vps' ? 'server' : 'cloud';
  return VIDEO_PROCESSING_ENGINES.filter(e => e.available && e.location === location);
}

export function selectBestEngine(
  tier: EngineTier,
  backend: ProcessingBackend,
  capabilities: string[],
  duration: number
): VideoProcessingEngine | undefined {
  let engines = VIDEO_PROCESSING_ENGINES.filter(e => e.available);
  
  // Filter by tier
  if (tier !== 'ai-chooses') {
    const tierOrder: EngineTier[] = ['free', 'low', 'medium', 'premium'];
    const maxIndex = tierOrder.indexOf(tier);
    engines = engines.filter(e => tierOrder.indexOf(e.tier) <= maxIndex);
  }
  
  // Filter by backend (location)
  const location = backend === 'vps' ? 'server' : 'cloud';
  engines = engines.filter(e => e.location === location);
  
  // Filter by capabilities
  if (capabilities.length > 0) {
    engines = engines.filter(e => 
      capabilities.some(cap => e.capabilities.includes(cap))
    );
  }
  
  // Filter by duration
  engines = engines.filter(e => e.maxDuration >= duration);
  
  // Sort by priority and return best
  engines.sort((a, b) => b.priority - a.priority);
  
  return engines[0];
}

/**
 * Get the default server engine (VPS FFmpeg)
 * This is the primary engine for all video processing
 */
export function getDefaultServerEngine(): VideoProcessingEngine {
  const vpsEngine = VIDEO_PROCESSING_ENGINES.find(e => e.id === 'vps-ffmpeg');
  if (!vpsEngine) {
    throw new Error('VPS FFmpeg engine not found in registry - critical configuration error');
  }
  return vpsEngine;
}

// Get tier display info
export function getTierInfo(tier: EngineTier): { label: string; description: string; color: string } {
  const info: Record<EngineTier, { label: string; description: string; color: string }> = {
    'free': {
      label: 'Free',
      description: 'VPS FFmpeg processing, no cost',
      color: 'text-green-500'
    },
    'low': {
      label: 'Low Cost',
      description: '$0.03-0.05 per second',
      color: 'text-blue-500'
    },
    'medium': {
      label: 'Medium',
      description: '$0.08-0.15 per second',
      color: 'text-yellow-500'
    },
    'premium': {
      label: 'Premium',
      description: '$0.15-0.35 per second',
      color: 'text-purple-500'
    },
    'ai-chooses': {
      label: 'AI Chooses',
      description: 'AI selects optimal engine',
      color: 'text-pink-500'
    }
  };
  return info[tier];
}
