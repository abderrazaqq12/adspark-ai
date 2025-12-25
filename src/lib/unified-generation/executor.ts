/**
 * Unified Execution Layer
 * Switches between Agent and Edge modes
 * Same prompt, same schema, different execution
 * 
 * NOTE: All AI execution now goes through edge functions.
 * Client-side AI adapters have been removed to simplify architecture.
 */

import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/utils/ai-factory';
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
      case 'edge':
        return await callEdgeFunction(input, customPrompt, startTime);
      case 'gemini':
        // Gemini now runs via edge function, not client-side
        return await callEdgeFunction(input, customPrompt, startTime, 'gemini');
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

  const { data, error } = await invokeEdgeFunction('unified-generation', {
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
 * Edge Function - High-performance API execution
 * Also handles Gemini mode when specified
 */
async function callEdgeFunction(
  input: UnifiedInput,
  customPrompt: string | undefined,
  startTime: number,
  preferredModel?: 'gemini' | 'default'
): Promise<ExecutionResult> {
  console.log('[Edge] Calling edge function', preferredModel ? `with model: ${preferredModel}` : '');

  const { systemPrompt, userPrompt } = getPromptForExecution(input, customPrompt);

  const { data, error } = await invokeEdgeFunction('unified-generation', {
    body: {
      input,
      prompt: userPrompt,
      systemPrompt,
      mode: preferredModel === 'gemini' ? 'gemini' : 'edge'
    }
  });

  if (error) throw error;

  return parseResponse(data, preferredModel === 'gemini' ? 'gemini' : 'edge', startTime);
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
      mode: 'edge',
      label: 'High-Performance API',
      description: 'Fast, scalable production API'
    }
  ];
}
