import 'virtual:uno.css';
import '../styles/themes.css';
import browser from 'webextension-polyfill';
import { StorageManager } from '../utils/storage';
import { ExtensionSettings, DEFAULT_SETTINGS } from '../types';
import { BUILD_INFO } from '../utils/buildInfo';

class OptionsController {
  private storageManager: StorageManager;
  private settings?: ExtensionSettings;
  private currentTheme: 'light' | 'dark' | 'system' = 'system';
  private selectedTabGroupColor: 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'grey' | 'orange' = 'grey';
  private pendingDeleteIndex: number | null = null;

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

    // タブグループリスト
    this.renderTabGroups();
  }

  private renderTabGroups() {
    const container = document.getElementById('tabGroupsList');
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
        <div class="flex items-center py-2 pl-4 pr-0 rounded-md" style="background-color: rgb(var(--color-group-${categoryColor}) / 0.1)">
          <div class="w-3 h-10 rounded-sm mr-3" style="background-color: rgb(var(--color-group-${categoryColor}))"></div>
          <span class="flex-1 text-text">${cat.name}</span>
          <button class="btn bg-danger text-white border border-danger hover:opacity-90" data-index="${index}" title="削除">
            <i class="i-mdi-trash-can-outline text-lg block text-white"></i>
          </button>
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

    // タブグループ追加ボタン -> モーダルを開く
    document.getElementById('addTabGroup')?.addEventListener('click', () => this.openTabGroupModal());

    // タブグループ削除（イベントデリゲーション）
    const tabGroupsContainer = document.getElementById('tabGroupsList');
    tabGroupsContainer?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('button[data-index]') as HTMLButtonElement | null;
      if (!btn) return;
      const index = parseInt(btn.getAttribute('data-index') || '-1', 10);
      if (Number.isNaN(index) || index < 0) return;
      this.openDeleteModal(index);
    });

    // モーダル: 閉じる/キャンセル/保存/オーバーレイ/ESC
    document.getElementById('tabGroupClose')?.addEventListener('click', () => this.closeTabGroupModal());
    document.getElementById('tabGroupCancel')?.addEventListener('click', () => this.closeTabGroupModal());
    document.getElementById('tabGroupOverlay')?.addEventListener('click', () => this.closeTabGroupModal());
    document.getElementById('tabGroupSave')?.addEventListener('click', () => this.submitTabGroupModal());
    const nameInput = document.getElementById('tabGroupName') as HTMLInputElement | null;
    nameInput?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        this.submitTabGroupModal();
      }
      if (ev.key === 'Escape') {
        ev.preventDefault();
        this.closeTabGroupModal();
      }
    });
    document.addEventListener('keydown', (ev) => {
      const modal = document.getElementById('tabGroupModal');
      const isOpen = modal && !modal.classList.contains('hidden');
      const deleteModal = document.getElementById('deleteModal');
      const isDeleteOpen = deleteModal && !deleteModal.classList.contains('hidden');
      if (!isOpen && !isDeleteOpen) return;
      if (ev.key === 'Escape') {
        if (isDeleteOpen) this.closeDeleteModal();
        else this.closeTabGroupModal();
      }
    });
    // 色選択
    const colorPicker = document.getElementById('colorPicker');
    colorPicker?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-color]') as HTMLElement | null;
      if (!target) return;
      const color = target.getAttribute('data-color') as typeof this.selectedTabGroupColor | null;
      if (!color) return;
      this.setSelectedColor(color);
    });
    // 削除モーダル: 閉じる/キャンセル/確定/オーバーレイ
    document.getElementById('deleteClose')?.addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('deleteCancel')?.addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('deleteOverlay')?.addEventListener('click', () => this.closeDeleteModal());
    document.getElementById('deleteConfirm')?.addEventListener('click', () => this.confirmDeleteTabGroup());
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

  private openTabGroupModal() {
    const modal = document.getElementById('tabGroupModal');
    const nameInput = document.getElementById('tabGroupName') as HTMLInputElement | null;
    if (!modal || !nameInput) return;
    nameInput.value = '';
    this.setSelectedColor('grey');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // フォーカス
    setTimeout(() => nameInput.focus(), 0);
  }

  private closeTabGroupModal() {
    const modal = document.getElementById('tabGroupModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }

  private setSelectedColor(color: typeof this.selectedTabGroupColor) {
    this.selectedTabGroupColor = color;
    const buttons = document.querySelectorAll('#colorPicker [data-color]');
    buttons.forEach(btn => {
      (btn as HTMLElement).classList.remove('ring-primary');
      (btn as HTMLElement).classList.add('ring-transparent');
    });
    const active = document.querySelector(`#colorPicker [data-color="${color}"]`) as HTMLElement | null;
    if (active) {
      active.classList.remove('ring-transparent');
      active.classList.add('ring-primary');
    }
  }

  private async submitTabGroupModal() {
    if (!this.settings) return;
    const nameInput = document.getElementById('tabGroupName') as HTMLInputElement | null;
    if (!nameInput) return;
    const trimmed = (nameInput.value || '').trim();
    if (!trimmed) {
      this.showNotification('タブグループ名を入力してください', 'error');
      return;
    }
    if (this.settings.categories.some(c => c.name === trimmed)) {
      this.showNotification(`タブグループ「${trimmed}」は既に存在します`, 'error');
      return;
    }
    const color = this.selectedTabGroupColor || 'grey';
    this.settings.categories.push({ name: trimmed, color });
    await this.storageManager.saveSettings(this.settings);
    await browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    this.renderTabGroups();
    this.closeTabGroupModal();
    this.showNotification(`タブグループ「${trimmed}」を追加しました`, 'success');
  }

  private async handleRemoveTabGroup(index: number) {
    if (!this.settings) return;
    const target = this.settings.categories[index];
    if (!target) return;

    // 削除
    this.settings.categories.splice(index, 1);
    await this.storageManager.saveSettings(this.settings);
    await browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    this.renderTabGroups();
    this.showNotification(`タブグループ「${target.name}」を削除しました`, 'success');
  }

  private openDeleteModal(index: number) {
    if (!this.settings) return;
    const modal = document.getElementById('deleteModal');
    const nameSpan = document.getElementById('deleteTabGroupName');
    if (!modal || !nameSpan) return;
    this.pendingDeleteIndex = index;
    nameSpan.textContent = this.settings.categories[index]?.name || '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  private closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    this.pendingDeleteIndex = null;
  }

  private async confirmDeleteTabGroup() {
    if (this.pendingDeleteIndex === null) return;
    const index = this.pendingDeleteIndex;
    this.pendingDeleteIndex = null;
    await this.handleRemoveTabGroup(index);
    this.closeDeleteModal();
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
    try {
      const result = await browser.runtime.sendMessage({ type: 'TEST_CONNECTION' });
      if (result && result.success) {
        this.showNotification('接続成功！', 'success');
      } else {
        this.showNotification('接続エラー', 'error');
      }
    } catch (error) {
      console.error('TEST_CONNECTION message failed:', error);
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
