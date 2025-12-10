// Extended AI Models Registry - Standalone module
// DO NOT MODIFY - This extends the existing aiModels.ts

export interface ExtendedAIModel {
  id: string;
  name: string;
  category: 'video' | 'talking_actor' | 'image' | 'preset' | 'tool';
  description: string;
  capabilities: string[];
  inputTypes: string[];
  outputType: string;
  supportedLanguages: string[];
  supportedMarkets: string[];
  pricingTier: 'free' | 'budget' | 'standard' | 'premium';
  apiEndpoint?: string;
  config?: Record<string, any>;
}

// Video Generation Models
export const videoModels: ExtendedAIModel[] = [
  {
    id: 'kling-2.6',
    name: 'Kling 2.6',
    category: 'video',
    description: 'High-quality AI video generation with cinematic motion',
    capabilities: ['text-to-video', 'image-to-video', 'video-extend'],
    inputTypes: ['text', 'image', 'video'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-video-generator',
    config: { maxDuration: 10, defaultResolution: '1080p' }
  },
  {
    id: 'veo-3.1',
    name: 'Veo 3.1',
    category: 'video',
    description: 'Google Veo for photorealistic video generation',
    capabilities: ['text-to-video', 'style-transfer', 'motion-control'],
    inputTypes: ['text', 'image'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-video-generator',
    config: { maxDuration: 8, defaultResolution: '1080p' }
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    category: 'video',
    description: 'OpenAI Sora for realistic video from text',
    capabilities: ['text-to-video', 'video-extend', 'scene-composition'],
    inputTypes: ['text'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-video-generator',
    config: { maxDuration: 20, defaultResolution: '1080p' }
  },
  {
    id: 'sora-2-pro',
    name: 'Sora 2 Pro',
    category: 'video',
    description: 'Enhanced Sora with extended duration and 4K output',
    capabilities: ['text-to-video', 'video-extend', 'scene-composition', '4k-output'],
    inputTypes: ['text'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-video-generator',
    config: { maxDuration: 60, defaultResolution: '4k' }
  },
];

// Talking Actor Models
export const talkingActorModels: ExtendedAIModel[] = [
  {
    id: 'arcads-1.0',
    name: 'Arcads 1.0',
    category: 'talking_actor',
    description: 'AI-generated UGC actors for ad content',
    capabilities: ['text-to-actor', 'emotion-control', 'lip-sync'],
    inputTypes: ['text', 'audio'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-talking-actor',
    config: { actorStyles: ['professional', 'casual', 'enthusiastic'] }
  },
  {
    id: 'audio-driven',
    name: 'Audio-Driven Actor',
    category: 'talking_actor',
    description: 'Lip-sync actor animation from audio input',
    capabilities: ['audio-to-video', 'lip-sync', 'expression-match'],
    inputTypes: ['audio', 'image'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'standard',
    apiEndpoint: 'ai-talking-actor',
    config: { requiresReferenceImage: true }
  },
  {
    id: 'omnihuman-1.5',
    name: 'OmniHuman 1.5',
    category: 'talking_actor',
    description: 'Full-body human animation with natural movement',
    capabilities: ['full-body', 'gesture-control', 'background-replace'],
    inputTypes: ['text', 'audio', 'image'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-talking-actor',
    config: { bodyTypes: ['standing', 'sitting', 'walking'] }
  },
  {
    id: 'custom-actor',
    name: 'Custom Actor',
    category: 'talking_actor',
    description: 'Use your own actor/avatar with AI animation',
    capabilities: ['custom-face', 'lip-sync', 'voice-clone'],
    inputTypes: ['image', 'video', 'audio'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-talking-actor',
    config: { requiresActorUpload: true }
  },
];

// Image Models
export const imageModels: ExtendedAIModel[] = [
  {
    id: 'nano-banana-pro',
    name: 'Nano Banana Pro',
    category: 'image',
    description: 'Enhanced Gemini image generation with product focus',
    capabilities: ['text-to-image', 'product-shots', 'lifestyle', 'mockups'],
    inputTypes: ['text'],
    outputType: 'image',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'standard',
    apiEndpoint: 'ai-image-generator',
    config: { model: 'google/gemini-2.5-flash-image', resolutions: ['1024x1024', '1536x1024', '1024x1536'] }
  },
  {
    id: 'seedream-40',
    name: 'Seedream 40',
    category: 'image',
    description: 'Photorealistic product and lifestyle imagery',
    capabilities: ['text-to-image', 'style-transfer', 'inpainting'],
    inputTypes: ['text', 'image'],
    outputType: 'image',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-image-generator',
    config: { resolutions: ['1024x1024', '2048x2048'] }
  },
];

// Content Presets
export const contentPresets: ExtendedAIModel[] = [
  {
    id: 'show-your-app',
    name: 'Show Your App',
    category: 'preset',
    description: 'App demo video preset with screen recording style',
    capabilities: ['app-demo', 'ui-showcase', 'feature-highlight'],
    inputTypes: ['text', 'image', 'video'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'standard',
    apiEndpoint: 'ai-content-preset',
    config: { 
      sceneTemplate: ['intro', 'problem', 'app-demo', 'features', 'cta'],
      defaultDuration: 30
    }
  },
  {
    id: 'unboxing-pov',
    name: 'Unboxing POV',
    category: 'preset',
    description: 'First-person unboxing video style',
    capabilities: ['product-reveal', 'hands-pov', 'unboxing-sequence'],
    inputTypes: ['text', 'image'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'standard',
    apiEndpoint: 'ai-content-preset',
    config: { 
      sceneTemplate: ['package-shot', 'opening', 'reveal', 'features', 'reaction'],
      defaultDuration: 45
    }
  },
];

// AI Tools
export const aiTools: ExtendedAIModel[] = [
  {
    id: 'animate-actor',
    name: 'Animate Actor',
    category: 'tool',
    description: 'Add motion and expression to static actor images',
    capabilities: ['image-to-video', 'expression-add', 'subtle-motion'],
    inputTypes: ['image'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'standard',
    apiEndpoint: 'ai-tools',
  },
  {
    id: 'swap-actor',
    name: 'Swap Actor',
    category: 'tool',
    description: 'Replace actor face in video with another face',
    capabilities: ['face-swap', 'identity-transfer'],
    inputTypes: ['video', 'image'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'premium',
    apiEndpoint: 'ai-tools',
  },
  {
    id: 'video-captions',
    name: 'Video Captions',
    category: 'tool',
    description: 'Auto-generate and style video captions/subtitles',
    capabilities: ['speech-to-text', 'caption-styling', 'multi-language'],
    inputTypes: ['video', 'audio'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'budget',
    apiEndpoint: 'ai-tools',
  },
  {
    id: 'skin-enhancer',
    name: 'Skin Enhancer',
    category: 'tool',
    description: 'AI-powered skin smoothing and enhancement',
    capabilities: ['skin-smooth', 'blemish-remove', 'tone-even'],
    inputTypes: ['video', 'image'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'standard',
    apiEndpoint: 'ai-tools',
  },
  {
    id: 'hook-repurposer',
    name: 'Hook Repurposer',
    category: 'tool',
    description: 'Generate multiple hook variations from one video',
    capabilities: ['hook-extract', 'variation-generate', 'ab-testing'],
    inputTypes: ['video', 'text'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'standard',
    apiEndpoint: 'ai-tools',
  },
  {
    id: 'video-upscale',
    name: 'Video Upscale',
    category: 'tool',
    description: 'AI upscaling to 4K with detail enhancement',
    capabilities: ['resolution-upscale', 'detail-enhance', 'noise-reduce'],
    inputTypes: ['video'],
    outputType: 'video',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'standard',
    apiEndpoint: 'ai-tools',
  },
  {
    id: 'image-upscale',
    name: 'Image Upscale',
    category: 'tool',
    description: 'AI upscaling for images with detail preservation',
    capabilities: ['resolution-upscale', 'detail-enhance', 'artifact-remove'],
    inputTypes: ['image'],
    outputType: 'image',
    supportedLanguages: ['en', 'ar', 'es', 'fr', 'de', 'pt'],
    supportedMarkets: ['gcc', 'europe', 'latam', 'usa'],
    pricingTier: 'budget',
    apiEndpoint: 'ai-tools',
  },
];

// Combined registry for easy access
export const extendedAIModelsRegistry = {
  video: videoModels,
  talkingActor: talkingActorModels,
  image: imageModels,
  presets: contentPresets,
  tools: aiTools,
};

// Helper functions
export const getModelById = (id: string): ExtendedAIModel | undefined => {
  const allModels = [
    ...videoModels,
    ...talkingActorModels,
    ...imageModels,
    ...contentPresets,
    ...aiTools,
  ];
  return allModels.find(model => model.id === id);
};

export const getModelsByCategory = (category: ExtendedAIModel['category']): ExtendedAIModel[] => {
  switch (category) {
    case 'video': return videoModels;
    case 'talking_actor': return talkingActorModels;
    case 'image': return imageModels;
    case 'preset': return contentPresets;
    case 'tool': return aiTools;
    default: return [];
  }
};

export const getModelsByPricingTier = (tier: ExtendedAIModel['pricingTier']): ExtendedAIModel[] => {
  const allModels = [
    ...videoModels,
    ...talkingActorModels,
    ...imageModels,
    ...contentPresets,
    ...aiTools,
  ];
  return allModels.filter(model => model.pricingTier === tier);
};
