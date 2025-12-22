/**
 * AI Tools Provider Registry
 * Maps tools to their preferred providers and fallbacks
 */

export type ProviderType = 
  | 'fal_ai' 
  | 'eden_ai' 
  | 'openrouter' 
  | 'lovable_ai'
  | 'google_ai_studio'
  | 'heygen'
  | 'runway'
  | 'leonardo_ai';

export type CapabilityType = 
  | 'image_to_video' 
  | 'video_upscale' 
  | 'image_upscale'
  | 'face_swap'
  | 'speech_to_text'
  | 'text_to_speech'
  | 'skin_enhancement'
  | 'hook_generation'
  | 'video_caption'
  | 'image_generation'
  | 'video_generation'
  | 'talking_avatar';

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  secretKey: string;
  baseUrl: string;
  capabilities: CapabilityType[];
  costTier: 'budget' | 'standard' | 'premium';
  priority: number; // Lower = higher priority
}

export interface ToolProviderMapping {
  toolId: string;
  capability: CapabilityType;
  preferredProviders: ProviderType[];
  fallbackProviders: ProviderType[];
  modelMapping: Record<ProviderType, string>;
  costEstimate: Record<ProviderType, number>;
}

// Provider configurations with their API details
export const PROVIDER_REGISTRY: Record<ProviderType, ProviderConfig> = {
  fal_ai: {
    id: 'fal_ai',
    name: 'Fal AI',
    secretKey: 'fal_ai',
    baseUrl: 'https://queue.fal.run',
    capabilities: ['image_to_video', 'video_upscale', 'image_upscale', 'image_generation', 'video_generation'],
    costTier: 'standard',
    priority: 1,
  },
  eden_ai: {
    id: 'eden_ai',
    name: 'Eden AI',
    secretKey: 'EDEN_AI_API_KEY',
    baseUrl: 'https://api.edenai.run/v2',
    capabilities: ['speech_to_text', 'text_to_speech', 'video_caption', 'image_upscale', 'video_upscale', 'face_swap'],
    costTier: 'budget',
    priority: 2,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    secretKey: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    capabilities: ['hook_generation', 'image_generation'],
    costTier: 'budget',
    priority: 3,
  },
  lovable_ai: {
    id: 'lovable_ai',
    name: 'Lovable AI',
    secretKey: 'LOVABLE_API_KEY',
    baseUrl: 'https://ai.gateway.lovable.dev/v1',
    capabilities: ['hook_generation', 'image_generation', 'speech_to_text'],
    costTier: 'budget',
    priority: 0, // Highest priority - always prefer
  },
  google_ai_studio: {
    id: 'google_ai_studio',
    name: 'Google AI Studio',
    secretKey: 'Google_ai_studio',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    capabilities: ['speech_to_text', 'video_caption', 'image_generation'],
    costTier: 'standard',
    priority: 2,
  },
  heygen: {
    id: 'heygen',
    name: 'HeyGen',
    secretKey: 'heygen_api',
    baseUrl: 'https://api.heygen.com/v2',
    capabilities: ['talking_avatar', 'image_to_video'],
    costTier: 'premium',
    priority: 1,
  },
  runway: {
    id: 'runway',
    name: 'Runway',
    secretKey: 'Runway',
    baseUrl: 'https://api.runwayml.com/v1',
    capabilities: ['video_generation', 'image_to_video', 'video_upscale'],
    costTier: 'premium',
    priority: 2,
  },
  leonardo_ai: {
    id: 'leonardo_ai',
    name: 'Leonardo AI',
    secretKey: 'Leonarodo_ai',
    baseUrl: 'https://cloud.leonardo.ai/api/rest/v1',
    capabilities: ['image_generation', 'image_upscale'],
    costTier: 'standard',
    priority: 3,
  },
};

// Tool to provider mappings with specific models
export const TOOL_PROVIDER_MAPPINGS: Record<string, ToolProviderMapping> = {
  'animate-actor': {
    toolId: 'animate-actor',
    capability: 'image_to_video',
    preferredProviders: ['fal_ai', 'heygen'],
    fallbackProviders: ['runway', 'lovable_ai'],
    modelMapping: {
      fal_ai: 'fal-ai/luma-dream-machine',
      heygen: 'v2/video/generate',
      runway: 'gen3a_turbo',
      lovable_ai: 'google/gemini-2.5-flash',
      eden_ai: '',
      openrouter: '',
      google_ai_studio: '',
      leonardo_ai: '',
    },
    costEstimate: {
      fal_ai: 0.05,
      heygen: 0.08,
      runway: 0.10,
      lovable_ai: 0.02,
      eden_ai: 0,
      openrouter: 0,
      google_ai_studio: 0,
      leonardo_ai: 0,
    },
  },
  'swap-actor': {
    toolId: 'swap-actor',
    capability: 'face_swap',
    preferredProviders: ['fal_ai'],
    fallbackProviders: ['eden_ai'],
    modelMapping: {
      fal_ai: 'fal-ai/face-swap',
      eden_ai: 'face/swap',
      heygen: '',
      runway: '',
      lovable_ai: '',
      openrouter: '',
      google_ai_studio: '',
      leonardo_ai: '',
    },
    costEstimate: {
      fal_ai: 0.08,
      eden_ai: 0.05,
      heygen: 0,
      runway: 0,
      lovable_ai: 0,
      openrouter: 0,
      google_ai_studio: 0,
      leonardo_ai: 0,
    },
  },
  'video-captions': {
    toolId: 'video-captions',
    capability: 'video_caption',
    preferredProviders: ['eden_ai', 'google_ai_studio'],
    fallbackProviders: ['lovable_ai'],
    modelMapping: {
      eden_ai: 'audio/speech_to_text_async',
      google_ai_studio: 'models/gemini-2.0-flash',
      lovable_ai: 'google/gemini-2.5-flash',
      fal_ai: '',
      heygen: '',
      runway: '',
      openrouter: '',
      leonardo_ai: '',
    },
    costEstimate: {
      eden_ai: 0.015,
      google_ai_studio: 0.02,
      lovable_ai: 0.01,
      fal_ai: 0,
      heygen: 0,
      runway: 0,
      openrouter: 0,
      leonardo_ai: 0,
    },
  },
  'skin-enhancer': {
    toolId: 'skin-enhancer',
    capability: 'skin_enhancement',
    preferredProviders: ['fal_ai'],
    fallbackProviders: ['eden_ai', 'leonardo_ai'],
    modelMapping: {
      fal_ai: 'fal-ai/face-retouch',
      eden_ai: 'image/generation',
      leonardo_ai: 'generations',
      heygen: '',
      runway: '',
      lovable_ai: '',
      openrouter: '',
      google_ai_studio: '',
    },
    costEstimate: {
      fal_ai: 0.03,
      eden_ai: 0.02,
      leonardo_ai: 0.04,
      heygen: 0,
      runway: 0,
      lovable_ai: 0,
      openrouter: 0,
      google_ai_studio: 0,
    },
  },
  'hook-repurposer': {
    toolId: 'hook-repurposer',
    capability: 'hook_generation',
    preferredProviders: ['lovable_ai', 'openrouter'],
    fallbackProviders: ['google_ai_studio'],
    modelMapping: {
      lovable_ai: 'google/gemini-2.5-flash',
      openrouter: 'anthropic/claude-3-haiku',
      google_ai_studio: 'models/gemini-2.0-flash',
      fal_ai: '',
      eden_ai: '',
      heygen: '',
      runway: '',
      leonardo_ai: '',
    },
    costEstimate: {
      lovable_ai: 0.02,
      openrouter: 0.03,
      google_ai_studio: 0.02,
      fal_ai: 0,
      eden_ai: 0,
      heygen: 0,
      runway: 0,
      leonardo_ai: 0,
    },
  },
  'video-upscale': {
    toolId: 'video-upscale',
    capability: 'video_upscale',
    preferredProviders: ['fal_ai'],
    fallbackProviders: ['eden_ai', 'runway'],
    modelMapping: {
      fal_ai: 'fal-ai/video-upscaler',
      eden_ai: 'video/enhancement',
      runway: 'upscaler',
      heygen: '',
      lovable_ai: '',
      openrouter: '',
      google_ai_studio: '',
      leonardo_ai: '',
    },
    costEstimate: {
      fal_ai: 0.12,
      eden_ai: 0.08,
      runway: 0.15,
      heygen: 0,
      lovable_ai: 0,
      openrouter: 0,
      google_ai_studio: 0,
      leonardo_ai: 0,
    },
  },
  'image-upscale': {
    toolId: 'image-upscale',
    capability: 'image_upscale',
    preferredProviders: ['fal_ai'],
    fallbackProviders: ['eden_ai', 'leonardo_ai'],
    modelMapping: {
      fal_ai: 'fal-ai/image-upscaler',
      eden_ai: 'image/upscale',
      leonardo_ai: 'variations/upscale',
      heygen: '',
      runway: '',
      lovable_ai: '',
      openrouter: '',
      google_ai_studio: '',
    },
    costEstimate: {
      fal_ai: 0.02,
      eden_ai: 0.01,
      leonardo_ai: 0.03,
      heygen: 0,
      runway: 0,
      lovable_ai: 0,
      openrouter: 0,
      google_ai_studio: 0,
    },
  },
};

// Get provider config by ID
export function getProvider(providerId: ProviderType): ProviderConfig | undefined {
  return PROVIDER_REGISTRY[providerId];
}

// Get tool mapping by tool ID
export function getToolMapping(toolId: string): ToolProviderMapping | undefined {
  return TOOL_PROVIDER_MAPPINGS[toolId];
}

// Get all providers that support a capability
export function getProvidersForCapability(capability: CapabilityType): ProviderConfig[] {
  return Object.values(PROVIDER_REGISTRY)
    .filter(p => p.capabilities.includes(capability))
    .sort((a, b) => a.priority - b.priority);
}

// Resolve best provider for a tool given available API keys
export function resolveProvider(
  toolId: string, 
  availableKeys: string[]
): { provider: ProviderConfig; model: string; reason: string } | null {
  const mapping = TOOL_PROVIDER_MAPPINGS[toolId];
  if (!mapping) {
    return null;
  }

  // Try preferred providers first
  for (const providerId of mapping.preferredProviders) {
    const provider = PROVIDER_REGISTRY[providerId];
    if (provider && availableKeys.includes(provider.secretKey)) {
      return {
        provider,
        model: mapping.modelMapping[providerId],
        reason: `Preferred provider with valid API key`,
      };
    }
  }

  // Try fallback providers
  for (const providerId of mapping.fallbackProviders) {
    const provider = PROVIDER_REGISTRY[providerId];
    if (provider && availableKeys.includes(provider.secretKey)) {
      return {
        provider,
        model: mapping.modelMapping[providerId],
        reason: `Fallback provider (preferred not available)`,
      };
    }
  }

  // Check LOVABLE_API_KEY as ultimate fallback if the tool supports it
  if (availableKeys.includes('LOVABLE_API_KEY')) {
    const lovableProvider = PROVIDER_REGISTRY.lovable_ai;
    if (mapping.modelMapping.lovable_ai) {
      return {
        provider: lovableProvider,
        model: mapping.modelMapping.lovable_ai,
        reason: `Using Lovable AI as global fallback`,
      };
    }
  }

  return null;
}

export interface ProviderResolutionResult {
  success: boolean;
  provider?: ProviderConfig;
  model?: string;
  reason: string;
  costEstimate?: number;
  allProvidersTried?: string[];
}
