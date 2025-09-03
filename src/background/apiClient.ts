import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, streamText, generateObject, streamObject } from 'ai';
import { z } from 'zod';
import { AIConfig } from '../types';

export class APIClient {
  private provider: ReturnType<typeof createOpenAICompatible>;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  private createProvider(config: AIConfig) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // URLをそのまま保持し、HTTPとHTTPSの両方に対応
    const baseURL = config.apiUrl;
    
    // fetchオプションを設定（ローカルLLM用にSSL検証をスキップ）
    const customFetch: typeof fetch = async (input, init) => {
      // @ts-ignore - ブラウザ環境ではこのオプションは無視される
      const options = {
        ...init,
        // ローカルHTTPサーバーへの接続を許可
        rejectUnauthorized: false
      };
      return globalThis.fetch(input, options);
    };

    return createOpenAICompatible({
      name: 'custom-provider',
      baseURL,
      headers,
      fetch: customFetch
    });
  }

  updateConfig(config: AIConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  async chat(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, maxTokens?: number) {
    const { text } = await generateText({
      model: this.provider(this.config.model),
      messages,
      maxRetries: 2,
      temperature: this.config.temperature,
      maxOutputTokens: maxTokens ?? this.config.maxTokens
    });

    return text;
  }

  async chatStream(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>, maxTokens?: number) {
    const { textStream } = streamText({
      model: this.provider(this.config.model),
      messages,
      maxRetries: 2,
      temperature: this.config.temperature,
      maxOutputTokens: maxTokens ?? this.config.maxTokens
    });

    return textStream;
  }

  async chatWithSchema<T extends z.ZodTypeAny>(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    schema: T,
    options?: {
      system?: string;
      maxRetries?: number;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<z.output<T>> {
    try {
      const { object } = await generateObject({
        model: this.provider(this.config.model),
        messages,
        schema,
        system: options?.system,
        maxRetries: options?.maxRetries ?? 2,
        temperature: options?.temperature ?? this.config.temperature,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens
      });

      return object as z.output<T>;
    } catch (error) {
      console.error('Failed to generate object with schema:', error);
      throw new Error('Failed to generate structured response from AI');
    }
  }

  async chatStreamWithSchema<T extends z.ZodTypeAny>(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    schema: T,
    options?: {
      system?: string;
      maxRetries?: number;
      temperature?: number;
      maxTokens?: number;
    }
  ) {
    try {
      const { partialObjectStream } = streamObject({
        model: this.provider(this.config.model),
        messages,
        schema,
        system: options?.system,
        maxRetries: options?.maxRetries ?? 2,
        temperature: options?.temperature ?? this.config.temperature,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens
      });

      return partialObjectStream;
    } catch (error) {
      console.error('Failed to stream object with schema:', error);
      throw new Error('Failed to generate streaming structured response from AI');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testMessages = [
        { role: 'user' as const, content: 'Hello' }
      ];

      await generateText({
        model: this.provider(this.config.model),
        messages: testMessages,
        maxRetries: 2
      });

      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}