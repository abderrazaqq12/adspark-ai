import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Universal Ad Structure Components
const AD_STRUCTURE_COMPONENTS = [
  'hook',
  'problem_recognition',
  'product_reveal',
  'demonstration',
  'social_proof',
  'benefits_emotional',
  'benefits_functional',
  'offer_incentive',
  'cta',
  'editing_identity'
];

// Market Psychology Profiles (language-agnostic, context-driven)
const MARKET_PSYCHOLOGY = {
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

// Platform-specific editing identities
const PLATFORM_IDENTITY = {
  'tiktok': {
    pacing: 'fast',
    cutFrequency: '1-2s',
    style: 'raw-ugc',
    subtitleStyle: 'bold-centered',
    transitions: ['jump-cut', 'zoom', 'whip']
  },
  'instagram-reels': {
    pacing: 'medium',
    cutFrequency: '2-3s',
    style: 'polished-ugc',
    subtitleStyle: 'minimal-bottom',
    transitions: ['smooth', 'slide', 'fade']
  },
  'youtube-shorts': {
    pacing: 'medium',
    cutFrequency: '2-4s',
    style: 'informative',
    subtitleStyle: 'readable-contrast',
    transitions: ['clean', 'zoom', 'slide']
  },
  'snapchat': {
    pacing: 'fast',
    cutFrequency: '1-2s',
    style: 'authentic-raw',
    subtitleStyle: 'playful-emoji',
    transitions: ['snap', 'zoom', 'glitch']
  },
  'meta-ads': {
    pacing: 'varied',
    cutFrequency: '2-4s',
    style: 'professional-ugc',
    subtitleStyle: 'clear-accessible',
    transitions: ['smooth', 'fade', 'slide']
  }
};

// Video type structures
const VIDEO_TYPE_STRUCTURES = {
  'ugc-review': ['hook', 'problem_recognition', 'product_reveal', 'demonstration', 'benefits_emotional', 'social_proof', 'cta'],
  'problem-solution': ['hook', 'problem_recognition', 'product_reveal', 'demonstration', 'benefits_functional', 'offer_incentive', 'cta'],
  'testimonial': ['hook', 'social_proof', 'problem_recognition', 'product_reveal', 'benefits_emotional', 'cta'],
  'unboxing': ['hook', 'product_reveal', 'demonstration', 'benefits_functional', 'benefits_emotional', 'cta'],
  'before-after': ['hook', 'problem_recognition', 'demonstration', 'benefits_emotional', 'social_proof', 'cta'],
  'day-in-life': ['hook', 'problem_recognition', 'product_reveal', 'demonstration', 'benefits_emotional', 'cta'],
  'educational': ['hook', 'problem_recognition', 'demonstration', 'benefits_functional', 'product_reveal', 'cta'],
  'lifestyle': ['hook', 'benefits_emotional', 'product_reveal', 'demonstration', 'social_proof', 'cta']
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, config, productContext, sourceAdAnalysis, preferredAgent } = await req.json();

    console.log('AI Ad Intelligence - Action:', action, 'Preferred Agent:', preferredAgent);

    switch (action) {
      case 'generate_ad_structure': {
        const structure = await generateAdStructure(config, productContext, sourceAdAnalysis, preferredAgent);
        return new Response(JSON.stringify({ success: true, structure }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_hooks': {
        const hooks = await generateDynamicHooks(config, productContext, preferredAgent);
        return new Response(JSON.stringify({ success: true, hooks }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_scene_content': {
        const sceneContent = await generateSceneContent(config, productContext, sourceAdAnalysis, preferredAgent);
        return new Response(JSON.stringify({ success: true, sceneContent }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'optimize_for_market': {
        const optimized = await optimizeForMarket(config, productContext, preferredAgent);
        return new Response(JSON.stringify({ success: true, optimized }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_market_profile': {
        const market = config?.market || 'global';
        const profile = MARKET_PSYCHOLOGY[market as keyof typeof MARKET_PSYCHOLOGY] || MARKET_PSYCHOLOGY['global'];
        return new Response(JSON.stringify({ success: true, profile }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_platform_identity': {
        const platform = config?.platform || 'tiktok';
        const identity = PLATFORM_IDENTITY[platform as keyof typeof PLATFORM_IDENTITY] || PLATFORM_IDENTITY['tiktok'];
        return new Response(JSON.stringify({ success: true, identity }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'generate_complete_variation': {
        const variation = await generateCompleteVariation(config, productContext, sourceAdAnalysis, preferredAgent);
        return new Response(JSON.stringify({ success: true, variation }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: unknown) {
    console.error('AI Ad Intelligence Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateAdStructure(config: any, productContext: any, sourceAdAnalysis: any, preferredAgent?: string) {
  const { language, market, videoType, targetAudience, pacing, hookStyle } = config;
  
  const marketProfile = MARKET_PSYCHOLOGY[market as keyof typeof MARKET_PSYCHOLOGY] || MARKET_PSYCHOLOGY['global'];
  const videoStructure = VIDEO_TYPE_STRUCTURES[videoType as keyof typeof VIDEO_TYPE_STRUCTURES] || VIDEO_TYPE_STRUCTURES['ugc-review'];

  const systemPrompt = `You are an expert ad creative director. Generate ad structure and content in the user's specified language. NEVER output English unless explicitly requested. All content must match the cultural context of the target market. Do not use any hardcoded examples - generate everything dynamically based on the product and context provided.`;

  const userPrompt = `Generate an ad structure for a ${videoType || 'ugc-review'} style video ad.

CONTEXT:
- Language: ${language || 'en'}
- Market: ${market || 'global'}
- Target Audience: ${JSON.stringify(targetAudience || {})}
- Pacing: ${pacing || 'fast'}
- Hook Style: ${hookStyle || 'problem-solution'}
- Market Psychology: ${JSON.stringify(marketProfile)}
- Product Context: ${JSON.stringify(productContext || {})}
- Source Ad Analysis: ${JSON.stringify(sourceAdAnalysis || {})}

REQUIRED STRUCTURE COMPONENTS: ${videoStructure.join(', ')}

Generate a JSON object with:
1. "scenes": Array of scene objects with {type, duration_seconds, purpose, visual_direction, audio_direction}
2. "hooks": Array of 3-5 hook variations (in target language)
3. "problem_statement": The main problem addressed (in target language)
4. "benefits": Array of {emotional: string, functional: string} (in target language)
5. "cta_variations": Array of 3 CTA options (in target language, matching market style)
6. "offer_structure": {type: string, urgency_level: string, incentive_type: string}
7. "editing_identity": {pacing, transitions: [], subtitle_style, music_mood}

ALL TEXT CONTENT MUST BE IN THE SPECIFIED LANGUAGE (${language}).
Adapt tone and style to the ${market} market psychology.
Do not include any placeholder or example text - generate real, usable content.`;

  const aiResponse = await callAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    preferredAgent: preferredAgent as any,
  });

  const content = aiResponse.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse structure JSON:', e);
  }

  return { raw: content, scenes: videoStructure.map((type, i) => ({ type, index: i })) };
}

async function generateDynamicHooks(config: any, productContext: any, preferredAgent?: string) {
  const { language, market, targetAudience, hookStyles, productCategory } = config;
  
  const marketProfile = MARKET_PSYCHOLOGY[market as keyof typeof MARKET_PSYCHOLOGY] || MARKET_PSYCHOLOGY['global'];

  const systemPrompt = `You are an expert copywriter specializing in video ad hooks. Generate hooks ONLY in the specified language. Never use English unless specifically requested. Create hooks that match the cultural nuances and buying psychology of the target market.`;

  const userPrompt = `Generate video ad hooks for a product.

CONTEXT:
- Language: ${language || 'en'} (ALL hooks must be in this language)
- Market: ${market || 'global'}
- Market Psychology: ${JSON.stringify(marketProfile)}
- Product Category: ${productCategory || 'general'}
- Product Info: ${JSON.stringify(productContext || {})}
- Target Audience: ${JSON.stringify(targetAudience || {})}
- Hook Style Preferences: ${JSON.stringify(hookStyles || ['question', 'problem-solution'])}

Generate a JSON object with:
{
  "hooks": [
    {
      "type": "question|shock|emotional|story|problem-solution|humor|statistic",
      "text": "The hook text in ${language}",
      "reasoning": "Why this hook works for this market",
      "emotional_trigger": "The primary emotion targeted"
    }
  ]
}

Generate 5-8 diverse hooks covering different styles.
ALL HOOKS MUST BE IN ${language.toUpperCase()}.
Adapt to ${market} market's cultural preferences and buying behavior.`;

  const aiResponse = await callAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.9,
    preferredAgent: preferredAgent as any,
  });

  const content = aiResponse.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse hooks JSON:', e);
  }

  return { hooks: [], raw: content };
}

async function generateSceneContent(config: any, productContext: any, sourceAdAnalysis: any, preferredAgent?: string) {
  const { language, market, videoType, pacing, transitions } = config;
  
  const marketProfile = MARKET_PSYCHOLOGY[market as keyof typeof MARKET_PSYCHOLOGY] || MARKET_PSYCHOLOGY['global'];
  const videoStructure = VIDEO_TYPE_STRUCTURES[videoType as keyof typeof VIDEO_TYPE_STRUCTURES] || VIDEO_TYPE_STRUCTURES['ugc-review'];

  const systemPrompt = `You are an expert video ad creative director. Generate complete scene content for video ads. ALL content must be in the specified language. Adapt all creative decisions to the target market's psychology and preferences.`;

  const userPrompt = `Generate detailed scene content for a ${videoType || 'ugc-review'} video ad.

CONTEXT:
- Language: ${language || 'en'}
- Market: ${market || 'global'}
- Market Profile: ${JSON.stringify(marketProfile)}
- Pacing: ${pacing || 'fast'}
- Transitions: ${JSON.stringify(transitions || ['hard-cut'])}
- Product: ${JSON.stringify(productContext || {})}
- Source Analysis: ${JSON.stringify(sourceAdAnalysis || {})}
- Structure: ${videoStructure.join(' → ')}

Generate a JSON object with:
{
  "scenes": [
    {
      "scene_type": "hook|problem|reveal|demo|benefits|social_proof|offer|cta",
      "duration_seconds": number,
      "script_text": "Voiceover/text content in ${language}",
      "visual_direction": "Description of visuals",
      "audio_direction": "Music/sound direction",
      "transition_in": "transition type",
      "transition_out": "transition type",
      "subtitle_text": "On-screen text in ${language}",
      "emotional_beat": "The emotion this scene evokes"
    }
  ],
  "total_duration_seconds": number,
  "music_mood": "suggested music mood",
  "overall_tone": "ad tone description"
}

ALL TEXT CONTENT IN ${language.toUpperCase()}.
Match ${market} market cultural preferences.`;

  const aiResponse = await callAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    preferredAgent: preferredAgent as any,
  });

  const content = aiResponse.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse scene content JSON:', e);
  }

  return { scenes: [], raw: content };
}

async function optimizeForMarket(config: any, productContext: any, preferredAgent?: string) {
  const { language, market, currentContent } = config;
  
  const marketProfile = MARKET_PSYCHOLOGY[market as keyof typeof MARKET_PSYCHOLOGY] || MARKET_PSYCHOLOGY['global'];

  const systemPrompt = `You are an expert in international marketing localization. Optimize ad content for specific markets while maintaining the core message. All output must be in the target language.`;

  const userPrompt = `Optimize the following ad content for the ${market} market.

CURRENT CONTENT:
${JSON.stringify(currentContent || {})}

TARGET:
- Language: ${language || 'en'}
- Market: ${market || 'global'}
- Market Psychology: ${JSON.stringify(marketProfile)}
- Product Context: ${JSON.stringify(productContext || {})}

Generate optimized content with:
1. "optimized_hooks": Market-adapted hooks (in ${language})
2. "optimized_ctas": Market-appropriate CTAs (in ${language})
3. "cultural_adaptations": List of changes made for cultural fit
4. "offer_optimization": Suggested offer structure for this market
5. "tone_adjustments": Recommended tone changes
6. "local_triggers": Emotional triggers specific to this market

ALL CONTENT IN ${language.toUpperCase()}.`;

  const aiResponse = await callAI({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    preferredAgent: preferredAgent as any,
  });

  const content = aiResponse.content || '';
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse optimization JSON:', e);
  }

  return { raw: content };
}

async function generateCompleteVariation(config: any, productContext: any, sourceAdAnalysis: any, preferredAgent?: string) {
  // Generate all components for a complete ad variation
  const structure = await generateAdStructure(config, productContext, sourceAdAnalysis, preferredAgent);
  const hooks = await generateDynamicHooks(config, productContext, preferredAgent);
  const sceneContent = await generateSceneContent(config, productContext, sourceAdAnalysis, preferredAgent);

  return {
    structure,
    hooks,
    sceneContent,
    config: {
      language: config.language,
      market: config.market,
      videoType: config.videoType,
      pacing: config.pacing,
      engineTier: config.engineTier
    },
    marketProfile: MARKET_PSYCHOLOGY[config.market as keyof typeof MARKET_PSYCHOLOGY] || MARKET_PSYCHOLOGY['global'],
    timestamp: new Date().toISOString()
  };
}
