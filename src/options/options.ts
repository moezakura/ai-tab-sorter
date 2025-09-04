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
    const lightBtn = document.getElementById('lightThemeBtn');
    const darkBtn = document.getElementById('darkThemeBtn');
    const systemBtn = document.getElementById('systemThemeBtn');

    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    root.removeAttribute('data-theme');

    // Reset button states (match popup style)
    lightBtn?.classList.remove('bg-white/30', 'bg-yellow-400/30');
    darkBtn?.classList.remove('bg-white/30', 'bg-blue-600/30');
    systemBtn?.classList.remove('bg-white/30', 'opacity-100');
    systemBtn?.classList.add('opacity-60');

    if (this.currentTheme === 'light') {
      root.setAttribute('data-theme', 'light');
      lightBtn?.classList.add('bg-yellow-400/30');
    } else if (this.currentTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      darkBtn?.classList.add('bg-blue-600/30');
    } else {
      // System theme - let CSS media query handle it
      systemBtn?.classList.remove('opacity-60');
      systemBtn?.classList.add('bg-white/30', 'opacity-100');
    }
  }

  private async setTheme(theme: 'light' | 'dark' | 'system') {
    this.currentTheme = theme;
    // Save preference
    await browser.storage.local.set({ theme: this.currentTheme });
    // Apply theme
    this.applyTheme();
    // Show notification
    const themeNames = {
      'system': 'システム設定',
      'light': 'ライトテーマ',
      'dark': 'ダークテーマ'
    } as const;
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
    // Theme buttons (align with popup)
    document.getElementById('lightThemeBtn')?.addEventListener('click', () => {
      this.setTheme('light');
    });
    document.getElementById('darkThemeBtn')?.addEventListener('click', () => {
      this.setTheme('dark');
    });
    document.getElementById('systemThemeBtn')?.addEventListener('click', () => {
      this.setTheme('system');
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
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;

    // Set base styles (align with popup implementation)
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      max-width: 320px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease-in-out;
    `;

    // Type-specific colors
    const colors = {
      success: { bg: 'rgb(52, 168, 83)', text: 'white' },
      error: { bg: 'rgb(234, 67, 53)', text: 'white' },
      info: { bg: 'rgb(66, 133, 244)', text: 'white' },
    } as const;

    notification.style.backgroundColor = colors[type].bg;
    notification.style.color = colors[type].text;

    document.body.appendChild(notification);

    // Enter animation
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });

    // Auto-remove after 3s with exit animation
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});
