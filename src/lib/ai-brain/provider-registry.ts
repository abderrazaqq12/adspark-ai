/**
 * Global Provider Registry
 * 
 * Centralized registry of all AI providers, their costs, capabilities,
 * and quality scores. Used by the Cost Optimizer to make decisions.
 */

import { APIProvider, CostTier } from './types';

// ============= PROVIDER DEFINITIONS =============

export const PROVIDER_REGISTRY: Record<string, APIProvider> = {
  // ============= FREE / FFMPEG PROVIDERS =============
  'ffmpeg-local': {
    id: 'ffmpeg-local',
    name: 'Local FFmpeg',
    type: 'video',
    costPerUnit: 0,
    costPerSecond: 0,
    qualityScore: 60,
    speedScore: 95,
    isAvailable: true,
    capabilities: ['trim', 'merge', 'resize', 'text_overlay', 'transitions', 'pan-zoom', 'ken-burns'],
  },
  'ffmpeg-edge': {
    id: 'ffmpeg-edge',
    name: 'Edge FFmpeg',
    type: 'video',
    costPerUnit: 0,
    costPerSecond: 0,
    qualityScore: 60,
    speedScore: 85,
    isAvailable: true,
    capabilities: ['trim', 'merge', 'resize', 'text_overlay', 'transitions'],
  },
  'ffmpeg-motion': {
    id: 'ffmpeg-motion',
    name: 'FFMPEG Motion Effects',
    type: 'video',
    costPerUnit: 0,
    costPerSecond: 0,
    qualityScore: 65,
    speedScore: 90,
    isAvailable: true,
    capabilities: ['pan-zoom', 'ken-burns', 'parallax', 'shake', 'zoom'],
  },

  // ============= LOW COST VIDEO PROVIDERS =============
  'kling': {
    id: 'kling',
    name: 'Kling 2.5',
    type: 'video',
    costPerUnit: 0.05,
    costPerSecond: 0.004,
    qualityScore: 72,
    speedScore: 70,
    isAvailable: false,
    capabilities: ['image-to-video', 'motion-consistency', 'video-gen'],
    supportedMarkets: ['global'],
  },
  'minimax': {
    id: 'minimax',
    name: 'MiniMax',
    type: 'video',
    costPerUnit: 0.05,
    costPerSecond: 0.003,
    qualityScore: 70,
    speedScore: 75,
    isAvailable: false,
    capabilities: ['image-to-video', 'motion-consistency'],
  },
  'wan': {
    id: 'wan',
    name: 'Wan 2.5',
    type: 'video',
    costPerUnit: 0.05,
    costPerSecond: 0.0035,
    qualityScore: 71,
    speedScore: 72,
    isAvailable: false,
    capabilities: ['image-to-video', 'video-gen'],
  },
  'hailuo': {
    id: 'hailuo',
    name: 'Hailuo',
    type: 'video',
    costPerUnit: 0.03,
    costPerSecond: 0.003,
    qualityScore: 68,
    speedScore: 80,
    isAvailable: false,
    capabilities: ['image-to-video', 'basic-gen'],
  },

  // ============= MEDIUM COST VIDEO PROVIDERS =============
  'runway': {
    id: 'runway',
    name: 'Runway Gen-3',
    type: 'video',
    costPerUnit: 0.25,
    costPerSecond: 0.015,
    qualityScore: 85,
    speedScore: 60,
    isAvailable: false,
    capabilities: ['full-generation', 'text-rendering', 'character-consistency', 'cinematic'],
    supportedPlatforms: ['tiktok', 'instagram-reels', 'youtube-shorts'],
  },
  'luma': {
    id: 'luma',
    name: 'Luma Dream Machine',
    type: 'video',
    costPerUnit: 0.20,
    costPerSecond: 0.012,
    qualityScore: 82,
    speedScore: 65,
    isAvailable: false,
    capabilities: ['full-generation', 'motion-consistency'],
  },
  'veo': {
    id: 'veo',
    name: 'Google Veo 3.1',
    type: 'video',
    costPerUnit: 0.30,
    costPerSecond: 0.018,
    qualityScore: 88,
    speedScore: 55,
    isAvailable: false,
    capabilities: ['full-generation', 'photorealistic', 'cinematic'],
  },

  // ============= PREMIUM VIDEO PROVIDERS =============
  'sora': {
    id: 'sora',
    name: 'Sora 2',
    type: 'video',
    costPerUnit: 0.80,
    costPerSecond: 0.08,
    qualityScore: 95,
    speedScore: 40,
    isAvailable: false,
    capabilities: ['cinematic', 'photorealistic', 'complex-camera', 'physics-simulation'],
  },
  'sora-pro': {
    id: 'sora-pro',
    name: 'Sora 2 Pro',
    type: 'video',
    costPerUnit: 1.00,
    costPerSecond: 0.10,
    qualityScore: 98,
    speedScore: 35,
    isAvailable: false,
    capabilities: ['cinematic', 'photorealistic', 'complex-camera', 'physics-simulation', 'extended'],
  },

  // ============= IMAGE PROVIDERS =============
  'nano-banana': {
    id: 'nano-banana',
    name: 'Nano Banana (Gemini)',
    type: 'image',
    costPerUnit: 0.02,
    qualityScore: 75,
    speedScore: 90,
    isAvailable: true,
    capabilities: ['image-gen', 'fast'],
  },
  'flux': {
    id: 'flux',
    name: 'Flux',
    type: 'image',
    costPerUnit: 0.05,
    qualityScore: 85,
    speedScore: 70,
    isAvailable: false,
    capabilities: ['image-gen', 'high-quality'],
  },
  'leonardo': {
    id: 'leonardo',
    name: 'Leonardo AI',
    type: 'image',
    costPerUnit: 0.04,
    qualityScore: 82,
    speedScore: 75,
    isAvailable: false,
    capabilities: ['image-gen', 'style-transfer'],
  },
  'dalle': {
    id: 'dalle',
    name: 'DALL-E 3',
    type: 'image',
    costPerUnit: 0.04,
    qualityScore: 88,
    speedScore: 65,
    isAvailable: false,
    capabilities: ['image-gen', 'text-rendering'],
  },

  // ============= TEXT/LLM PROVIDERS =============
  'gemini-flash': {
    id: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    type: 'text',
    costPerUnit: 0.001,
    qualityScore: 85,
    speedScore: 95,
    isAvailable: true, // Default available via Lovable AI
    capabilities: ['text-gen', 'analysis', 'structured-output'],
  },
  'gemini-pro': {
    id: 'gemini-pro',
    name: 'Gemini 2.5 Pro',
    type: 'text',
    costPerUnit: 0.005,
    qualityScore: 92,
    speedScore: 75,
    isAvailable: true,
    capabilities: ['text-gen', 'analysis', 'reasoning', 'structured-output'],
  },
  'gpt-5': {
    id: 'gpt-5',
    name: 'GPT-5',
    type: 'text',
    costPerUnit: 0.01,
    qualityScore: 95,
    speedScore: 70,
    isAvailable: false,
    capabilities: ['text-gen', 'reasoning', 'analysis'],
  },

  // ============= AUDIO PROVIDERS =============
  'elevenlabs': {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    type: 'audio',
    costPerUnit: 0.05,
    costPerSecond: 0.002,
    qualityScore: 95,
    speedScore: 80,
    isAvailable: false,
    capabilities: ['voice-gen', 'voice-clone', 'multilingual'],
    supportedMarkets: ['global'],
  },
  'openai-tts': {
    id: 'openai-tts',
    name: 'OpenAI TTS',
    type: 'audio',
    costPerUnit: 0.03,
    costPerSecond: 0.0015,
    qualityScore: 85,
    speedScore: 90,
    isAvailable: false,
    capabilities: ['voice-gen'],
  },
};

// ============= TIER MAPPINGS =============

export const PROVIDER_TIERS: Record<CostTier, string[]> = {
  free: ['ffmpeg-local', 'ffmpeg-edge', 'ffmpeg-motion'],
  low: ['kling', 'minimax', 'wan', 'hailuo', 'nano-banana'],
  medium: ['runway', 'luma', 'veo', 'flux', 'leonardo', 'dalle', 'elevenlabs'],
  premium: ['sora', 'sora-pro', 'gpt-5'],
};

export const TIER_COST_RANGES: Record<CostTier, { min: number; max: number }> = {
  free: { min: 0, max: 0 },
  low: { min: 0.02, max: 0.15 },
  medium: { min: 0.15, max: 0.50 },
  premium: { min: 0.50, max: 2.00 },
};

// ============= HELPER FUNCTIONS =============

export function getProviderTier(providerId: string): CostTier {
  for (const [tier, providers] of Object.entries(PROVIDER_TIERS)) {
    if (providers.includes(providerId)) {
      return tier as CostTier;
    }
  }
  return 'medium'; // Default
}

export function getProvidersByType(type: APIProvider['type']): APIProvider[] {
  return Object.values(PROVIDER_REGISTRY).filter(p => p.type === type);
}

export function getProvidersByTier(tier: CostTier): APIProvider[] {
  const providerIds = PROVIDER_TIERS[tier] || [];
  return providerIds.map(id => PROVIDER_REGISTRY[id]).filter(Boolean);
}

export function getProvidersByCapability(capability: string): APIProvider[] {
  return Object.values(PROVIDER_REGISTRY).filter(p => 
    p.capabilities.includes(capability)
  );
}

export function getAvailableProviders(configuredKeys: string[]): APIProvider[] {
  const available: APIProvider[] = [];
  
  for (const provider of Object.values(PROVIDER_REGISTRY)) {
    // Always include free providers
    if (PROVIDER_TIERS.free.includes(provider.id)) {
      available.push({ ...provider, isAvailable: true });
      continue;
    }
    
    // Check if user has API key for this provider
    const hasKey = configuredKeys.some(key => 
      key.toLowerCase().includes(provider.id) ||
      provider.id.includes(key.toLowerCase())
    );
    
    if (hasKey) {
      available.push({ ...provider, isAvailable: true });
    }
  }
  
  return available;
}

export function getCheapestProvider(
  type: APIProvider['type'],
  availableProviders: string[],
  minQuality: number = 50
): APIProvider | null {
  const providers = getProvidersByType(type)
    .filter(p => availableProviders.includes(p.id) || PROVIDER_TIERS.free.includes(p.id))
    .filter(p => p.qualityScore >= minQuality)
    .sort((a, b) => a.costPerUnit - b.costPerUnit);
  
  return providers[0] || null;
}

export function getBestQualityProvider(
  type: APIProvider['type'],
  availableProviders: string[],
  maxCost: number = Infinity
): APIProvider | null {
  const providers = getProvidersByType(type)
    .filter(p => availableProviders.includes(p.id) || PROVIDER_TIERS.free.includes(p.id))
    .filter(p => p.costPerUnit <= maxCost)
    .sort((a, b) => b.qualityScore - a.qualityScore);
  
  return providers[0] || null;
}
