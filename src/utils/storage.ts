import browser from 'webextension-polyfill';
import { ExtensionSettings, DEFAULT_SETTINGS, GroupCategory } from '../types';

export class StorageManager {
  private readonly SETTINGS_KEY = 'extensionSettings';
  private readonly CACHE_KEY = 'tabCache';
  private readonly API_STATUS_KEY = 'apiConnectionStatus';
  private readonly PROCESSED_TOTAL_KEY = 'processedTotalCount';

  async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await browser.storage.local.get(this.SETTINGS_KEY);
      const storedSettings = result[this.SETTINGS_KEY] as ExtensionSettings | undefined;
      
      if (storedSettings) {
        // Merge with defaults to ensure all properties exist
        return {
          ...DEFAULT_SETTINGS,
          ...storedSettings
        } as ExtensionSettings;
      }
      
      // First time - save defaults
      await this.saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      await browser.storage.local.set({
        [this.SETTINGS_KEY]: settings
      });
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  async updateSetting<K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    await this.saveSettings(settings);
  }

  async addCategory(category: GroupCategory): Promise<void> {
    const settings = await this.getSettings();
    settings.categories.push(category);
    await this.saveSettings(settings);
  }

  async removeCategory(categoryName: string): Promise<void> {
    const settings = await this.getSettings();
    settings.categories = settings.categories.filter(
      cat => cat.name !== categoryName
    );
    await this.saveSettings(settings);
  }

  async updateCategory(
    categoryName: string,
    updates: Partial<GroupCategory>
  ): Promise<void> {
    const settings = await this.getSettings();
    const categoryIndex = settings.categories.findIndex(
      cat => cat.name === categoryName
    );
    
    if (categoryIndex !== -1) {
      settings.categories[categoryIndex] = {
        ...settings.categories[categoryIndex],
        ...updates
      };
      await this.saveSettings(settings);
    }
  }

  async getTabCache(): Promise<any> {
    try {
      const result = await browser.storage.local.get(this.CACHE_KEY);
      return result[this.CACHE_KEY] || {};
    } catch (error) {
      console.error('Error loading tab cache:', error);
      return {};
    }
  }

  async saveTabCache(cache: any): Promise<void> {
    try {
      await browser.storage.local.set({
        [this.CACHE_KEY]: cache
      });
    } catch (error) {
      console.error('Error saving tab cache:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await browser.storage.local.remove(this.CACHE_KEY);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async exportSettings(): Promise<string> {
    const settings = await this.getSettings();
    return JSON.stringify(settings, null, 2);
  }

  async importSettings(jsonString: string): Promise<void> {
    try {
      const settings = JSON.parse(jsonString) as ExtensionSettings;
      
      // Validate the imported settings
      if (!this.validateSettings(settings)) {
        throw new Error('Invalid settings format');
      }
      
      await this.saveSettings(settings);
    } catch (error) {
      console.error('Error importing settings:', error);
      throw error;
    }
  }

  private validateSettings(settings: any): settings is ExtensionSettings {
    return (
      typeof settings === 'object' &&
      typeof settings.enabled === 'boolean' &&
      typeof settings.apiConfig === 'object' &&
      Array.isArray(settings.categories) &&
      Array.isArray(settings.excludedUrls)
    );
  }

  async getApiConnectionStatus(): Promise<{ lastCheckTime?: number; lastStatus?: boolean }> {
    try {
      const result = await browser.storage.local.get(this.API_STATUS_KEY);
      return result[this.API_STATUS_KEY] || {};
    } catch (error) {
      console.error('Error loading API connection status:', error);
      return {};
    }
  }

  async saveApiConnectionStatus(status: boolean): Promise<void> {
    try {
      await browser.storage.local.set({
        [this.API_STATUS_KEY]: {
          lastCheckTime: Date.now(),
          lastStatus: status
        }
      });
    } catch (error) {
      console.error('Error saving API connection status:', error);
    }
  }

  // Cumulative processed tabs counter
  async getProcessedTotalCount(): Promise<number> {
    try {
      const result = await browser.storage.local.get(this.PROCESSED_TOTAL_KEY);
      const val = result[this.PROCESSED_TOTAL_KEY];
      return typeof val === 'number' && Number.isFinite(val) ? val : 0;
    } catch (error) {
      console.error('Error loading processed total count:', error);
      return 0;
    }
  }

  async incrementProcessedTotalCount(delta: number = 1): Promise<void> {
    try {
      const current = await this.getProcessedTotalCount();
      const next = Math.max(0, current + delta);
      await browser.storage.local.set({
        [this.PROCESSED_TOTAL_KEY]: next,
      });
    } catch (error) {
      console.error('Error incrementing processed total count:', error);
    }
  }
}
