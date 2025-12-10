/**
 * Google Gemini API Adapter
 * Direct connection to Gemini API (requires user API key)
 */

import { config } from '@/config';
import type { AIProviderAdapter, ChatCompletionOptions, ChatCompletionResponse } from './provider';

export class GeminiAdapter implements AIProviderAdapter {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || null;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
    localStorage.setItem('gemini_api_key', key);
  }

  private formatMessages(messages: ChatCompletionOptions['messages']): { contents: any[] } {
    // Gemini uses a different format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Add system message as first user message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage && contents.length > 0) {
      contents[0].parts.unshift({ text: `System: ${systemMessage.content}\n\n` });
    }

    return { contents };
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options.model || 'gemini-1.5-flash';
    const url = `${config.ai.geminiApiUrl}/models/${model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.formatMessages(options.messages),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      content,
      model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async streamChat(options: ChatCompletionOptions, onChunk: (chunk: string) => void): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const model = options.model || 'gemini-1.5-flash';
    const url = `${config.ai.geminiApiUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.formatMessages(options.messages),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens,
        },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to start Gemini stream');
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
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
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
