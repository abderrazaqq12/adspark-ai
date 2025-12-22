// Smart Scene Builder Hook
// Manages state and operations for the scene builder

import { useState, useCallback, useMemo } from 'react';
import {
  SmartScenePlan,
  VideoConfig,
  VisualAsset,
  ScenePlanOutput,
  BudgetPreference,
  SceneDuration,
  SceneStructure,
} from '@/lib/smart-scene-builder/types';
import {
  generateScenesFromAssets,
  generateScenesFromTemplate,
  generateEmptyScene,
  regenerateSceneEngine,
  reorderScenes,
  updateSceneDuration,
  calculateTotalDuration,
} from '@/lib/smart-scene-builder/scene-generator';
import {
  selectEngineForScene,
  calculateTotalCost,
  getUniqueEnginesUsed,
} from '@/lib/smart-scene-builder/engine-selector';
import {
  generateScenePlanOutput,
  validateScenePlan,
} from '@/lib/smart-scene-builder/output-schema';
import {
  VideoScript,
  ScriptAnalysisResult,
  generateScenesFromScripts,
  analyzeScriptsForScenes,
} from '@/lib/smart-scene-builder/script-analyzer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UseSmartSceneBuilderProps {
  projectId: string;
  initialConfig?: Partial<VideoConfig>;
  scripts?: VideoScript[];
}

const DEFAULT_CONFIG: VideoConfig = {
  aspectRatio: '9:16',
  resolution: 'auto',
  defaultSceneDuration: 5,
  budgetPreference: 'auto',
  enableTextOverlays: true,
};

export function useSmartSceneBuilder({ projectId, initialConfig, scripts = [] }: UseSmartSceneBuilderProps) {
  const [config, setConfig] = useState<VideoConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  
  const [scenes, setScenes] = useState<SmartScenePlan[]>([]);
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [videoScripts, setVideoScripts] = useState<VideoScript[]>(scripts);
  const [scriptAnalysis, setScriptAnalysis] = useState<ScriptAnalysisResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  
  // Derived state
  const totalDuration = useMemo(() => calculateTotalDuration(scenes), [scenes]);
  const totalCost = useMemo(() => calculateTotalCost(scenes), [scenes]);
  const enginesUsed = useMemo(() => getUniqueEnginesUsed(scenes), [scenes]);
  const completedCount = useMemo(() => 
    scenes.filter(s => s.status === 'completed').length, 
    [scenes]
  );
  
  // Derived: reusable vs script-specific scenes
  const reusableSceneCount = useMemo(() => 
    scriptAnalysis?.reusableScenes.length || 0, 
    [scriptAnalysis]
  );
  const scriptSpecificSceneCount = useMemo(() => 
    scriptAnalysis?.scriptSpecificScenes.length || 0, 
    [scriptAnalysis]
  );
  
  // Update config
  const updateConfig = useCallback((updates: Partial<VideoConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      
      // If budget changed, regenerate all engines
      if (updates.budgetPreference && updates.budgetPreference !== prev.budgetPreference) {
        setScenes(prevScenes => 
          prevScenes.map(scene => 
            regenerateSceneEngine(scene, newConfig.budgetPreference)
          )
        );
      }
      
      return newConfig;
    });
  }, []);
  
  // Add asset
  const addAsset = useCallback((asset: VisualAsset) => {
    setAssets(prev => [...prev, asset]);
  }, []);
  
  // Remove asset
  const removeAsset = useCallback((assetId: string) => {
    setAssets(prev => prev.filter(a => a.id !== assetId));
  }, []);
  
  // Generate scenes from assets
  const generateFromAssets = useCallback(() => {
    const newScenes = generateScenesFromAssets(assets, config);
    setScenes(newScenes);
    toast.success(`Generated ${newScenes.length} scenes from assets`);
  }, [assets, config]);
  
  // Generate scenes from template
  const generateFromTemplate = useCallback((templateName: string) => {
    const newScenes = generateScenesFromTemplate(templateName, config, assets);
    setScenes(newScenes);
    toast.success(`Generated ${newScenes.length} scenes from ${templateName} template`);
  }, [config, assets]);
  
  // Update scripts
  const updateScripts = useCallback((newScripts: VideoScript[]) => {
    setVideoScripts(newScripts);
  }, []);
  
  // Generate scenes from video scripts (AI-powered)
  const generateFromScripts = useCallback(() => {
    if (videoScripts.length === 0) {
      toast.error('No video scripts available. Add scripts first.');
      return;
    }
    
    const { scenes: newScenes, analysis } = generateScenesFromScripts(videoScripts, assets, config);
    setScenes(newScenes);
    setScriptAnalysis(analysis);
    
    const reusableCount = analysis.reusableScenes.length;
    const specificCount = analysis.scriptSpecificScenes.length;
    
    toast.success(
      `Generated ${newScenes.length} scenes from scripts. ` +
      `${reusableCount} reusable across all videos, ${specificCount} script-specific.`
    );
  }, [videoScripts, assets, config]);
  
  // Add empty scene
  const addScene = useCallback(() => {
    const newScene = generateEmptyScene(scenes.length, config);
    setScenes(prev => [...prev, newScene]);
  }, [scenes.length, config]);
  
  // Remove scene
  const removeScene = useCallback((sceneId: string) => {
    setScenes(prev => {
      const filtered = prev.filter(s => s.id !== sceneId);
      return filtered.map((s, i) => ({ ...s, index: i }));
    });
  }, []);
  
  // Update scene
  const updateScene = useCallback((sceneId: string, updates: Partial<SmartScenePlan>) => {
    setScenes(prev => prev.map(s => 
      s.id === sceneId ? { ...s, ...updates } : s
    ));
  }, []);
  
  // Update scene structure
  const updateSceneStructure = useCallback((sceneId: string, structure: SceneStructure) => {
    setScenes(prev => prev.map(s => {
      if (s.id !== sceneId) return s;
      
      const updatedScene = { ...s, structure };
      const newEngine = selectEngineForScene(updatedScene, config.budgetPreference);
      return { ...updatedScene, selectedEngine: newEngine };
    }));
  }, [config.budgetPreference]);
  
  // Update scene duration
  const updateDuration = useCallback((sceneId: string, duration: SceneDuration) => {
    setScenes(prev => prev.map(s => 
      s.id === sceneId 
        ? updateSceneDuration(s, duration, config.budgetPreference)
        : s
    ));
  }, [config.budgetPreference]);
  
  // Reorder scenes
  const moveScene = useCallback((fromIndex: number, toIndex: number) => {
    setScenes(prev => reorderScenes(prev, fromIndex, toIndex));
  }, []);
  
  // Regenerate engine for scene
  const regenerateEngine = useCallback((sceneId: string) => {
    setScenes(prev => prev.map(s => 
      s.id === sceneId 
        ? regenerateSceneEngine(s, config.budgetPreference)
        : s
    ));
    toast.success('Engine re-selected');
  }, [config.budgetPreference]);
  
  // Generate single scene video
  const generateSceneVideo = useCallback(async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    setGeneratingSceneId(sceneId);
    updateScene(sceneId, { status: 'generating' });
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-scene-video', {
        body: {
          sceneId: scene.id,
          engineName: scene.selectedEngine.engineId,
          prompt: scene.visualIntent,
          imageUrl: scene.productImageUrl || scene.sourceAsset?.url,
          duration: scene.duration,
        },
      });
      
      if (error) throw error;
      
      updateScene(sceneId, {
        status: data?.error ? 'failed' : 'completed',
        videoUrl: data?.videoUrl,
        thumbnailUrl: data?.thumbnailUrl,
        error: data?.error,
      });
      
      if (!data?.error) {
        toast.success('Scene generated');
      }
    } catch (err: any) {
      updateScene(sceneId, { 
        status: 'failed', 
        error: err.message || 'Generation failed' 
      });
      toast.error('Scene generation failed');
    } finally {
      setGeneratingSceneId(null);
    }
  }, [scenes, updateScene]);
  
  // Generate all pending scenes
  const generateAllScenes = useCallback(async () => {
    const pendingScenes = scenes.filter(s => s.status === 'pending');
    if (pendingScenes.length === 0) {
      toast.info('No pending scenes to generate');
      return;
    }
    
    setIsGenerating(true);
    let successCount = 0;
    
    for (const scene of pendingScenes) {
      setGeneratingSceneId(scene.id);
      updateScene(scene.id, { status: 'generating' });
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-scene-video', {
          body: {
            sceneId: scene.id,
            engineName: scene.selectedEngine.engineId,
            prompt: scene.visualIntent,
            imageUrl: scene.productImageUrl || scene.sourceAsset?.url,
            duration: scene.duration,
          },
        });
        
        if (error) throw error;
        
        updateScene(scene.id, {
          status: data?.error ? 'failed' : 'completed',
          videoUrl: data?.videoUrl,
          thumbnailUrl: data?.thumbnailUrl,
          error: data?.error,
        });
        
        if (!data?.error) successCount++;
      } catch (err: any) {
        updateScene(scene.id, { 
          status: 'failed', 
          error: err.message || 'Generation failed' 
        });
      }
      
      // Small delay between scenes
      await new Promise(r => setTimeout(r, 500));
    }
    
    setIsGenerating(false);
    setGeneratingSceneId(null);
    toast.success(`Generated ${successCount}/${pendingScenes.length} scenes`);
  }, [scenes, updateScene]);
  
  // Get scene plan output
  const getScenePlan = useCallback((): ScenePlanOutput => {
    return generateScenePlanOutput(projectId, config, scenes);
  }, [projectId, config, scenes]);
  
  // Validate current plan
  const validate = useCallback(() => {
    const plan = getScenePlan();
    return validateScenePlan(plan);
  }, [getScenePlan]);
  
  return {
    // Config
    config,
    updateConfig,
    
    // Assets
    assets,
    addAsset,
    removeAsset,
    
    // Scripts
    videoScripts,
    updateScripts,
    scriptAnalysis,
    
    // Scenes
    scenes,
    addScene,
    removeScene,
    updateScene,
    updateSceneStructure,
    updateDuration,
    moveScene,
    regenerateEngine,
    
    // Generation
    isGenerating,
    generatingSceneId,
    generateFromAssets,
    generateFromTemplate,
    generateFromScripts,
    generateSceneVideo,
    generateAllScenes,
    
    // Output
    getScenePlan,
    validate,
    
    // Derived
    totalDuration,
    totalCost,
    enginesUsed,
    completedCount,
    reusableSceneCount,
    scriptSpecificSceneCount,
  };
}
