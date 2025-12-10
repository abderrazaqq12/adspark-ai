/**
 * OpenAI API Adapter
 * Direct connection to OpenAI API (requires user API key)
 */

import { config } from '@/config';
import type { AIProviderAdapter, ChatCompletionOptions, ChatCompletionResponse } from './provider';

export class OpenAIAdapter implements AIProviderAdapter {
  private apiKey: string | null = null;

  constructor() {
    // Try to get API key from localStorage or config
    this.apiKey = localStorage.getItem('openai_api_key') || null;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
    localStorage.setItem('openai_api_key', key);
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${config.ai.openaiApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  async streamChat(options: ChatCompletionOptions, onChunk: (chunk: string) => void): Promise<void> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch(`${config.ai.openaiApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to start OpenAI stream');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
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
    return !!this.apiKey;
  }
}
