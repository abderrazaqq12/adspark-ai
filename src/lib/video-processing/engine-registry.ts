// Video Processing Engine Registry

import { VideoProcessingEngine, EngineTier, ProcessingBackend } from './types';

export const VIDEO_PROCESSING_ENGINES: VideoProcessingEngine[] = [
  // === FREE TIER (Browser-based) ===
  {
    id: 'ffmpeg-wasm',
    name: 'Browser FFMPEG',
    tier: 'free',
    backends: ['browser'],
    capabilities: ['trim', 'merge', 'transcode', 'effects', 'transitions'],
    costPerSecond: 0,
    maxDuration: 60,
    priority: 100,
    available: true,
  },
  {
    id: 'webcodecs',
    name: 'WebCodecs API',
    tier: 'free',
    backends: ['browser'],
    capabilities: ['transcode', 'frame-extraction', 'realtime'],
    costPerSecond: 0,
    maxDuration: 120,
    priority: 95,
    available: true,
  },
  {
    id: 'ken-burns',
    name: 'Ken Burns Effect',
    tier: 'free',
    backends: ['browser'],
    capabilities: ['image-to-video', 'pan-zoom'],
    costPerSecond: 0,
    maxDuration: 30,
    priority: 90,
    available: true,
  },
  {
    id: 'parallax',
    name: 'Parallax Motion',
    tier: 'free',
    backends: ['browser'],
    capabilities: ['image-to-video', '2.5d-effect'],
    costPerSecond: 0,
    maxDuration: 30,
    priority: 85,
    available: true,
  },

  // === LOW COST TIER ===
  {
    id: 'kling-2.5',
    name: 'Kling 2.5',
    tier: 'low',
    backends: ['cloud-api'],
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
    backends: ['cloud-api'],
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
    backends: ['cloud-api'],
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.03,
    maxDuration: 8,
    priority: 65,
    available: true,
  },
  {
    id: 'kie-luma',
    name: 'Kie.ai Luma',
    tier: 'low',
    backends: ['cloud-api'],
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.05,
    maxDuration: 5,
    priority: 60,
    available: true,
  },

  // === MEDIUM TIER ===
  {
    id: 'runway-gen3',
    name: 'Runway Gen-3',
    tier: 'medium',
    backends: ['cloud-api'],
    capabilities: ['text-to-video', 'image-to-video', 'video-to-video'],
    costPerSecond: 0.12,
    maxDuration: 10,
    priority: 85,
    available: true,
  },
  {
    id: 'veo-3.1',
    name: 'Google Veo 3.1',
    tier: 'medium',
    backends: ['cloud-api'],
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
    backends: ['cloud-api'],
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.08,
    maxDuration: 5,
    priority: 75,
    available: true,
  },
  {
    id: 'kie-runway',
    name: 'Kie.ai Runway',
    tier: 'medium',
    backends: ['cloud-api'],
    capabilities: ['text-to-video', 'image-to-video'],
    costPerSecond: 0.10,
    maxDuration: 10,
    priority: 80,
    available: true,
  },

  // === PREMIUM TIER ===
  {
    id: 'sora-2',
    name: 'OpenAI Sora 2',
    tier: 'premium',
    backends: ['cloud-api'],
    capabilities: ['text-to-video', 'image-to-video', 'cinematic'],
    costPerSecond: 0.20,
    maxDuration: 20,
    priority: 98,
    available: true,
  },
  {
    id: 'sora-2-pro',
    name: 'OpenAI Sora 2 Pro',
    tier: 'premium',
    backends: ['cloud-api'],
    capabilities: ['text-to-video', 'image-to-video', 'cinematic', '4k'],
    costPerSecond: 0.35,
    maxDuration: 60,
    priority: 100,
    available: true,
  },
  {
    id: 'omnihuman',
    name: 'OmniHuman',
    tier: 'premium',
    backends: ['cloud-api'],
    capabilities: ['avatar', 'lip-sync', 'talking-head'],
    costPerSecond: 0.18,
    maxDuration: 60,
    priority: 88,
    available: true,
  },
  {
    id: 'kie-veo-3.1',
    name: 'Kie.ai Veo 3.1',
    tier: 'premium',
    backends: ['cloud-api'],
    capabilities: ['text-to-video', 'image-to-video', 'cinematic'],
    costPerSecond: 0.15,
    maxDuration: 8,
    priority: 85,
    available: true,
  },

  // === CODE-BASED (Remotion) ===
  {
    id: 'remotion-ugc',
    name: 'Remotion UGC',
    tier: 'free',
    backends: ['remotion'],
    capabilities: ['template-video', 'text-animation', 'layout'],
    costPerSecond: 0,
    maxDuration: 60,
    priority: 80,
    available: true,
  },
  {
    id: 'remotion-product',
    name: 'Remotion Product',
    tier: 'free',
    backends: ['remotion'],
    capabilities: ['template-video', 'product-showcase', 'split-screen'],
    costPerSecond: 0,
    maxDuration: 60,
    priority: 75,
    available: true,
  },
];

// Get engines by tier
export function getEnginesByTier(tier: EngineTier): VideoProcessingEngine[] {
  if (tier === 'ai-chooses') {
    return VIDEO_PROCESSING_ENGINES.filter(e => e.available);
  }
  return VIDEO_PROCESSING_ENGINES.filter(e => e.tier === tier && e.available);
}

// Get engines by backend
export function getEnginesByBackend(backend: ProcessingBackend): VideoProcessingEngine[] {
  if (backend === 'auto') {
    return VIDEO_PROCESSING_ENGINES.filter(e => e.available);
  }
  return VIDEO_PROCESSING_ENGINES.filter(e => e.backends.includes(backend) && e.available);
}

// Get engine by ID
export function getEngineById(id: string): VideoProcessingEngine | undefined {
  return VIDEO_PROCESSING_ENGINES.find(e => e.id === id);
}

// Select best engine based on requirements
export function selectBestEngine(
  tier: EngineTier,
  backend: ProcessingBackend,
  capabilities: string[],
  duration: number
): VideoProcessingEngine | undefined {
  let engines = VIDEO_PROCESSING_ENGINES.filter(e => e.available);
  
  // Filter by tier
  if (tier !== 'ai-chooses') {
    engines = engines.filter(e => e.tier === tier);
  }
  
  // Filter by backend
  if (backend !== 'auto') {
    engines = engines.filter(e => e.backends.includes(backend));
  }
  
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

// Get tier display info
export function getTierInfo(tier: EngineTier): { label: string; description: string; color: string } {
  const info: Record<EngineTier, { label: string; description: string; color: string }> = {
    'free': {
      label: 'Free',
      description: 'Browser-based processing, no cost',
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
