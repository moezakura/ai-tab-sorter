import 'virtual:uno.css';
import '../styles/themes.css';
import browser from 'webextension-polyfill';
import { ExtensionSettings, Message, TabGroupInfo } from '../types';
import { StorageManager } from '../utils/storage';
import { APIClient } from '../background/apiClient';
import { isTabGroupsAvailable, getTabGroups, hasTabsUngroupMethod } from '../utils/typeGuards';
import { BUILD_INFO } from '../utils/buildInfo';

class PopupController {
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
    
    // Load settings
    this.settings = await this.storageManager.getSettings();
    
    // Set up UI based on settings
    this.updateUI();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Display last API check status
    this.displayLastApiCheckStatus();
    
    // Load groups
    this.loadGroups();
    
    // Get processed count
    this.updateProcessedCount();

    // Setup processing status listeners and fetch initial state
    this.setupProcessingStatusListeners();
    
    // Display build info
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
    
    // Reset button states
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
    };
    this.showNotification(`テーマ: ${themeNames[this.currentTheme]}`, 'info');
  }

  private updateUI() {
    if (!this.settings) return;

    // Update toggle states
    const extensionToggle = document.getElementById('extensionToggle') as HTMLInputElement;
    const autoGroupCheckbox = document.getElementById('autoGroup') as HTMLInputElement;
    const groupingDelayInput = document.getElementById('groupingDelay') as HTMLInputElement;

    if (extensionToggle) {
      extensionToggle.checked = this.settings.enabled;
      // Update toggle slider position
      const sliderThumb = extensionToggle.nextElementSibling?.querySelector('.toggle-slider-thumb') as HTMLElement;
      if (sliderThumb) {
        if (this.settings.enabled) {
          sliderThumb.classList.add('translate-x-6');
        } else {
          sliderThumb.classList.remove('translate-x-6');
        }
      }
    }
    if (autoGroupCheckbox) {
      autoGroupCheckbox.checked = this.settings.autoGroupNewTabs;
      const autoSlider = autoGroupCheckbox.nextElementSibling as HTMLElement | null;
      const autoThumb = autoSlider?.querySelector('.toggle-slider-thumb') as HTMLElement | null;
      if (autoThumb) {
        if (this.settings.autoGroupNewTabs) {
          autoThumb.classList.add('translate-x-6');
        } else {
          autoThumb.classList.remove('translate-x-6');
        }
      }
      if (autoSlider) {
        autoSlider.style.backgroundColor = this.settings.autoGroupNewTabs
          ? 'rgb(52, 168, 83)'
          : 'rgb(158, 158, 158)';
      }
    }
    if (groupingDelayInput) groupingDelayInput.value = (this.settings.groupingDelay / 1000).toString();

    // Update status display and toggle button appearance
    const statusTextElement = document.getElementById('extensionStatusText');
    const toggleSlider = document.querySelector('#extensionToggle ~ .toggle-slider') as HTMLElement;
    
    if (statusTextElement) {
      statusTextElement.textContent = this.settings.enabled ? '有効' : '無効';
      if (this.settings.enabled) {
        statusTextElement.className = 'text-sm px-2 py-0.5 rounded-full font-medium bg-green-500/20 text-green-600 dark:bg-green-500/30 dark:text-green-400';
      } else {
        statusTextElement.className = 'text-sm px-2 py-0.5 rounded-full font-medium bg-gray-500/20 text-gray-600 dark:bg-gray-500/30 dark:text-gray-400';
      }
    }
    
    // Update toggle slider background color based on enabled state
    if (toggleSlider) {
      if (this.settings.enabled) {
        toggleSlider.style.backgroundColor = 'rgb(52, 168, 83)'; // Green color for enabled
      } else {
        toggleSlider.style.backgroundColor = 'rgb(158, 158, 158)'; // Gray color for disabled
      }
    }
  }

  private setupEventListeners() {
    // Theme buttons
    document.getElementById('lightThemeBtn')?.addEventListener('click', () => {
      this.setTheme('light');
    });
    
    document.getElementById('darkThemeBtn')?.addEventListener('click', () => {
      this.setTheme('dark');
    });
    
    document.getElementById('systemThemeBtn')?.addEventListener('click', () => {
      this.setTheme('system');
    });

    // Extension toggle
    document.getElementById('extensionToggle')?.addEventListener('change', async (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      await this.storageManager.updateSetting('enabled', enabled);
      
      // Update UI
      this.settings = await this.storageManager.getSettings();
      this.updateUI();
      
      // Update toggle slider color immediately
      const toggleSlider = document.querySelector('#extensionToggle ~ .toggle-slider') as HTMLElement;
      if (toggleSlider) {
        if (enabled) {
          toggleSlider.style.backgroundColor = 'rgb(52, 168, 83)'; // Green color for enabled
        } else {
          toggleSlider.style.backgroundColor = 'rgb(158, 158, 158)'; // Gray color for disabled
        }
      }
      
      // Notify background script
      await browser.runtime.sendMessage({
        type: 'SETTINGS_UPDATED'
      });
    });

    // Auto group toggle
    document.getElementById('autoGroup')?.addEventListener('change', async (e) => {
      const input = e.target as HTMLInputElement;
      const autoGroup = input.checked;
      await this.storageManager.updateSetting('autoGroupNewTabs', autoGroup);

      // Update toggle visuals immediately
      const autoSlider = input.nextElementSibling as HTMLElement | null;
      const autoThumb = autoSlider?.querySelector('.toggle-slider-thumb') as HTMLElement | null;
      if (autoThumb) {
        if (autoGroup) {
          autoThumb.classList.add('translate-x-6');
        } else {
          autoThumb.classList.remove('translate-x-6');
        }
      }
      if (autoSlider) {
        autoSlider.style.backgroundColor = autoGroup
          ? 'rgb(52, 168, 83)'
          : 'rgb(158, 158, 158)';
      }

      // Notify background script to refresh settings
      await browser.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
    });

    // Grouping delay
    document.getElementById('groupingDelay')?.addEventListener('change', async (e) => {
      const delay = parseFloat((e.target as HTMLInputElement).value) * 1000;
      await this.storageManager.updateSetting('groupingDelay', delay);
    });

    // Action buttons
    document.getElementById('classifyCurrentTab')?.addEventListener('click', () => {
      this.classifyCurrentTab();
    });

    document.getElementById('classifyAllTabs')?.addEventListener('click', () => {
      this.classifyAllTabs();
    });

    document.getElementById('ungroupAllTabs')?.addEventListener('click', () => {
      this.ungroupAllTabs();
    });

    // Settings button
    document.getElementById('openSettings')?.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });

    // API check button
    document.getElementById('checkApiStatus')?.addEventListener('click', () => {
      this.checkAPIStatus();
    });

    // Listen for storage changes to update processed count live
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes as any)['processedTotalCount']) {
        this.updateProcessedCount();
      }
    });
  }

  private setupProcessingStatusListeners() {
    // Listen to processing status push updates
    browser.runtime.onMessage.addListener((message: any) => {
      if (message && message.type === 'PROCESSING_STATUS') {
        const { active, count, processingIds } = message.payload || {};
        this.updateProcessingStatusUI(!!active, typeof count === 'number' ? count : 0, Array.isArray(processingIds) ? processingIds : []);
      }
    });

    // Request initial status
    browser.runtime
      .sendMessage({ type: 'GET_PROCESSING_STATUS' })
      .then((resp: any) => {
        if (resp) {
          const { active, count, processingIds } = resp;
          this.updateProcessingStatusUI(!!active, typeof count === 'number' ? count : 0, Array.isArray(processingIds) ? processingIds : []);
        }
      })
      .catch(() => {
        // Ignore errors
      });
  }

  private async updateProcessingStatusUI(active: boolean, count: number, processingIds: number[] = []) {
    const processingEl = document.getElementById('processingStatus');
    const idleEl = document.getElementById('processingIdle');
    const countEl = document.getElementById('processingCount');
    const namesEl = document.getElementById('processingNames');
    if (!processingEl || !idleEl) return;

    if (active) {
      // Ensure only processing is visible
      processingEl.style.display = 'flex';
      idleEl.style.display = 'none';
      // Hide the old count indicator; we will show "他N件" separately
      if (countEl) countEl.textContent = '';
      if (namesEl) {
        try {
          // Only show the first processing tab title
          const currentId = processingIds[0];
          let currentTitle = '';
          if (typeof currentId === 'number') {
            try {
              const t = await browser.tabs.get(currentId);
              currentTitle = t.title || t.url || `Tab ${currentId}`;
            } catch {
              currentTitle = `Tab ${currentId}`;
            }
          }
          const others = Math.max(0, processingIds.length - 1);
          const titleEl = document.getElementById('processingTitle');
          const othersEl = document.getElementById('processingOthers');
          if (titleEl) titleEl.textContent = currentTitle;
          if (othersEl) othersEl.textContent = others > 0 ? ` 他${others}件` : '';
          // Toggle visibility via class
          if (currentTitle || others > 0) {
            namesEl.classList.remove('hidden');
          } else {
            namesEl.classList.add('hidden');
          }
        } catch {
          const titleEl = document.getElementById('processingTitle');
          const othersEl = document.getElementById('processingOthers');
          if (titleEl) titleEl.textContent = '';
          if (othersEl) othersEl.textContent = '';
          namesEl.classList.add('hidden');
        }
      }
    } else {
      // Ensure only idle is visible
      processingEl.style.display = 'none';
      idleEl.style.display = '';
      if (countEl) {
        countEl.textContent = '';
      }
      if (namesEl) {
        const titleEl = document.getElementById('processingTitle');
        const othersEl = document.getElementById('processingOthers');
        if (titleEl) titleEl.textContent = '';
        if (othersEl) othersEl.textContent = '';
        namesEl.classList.add('hidden');
      }
    }
  }

  private async displayLastApiCheckStatus() {
    const statusElement = document.getElementById('apiStatus');
    const timeElement = document.getElementById('lastApiCheckTime');
    if (!statusElement || !timeElement) return;

    const apiStatus = await this.storageManager.getApiConnectionStatus();
    
    if (apiStatus.lastCheckTime && apiStatus.lastStatus !== undefined) {
      statusElement.innerHTML = apiStatus.lastStatus 
        ? '<i class="i-mdi-check-circle inline-block align-middle leading-none"></i> 接続済み' 
        : '<i class="i-mdi-alert-circle inline-block align-middle leading-none"></i> 接続エラー';
      statusElement.className = apiStatus.lastStatus ? 'status-value status-active' : 'status-value status-error';
      timeElement.textContent = this.formatRelativeTime(apiStatus.lastCheckTime);
    } else {
      statusElement.textContent = '未確認';
      statusElement.className = 'status-value status-checking';
      timeElement.textContent = 'なし';
    }
  }

  private async checkAPIStatus() {
    const statusElement = document.getElementById('apiStatus');
    const timeElement = document.getElementById('lastApiCheckTime');
    const checkButton = document.getElementById('checkApiStatus') as HTMLButtonElement;
    if (!statusElement || !timeElement || !this.settings) return;

    // Disable button and show loading state
    if (checkButton) {
      checkButton.disabled = true;
      checkButton.innerHTML = '<i class="i-mdi-loading animate-spin text-lg block"></i>';
    }
    statusElement.textContent = '確認中...';
    statusElement.className = 'status-value status-checking';

    try {
      const apiClient = new APIClient(this.settings.apiConfig);
      const isConnected = await apiClient.testConnection();
      
      // Save the status
      await this.storageManager.saveApiConnectionStatus(isConnected);
      
      // Update UI
      statusElement.innerHTML = isConnected 
        ? '<i class="i-mdi-check-circle inline-block align-middle leading-none"></i> 接続済み' 
        : '<i class="i-mdi-alert-circle inline-block align-middle leading-none"></i> 接続エラー';
      statusElement.className = isConnected ? 'status-value status-active' : 'status-value status-error';
      timeElement.textContent = this.formatRelativeTime(Date.now());
      
      // Show notification
      this.showNotification(
        isConnected ? 'API接続成功' : 'API接続失敗', 
        isConnected ? 'success' : 'error'
      );
    } catch (error) {
      // Save the status
      await this.storageManager.saveApiConnectionStatus(false);
      
      statusElement.innerHTML = '<i class="i-mdi-alert-circle inline-block align-middle leading-none"></i> 接続エラー';
      statusElement.className = 'status-value status-error';
      timeElement.textContent = this.formatRelativeTime(Date.now());
      
      this.showNotification('API接続エラー', 'error');
    } finally {
      // Re-enable button
      if (checkButton) {
        checkButton.disabled = false;
        checkButton.innerHTML = '<i class="i-mdi-refresh text-lg block"></i>';
      }
    }
  }

  private formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) {
      return 'たった今';
    } else if (minutes < 60) {
      return `${minutes}分前`;
    } else if (hours < 24) {
      return `${hours}時間前`;
    } else {
      return `${days}日前`;
    }
  }

  private async loadGroups() {
    const groupsList = document.getElementById('groupsList');
    if (!groupsList) return;

    try {
      // Check if tabGroups API is available
      const tabGroups = getTabGroups();
      if (!tabGroups) {
        groupsList.innerHTML = '<div class="text-center text-text-secondary py-5">Tab Groups APIが利用できません</div>';
        return;
      }

      const groups = await tabGroups.query({});
      
      if (groups.length === 0) {
        groupsList.innerHTML = '<div class="text-center text-text-secondary py-5">グループがありません</div>';
        return;
      }

      groupsList.innerHTML = '';
      
      for (const group of groups) {
        const tabs = await browser.tabs.query({ groupId: group.id } as any);
        const groupElement = this.createGroupElement(group, tabs.length);
        groupsList.appendChild(groupElement);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      groupsList.innerHTML = '<div class="text-center text-text-secondary py-5">グループの読み込みに失敗しました</div>';
    }
  }

  private createGroupElement(group: browser.TabGroups.TabGroup, tabCount: number): HTMLElement {
    const div = document.createElement('div');
    // Compact, marginless item (align with options' categories list)
    div.className = 'flex items-center py-2 pl-4 pr-2 rounded-md';
    
    // Map Firefox group colors to our CSS variables
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
    
    const groupColor = colorMap[group.color] || 'grey';
    
    // Set background color with low opacity
    div.style.backgroundColor = `rgb(var(--color-group-${groupColor}) / 0.1)`;
    
    div.innerHTML = `
      <div class="w-3 h-10 rounded-sm mr-3" style="background-color: rgb(var(--color-group-${groupColor}))"></div>
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm text-text truncate">${group.title || '無題のグループ'}</div>
        <div class="flex gap-2 text-xs text-text-secondary">
          <span>${tabCount} タブ</span>
          <span>${group.collapsed ? '折りたたみ' : '展開'}</span>
        </div>
      </div>
      <button class="px-2 py-1 text-xs text-text bg-transparent border border-border rounded hover:opacity-80 transition-opacity ml-2 whitespace-nowrap" 
              data-group-id="${group.id}" 
              data-collapsed="${group.collapsed}">
        ${group.collapsed ? '展開' : '折りたたみ'}
      </button>
    `;

    // Add event listener for collapse/expand
    const actionButton = div.querySelector('button') as HTMLButtonElement;
    actionButton?.addEventListener('click', async () => {
      const groupId = parseInt(actionButton.dataset.groupId || '0');
      const isCollapsed = actionButton.dataset.collapsed === 'true';
      
      const tabGroups = getTabGroups();
      if (tabGroups) {
        await tabGroups.update(groupId, {
          collapsed: !isCollapsed as any
        });
      }
      
      // Refresh groups list
      this.loadGroups();
    });

    return div;
  }

  private async updateProcessedCount() {
    const countElement = document.getElementById('processedCount');
    if (!countElement) return;

    try {
      const total = await this.storageManager.getProcessedTotalCount();
      countElement.textContent = total.toString();
    } catch (error) {
      console.error('Error getting processed count:', error);
      countElement.textContent = '0';
    }
  }

  private async classifyCurrentTab() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        console.error('No active tab found');
        return;
      }

      await browser.runtime.sendMessage({
        type: 'CLASSIFY_TAB',
        payload: { tabId: tab.id }
      });

      // Show notification
      this.showNotification('タブの分類を開始しました');
      
      // Refresh groups after a delay
      setTimeout(() => this.loadGroups(), 2000);
    } catch (error) {
      console.error('Error classifying current tab:', error);
      this.showNotification('エラーが発生しました', 'error');
    }
  }

  private async classifyAllTabs() {
    try {
      const tabs = await browser.tabs.query({ currentWindow: true });
      const ungroupedTabs = tabs.filter(tab => !tab.groupId || tab.groupId === -1);
      
      if (ungroupedTabs.length === 0) {
        this.showNotification('分類するタブがありません', 'info');
        return;
      }

      for (const tab of ungroupedTabs) {
        if (tab.id) {
          await browser.runtime.sendMessage({
            type: 'CLASSIFY_TAB',
            payload: { tabId: tab.id }
          });
        }
      }

      this.showNotification(`${ungroupedTabs.length}個のタブの分類を開始しました`);

      // Refresh groups after a delay
      setTimeout(() => this.loadGroups(), 3000);
    } catch (error) {
      console.error('Error classifying all tabs:', error);
      this.showNotification('エラーが発生しました', 'error');
    }
  }

  private async ungroupAllTabs() {
    try {
      if (!isTabGroupsAvailable() || !hasTabsUngroupMethod()) {
        this.showNotification('Tab Groups APIが利用できません', 'error');
        return;
      }

      const tabs = await browser.tabs.query({ currentWindow: true });
      const groupedTabs = tabs.filter(tab => (tab as any).groupId && (tab as any).groupId !== -1);
      
      if (groupedTabs.length === 0) {
        this.showNotification('グループ化されたタブがありません', 'info');
        return;
      }

      const tabIds = groupedTabs.map(tab => tab.id).filter(id => id !== undefined) as number[];
      if ((browser.tabs as any).ungroup) {
        await (browser.tabs as any).ungroup(tabIds);
      }

      this.showNotification(`${groupedTabs.length}個のタブのグループを解除しました`);
      
      // Refresh groups
      this.loadGroups();
    } catch (error) {
      console.error('Error ungrouping tabs:', error);
      this.showNotification('エラーが発生しました', 'error');
    }
  }

  private displayBuildInfo() {
    const versionElement = document.getElementById('version');
    const buildTimeElement = document.getElementById('buildTime');
    
    if (versionElement) {
      versionElement.textContent = `v${BUILD_INFO.version}`;
    }
    if (buildTimeElement) {
      buildTimeElement.textContent = BUILD_INFO.buildTime;
    }
  }
  
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    
    // Set base styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease-in-out;
    `;
    
    // Set type-specific colors
    const colors = {
      success: {
        bg: 'rgb(52, 168, 83)',
        text: 'white'
      },
      error: {
        bg: 'rgb(234, 67, 53)',
        text: 'white'
      },
      info: {
        bg: 'rgb(66, 133, 244)',
        text: 'white'
      }
    };
    
    notification.style.backgroundColor = colors[type].bg;
    notification.style.color = colors[type].text;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });
    
    // Remove after 3 seconds with fade out
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
}

// Initialize popup controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
