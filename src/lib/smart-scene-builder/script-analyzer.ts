// Smart Scene Builder - Script Analyzer
// AI-powered analysis to identify reusable scenes across multiple scripts

import {
  SmartScenePlan,
  SceneStructure,
  SceneGoal,
  MotionIntensity,
  VideoConfig,
  VisualAsset,
  BudgetPreference,
} from './types';
import { selectEngineForScene } from './engine-selector';

// Script interface
export interface VideoScript {
  id: string;
  text: string;
  hooks?: string[];
  style?: string;
  language?: string;
}

// Analyzed scene segment from script
export interface SceneSegment {
  text: string;
  type: SceneStructure;
  goal: SceneGoal;
  isReusable: boolean; // Can be used across all video variations
  reusabilityReason?: string;
  suggestedDuration: number;
  motionIntensity: MotionIntensity;
  visualPrompt: string;
  matchedAsset?: VisualAsset;
}

// Script analysis result
export interface ScriptAnalysisResult {
  segments: SceneSegment[];
  reusableScenes: SceneSegment[]; // Scenes that work across all scripts
  scriptSpecificScenes: SceneSegment[]; // Scenes unique to each script
  recommendedSceneCount: number;
  scalingFactor: number; // How many variations can be generated
}

// Keywords that indicate different scene types
const SCENE_TYPE_KEYWORDS: Record<SceneStructure, string[]> = {
  product_closeup: ['product', 'introducing', 'meet', 'this is', 'feature', 'look at'],
  problem_visualization: ['problem', 'struggle', 'tired of', 'frustrated', 'hate', 'annoying', 'pain'],
  lifestyle_usage: ['use', 'using', 'everyday', 'daily', 'routine', 'lifestyle', 'how to'],
  social_proof: ['customers', 'reviews', 'rated', 'trusted', 'millions', 'testimonial', 'people love'],
  cta_background: ['order', 'buy', 'get yours', 'shop now', 'limited', 'discount', 'today only', 'click'],
  before_after: ['before', 'after', 'transform', 'change', 'results', 'improvement'],
  unboxing: ['unbox', 'package', 'open', 'inside', 'reveal', 'first look'],
  testimonial: ['said', 'told us', 'customer says', 'review', 'feedback', 'amazing'],
  feature_highlight: ['feature', 'benefit', 'why', 'because', 'advantage', 'special'],
  comparison: ['vs', 'versus', 'compared', 'unlike', 'better than', 'competitor'],
};

// Scene type to reusability mapping (some scenes are naturally reusable)
const REUSABLE_SCENE_TYPES: SceneStructure[] = [
  'product_closeup',
  'feature_highlight',
  'cta_background',
  'social_proof',
];

// Analyze a single script segment
function analyzeSegment(text: string, index: number, totalSegments: number): SceneSegment {
  const lowerText = text.toLowerCase();
  
  // Determine scene type based on keywords
  let detectedType: SceneStructure = 'product_closeup';
  let maxMatches = 0;
  
  for (const [type, keywords] of Object.entries(SCENE_TYPE_KEYWORDS)) {
    const matches = keywords.filter(kw => lowerText.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedType = type as SceneStructure;
    }
  }
  
  // Position-based adjustments
  if (index === 0 && maxMatches === 0) {
    detectedType = 'product_closeup'; // First scene - product intro
  } else if (index === totalSegments - 1) {
    detectedType = 'cta_background'; // Last scene - CTA
  }
  
  // Determine goal based on type
  const goalMapping: Record<SceneStructure, SceneGoal> = {
    product_closeup: 'explain',
    problem_visualization: 'hook',
    lifestyle_usage: 'explain',
    social_proof: 'proof',
    cta_background: 'cta',
    before_after: 'proof',
    unboxing: 'hook',
    testimonial: 'proof',
    feature_highlight: 'explain',
    comparison: 'explain',
  };
  
  // Determine motion intensity
  const motionMapping: Record<SceneStructure, MotionIntensity> = {
    product_closeup: 'low',
    problem_visualization: 'medium',
    lifestyle_usage: 'high',
    social_proof: 'low',
    cta_background: 'low',
    before_after: 'medium',
    unboxing: 'high',
    testimonial: 'low',
    feature_highlight: 'medium',
    comparison: 'medium',
  };
  
  // Check if this scene type is naturally reusable
  const isReusable = REUSABLE_SCENE_TYPES.includes(detectedType);
  
  // Calculate duration based on text length (rough estimate: 150 words per minute)
  const wordCount = text.split(/\s+/).length;
  const suggestedDuration = Math.max(3, Math.min(10, Math.ceil(wordCount / 25) * 3)) as 3 | 5 | 7 | 10;
  
  // Generate visual prompt from script text
  const visualPrompt = generateVisualPrompt(text, detectedType);
  
  return {
    text,
    type: detectedType,
    goal: goalMapping[detectedType],
    isReusable,
    reusabilityReason: isReusable 
      ? `${detectedType} scenes can be reused across all video variations` 
      : undefined,
    suggestedDuration,
    motionIntensity: motionMapping[detectedType],
    visualPrompt,
  };
}

// Generate visual prompt from script text
function generateVisualPrompt(text: string, sceneType: SceneStructure): string {
  const basePrompts: Record<SceneStructure, string> = {
    product_closeup: 'Cinematic close-up shot showcasing the product with professional lighting',
    problem_visualization: 'Visual representation of the problem being addressed',
    lifestyle_usage: 'Real-world usage scene showing the product in action',
    social_proof: 'Trust-building visuals with customer satisfaction elements',
    cta_background: 'Eye-catching dynamic background for call-to-action',
    before_after: 'Dramatic transformation comparison showing results',
    unboxing: 'Exciting unboxing experience with premium presentation',
    testimonial: 'Authentic testimonial setting with genuine emotion',
    feature_highlight: 'Focused demonstration of the key feature in action',
    comparison: 'Side-by-side comparison highlighting advantages',
  };
  
  // Extract key nouns/adjectives from text to enhance prompt
  const keyWords = text
    .split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 5)
    .join(', ');
  
  return `${basePrompts[sceneType]}. Context: ${keyWords}`;
}

// Split script into logical segments
function splitScriptIntoSegments(script: string): string[] {
  // Split by sentences or natural breaks
  const segments: string[] = [];
  
  // Try splitting by double newlines first
  let parts = script.split(/\n\n+/);
  
  if (parts.length < 3) {
    // Split by sentences (roughly 2-3 sentences per segment)
    const sentences = script.split(/(?<=[.!?])\s+/);
    let currentSegment = '';
    
    for (const sentence of sentences) {
      currentSegment += sentence + ' ';
      
      if (currentSegment.split(/\s+/).length >= 15 || sentence.endsWith('!') || sentence.endsWith('?')) {
        segments.push(currentSegment.trim());
        currentSegment = '';
      }
    }
    
    if (currentSegment.trim()) {
      segments.push(currentSegment.trim());
    }
  } else {
    segments.push(...parts.filter(p => p.trim()));
  }
  
  return segments.slice(0, 10); // Max 10 scenes
}

// Match assets to scene segments
function matchAssetsToSegments(
  segments: SceneSegment[],
  assets: VisualAsset[]
): SceneSegment[] {
  if (assets.length === 0) return segments;
  
  return segments.map((segment, index) => {
    // Try to match asset based on scene type
    let matchedAsset: VisualAsset | undefined;
    
    // Product closeups get product images
    if (segment.type === 'product_closeup' || segment.type === 'feature_highlight') {
      matchedAsset = assets.find(a => a.type === 'image');
    }
    // Lifestyle/usage scenes get video assets
    else if (segment.type === 'lifestyle_usage' || segment.type === 'unboxing') {
      matchedAsset = assets.find(a => a.type === 'video');
    }
    // B-roll for backgrounds
    else if (segment.type === 'cta_background') {
      matchedAsset = assets.find(a => a.type === 'broll');
    }
    
    // Fallback: assign by index
    if (!matchedAsset && assets[index]) {
      matchedAsset = assets[index];
    }
    
    return { ...segment, matchedAsset };
  });
}

// Find scenes that are reusable across multiple scripts
function identifyReusableScenes(
  scripts: VideoScript[],
  segments: SceneSegment[]
): { reusable: SceneSegment[]; specific: SceneSegment[] } {
  const reusable: SceneSegment[] = [];
  const specific: SceneSegment[] = [];
  
  for (const segment of segments) {
    // Scene types that are naturally reusable
    if (segment.isReusable) {
      reusable.push(segment);
    } else {
      // Check if similar content appears across scripts
      const similarityCount = scripts.filter(script => 
        segment.text.split(' ').some(word => 
          word.length > 4 && script.text.toLowerCase().includes(word.toLowerCase())
        )
      ).length;
      
      if (similarityCount >= scripts.length * 0.7) {
        // This segment concept appears in 70%+ of scripts
        reusable.push({ ...segment, isReusable: true, reusabilityReason: 'Similar content across scripts' });
      } else {
        specific.push(segment);
      }
    }
  }
  
  return { reusable, specific };
}

// Main analysis function
export function analyzeScriptsForScenes(
  scripts: VideoScript[],
  assets: VisualAsset[] = [],
  config: VideoConfig
): ScriptAnalysisResult {
  if (scripts.length === 0) {
    return {
      segments: [],
      reusableScenes: [],
      scriptSpecificScenes: [],
      recommendedSceneCount: 5,
      scalingFactor: 1,
    };
  }
  
  // Analyze the first script as the primary template
  const primaryScript = scripts[0];
  const textSegments = splitScriptIntoSegments(primaryScript.text);
  
  // Analyze each segment
  const analyzedSegments = textSegments.map((text, index) => 
    analyzeSegment(text, index, textSegments.length)
  );
  
  // Match assets to segments
  const segmentsWithAssets = matchAssetsToSegments(analyzedSegments, assets);
  
  // Identify reusable vs script-specific scenes
  const { reusable, specific } = identifyReusableScenes(scripts, segmentsWithAssets);
  
  // Calculate scaling factor (more assets = more scene variations possible)
  const scalingFactor = Math.max(1, Math.floor(assets.length / 2) + 1);
  
  return {
    segments: segmentsWithAssets,
    reusableScenes: reusable,
    scriptSpecificScenes: specific,
    recommendedSceneCount: segmentsWithAssets.length,
    scalingFactor,
  };
}

// Convert analysis result to scene plans
export function convertAnalysisToScenePlans(
  analysis: ScriptAnalysisResult,
  config: VideoConfig,
  includeScaled: boolean = true
): SmartScenePlan[] {
  const scenes: SmartScenePlan[] = [];
  
  // Add all segments as base scenes
  for (let i = 0; i < analysis.segments.length; i++) {
    const segment = analysis.segments[i];
    
    const partialScene: Partial<SmartScenePlan> = {
      structure: segment.type,
      goal: segment.goal,
      motionIntensity: segment.motionIntensity,
      duration: segment.suggestedDuration as 3 | 5 | 7 | 10,
      sourceAsset: segment.matchedAsset,
      productImageUrl: segment.matchedAsset?.type === 'image' ? segment.matchedAsset.url : undefined,
    };
    
    const engineDecision = selectEngineForScene(partialScene, config.budgetPreference);
    
    scenes.push({
      id: `scene-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
      index: i,
      structure: segment.type,
      goal: segment.goal,
      visualIntent: segment.visualPrompt,
      motionIntensity: segment.motionIntensity,
      textSafeArea: config.enableTextOverlays,
      duration: segment.suggestedDuration as 3 | 5 | 7 | 10,
      sourceAsset: segment.matchedAsset,
      productImageUrl: segment.matchedAsset?.type === 'image' ? segment.matchedAsset.url : undefined,
      selectedEngine: engineDecision,
      status: 'pending',
      debug: {
        analysisTime: Date.now(),
        engineSelectionReason: engineDecision.reason,
        complexityScore: segment.motionIntensity === 'high' ? 80 : segment.motionIntensity === 'medium' ? 50 : 30,
        qualityTierMatch: true,
        costEfficiencyScore: 85,
        alternativesConsidered: engineDecision.alternatives.length,
        fallbacksAvailable: engineDecision.alternatives.map(a => a.engineName),
      },
    });
  }
  
  // If scaling is enabled and we have extra assets, add variation scenes
  if (includeScaled && analysis.scalingFactor > 1) {
    // Add scaled scenes using remaining assets
    for (let s = 1; s < analysis.scalingFactor && scenes.length < 15; s++) {
      for (const reusable of analysis.reusableScenes.slice(0, 2)) {
        if (scenes.length >= 15) break;
        
        const sceneIndex = scenes.length;
        const partialScene: Partial<SmartScenePlan> = {
          structure: reusable.type,
          goal: reusable.goal,
          motionIntensity: reusable.motionIntensity,
          duration: reusable.suggestedDuration as 3 | 5 | 7 | 10,
        };
        
        const engineDecision = selectEngineForScene(partialScene, config.budgetPreference);
        
        scenes.push({
          id: `scene-scaled-${Date.now()}-${sceneIndex}-${Math.random().toString(36).substr(2, 9)}`,
          index: sceneIndex,
          structure: reusable.type,
          goal: reusable.goal,
          visualIntent: `${reusable.visualPrompt} (Variation ${s + 1})`,
          motionIntensity: reusable.motionIntensity,
          textSafeArea: config.enableTextOverlays,
          duration: reusable.suggestedDuration as 3 | 5 | 7 | 10,
          selectedEngine: engineDecision,
          status: 'pending',
        });
      }
    }
  }
  
  return scenes;
}

// Generate scenes directly from scripts (main entry point)
export function generateScenesFromScripts(
  scripts: VideoScript[],
  assets: VisualAsset[],
  config: VideoConfig
): { scenes: SmartScenePlan[]; analysis: ScriptAnalysisResult } {
  const analysis = analyzeScriptsForScenes(scripts, assets, config);
  const scenes = convertAnalysisToScenePlans(analysis, config, true);
  
  return { scenes, analysis };
}
