// Extended AI Tools Hook - Enhanced with execution tracking
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ExtendedAIModel, 
  getModelById, 
  extendedAIModelsRegistry 
} from '@/data/extendedAIModels';
import { useToast } from '@/hooks/use-toast';
import { ExecutionState, ExecutionTiming } from '@/components/ai-tools/ExecutionStatusTracker';
import { ExecutionHistoryItem } from '@/components/ai-tools/ExecutionHistoryPanel';
import { ImageOutputSettings, VideoOutputSettings } from '@/components/ai-tools/OutputControlsPanel';

interface ToolExecutionConfig {
  toolId: string;
  prompt?: string;
  language?: string;
  targetMarket?: string;
  audience?: { age?: string; gender?: string };
  productContext?: { name?: string; description?: string };
  inputData?: { imageUrl?: string; videoUrl?: string; audioUrl?: string; text?: string };
  additionalParams?: Record<string, any>;
  imageSettings?: ImageOutputSettings;
  videoSettings?: VideoOutputSettings;
}

export interface ToolExecutionDebug {
  provider: string;
  model: string;
  reason: string;
  executionTimeMs: number;
  attemptedProviders: string[];
  costEstimate?: number;
  status: 'idle' | 'resolving' | 'executing' | 'success' | 'error';
  error?: string;
}

interface ToolExecutionResult {
  success: boolean;
  data?: any;
  outputUrl?: string;
  outputType?: 'image' | 'video' | 'audio' | 'text';
  error?: string;
  cost?: number;
  debug?: ToolExecutionDebug;
}

const MAX_HISTORY_ITEMS = 10;

export const useExtendedAITools = () => {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<Record<string, number>>({});
  const [lastResults, setLastResults] = useState<Record<string, ToolExecutionResult>>({});
  const [currentDebug, setCurrentDebug] = useState<ToolExecutionDebug | null>(null);
  const [executionTiming, setExecutionTiming] = useState<ExecutionTiming>({
    startTime: null,
    endTime: null,
    state: 'idle',
    progress: 0,
  });
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryItem[]>([]);
  const [lastOutputUrl, setLastOutputUrl] = useState<string | null>(null);
  const [lastOutputType, setLastOutputType] = useState<'image' | 'video' | 'audio' | 'text'>('image');
  const [lastSuccess, setLastSuccess] = useState(false);

  // Ref for progress interval
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get available tools by category
  const getVideoModels = useCallback(() => extendedAIModelsRegistry.video, []);
  const getTalkingActorModels = useCallback(() => extendedAIModelsRegistry.talkingActor, []);
  const getImageModels = useCallback(() => extendedAIModelsRegistry.image, []);
  const getPresets = useCallback(() => extendedAIModelsRegistry.presets, []);
  const getTools = useCallback(() => extendedAIModelsRegistry.tools, []);

  // Determine output type based on tool category
  const getOutputTypeFromTool = (tool: ExtendedAIModel): 'image' | 'video' | 'audio' | 'text' => {
    if (tool.outputType === 'video') return 'video';
    if (tool.outputType === 'audio') return 'audio';
    if (tool.outputType === 'text') return 'text';
    return 'image';
  };

  // Estimate cost based on settings
  const estimateCost = useCallback((
    toolId: string,
    imageSettings?: ImageOutputSettings,
    videoSettings?: VideoOutputSettings
  ): number => {
    const tool = getModelById(toolId);
    if (!tool) return 0;

    let baseCost = 0.02;
    
    if (tool.pricingTier === 'premium') baseCost = 0.10;
    else if (tool.pricingTier === 'standard') baseCost = 0.05;
    else if (tool.pricingTier === 'budget') baseCost = 0.02;

    if (imageSettings) {
      if (imageSettings.quality === 'high') baseCost *= 2;
      else if (imageSettings.quality === 'draft') baseCost *= 0.5;
      baseCost *= imageSettings.numOutputs;
      if (imageSettings.resolution === '2048') baseCost *= 1.5;
    }

    if (videoSettings) {
      if (videoSettings.qualityTier === 'premium') baseCost *= 2.5;
      else if (videoSettings.qualityTier === 'budget') baseCost *= 0.6;
      baseCost *= (videoSettings.duration / 5); // Per 5 seconds
      if (videoSettings.fps === '60') baseCost *= 1.3;
    }

    return Math.round(baseCost * 100) / 100;
  }, []);

  // Add to history
  const addToHistory = useCallback((item: Omit<ExecutionHistoryItem, 'id'>) => {
    setExecutionHistory(prev => {
      const newHistory = [
        { ...item, id: crypto.randomUUID() },
        ...prev
      ].slice(0, MAX_HISTORY_ITEMS);
      return newHistory;
    });
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  // Execute a tool with full tracking
  const executeTool = useCallback(async (config: ToolExecutionConfig): Promise<ToolExecutionResult> => {
    const model = getModelById(config.toolId);
    if (!model) {
      const errorDebug: ToolExecutionDebug = {
        provider: 'none',
        model: 'none',
        reason: 'Tool not found in registry',
        executionTimeMs: 0,
        attemptedProviders: [],
        status: 'error',
        error: 'Tool not found',
      };
      setCurrentDebug(errorDebug);
      return { success: false, error: 'Tool not found', debug: errorDebug };
    }

    const startTime = new Date();
    
    // Update timing state
    setExecutionTiming({
      startTime,
      endTime: null,
      state: 'queued',
      progress: 0,
    });

    setIsExecuting(true);
    setExecutionProgress(prev => ({ ...prev, [config.toolId]: 0 }));
    setLastSuccess(false);
    
    // Set initial debug state
    setCurrentDebug({
      provider: 'resolving...',
      model: 'resolving...',
      reason: 'Determining best provider based on availability and cost',
      executionTimeMs: 0,
      attemptedProviders: [],
      status: 'resolving',
    });

    // Move to processing state
    setTimeout(() => {
      setExecutionTiming(prev => ({ ...prev, state: 'processing' }));
    }, 500);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Update debug to executing
      setCurrentDebug(prev => prev ? { ...prev, status: 'executing' } : null);

      const functionName = model.apiEndpoint || 'ai-tools';
      
      const payload = {
        action: config.toolId,
        model: model.id,
        category: model.category,
        prompt: config.prompt,
        language: config.language || 'en',
        targetMarket: config.targetMarket || 'gcc',
        audience: config.audience,
        productContext: config.productContext,
        inputData: config.inputData,
        modelConfig: model.config,
        imageSettings: config.imageSettings,
        videoSettings: config.videoSettings,
        ...config.additionalParams,
      };

      console.log(`[AITools] Executing ${model.name} via ${functionName}`);

      // Progress simulation with timing updates
      let progress = 0;
      progressIntervalRef.current = setInterval(() => {
        progress = Math.min(progress + 8, 90);
        setExecutionProgress(prev => ({ ...prev, [config.toolId]: progress }));
        setExecutionTiming(prev => ({ ...prev, progress }));
      }, 400);

      const response = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      setExecutionProgress(prev => ({ ...prev, [config.toolId]: 100 }));
      setExecutionTiming(prev => ({ 
        ...prev, 
        endTime, 
        progress: 100,
        state: response.error ? 'failed' : 'completed' 
      }));

      if (response.error) {
        throw new Error(response.error.message || 'Tool execution failed');
      }

      const responseData = response.data;
      const outputType = getOutputTypeFromTool(model);
      const outputUrl = responseData?.outputUrl || responseData?.url || responseData?.imageUrl || responseData?.videoUrl;
      
      // Extract debug info from response
      const debug: ToolExecutionDebug = {
        provider: responseData?.debug?.provider || model.apiEndpoint || 'lovable_ai',
        model: responseData?.debug?.model || model.id,
        reason: responseData?.debug?.reason || 'Preferred provider with valid API key',
        executionTimeMs: responseData?.debug?.executionTimeMs || durationMs,
        attemptedProviders: responseData?.debug?.attemptedProviders || [responseData?.debug?.provider || 'lovable_ai'],
        costEstimate: responseData?.cost,
        status: 'success',
      };

      setCurrentDebug(debug);
      setLastOutputUrl(outputUrl);
      setLastOutputType(outputType);
      setLastSuccess(true);

      // Add to history
      addToHistory({
        timestamp: startTime,
        toolId: config.toolId,
        toolName: model.name,
        provider: debug.provider,
        model: debug.model,
        cost: responseData?.cost || 0,
        success: true,
        durationMs,
        outputUrl,
      });

      const result: ToolExecutionResult = {
        success: responseData?.success !== false,
        data: responseData,
        outputUrl,
        outputType,
        cost: responseData?.cost,
        debug,
      };

      setLastResults(prev => ({ ...prev, [config.toolId]: result }));
      
      toast({
        title: "Execution Complete",
        description: `${model.name} finished in ${(durationMs / 1000).toFixed(1)}s via ${debug.provider}`,
      });

      return result;
    } catch (error: any) {
      console.error('[AITools] Execution error:', error);
      
      // Clear progress interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      setExecutionTiming(prev => ({ 
        ...prev, 
        endTime, 
        state: 'failed' 
      }));

      const errorDebug: ToolExecutionDebug = {
        provider: 'failed',
        model: 'none',
        reason: error.message || 'Unknown error',
        executionTimeMs: durationMs,
        attemptedProviders: [],
        status: 'error',
        error: error.message,
      };

      setCurrentDebug(errorDebug);
      setLastSuccess(false);

      // Add to history
      addToHistory({
        timestamp: startTime,
        toolId: config.toolId,
        toolName: model.name,
        provider: 'unknown',
        model: 'unknown',
        cost: 0,
        success: false,
        durationMs,
      });

      const result: ToolExecutionResult = {
        success: false,
        error: error.message || 'Unknown error',
        debug: errorDebug,
      };

      setLastResults(prev => ({ ...prev, [config.toolId]: result }));
      
      toast({
        title: "Execution Failed",
        description: error.message || "Failed to execute tool",
        variant: "destructive",
      });

      return result;
    } finally {
      setIsExecuting(false);
      setTimeout(() => {
        setExecutionProgress(prev => {
          const { [config.toolId]: _, ...rest } = prev;
          return rest;
        });
      }, 2000);
    }
  }, [toast, addToHistory]);

  // Get tool by ID
  const getTool = useCallback((toolId: string) => getModelById(toolId), []);

  // Check if a tool supports a specific input type
  const toolSupportsInput = useCallback((toolId: string, inputType: string): boolean => {
    const model = getModelById(toolId);
    return model?.inputTypes.includes(inputType) || false;
  }, []);

  // Get tools that can process a specific input type
  const getToolsForInputType = useCallback((inputType: string): ExtendedAIModel[] => {
    const allModels = [
      ...extendedAIModelsRegistry.video,
      ...extendedAIModelsRegistry.talkingActor,
      ...extendedAIModelsRegistry.image,
      ...extendedAIModelsRegistry.presets,
      ...extendedAIModelsRegistry.tools,
    ];
    return allModels.filter(model => model.inputTypes.includes(inputType));
  }, []);

  // Clear debug state
  const clearDebug = useCallback(() => {
    setCurrentDebug(null);
    setExecutionTiming({
      startTime: null,
      endTime: null,
      state: 'idle',
      progress: 0,
    });
  }, []);

  // Reset output
  const resetOutput = useCallback(() => {
    setLastOutputUrl(null);
    setLastSuccess(false);
  }, []);

  return {
    // State
    isExecuting,
    executionProgress,
    lastResults,
    currentDebug,
    executionTiming,
    executionHistory,
    lastOutputUrl,
    lastOutputType,
    lastSuccess,
    
    // Model getters
    getVideoModels,
    getTalkingActorModels,
    getImageModels,
    getPresets,
    getTools,
    getTool,
    
    // Execution
    executeTool,
    estimateCost,
    
    // Utilities
    toolSupportsInput,
    getToolsForInputType,
    clearDebug,
    clearHistory,
    resetOutput,
  };
};

export default useExtendedAITools;
