export interface TabInfo {
  id: number;
  url: string;
  title: string;
  content?: string;
  extractedAt?: number;
}

export interface TabGroupInfo {
  id: number;
  title: string;
  color: string;
  collapsed: boolean;
  windowId: number;
  tabIds: number[];
}

export interface TabCache {
  [tabId: number]: {
    url: string;
    title: string;
    category?: string;
    lastClassified?: number;
  };
}

export interface TabGroup {
  id: number;
  title: string;
  color: string;
  collapsed: boolean;
  windowId: number;
}

export interface GroupCategory {
  name: string;
  color: string;
  keywords?: string[];
  urlPatterns?: string[];
  priority?: number;
}

export interface ExtensionSettings {
  enabled: boolean;
  apiConfig: AIConfig;
  categories: GroupCategory[];
  excludedUrls: string[];
  autoGroupNewTabs: boolean;
  groupingDelay: number;
}

export interface AIConfig {
  apiUrl: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning?: string;
}

export interface PageContent {
  url: string;
  title: string;
  description?: string;
  content: string;
  keywords?: string[];
}

export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'CONTENT_EXTRACTED'
  | 'CLASSIFY_TAB'
  | 'GROUP_TAB'
  | 'SETTINGS_UPDATED'
  | 'PROCESSING_STATUS'
  | 'GET_PROCESSING_STATUS'
  | 'TEST_CONNECTION';

export interface Message<T = any> {
  type: MessageType;
  payload?: T;
}

export const DEFAULT_CATEGORIES: GroupCategory[] = [
  { name: '仕事・プロジェクト', color: 'blue' },
  { name: '学習・ドキュメント', color: 'green' },
  { name: 'エンターテイメント', color: 'red' },
  { name: 'ショッピング', color: 'yellow' },
  { name: 'ニュース・メディア', color: 'cyan' },
  { name: 'SNS・コミュニケーション', color: 'purple' },
  { name: '開発・技術', color: 'grey' },
  { name: 'その他', color: 'orange' }
];

export interface BuildInfo {
  version: string;
  buildDate: string;
  buildTime: string;
}

export interface StructuredChatOptions {
  system?: string;
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  apiConfig: {
    apiUrl: 'http://localhost:11434/v1',
    model: 'llama3',
    maxTokens: 1024,
    temperature: 0.3
  },
  categories: DEFAULT_CATEGORIES,
  excludedUrls: [
    'chrome://*',
    'chrome-extension://*',
    'moz-extension://*',
    'about:*',
    'file://*'
  ],
  autoGroupNewTabs: true,
  groupingDelay: 2000
};
