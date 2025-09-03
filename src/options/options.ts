import 'virtual:uno.css';
import '../styles/themes.css';
import browser from 'webextension-polyfill';
import { StorageManager } from '../utils/storage';
import { ExtensionSettings, DEFAULT_SETTINGS } from '../types';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import { BUILD_INFO } from '../utils/buildInfo';

class OptionsController {
  private storageManager: StorageManager;
  private settings?: ExtensionSettings;
  private currentTheme: 'light' | 'dark' | 'system' = 'system';

  constructor() {
    this.storageManager = new StorageManager();
    this.initialize();
  }

  private async initialize() {
    // Initialize theme
    await this.initializeTheme();
    
    this.settings = await this.storageManager.getSettings();
    this.updateUI();
    this.setupEventListeners();
    this.displayBuildInfo();
  }

  private async initializeTheme() {
    // Load saved theme preference
    const saved = await browser.storage.local.get('theme');
    this.currentTheme = (saved.theme as 'light' | 'dark' | 'system') || 'system';
    this.applyTheme();
  }

  private applyTheme() {
    const root = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    root.removeAttribute('data-theme');
    
    if (this.currentTheme === 'light') {
      root.setAttribute('data-theme', 'light');
      if (themeIcon) {
        themeIcon.className = 'i-mdi-weather-sunny text-xl';
      }
    } else if (this.currentTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      if (themeIcon) {
        themeIcon.className = 'i-mdi-weather-night text-xl';
      }
    } else {
      // System theme - let CSS media query handle it
      if (themeIcon) {
        themeIcon.className = 'i-mdi-brightness-6 text-xl';
      }
    }
  }

  private async toggleTheme() {
    // Cycle through themes: system -> light -> dark -> system
    if (this.currentTheme === 'system') {
      this.currentTheme = 'light';
    } else if (this.currentTheme === 'light') {
      this.currentTheme = 'dark';
    } else {
      this.currentTheme = 'system';
    }
    
    // Save preference
    await browser.storage.local.set({ theme: this.currentTheme });
    
    // Apply theme
    this.applyTheme();
    
    // Show notification
    const themeNames = {
      'system': 'システム設定',
      'light': 'ライトテーマ',
      'dark': 'ダークテーマ'
    };
    this.showNotification(`テーマ: ${themeNames[this.currentTheme]}`, 'info');
  }

  private updateUI() {
    if (!this.settings) return;

    // API設定
    (document.getElementById('apiUrl') as HTMLInputElement).value = this.settings.apiConfig.apiUrl;
    (document.getElementById('apiKey') as HTMLInputElement).value = this.settings.apiConfig.apiKey || '';
    (document.getElementById('model') as HTMLInputElement).value = this.settings.apiConfig.model;
    
    // maxTokensとtemperatureスライダー
    const maxTokensInput = document.getElementById('maxTokens') as HTMLInputElement;
    const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
    const maxTokensValue = document.getElementById('maxTokensValue');
    const temperatureValue = document.getElementById('temperatureValue');
    
    if (maxTokensInput && maxTokensValue) {
      maxTokensInput.value = this.settings.apiConfig.maxTokens.toString();
      maxTokensValue.textContent = this.settings.apiConfig.maxTokens.toString();
    }
    
    if (temperatureInput && temperatureValue) {
      temperatureInput.value = this.settings.apiConfig.temperature.toString();
      temperatureValue.textContent = this.settings.apiConfig.temperature.toString();
    }
    
    // 除外URL
    (document.getElementById('excludedUrls') as HTMLTextAreaElement).value = 
      this.settings.excludedUrls.join('\n');

    // カテゴリリスト
    this.renderCategories();
  }

  private renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container || !this.settings) return;

    container.innerHTML = this.settings.categories
      .map((cat, index) => {
        // Map category colors to CSS variables
        const colorMap: { [key: string]: string } = {
          'blue': 'blue',
          'red': 'red',
          'yellow': 'yellow',
          'green': 'green',
          'pink': 'pink',
          'purple': 'purple',
          'cyan': 'cyan',
          'grey': 'grey',
          'orange': 'orange'
        };
        
        const categoryColor = colorMap[cat.color] || 'grey';
        
        return `
        <div class="flex items-center p-2 bg-surface rounded mb-2">
          <span class="w-5 h-5 rounded mr-2.5" style="background-color: rgb(var(--color-group-${categoryColor}))"></span>
          <span class="flex-1 text-text">${cat.name}</span>
          <button class="px-2 py-1 text-xs bg-transparent border border-danger text-danger rounded hover:bg-danger hover:text-text-inverse transition-colors" data-index="${index}">削除</button>
        </div>
      `;
      }).join('');
  }

  private setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // Save button
    document.getElementById('saveSettings')?.addEventListener('click', () => this.saveSettings());
    
    // Reset button
    document.getElementById('resetSettings')?.addEventListener('click', () => this.resetSettings());
    
    // Test connection button
    document.getElementById('testConnection')?.addEventListener('click', () => this.testConnection());
    
    // maxTokensスライダー
    const maxTokensInput = document.getElementById('maxTokens') as HTMLInputElement;
    const maxTokensValue = document.getElementById('maxTokensValue');
    if (maxTokensInput && maxTokensValue) {
      maxTokensInput.addEventListener('input', () => {
        maxTokensValue.textContent = maxTokensInput.value;
      });
    }
    
    // temperatureスライダー
    const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
    const temperatureValue = document.getElementById('temperatureValue');
    if (temperatureInput && temperatureValue) {
      temperatureInput.addEventListener('input', () => {
        temperatureValue.textContent = temperatureInput.value;
      });
    }
    
    // API key visibility toggle
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const apiKeyIcon = document.getElementById('apiKeyIcon');
    
    if (toggleApiKeyBtn && apiKeyInput && apiKeyIcon) {
      toggleApiKeyBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
          apiKeyInput.type = 'text';
          apiKeyIcon.className = 'i-mdi-eye-off text-xl';
        } else {
          apiKeyInput.type = 'password';
          apiKeyIcon.className = 'i-mdi-eye text-xl';
        }
      });
    }
  }

  private async saveSettings() {
    if (!this.settings) return;

    this.settings.apiConfig.apiUrl = (document.getElementById('apiUrl') as HTMLInputElement).value;
    this.settings.apiConfig.apiKey = (document.getElementById('apiKey') as HTMLInputElement).value || undefined;
    this.settings.apiConfig.model = (document.getElementById('model') as HTMLInputElement).value;
    
    // maxTokensとtemperatureの値を保存
    const maxTokensInput = document.getElementById('maxTokens') as HTMLInputElement;
    const temperatureInput = document.getElementById('temperature') as HTMLInputElement;
    
    if (maxTokensInput) {
      this.settings.apiConfig.maxTokens = parseInt(maxTokensInput.value, 10);
    }
    
    if (temperatureInput) {
      this.settings.apiConfig.temperature = parseFloat(temperatureInput.value);
    }
    
    // デバッグ用：保存される設定値をコンソールに出力
    console.log('Saving settings:', {
      apiUrl: this.settings.apiConfig.apiUrl,
      model: this.settings.apiConfig.model,
      hasApiKey: !!this.settings.apiConfig.apiKey,
      maxTokens: this.settings.apiConfig.maxTokens,
      temperature: this.settings.apiConfig.temperature
    });
    
    const excludedUrls = (document.getElementById('excludedUrls') as HTMLTextAreaElement).value;
    this.settings.excludedUrls = excludedUrls.split('\n').filter(url => url.trim());

    await this.storageManager.saveSettings(this.settings);
    
    // Notify background script
    await browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    
    this.showNotification('設定を保存しました');
  }

  private async resetSettings() {
    if (confirm('設定を初期値に戻しますか？')) {
      await this.storageManager.saveSettings(DEFAULT_SETTINGS);
      this.settings = DEFAULT_SETTINGS;
      this.updateUI();
      this.showNotification('設定をリセットしました');
    }
  }

  private async testConnection() {
    const apiUrl = (document.getElementById('apiUrl') as HTMLInputElement).value;
    const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;
    const model = (document.getElementById('model') as HTMLInputElement).value;

    // APIClientと同じ設定でプロバイダを作成
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // URLをそのまま保持し、HTTPとHTTPSの両方に対応
    const baseURL = apiUrl;
    
    // デバッグ用：接続テストで使用されるbaseURLをコンソールに出力
    console.log('Testing connection with:', {
      baseURL,
      model,
      hasApiKey: !!apiKey
    });
    
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

    const provider = createOpenAICompatible({
      name: 'custom-provider',
      baseURL,
      headers,
      fetch: customFetch
    });

    try {
      const testMessages = [
        { role: 'user' as const, content: 'Hello' }
      ];

      await generateText({
        model: provider(model),
        messages: testMessages,
        maxRetries: 2
      });

      this.showNotification('接続成功！', 'success');
    } catch (error) {
      console.error('API connection test failed:', error);
      this.showNotification('接続エラー', 'error');
    }
  }

  private displayBuildInfo() {
    const versionElement = document.getElementById('version');
    const buildTimeElement = document.getElementById('buildTime');
    
    if (versionElement) {
      versionElement.textContent = BUILD_INFO.version;
    }
    if (buildTimeElement) {
      buildTimeElement.textContent = BUILD_INFO.buildTime;
    }
  }
  
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const notification = document.createElement('div');
    
    // Map notification types to UnoCSS classes
    const classMap = {
      'success': 'fixed top-5 right-5 px-5 py-3 rounded-md bg-secondary text-text-inverse text-sm z-1000 animate-slideIn',
      'error': 'fixed top-5 right-5 px-5 py-3 rounded-md bg-danger text-text-inverse text-sm z-1000 animate-slideIn',
      'info': 'fixed top-5 right-5 px-5 py-3 rounded-md bg-primary text-text-inverse text-sm z-1000 animate-slideIn'
    };
    
    notification.className = classMap[type];
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});