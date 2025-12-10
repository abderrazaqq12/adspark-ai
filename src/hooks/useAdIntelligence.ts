import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdIntelligenceConfig {
  language: string;
  market: string;
  videoType: string;
  targetAudience: {
    ageRange?: string;
    gender?: string;
    interests?: string[];
    occupation?: string;
  };
  productCategory: string;
  pacing: string;
  hookStyles: string[];
  transitions: string[];
  engineTier: string;
  platform?: string;
  conversionGoal?: string;
}

export interface ProductContext {
  name?: string;
  description?: string;
  category?: string;
  benefits?: string[];
  price?: string;
  uniqueSellingPoints?: string[];
}

export interface SourceAdAnalysis {
  transcript?: string;
  scenes?: any[];
  hook?: string;
  pacing?: string;
  style?: string;
  transitions?: string[];
}

export interface AdStructure {
  scenes: any[];
  hooks: any[];
  problem_statement?: string;
  benefits?: any[];
  cta_variations?: string[];
  offer_structure?: any;
  editing_identity?: any;
}

export interface MarketProfile {
  buyingBehavior: string;
  urgencyStyle: string;
  socialProof: string;
  ctaStyle: string;
  emotionalTriggers: string[];
  paymentPreference: string;
}

// Static market profiles for quick access without API call
export const MARKET_PROFILES: Record<string, MarketProfile> = {
  'saudi': {
    buyingBehavior: 'trust-focused',
    urgencyStyle: 'relationship-building',
    socialProof: 'community-testimonials',
    ctaStyle: 'reassuring-cod-friendly',
    emotionalTriggers: ['family', 'trust', 'quality', 'authenticity'],
    paymentPreference: 'cod'
  },
  'uae': {
    buyingBehavior: 'premium-aspirational',
    urgencyStyle: 'exclusive-limited',
    socialProof: 'luxury-endorsements',
    ctaStyle: 'premium-experience',
    emotionalTriggers: ['status', 'exclusivity', 'quality', 'innovation'],
    paymentPreference: 'mixed'
  },
  'usa': {
    buyingBehavior: 'value-convenience',
    urgencyStyle: 'deal-focused',
    socialProof: 'reviews-statistics',
    ctaStyle: 'action-oriented',
    emotionalTriggers: ['convenience', 'value', 'results', 'lifestyle'],
    paymentPreference: 'prepaid'
  },
  'europe': {
    buyingBehavior: 'quality-conscious',
    urgencyStyle: 'professional-subtle',
    socialProof: 'expert-endorsements',
    ctaStyle: 'informed-decision',
    emotionalTriggers: ['quality', 'sustainability', 'trust', 'expertise'],
    paymentPreference: 'prepaid'
  },
  'latam': {
    buyingBehavior: 'emotional-social',
    urgencyStyle: 'high-energy-fomo',
    socialProof: 'community-influencer',
    ctaStyle: 'enthusiastic-direct',
    emotionalTriggers: ['community', 'family', 'transformation', 'celebration'],
    paymentPreference: 'mixed'
  },
  'global': {
    buyingBehavior: 'balanced',
    urgencyStyle: 'moderate',
    socialProof: 'mixed',
    ctaStyle: 'clear-direct',
    emotionalTriggers: ['value', 'quality', 'trust', 'results'],
    paymentPreference: 'mixed'
  }
};

// Static video type structures
export const VIDEO_TYPE_STRUCTURES: Record<string, string[]> = {
  'ugc-review': ['hook', 'problem_recognition', 'product_reveal', 'demonstration', 'benefits_emotional', 'social_proof', 'cta'],
  'problem-solution': ['hook', 'problem_recognition', 'product_reveal', 'demonstration', 'benefits_functional', 'offer_incentive', 'cta'],
  'testimonial': ['hook', 'social_proof', 'problem_recognition', 'product_reveal', 'benefits_emotional', 'cta'],
  'unboxing': ['hook', 'product_reveal', 'demonstration', 'benefits_functional', 'benefits_emotional', 'cta'],
  'before-after': ['hook', 'problem_recognition', 'demonstration', 'benefits_emotional', 'social_proof', 'cta'],
  'day-in-life': ['hook', 'problem_recognition', 'product_reveal', 'demonstration', 'benefits_emotional', 'cta'],
  'educational': ['hook', 'problem_recognition', 'demonstration', 'benefits_functional', 'product_reveal', 'cta'],
  'lifestyle': ['hook', 'benefits_emotional', 'product_reveal', 'demonstration', 'social_proof', 'cta']
};

// Platform editing identities
export const PLATFORM_IDENTITIES: Record<string, any> = {
  'tiktok': { pacing: 'fast', cutFrequency: '1-2s', style: 'raw-ugc', subtitleStyle: 'bold-centered', transitions: ['jump-cut', 'zoom', 'whip'] },
  'instagram-reels': { pacing: 'medium', cutFrequency: '2-3s', style: 'polished-ugc', subtitleStyle: 'minimal-bottom', transitions: ['smooth', 'slide', 'fade'] },
  'youtube-shorts': { pacing: 'medium', cutFrequency: '2-4s', style: 'informative', subtitleStyle: 'readable-contrast', transitions: ['clean', 'zoom', 'slide'] },
  'snapchat': { pacing: 'fast', cutFrequency: '1-2s', style: 'authentic-raw', subtitleStyle: 'playful-emoji', transitions: ['snap', 'zoom', 'glitch'] },
  'meta-ads': { pacing: 'varied', cutFrequency: '2-4s', style: 'professional-ugc', subtitleStyle: 'clear-accessible', transitions: ['smooth', 'fade', 'slide'] }
};

export const useAdIntelligence = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedStructure, setGeneratedStructure] = useState<AdStructure | null>(null);
  const [generatedHooks, setGeneratedHooks] = useState<any[]>([]);
  const [sceneContent, setSceneContent] = useState<any>(null);

  const getMarketProfile = useCallback((market: string): MarketProfile => {
    return MARKET_PROFILES[market] || MARKET_PROFILES['global'];
  }, []);

  const getVideoStructure = useCallback((videoType: string): string[] => {
    return VIDEO_TYPE_STRUCTURES[videoType] || VIDEO_TYPE_STRUCTURES['ugc-review'];
  }, []);

  const getPlatformIdentity = useCallback((platform: string) => {
    return PLATFORM_IDENTITIES[platform] || PLATFORM_IDENTITIES['tiktok'];
  }, []);

  const generateAdStructure = useCallback(async (
    config: AdIntelligenceConfig,
    productContext?: ProductContext,
    sourceAdAnalysis?: SourceAdAnalysis
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-ad-intelligence', {
        body: {
          action: 'generate_ad_structure',
          config,
          productContext,
          sourceAdAnalysis
        }
      });

      if (error) throw error;
      
      if (data?.structure) {
        setGeneratedStructure(data.structure);
        return data.structure;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating ad structure:', error);
      toast.error('Failed to generate ad structure');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateDynamicHooks = useCallback(async (
    config: AdIntelligenceConfig,
    productContext?: ProductContext
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-ad-intelligence', {
        body: {
          action: 'generate_hooks',
          config,
          productContext
        }
      });

      if (error) throw error;
      
      if (data?.hooks?.hooks) {
        setGeneratedHooks(data.hooks.hooks);
        return data.hooks.hooks;
      }
      
      return [];
    } catch (error) {
      console.error('Error generating hooks:', error);
      toast.error('Failed to generate hooks');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateSceneContent = useCallback(async (
    config: AdIntelligenceConfig,
    productContext?: ProductContext,
    sourceAdAnalysis?: SourceAdAnalysis
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-ad-intelligence', {
        body: {
          action: 'generate_scene_content',
          config,
          productContext,
          sourceAdAnalysis
        }
      });

      if (error) throw error;
      
      if (data?.sceneContent) {
        setSceneContent(data.sceneContent);
        return data.sceneContent;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating scene content:', error);
      toast.error('Failed to generate scene content');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const optimizeForMarket = useCallback(async (
    config: AdIntelligenceConfig,
    productContext?: ProductContext,
    currentContent?: any
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-ad-intelligence', {
        body: {
          action: 'optimize_for_market',
          config: { ...config, currentContent },
          productContext
        }
      });

      if (error) throw error;
      return data?.optimized || null;
    } catch (error) {
      console.error('Error optimizing for market:', error);
      toast.error('Failed to optimize for market');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateCompleteVariation = useCallback(async (
    config: AdIntelligenceConfig,
    productContext?: ProductContext,
    sourceAdAnalysis?: SourceAdAnalysis
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-ad-intelligence', {
        body: {
          action: 'generate_complete_variation',
          config,
          productContext,
          sourceAdAnalysis
        }
      });

      if (error) throw error;
      
      if (data?.variation) {
        setGeneratedStructure(data.variation.structure);
        setGeneratedHooks(data.variation.hooks?.hooks || []);
        setSceneContent(data.variation.sceneContent);
        return data.variation;
      }
      
      return null;
    } catch (error) {
      console.error('Error generating complete variation:', error);
      toast.error('Failed to generate variation');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    generatedStructure,
    generatedHooks,
    sceneContent,
    getMarketProfile,
    getVideoStructure,
    getPlatformIdentity,
    generateAdStructure,
    generateDynamicHooks,
    generateSceneContent,
    optimizeForMarket,
    generateCompleteVariation
  };
};
