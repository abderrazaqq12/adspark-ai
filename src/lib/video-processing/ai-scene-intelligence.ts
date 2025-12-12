// AI Scene Intelligence - Auto-defines video structure

import { AISceneDefinition, TransitionType, MotionStyle, OverlayConfig } from './types';
import { supabase } from '@/integrations/supabase/client';

export interface SceneIntelligenceInput {
  script?: string;
  voiceoverDuration?: number;
  sourceVideos?: string[];
  sourceImages?: string[];
  videoType: string;
  market: string;
  language: string;
  maxDuration: number;
  aiAutoMode: boolean;
}

export interface SceneIntelligenceOutput {
  scenes: AISceneDefinition[];
  totalDuration: number;
  recommendedHooks: string[];
  recommendedPacing: 'fast' | 'medium' | 'slow';
  recommendedTransitions: TransitionType[];
}

// Scene templates by video type
const SCENE_TEMPLATES: Record<string, AISceneDefinition['type'][]> = {
  'ugc-review': ['hook', 'problem', 'solution', 'benefits', 'cta'],
  'before-after': ['hook', 'before', 'solution', 'after', 'cta'],
  'problem-solution': ['hook', 'problem', 'solution', 'benefits', 'usp', 'cta'],
  'testimonial': ['hook', 'testimonial', 'benefits', 'cta'],
  'product-showcase': ['hook', 'demo', 'benefits', 'usp', 'cta'],
  'unboxing': ['hook', 'demo', 'benefits', 'cta'],
  'day-in-life': ['hook', 'demo', 'benefits', 'testimonial', 'cta'],
  'educational': ['hook', 'problem', 'solution', 'demo', 'cta'],
};

// Market-specific configurations
const MARKET_CONFIG: Record<string, { pacing: 'fast' | 'medium' | 'slow'; hookStyle: string; ctaStyle: string }> = {
  'saudi': { pacing: 'medium', hookStyle: 'emotional', ctaStyle: 'cod-friendly' },
  'uae': { pacing: 'medium', hookStyle: 'luxury', ctaStyle: 'premium' },
  'usa': { pacing: 'fast', hookStyle: 'direct', ctaStyle: 'urgent' },
  'europe': { pacing: 'medium', hookStyle: 'professional', ctaStyle: 'value' },
  'latam': { pacing: 'fast', hookStyle: 'emotional', ctaStyle: 'social-proof' },
};

// Motion styles by scene type
const SCENE_MOTION_MAP: Record<AISceneDefinition['type'], MotionStyle[]> = {
  'hook': ['zoom-in', 'shake', 'ken-burns'],
  'problem': ['static', 'parallax'],
  'before': ['static', 'zoom-out'],
  'solution': ['zoom-in', 'ken-burns'],
  'after': ['zoom-in', 'parallax'],
  'benefits': ['ken-burns', 'pan'],
  'usp': ['parallax', 'orbit'],
  'cta': ['zoom-in', 'shake'],
  'testimonial': ['static', 'ken-burns'],
  'demo': ['pan', 'zoom-in'],
};

// Transition styles by pacing
const PACING_TRANSITIONS: Record<string, TransitionType[]> = {
  'fast': ['cut', 'whip', 'zoom'],
  'medium': ['cut', 'fade', 'slide'],
  'slow': ['fade', 'dissolve', 'slide'],
};

// Generate AI-driven scene structure
export async function generateSceneStructure(
  input: SceneIntelligenceInput
): Promise<SceneIntelligenceOutput> {
  const {
    script,
    voiceoverDuration,
    sourceImages,
    videoType,
    market,
    maxDuration,
    aiAutoMode,
  } = input;

  // Get market config
  const marketConfig = MARKET_CONFIG[market] || MARKET_CONFIG['saudi'];
  
  // Get scene template
  const sceneTypes = SCENE_TEMPLATES[videoType] || SCENE_TEMPLATES['ugc-review'];
  
  // Calculate scene durations
  const targetDuration = Math.min(maxDuration, voiceoverDuration || 30);
  const sceneCount = sceneTypes.length;
  
  // Distribute duration with hook getting less time
  const hookDuration = Math.min(3, targetDuration * 0.1);
  const ctaDuration = Math.min(4, targetDuration * 0.15);
  const remainingDuration = targetDuration - hookDuration - ctaDuration;
  const middleSceneDuration = remainingDuration / (sceneCount - 2);

  // Build scenes
  const scenes: AISceneDefinition[] = [];
  let currentTime = 0;

  for (let i = 0; i < sceneTypes.length; i++) {
    const sceneType = sceneTypes[i];
    
    // Calculate duration
    let duration: number;
    if (sceneType === 'hook') {
      duration = hookDuration;
    } else if (sceneType === 'cta') {
      duration = ctaDuration;
    } else {
      duration = middleSceneDuration;
    }
    
    // Select motion style
    const possibleMotions = SCENE_MOTION_MAP[sceneType] || ['static'];
    const motionStyle = aiAutoMode 
      ? possibleMotions[Math.floor(Math.random() * possibleMotions.length)]
      : possibleMotions[0];
    
    // Select transition
    const possibleTransitions = PACING_TRANSITIONS[marketConfig.pacing];
    const transition = possibleTransitions[Math.floor(Math.random() * possibleTransitions.length)];
    
    // Generate overlay for certain scenes
    let overlay: OverlayConfig | undefined;
    if (sceneType === 'cta') {
      overlay = {
        type: 'cta',
        content: market === 'saudi' ? 'اطلب الآن' : 'Order Now',
        position: 'bottom',
        style: { color: '#ffffff', font: 'bold 36px Arial' }
      };
    }

    scenes.push({
      id: `scene-${i}`,
      index: i,
      type: sceneType,
      duration,
      startTime: currentTime,
      endTime: currentTime + duration,
      transition,
      motionStyle,
      overlay,
      visualPrompt: generateVisualPrompt(sceneType, videoType, market),
    });

    currentTime += duration;
  }

  // If AI auto mode, enhance with AI analysis
  if (aiAutoMode && script) {
    try {
      const enhanced = await enhanceScenesWithAI(scenes, script, market, input.language);
      if (enhanced) {
        return enhanced;
      }
    } catch (err) {
      console.warn('[ai-scene-intelligence] AI enhancement failed, using template:', err);
    }
  }

  return {
    scenes,
    totalDuration: currentTime,
    recommendedHooks: generateHookSuggestions(market, videoType),
    recommendedPacing: marketConfig.pacing,
    recommendedTransitions: PACING_TRANSITIONS[marketConfig.pacing],
  };
}

// Generate visual prompt for scene
function generateVisualPrompt(
  sceneType: AISceneDefinition['type'],
  videoType: string,
  market: string
): string {
  const prompts: Record<AISceneDefinition['type'], string> = {
    'hook': 'Attention-grabbing opening, close-up or dramatic movement',
    'problem': 'Show the problem or pain point clearly',
    'before': 'Before state - show the issue or current situation',
    'solution': 'Introduce the product as the solution',
    'after': 'After state - show the transformation or improvement',
    'benefits': 'Highlight key benefits with product in focus',
    'usp': 'Unique selling point - what makes this different',
    'cta': 'Call to action - clear instruction to buy',
    'testimonial': 'Real person testimonial or reaction',
    'demo': 'Product demonstration or usage',
  };

  return prompts[sceneType] || 'Product showcase';
}

// Generate hook suggestions based on market
function generateHookSuggestions(market: string, videoType: string): string[] {
  const hooks: Record<string, string[]> = {
    'saudi': [
      'هل تعاني من...؟',
      'اكتشف السر الذي يخفونه عنك',
      'لن تصدق ما حدث معي',
      'توقف! قبل أن تشتري',
    ],
    'uae': [
      'The secret to...',
      'You won\'t believe this',
      'Stop scrolling!',
      'This changed everything',
    ],
    'usa': [
      'You\'re doing it wrong',
      'This hack saved me $1000',
      'POV: You just discovered',
      'Wait for it...',
    ],
  };

  return hooks[market] || hooks['usa'];
}

// Enhance scenes with AI analysis
async function enhanceScenesWithAI(
  scenes: AISceneDefinition[],
  script: string,
  market: string,
  language: string
): Promise<SceneIntelligenceOutput | null> {
  try {
    const { data, error } = await supabase.functions.invoke('free-tier-creative-engine', {
      body: {
        action: 'optimize_narrative',
        scenes: scenes.map(s => ({
          type: s.type,
          duration: s.duration,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        productContext: { script, language },
        market,
      },
    });

    if (error || !data?.success) {
      return null;
    }

    const optimization = data.narrativeOptimization;
    
    // Reorder scenes based on AI recommendation
    if (optimization?.optimizedOrder) {
      const reorderedScenes = optimization.optimizedOrder.map((index: number, i: number) => {
        const scene = { ...scenes[index] };
        scene.index = i;
        return scene;
      });

      // Recalculate timing
      let currentTime = 0;
      for (const scene of reorderedScenes) {
        scene.startTime = currentTime;
        scene.endTime = currentTime + scene.duration;
        currentTime += scene.duration;
      }

      return {
        scenes: reorderedScenes,
        totalDuration: currentTime,
        recommendedHooks: generateHookSuggestions(market, 'ugc-review'),
        recommendedPacing: MARKET_CONFIG[market]?.pacing || 'medium',
        recommendedTransitions: PACING_TRANSITIONS[MARKET_CONFIG[market]?.pacing || 'medium'],
      };
    }

    return null;
  } catch (err) {
    console.error('[ai-scene-intelligence] AI enhancement error:', err);
    return null;
  }
}

// Get scene type label
export function getSceneTypeLabel(type: AISceneDefinition['type']): string {
  const labels: Record<AISceneDefinition['type'], string> = {
    'hook': 'Hook',
    'problem': 'Problem',
    'before': 'Before',
    'solution': 'Solution',
    'after': 'After',
    'benefits': 'Benefits',
    'usp': 'USP',
    'cta': 'CTA',
    'testimonial': 'Testimonial',
    'demo': 'Demo',
  };
  return labels[type] || type;
}

// Get motion style label
export function getMotionStyleLabel(style: MotionStyle): string {
  const labels: Record<MotionStyle, string> = {
    'static': 'Static',
    'ken-burns': 'Ken Burns',
    'parallax': 'Parallax',
    'zoom-in': 'Zoom In',
    'zoom-out': 'Zoom Out',
    'pan': 'Pan',
    'shake': 'Shake',
    'orbit': 'Orbit',
  };
  return labels[style] || style;
}
