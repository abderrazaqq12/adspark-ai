/**
 * Lovable AI Gateway Adapter
 * Uses the Lovable AI Gateway for AI completions (requires edge function)
 */

import { config } from '@/config';
import { supabase } from '@/integrations/supabase/client';
import type { AIProviderAdapter, ChatCompletionOptions, ChatCompletionResponse, ChatMessage } from './provider';

export class LovableAIAdapter implements AIProviderAdapter {
  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: {
        messages: options.messages,
        model: options.model || 'google/gemini-2.5-flash',
        stream: false,
      },
    });

    if (error) {
      throw new Error(`Lovable AI error: ${error.message}`);
    }

    return {
      content: data.content || data.response || '',
      model: options.model || 'google/gemini-2.5-flash',
      usage: data.usage,
    };
  }

  async streamChat(options: ChatCompletionOptions, onChunk: (chunk: string) => void): Promise<void> {
    const edgeFunctionUrl = `${config.backend.supabaseUrl}/functions/v1/ai-assistant`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.backend.supabaseAnonKey}`,
      },
      body: JSON.stringify({
        messages: options.messages,
        model: options.model || 'google/gemini-2.5-flash',
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to start stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    // Lovable AI is available when running on Lovable Cloud
    return !!config.backend.supabaseUrl;
  }
}
