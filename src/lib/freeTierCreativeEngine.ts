// Free-Tier Creative Engine - Core Logic
// Maximizes creative output at $0 cost using FFMPEG, AI marketing intelligence, 
// scene recomposition, synthetic motion, and hook replacement

export interface FreeTierCapabilities {
  ffmpegTransformations: FFmpegTransformation[];
  syntheticMotion: SyntheticMotionEffect[];
  sceneRecomposition: SceneRecompositionOption[];
  hookReplacements: HookReplacementStyle[];
  creativePipelines: CreativePipeline[];
}

export interface FFmpegTransformation {
  id: string;
  name: string;
  description: string;
  category: 'motion' | 'pacing' | 'color' | 'audio' | 'composition' | 'overlay' | 'transition';
  command: string;
  isFree: boolean;
}

export interface SyntheticMotionEffect {
  id: string;
  name: string;
  description: string;
  type: 'parallax' | 'zoom' | 'pan' | 'rotation' | 'depth' | 'jitter' | 'loop';
  intensity: 'subtle' | 'medium' | 'dramatic';
  isFree: boolean;
}

export interface SceneRecompositionOption {
  id: string;
  name: string;
  strategy: 'reorder' | 'replace' | 'combine' | 'extract' | 'rebuild';
  description: string;
  isFree: boolean;
}

export interface HookReplacementStyle {
  id: string;
  name: string;
  visualEffect: string;
  emotionalTone: string;
  duration: number;
  isFree: boolean;
}

export interface CreativePipeline {
  id: string;
  name: string;
  steps: string[];
  estimatedCost: number;
  isFree: boolean;
}

// All FFMPEG-based transformations (FREE)
export const FFMPEG_TRANSFORMATIONS: FFmpegTransformation[] = [
  // Motion Effects
  { id: 'parallax-motion', name: 'Parallax Motion', description: 'Simulated depth movement', category: 'motion', command: 'zoompan=z="zoom+0.001":x="iw/2-(iw/zoom/2)":y="ih/2-(ih/zoom/2)":d=125', isFree: true },
  { id: 'slow-zoom', name: 'Ken Burns Zoom', description: 'Slow cinematic zoom', category: 'motion', command: 'zoompan=z="min(max(zoom,pzoom)+0.0015,1.5)":d=125', isFree: true },
  { id: 'stabilized-crop', name: 'Stabilized Crop', description: 'Crop with stabilization', category: 'motion', command: 'deshake=smooth=5:edge=mirror', isFree: true },
  { id: 'frame-interpolation', name: 'Frame Interpolation', description: 'Smooth slow-motion', category: 'motion', command: 'minterpolate=fps=60:mi_mode=mci', isFree: true },
  { id: 'speed-ramp', name: 'Speed Ramping', description: 'Dynamic speed changes', category: 'pacing', command: 'setpts="if(lt(T,2),PTS*0.5,if(lt(T,4),PTS*2,PTS))"', isFree: true },
  { id: 'handheld-jitter', name: 'Handheld Shake', description: 'Authentic camera movement', category: 'motion', command: 'noise=alls=10:allf=t+u,hue=s=0', isFree: true },
  { id: 'rotation-drift', name: 'Camera Rotation', description: 'Subtle rotation effect', category: 'motion', command: 'rotate=PI/180*sin(t*2):bilinear=0', isFree: true },
  
  // Pacing Effects
  { id: 'smart-cut', name: 'Smart Auto-Cut', description: 'Remove silence and dead frames', category: 'pacing', command: 'silenceremove=start_periods=1:start_silence=0.5:start_threshold=-50dB', isFree: true },
  { id: 'dynamic-pacing', name: 'Dynamic Pacing', description: '1-3 second cuts for TikTok', category: 'pacing', command: 'trim=duration=2,setpts=PTS-STARTPTS', isFree: true },
  { id: 'compress-pacing', name: 'Compressed Pacing', description: 'Speed up boring sections', category: 'pacing', command: 'setpts=0.8*PTS', isFree: true },
  
  // Color Grading
  { id: 'warm-grade', name: 'Warm Color Grade', description: 'Golden warm tones', category: 'color', command: 'colorbalance=rs=0.1:gs=0.05:bs=-0.1', isFree: true },
  { id: 'cool-grade', name: 'Cool Color Grade', description: 'Blue cool tones', category: 'color', command: 'colorbalance=rs=-0.1:gs=0:bs=0.1', isFree: true },
  { id: 'high-contrast', name: 'High Contrast', description: 'Punchy contrast look', category: 'color', command: 'eq=contrast=1.3:brightness=0.05:saturation=1.2', isFree: true },
  { id: 'cinematic-lut', name: 'Cinematic LUT', description: 'Film-like color grading', category: 'color', command: 'curves=preset=cross_process', isFree: true },
  { id: 'vintage-fade', name: 'Vintage Fade', description: 'Retro faded look', category: 'color', command: 'curves=lighter,hue=s=0.8', isFree: true },
  
  // Audio
  { id: 'audio-ducking', name: 'Audio Ducking', description: 'Auto-level voice over music', category: 'audio', command: 'sidechaincompress=threshold=0.02:ratio=3', isFree: true },
  { id: 'audio-leveling', name: 'Audio Leveling', description: 'Normalize audio levels', category: 'audio', command: 'loudnorm=I=-16:TP=-1.5:LRA=11', isFree: true },
  { id: 'eq-boost', name: 'Voice EQ Boost', description: 'Enhance voice clarity', category: 'audio', command: 'equalizer=f=3000:t=q:w=1:g=3', isFree: true },
  
  // Composition
  { id: 'portrait-to-square', name: 'Portrait to Square', description: 'Reframe 9:16 to 1:1', category: 'composition', command: 'crop=ih*9/16:ih,scale=1080:1080', isFree: true },
  { id: 'portrait-to-landscape', name: 'Portrait to Landscape', description: 'Reframe 9:16 to 16:9', category: 'composition', command: 'crop=iw:iw*9/16,scale=1920:1080', isFree: true },
  { id: 'smart-crop', name: 'Smart Crop', description: 'Intelligent content-aware crop', category: 'composition', command: 'cropdetect=limit=24:round=2:reset_count=0', isFree: true },
  { id: 'face-tracking-crop', name: 'Face Tracking Crop', description: 'Keep face centered', category: 'composition', command: 'crop=w=ih*9/16:h=ih:x=(iw-ow)/2:y=0', isFree: true },
  
  // Overlays
  { id: 'text-overlay', name: 'Text Overlay', description: 'Add text captions', category: 'overlay', command: 'drawtext=fontfile=/path/font.ttf:text="TEXT":x=(w-tw)/2:y=h-th-50:fontsize=48:fontcolor=white', isFree: true },
  { id: 'emoji-overlay', name: 'Emoji Overlay', description: 'Add emoji reactions', category: 'overlay', command: 'overlay=x=W-w-10:y=10', isFree: true },
  { id: 'cta-button', name: 'CTA Button Overlay', description: 'Add call-to-action button', category: 'overlay', command: 'drawbox=x=10:y=ih-100:w=iw-20:h=80:c=red@0.8:t=fill', isFree: true },
  { id: 'subtitles-burn', name: 'Burn-in Subtitles', description: 'Permanent subtitle overlay', category: 'overlay', command: 'subtitles=subs.srt:force_style="FontSize=24,PrimaryColour=&HFFFFFF"', isFree: true },
  
  // Transitions
  { id: 'hard-cut', name: 'Hard Cut', description: 'Instant scene change', category: 'transition', command: 'concat=n=2:v=1:a=1', isFree: true },
  { id: 'zoom-transition', name: 'Zoom Transition', description: 'Zoom into next scene', category: 'transition', command: 'zoompan=z="zoom+0.01":d=25', isFree: true },
  { id: 'whip-pan', name: 'Whip Pan', description: 'Fast horizontal swipe', category: 'transition', command: 'xfade=transition=wipeleft:duration=0.3', isFree: true },
  { id: 'flash-transition', name: 'Flash Transition', description: 'Quick flash cut', category: 'transition', command: 'fade=t=out:st=0:d=0.1,fade=t=in:st=0:d=0.1', isFree: true },
  { id: 'glitch-transition', name: 'Glitch Transition', description: 'Digital glitch effect', category: 'transition', command: 'noise=alls=50:allf=t+u', isFree: true },
  { id: 'slide-transition', name: 'Slide Transition', description: 'Slide to next scene', category: 'transition', command: 'xfade=transition=slideleft:duration=0.5', isFree: true },
];

// Synthetic Motion Effects (FREE - Image to Video)
export const SYNTHETIC_MOTION_EFFECTS: SyntheticMotionEffect[] = [
  { id: 'parallax-layers', name: 'Parallax Layers', description: 'Multi-layer depth movement', type: 'parallax', intensity: 'medium', isFree: true },
  { id: 'slow-push', name: 'Slow Push In', description: 'Cinematic slow zoom', type: 'zoom', intensity: 'subtle', isFree: true },
  { id: 'dramatic-zoom', name: 'Dramatic Zoom', description: 'Fast dramatic zoom', type: 'zoom', intensity: 'dramatic', isFree: true },
  { id: 'ken-burns', name: 'Ken Burns', description: 'Classic documentary style', type: 'pan', intensity: 'subtle', isFree: true },
  { id: 'orbit-rotation', name: 'Orbit Rotation', description: '3D orbit simulation', type: 'rotation', intensity: 'medium', isFree: true },
  { id: 'depth-pulse', name: 'Depth Pulse', description: 'Breathing depth effect', type: 'depth', intensity: 'subtle', isFree: true },
  { id: 'handheld-sim', name: 'Handheld Simulation', description: 'Natural camera movement', type: 'jitter', intensity: 'subtle', isFree: true },
  { id: 'seamless-loop', name: 'Seamless Loop', description: 'Perfect video loop', type: 'loop', intensity: 'subtle', isFree: true },
  { id: 'light-sweep', name: 'Light Sweep', description: 'Moving light effect', type: 'parallax', intensity: 'medium', isFree: true },
  { id: 'dolly-push', name: 'Dolly Push', description: 'Simulated dolly movement', type: 'zoom', intensity: 'medium', isFree: true },
];

// Scene Recomposition Options (FREE)
export const SCENE_RECOMPOSITION_OPTIONS: SceneRecompositionOption[] = [
  { id: 'scene-reorder', name: 'Scene Reordering', strategy: 'reorder', description: 'Reorder scenes for new narrative', isFree: true },
  { id: 'weak-scene-replace', name: 'Weak Scene Replacement', strategy: 'replace', description: 'Replace weak scenes with motion images', isFree: true },
  { id: 'multi-ad-combine', name: 'Multi-Ad Combination', strategy: 'combine', description: 'Combine scenes from multiple ads', isFree: true },
  { id: 'zoom-extract', name: 'Zoom Extraction', strategy: 'extract', description: 'Extract and zoom product shots', isFree: true },
  { id: 'narrative-rebuild', name: 'Narrative Rebuild', strategy: 'rebuild', description: 'Rebuild around new hook/CTA', isFree: true },
  { id: 'closeup-insert', name: 'Close-up Insertion', strategy: 'replace', description: 'Insert product close-ups', isFree: true },
  { id: 'broll-inject', name: 'B-Roll Injection', strategy: 'replace', description: 'Inject animated B-roll', isFree: true },
];

// Hook Replacement Styles (FREE)
export const HOOK_REPLACEMENT_STYLES: HookReplacementStyle[] = [
  { id: 'zoom-pop', name: 'Zoom Pop-In', visualEffect: 'Quick zoom with bounce', emotionalTone: 'exciting', duration: 1.5, isFree: true },
  { id: 'flash-intro', name: 'Flash Intro', visualEffect: 'White flash transition', emotionalTone: 'urgent', duration: 1, isFree: true },
  { id: 'benefit-flash', name: 'Benefit Flash', visualEffect: 'Text overlay flash', emotionalTone: 'informative', duration: 2, isFree: true },
  { id: 'emotional-symbol', name: 'Emotional Symbol', visualEffect: 'Emoji/icon overlay', emotionalTone: 'emotional', duration: 1.5, isFree: true },
  { id: 'motion-cut', name: 'Motion Cut-In', visualEffect: 'Dynamic motion intro', emotionalTone: 'energetic', duration: 1, isFree: true },
  { id: 'problem-shock', name: 'Problem Shock', visualEffect: 'Glitch + shake effect', emotionalTone: 'shocking', duration: 1.5, isFree: true },
  { id: 'question-reveal', name: 'Question Reveal', visualEffect: 'Text reveal animation', emotionalTone: 'curious', duration: 2, isFree: true },
  { id: 'product-spotlight', name: 'Product Spotlight', visualEffect: 'Zoom + highlight', emotionalTone: 'focused', duration: 1.5, isFree: true },
];

// Free Creative Pipelines
export const FREE_CREATIVE_PIPELINES: CreativePipeline[] = [
  {
    id: 'pacing-variations',
    name: 'Pacing Variations',
    steps: ['smart-cut', 'dynamic-pacing', 'speed-ramp', 'audio-leveling'],
    estimatedCost: 0,
    isFree: true
  },
  {
    id: 'hook-variations',
    name: 'Hook Variations',
    steps: ['scene-reorder', 'zoom-pop', 'flash-intro', 'text-overlay'],
    estimatedCost: 0,
    isFree: true
  },
  {
    id: 'color-variations',
    name: 'Color Grade Variations',
    steps: ['warm-grade', 'cool-grade', 'high-contrast', 'cinematic-lut'],
    estimatedCost: 0,
    isFree: true
  },
  {
    id: 'composition-variations',
    name: 'Composition Variations',
    steps: ['portrait-to-square', 'portrait-to-landscape', 'smart-crop'],
    estimatedCost: 0,
    isFree: true
  },
  {
    id: 'transition-variations',
    name: 'Transition Variations',
    steps: ['hard-cut', 'zoom-transition', 'whip-pan', 'glitch-transition'],
    estimatedCost: 0,
    isFree: true
  },
  {
    id: 'image-to-video',
    name: 'Image to Video',
    steps: ['parallax-layers', 'slow-push', 'ken-burns', 'depth-pulse'],
    estimatedCost: 0,
    isFree: true
  },
  {
    id: 'full-remix',
    name: 'Full Creative Remix',
    steps: ['smart-cut', 'scene-reorder', 'zoom-pop', 'dynamic-pacing', 'audio-leveling', 'subtitles-burn'],
    estimatedCost: 0,
    isFree: true
  },
];

// Get all free tier capabilities
export const getFreeTierCapabilities = (): FreeTierCapabilities => ({
  ffmpegTransformations: FFMPEG_TRANSFORMATIONS,
  syntheticMotion: SYNTHETIC_MOTION_EFFECTS,
  sceneRecomposition: SCENE_RECOMPOSITION_OPTIONS,
  hookReplacements: HOOK_REPLACEMENT_STYLES,
  creativePipelines: FREE_CREATIVE_PIPELINES,
});

// Check if an operation can be done for free
export const canDoForFree = (operationType: string): boolean => {
  const allFreeOps = [
    ...FFMPEG_TRANSFORMATIONS.map(t => t.id),
    ...SYNTHETIC_MOTION_EFFECTS.map(e => e.id),
    ...SCENE_RECOMPOSITION_OPTIONS.map(o => o.id),
    ...HOOK_REPLACEMENT_STYLES.map(h => h.id),
    ...FREE_CREATIVE_PIPELINES.map(p => p.id),
  ];
  return allFreeOps.includes(operationType);
};

// Calculate maximum free variations possible
export const calculateFreeVariations = (
  sourceVideoCount: number,
  requestedCount: number
): { freeCount: number; paidCount: number; explanation: string } => {
  // Each source video can generate multiple free variations through:
  // - Pacing variations: 4 per video
  // - Hook variations: 8 per video  
  // - Color variations: 5 per video
  // - Composition variations: 4 per video (different ratios)
  // - Transition variations: 6 per video
  // - Combined = up to 27 unique free variations per source
  
  const freePerSource = 27;
  const maxFree = sourceVideoCount * freePerSource;
  const freeCount = Math.min(requestedCount, maxFree);
  const paidCount = Math.max(0, requestedCount - maxFree);
  
  let explanation = '';
  if (paidCount === 0) {
    explanation = `All ${freeCount} variations can be generated using FREE tools (FFMPEG, AI Intelligence, Scene Recomposition)`;
  } else {
    explanation = `${freeCount} variations FREE using FFMPEG transformations. ${paidCount} will require premium video engines.`;
  }
  
  return { freeCount, paidCount, explanation };
};
