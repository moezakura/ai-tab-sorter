import { z } from 'zod';
import { AIConfig, ClassificationResult, PageContent, GroupCategory, DEFAULT_CATEGORIES } from '../types';
import { APIClient } from './apiClient';

export class AIClassifier {
  private config: AIConfig;
  private rateLimiter: RateLimiter;
  private apiClient: APIClient;
  private categories: GroupCategory[] = DEFAULT_CATEGORIES;

  constructor(config: AIConfig, categories: GroupCategory[] = DEFAULT_CATEGORIES) {
    this.config = config;
    this.rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
    this.apiClient = new APIClient(config);
    this.categories = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
  }

  updateConfig(config: AIConfig) {
    this.config = config;
    this.apiClient.updateConfig(config);
  }

  updateCategories(categories: GroupCategory[]) {
    this.categories = (categories && categories.length > 0) ? categories : DEFAULT_CATEGORIES;
  }

  async classifyPage(content: PageContent): Promise<ClassificationResult | null> {
    try {
      // Rate limiting
      await this.rateLimiter.waitForSlot();

      const prompt = this.buildClassificationPrompt(content);
      const response = await this.callAI(prompt);
      
      if (!response) {
        return null;
      }

      return response;
    } catch (error) {
      console.error('Error classifying page:', error);
      return null;
    }
  }

  private buildClassificationPrompt(content: PageContent): string {
    const categories = (this.categories.length > 0 ? this.categories : DEFAULT_CATEGORIES)
      .map(cat => cat.name)
      .join('\\n');
    
    return `あなたはウェブページを分類する専門家です。
以下のページ情報を分析し、最も適切なカテゴリを1つ選んでください。

ページ情報:
- URL: ${content.url}
- タイトル: ${content.title}
- 説明: ${content.description || 'なし'}
- コンテンツ: ${content.content.substring(0, 500)}

利用可能なカテゴリ:
${categories}

このページに最も適したカテゴリを選択し、分類の理由も簡潔に説明してください。
---
JSONは以下のフォーマットで返してください:
{
  "reasoning": "このページは仕事に関連しているため、仕事・プロジェクトカテゴリに分類されます。"
  "category": "選択したカテゴリ名",
  "confidence": 0.8,
}
`;
  }

  private async callAI(prompt: string): Promise<ClassificationResult | null> {
    try {
      // カテゴリ名の列挙型を動的に作成
      const names = (this.categories.length > 0 ? this.categories : DEFAULT_CATEGORIES)
        .map(cat => cat.name);
      // Ensure at least one element to satisfy z.enum typing
      const first = names[0] ?? DEFAULT_CATEGORIES[0].name;
      const rest = (names.length > 0 ? names.slice(1) : DEFAULT_CATEGORIES.slice(1).map(c => c.name)) as string[];
      const categoryEnum = z.enum([first, ...rest] as [string, ...string[]]);

      const schema = z.object({
        reasoning: z.string().optional().describe('分類の理由'),
        category: categoryEnum,
        confidence: z.number().min(0).max(1).describe('分類の信頼度（0.0-1.0）'),
      });

      const messages = [
        { role: 'user' as const, content: prompt }
      ];

      const result = await this.apiClient.chatWithSchema(messages, schema, {
        system: 'あなたは正確な分類を行うアシスタントです。',
        maxRetries: 2,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      return {
        category: result.category,
        confidence: result.confidence || 0.8,
        reasoning: result.reasoning
      };
    } catch (error) {
      console.error('AI API Error:', error);
      return null;
    }
  }
}

class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private timeWindow: number;

  constructor(maxRequests: number, timeWindow: number) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.timeWindow
    );

    // If at capacity, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest) + 100;
      
      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot();
      }
    }

    // Add current request
    this.requests.push(now);
  }
}
