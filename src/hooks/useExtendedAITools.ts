// Extended AI Tools Hook - Standalone module
// Provides integration with extended AI tools without modifying existing hooks

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  ExtendedAIModel, 
  getModelById, 
  getModelsByCategory,
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

interface ToolExecutionResult {
  success: boolean;
  data?: any;
  outputUrl?: string;
  error?: string;
  cost?: number;
}

export const useExtendedAITools = () => {
  const { toast } = useToast();
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<Record<string, number>>({});
  const [lastResults, setLastResults] = useState<Record<string, ToolExecutionResult>>({});

  // Get available tools by category
  const getVideoModels = useCallback(() => extendedAIModelsRegistry.video, []);
  const getTalkingActorModels = useCallback(() => extendedAIModelsRegistry.talkingActor, []);
  const getImageModels = useCallback(() => extendedAIModelsRegistry.image, []);
  const getPresets = useCallback(() => extendedAIModelsRegistry.presets, []);
  const getTools = useCallback(() => extendedAIModelsRegistry.tools, []);

  // Execute a tool
  const executeTool = useCallback(async (config: ToolExecutionConfig): Promise<ToolExecutionResult> => {
    const model = getModelById(config.toolId);
    if (!model) {
      return { success: false, error: 'Tool not found' };
    }

    setIsExecuting(true);
    setExecutionProgress(prev => ({ ...prev, [config.toolId]: 0 }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Determine which edge function to call based on tool category
      let functionName = model.apiEndpoint || 'ai-tools';
      
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

      console.log(`Executing ${model.name} via ${functionName}:`, payload);

      // Simulate progress updates
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

      const result: ToolExecutionResult = {
        success: true,
        data: response.data,
        outputUrl: response.data?.outputUrl || response.data?.url || response.data?.imageUrl || response.data?.videoUrl,
        cost: response.data?.cost,
      };

      setLastResults(prev => ({ ...prev, [config.toolId]: result }));
      
      toast({
        title: "Tool Executed",
        description: `${model.name} completed successfully`,
      });

      return result;
    } catch (error: any) {
      console.error('Tool execution error:', error);
      
      const result: ToolExecutionResult = {
        success: false,
        error: error.message || 'Unknown error',
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
      
      // Pass output from previous tool as input to next
      if (result.success && result.outputUrl && configs.indexOf(config) < configs.length - 1) {
        const nextConfig = configs[configs.indexOf(config) + 1];
        if (!nextConfig.inputData) {
          nextConfig.inputData = {};
        }
        // Determine input type based on output
        if (result.outputUrl.includes('video')) {
          nextConfig.inputData.videoUrl = result.outputUrl;
        } else if (result.outputUrl.includes('audio')) {
          nextConfig.inputData.audioUrl = result.outputUrl;
        } else {
          nextConfig.inputData.imageUrl = result.outputUrl;
        }
      }
      
      // Stop chain if a tool fails
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

  return {
    // State
    isExecuting,
    executionProgress,
    lastResults,
    
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
  };
};

export default useExtendedAITools;
