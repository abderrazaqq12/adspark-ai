/**
 * Unified Execution Layer
 * Switches between Agent, n8n, and Edge modes
 * Same prompt, same schema, different execution
 */

import { supabase } from '@/integrations/supabase/client';
import { UnifiedInput, UnifiedOutput, ExecutionResult, ExecutionMode } from './types';
import { getPromptForExecution } from './prompts';

export type { ExecutionMode } from './types';

export async function executeUnified(
  input: UnifiedInput,
  customPrompt?: string
): Promise<ExecutionResult> {
  const startTime = Date.now();
  
  try {
    switch (input.executionMode) {
      case 'agent':
        return await runLovableAgent(input, customPrompt, startTime);
      case 'n8n':
        return await triggerWebhook(input, customPrompt, startTime);
      case 'edge':
        return await callEdgeFunction(input, customPrompt, startTime);
      default:
        return await runLovableAgent(input, customPrompt, startTime);
    }
  } catch (error: any) {
    console.error('[UnifiedExecutor] Error:', error);
    return {
      success: false,
      error: error.message || 'Execution failed'
    };
  }
}

/**
 * Lovable AI Agent - UI-first execution
 */
async function runLovableAgent(
  input: UnifiedInput,
  customPrompt: string | undefined,
  startTime: number
): Promise<ExecutionResult> {
  console.log('[Agent] Starting Lovable AI execution');
  
  const { systemPrompt, userPrompt } = getPromptForExecution(input, customPrompt);
  
  const { data, error } = await supabase.functions.invoke('unified-generation', {
    body: {
      input,
      prompt: userPrompt,
      systemPrompt,
      mode: 'agent'
    }
  });
  
  if (error) throw error;
  
  return parseResponse(data, 'agent', startTime);
}

/**
 * n8n Workflow - Automation execution
 */
async function triggerWebhook(
  input: UnifiedInput,
  customPrompt: string | undefined,
  startTime: number
): Promise<ExecutionResult> {
  console.log('[n8n] Triggering webhook execution');
  
  if (!input.webhookUrl) {
    throw new Error('Webhook URL required for n8n mode');
  }
  
  const { systemPrompt, userPrompt } = getPromptForExecution(input, customPrompt);
  
  // Use n8n-proxy to avoid CORS
  const { data, error } = await supabase.functions.invoke('n8n-proxy', {
    body: {
      webhookUrl: input.webhookUrl,
      payload: {
        input,
        prompt: userPrompt,
        systemPrompt,
        mode: 'n8n'
      }
    }
  });
  
  if (error) throw error;
  
  return parseResponse(data, 'n8n', startTime);
}

/**
 * Edge Function - High-performance API execution
 */
async function callEdgeFunction(
  input: UnifiedInput,
  customPrompt: string | undefined,
  startTime: number
): Promise<ExecutionResult> {
  console.log('[Edge] Calling edge function');
  
  const { systemPrompt, userPrompt } = getPromptForExecution(input, customPrompt);
  
  const { data, error } = await supabase.functions.invoke('unified-generation', {
    body: {
      input,
      prompt: userPrompt,
      systemPrompt,
      mode: 'edge'
    }
  });
  
  if (error) throw error;
  
  return parseResponse(data, 'edge', startTime);
}

/**
 * Parse and normalize response from any execution mode
 */
function parseResponse(
  data: any,
  engine: ExecutionMode,
  startTime: number
): ExecutionResult {
  const latencyMs = Date.now() - startTime;
  
  if (!data) {
    return { success: false, error: 'Empty response' };
  }
  
  // Handle error responses
  if (data.error) {
    return { success: false, error: data.error };
  }
  
  // Parse the generated content
  let parsed = data;
  if (typeof data === 'string') {
    try {
      // Extract JSON from possible markdown wrapper
      const jsonMatch = data.match(/```json\s*([\s\S]*?)\s*```/) || 
                       data.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
    } catch (e) {
      console.error('[Parser] Failed to parse response:', e);
      return { success: false, error: 'Failed to parse response' };
    }
  }
  
  // Normalize to UnifiedOutput
  const output: UnifiedOutput = {
    status: 'success',
    html: parsed.html || parsed.landingPageHTML || '',
    sections: parsed.sections || parsed.landingPageText || {
      hero: { headline: '', subheadline: '' },
      features: [],
      benefits: [],
      problemSolution: { problem: '', solution: '' },
      usage: [],
      technicalDetails: [],
      faq: [],
      reviews: [],
      cta: { text: '', subtext: '' }
    },
    marketingAngles: parsed.marketingAngles || {
      painPoints: [],
      desires: [],
      emotionalHooks: [],
      trustBuilders: []
    },
    meta: {
      engine,
      latencyMs,
      promptVersion: 1,
      generatedAt: new Date().toISOString()
    }
  };
  
  return { success: true, data: output };
}

/**
 * Get available execution modes
 */
export function getAvailableModes(): Array<{
  mode: ExecutionMode;
  label: string;
  description: string;
  recommended?: boolean;
}> {
  return [
    {
      mode: 'agent',
      label: 'AI Agent',
      description: 'Recommended for most users',
      recommended: true
    },
    {
      mode: 'n8n',
      label: 'Automation (n8n)',
      description: 'For power users with automation workflows'
    },
    {
      mode: 'edge',
      label: 'High-Performance API',
      description: 'Fast, scalable production API'
    }
  ];
}
