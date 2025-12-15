/**
 * Unified Execution Layer
 * Switches between Agent, n8n, and Edge modes
 * Same prompt, same schema, different execution
 */

import { supabase } from '@/integrations/supabase/client';
import { UnifiedInput, UnifiedOutput, ExecutionResult, ExecutionMode } from './types';
import { getPromptForExecution } from './prompts';

export type { ExecutionMode } from './types';

import { GeminiAdapter } from '../ai/gemini';

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
      case 'gemini':
        return await runGeminiDirect(input, customPrompt, startTime);
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
 * Google AI Studio - Direct Client-Side Execution
 */
async function runGeminiDirect(
  input: UnifiedInput,
  customPrompt: string | undefined,
  startTime: number
): Promise<ExecutionResult> {
  console.log('[Gemini] Starting direct execution');

  const adapter = new GeminiAdapter();
  if (!await adapter.isAvailable()) {
    throw new Error('Google AI Studio API key not configured. Please add it in Settings.');
  }

  const { systemPrompt, userPrompt } = getPromptForExecution(input, customPrompt);

  // Combine system and user prompt for Gemini
  // We'll use a chat structure where the first message is the system context
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt }
  ];

  try {
    const response = await adapter.chat({
      messages,
      temperature: 0.7,
      maxTokens: 8192 // Large context window for HTML generation
    });

    // Parse the JSON response from the model
    // Gemini often wraps JSON in code blocks, handled by parseResponse
    return parseResponse(response.content, 'gemini', startTime);

  } catch (error: any) {
    console.error('[Gemini] Execution error:', error);
    throw error;
  }
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
  if (typeof data === 'object' && data.error) {
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
      } else {
        // Try parsing directly if no code blocks found
        parsed = JSON.parse(data);
      }
    } catch (e) {
      console.error('[Parser] Failed to parse response:', e);
      // For Gemini, sometimes it might just output text if JSON instruction failed
      // We could try to gracefully handle or just fail
      return { success: false, error: 'Failed to parse JSON response from AI' };
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
      mode: 'gemini',
      label: 'Google AI Studio',
      description: 'Run locally with your API Key (Free)',
      recommended: false
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
