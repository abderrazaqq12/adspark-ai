// Extended AI Tools Hook - Standalone module
// Provides integration with extended AI tools with provider resolution debugging

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ExtendedAIModel, 
  getModelById, 
  extendedAIModelsRegistry 
} from '@/data/extendedAIModels';
import { useToast } from '@/hooks/use-toast';

interface ToolExecutionConfig {
  toolId: string;
  prompt?: string;
  language?: string;
  targetMarket?: string;
  audience?: {
    age?: string;
    gender?: string;
  };
  productContext?: {
    name?: string;
    description?: string;
  };
  inputData?: {
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    text?: string;
  };
  additionalParams?: Record<string, any>;
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
  error?: string;
  cost?: number;
  debug?: ToolExecutionDebug;
}

export const useExtendedAITools = () => {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<Record<string, number>>({});
  const [lastResults, setLastResults] = useState<Record<string, ToolExecutionResult>>({});
  const [currentDebug, setCurrentDebug] = useState<ToolExecutionDebug | null>(null);

  // Get available tools by category
  const getVideoModels = useCallback(() => extendedAIModelsRegistry.video, []);
  const getTalkingActorModels = useCallback(() => extendedAIModelsRegistry.talkingActor, []);
  const getImageModels = useCallback(() => extendedAIModelsRegistry.image, []);
  const getPresets = useCallback(() => extendedAIModelsRegistry.presets, []);
  const getTools = useCallback(() => extendedAIModelsRegistry.tools, []);

  // Execute a tool with debug tracking
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

    setIsExecuting(true);
    setExecutionProgress(prev => ({ ...prev, [config.toolId]: 0 }));
    
    // Set initial debug state
    setCurrentDebug({
      provider: 'resolving...',
      model: 'resolving...',
      reason: 'Determining best provider',
      executionTimeMs: 0,
      attemptedProviders: [],
      status: 'resolving',
    });

    const startTime = Date.now();

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
        ...config.additionalParams,
      };

      console.log(`[AITools] Executing ${model.name} via ${functionName}`);

      // Progress simulation
      const progressInterval = setInterval(() => {
        setExecutionProgress(prev => {
          const current = prev[config.toolId] || 0;
          if (current < 90) {
            return { ...prev, [config.toolId]: current + 10 };
          }
          return prev;
        });
      }, 500);

      const response = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      clearInterval(progressInterval);
      setExecutionProgress(prev => ({ ...prev, [config.toolId]: 100 }));

      if (response.error) {
        throw new Error(response.error.message || 'Tool execution failed');
      }

      const responseData = response.data;
      
      // Extract debug info from response
      const debug: ToolExecutionDebug = {
        provider: responseData?.debug?.provider || 'unknown',
        model: responseData?.debug?.model || 'unknown',
        reason: responseData?.debug?.reason || 'Execution completed',
        executionTimeMs: responseData?.debug?.executionTimeMs || (Date.now() - startTime),
        attemptedProviders: responseData?.debug?.attemptedProviders || [],
        costEstimate: responseData?.cost,
        status: 'success',
      };

      setCurrentDebug(debug);

      const result: ToolExecutionResult = {
        success: responseData?.success !== false,
        data: responseData,
        outputUrl: responseData?.outputUrl || responseData?.url || responseData?.imageUrl || responseData?.videoUrl,
        cost: responseData?.cost,
        debug,
      };

      setLastResults(prev => ({ ...prev, [config.toolId]: result }));
      
      toast({
        title: "Tool Executed",
        description: `${model.name} completed via ${debug.provider}`,
      });

      return result;
    } catch (error: any) {
      console.error('[AITools] Execution error:', error);
      
      const errorDebug: ToolExecutionDebug = {
        provider: 'failed',
        model: 'none',
        reason: error.message || 'Unknown error',
        executionTimeMs: Date.now() - startTime,
        attemptedProviders: [],
        status: 'error',
        error: error.message,
      };

      setCurrentDebug(errorDebug);

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
  }, [toast]);

  // Execute multiple tools in sequence
  const executeToolChain = useCallback(async (configs: ToolExecutionConfig[]): Promise<ToolExecutionResult[]> => {
    const results: ToolExecutionResult[] = [];
    
    for (const config of configs) {
      const result = await executeTool(config);
      results.push(result);
      
      if (result.success && result.outputUrl && configs.indexOf(config) < configs.length - 1) {
        const nextConfig = configs[configs.indexOf(config) + 1];
        if (!nextConfig.inputData) {
          nextConfig.inputData = {};
        }
        if (result.outputUrl.includes('video')) {
          nextConfig.inputData.videoUrl = result.outputUrl;
        } else if (result.outputUrl.includes('audio')) {
          nextConfig.inputData.audioUrl = result.outputUrl;
        } else {
          nextConfig.inputData.imageUrl = result.outputUrl;
        }
      }
      
      if (!result.success) {
        break;
      }
    }
    
    return results;
  }, [executeTool]);

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
  }, []);

  return {
    // State
    isExecuting,
    executionProgress,
    lastResults,
    currentDebug,
    
    // Model getters
    getVideoModels,
    getTalkingActorModels,
    getImageModels,
    getPresets,
    getTools,
    getTool,
    
    // Execution
    executeTool,
    executeToolChain,
    
    // Utilities
    toolSupportsInput,
    getToolsForInputType,
    clearDebug,
  };
};

export default useExtendedAITools;
