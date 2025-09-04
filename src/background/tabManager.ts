import browser from 'webextension-polyfill';
import { AIClassifier } from './aiClassifier';
import { GroupController } from './groupController';
import { TabInfo, ExtensionSettings, PageContent, TabCache } from '../types';
import { StorageManager } from '../utils/storage';

export class TabManager {
  private aiClassifier: AIClassifier;
  private groupController: GroupController;
  private settings: ExtensionSettings;
  private tabCache: TabCache = {};
  private processingQueue: Set<number> = new Set();
  private storageManager = new StorageManager();

  constructor(
    aiClassifier: AIClassifier,
    groupController: GroupController,
    settings: ExtensionSettings
  ) {
    this.aiClassifier = aiClassifier;
    this.groupController = groupController;
    this.settings = settings;
  }

  updateSettings(settings: ExtensionSettings) {
    this.settings = settings;
  }

  async handleNewTab(tab: browser.Tabs.Tab) {
    if (!tab.id || !tab.url || this.isExcludedUrl(tab.url)) return;

    // Wait for tab to load before processing
    setTimeout(() => {
      if (tab.id) {
        this.classifyTab(tab.id);
      }
    }, this.settings.groupingDelay);
  }

  async handleTabUpdate(tab: browser.Tabs.Tab) {
    if (!tab.id || !tab.url || this.isExcludedUrl(tab.url)) return;
    
    // Check if URL has changed significantly
    const cachedTab = this.tabCache[tab.id];
    if (cachedTab && this.isSameCategory(cachedTab.url, tab.url)) {
      return; // No need to reclassify
    }

    // Update cache and classify
    this.tabCache[tab.id] = {
      url: tab.url,
      title: tab.title || '',
      lastClassified: Date.now()
    };

    await this.classifyTab(tab.id);
  }

  handleTabRemoval(tabId: number) {
    delete this.tabCache[tabId];
    this.processingQueue.delete(tabId);
  }

  async classifyTab(tabId: number): Promise<void> {
    // Prevent duplicate processing
    if (this.processingQueue.has(tabId)) {
      console.log(`Tab ${tabId} is already being processed`);
      return;
    }

    this.processingQueue.add(tabId);

    try {
      const tab = await browser.tabs.get(tabId);
      if (!tab.url || this.isExcludedUrl(tab.url)) {
        return;
      }

      // Skip if already grouped
      if (tab.groupId && tab.groupId !== -1) {
        console.log(`Tab ${tabId} is already in a group`);
        return;
      }

      // Request content extraction from content script
      const content = await this.extractTabContent(tabId);
      if (!content) {
        console.warn(`Failed to extract content for tab ${tabId}`);
        return;
      }

      // Classify using AI
      const classification = await this.aiClassifier.classifyPage(content);
      if (!classification) {
        console.warn(`Failed to classify tab ${tabId}`);
        return;
      }

      console.log(`Tab ${tabId} classified as: ${classification.category}`);

      // Add to appropriate group
      await this.groupController.addTabToGroup(tabId, classification.category);

      // Increment cumulative processed count
      await this.storageManager.incrementProcessedTotalCount(1);

      // Update cache
      this.tabCache[tabId] = {
        ...this.tabCache[tabId],
        category: classification.category,
        lastClassified: Date.now()
      };

    } catch (error) {
      console.error(`Error classifying tab ${tabId}:`, error);
    } finally {
      this.processingQueue.delete(tabId);
    }
  }

  async processExtractedContent(tabId: number, content: PageContent): Promise<void> {
    if (!content || this.isExcludedUrl(content.url)) return;

    try {
      const classification = await this.aiClassifier.classifyPage(content);
      if (classification) {
        await this.groupController.addTabToGroup(tabId, classification.category);
        // Increment cumulative processed count
        await this.storageManager.incrementProcessedTotalCount(1);
      }
    } catch (error) {
      console.error(`Error processing content for tab ${tabId}:`, error);
    }
  }

  private async extractTabContent(tabId: number): Promise<PageContent | null> {
    try {
      // Inject content script if needed
      await browser.scripting.executeScript({
        target: { tabId },
        files: ['contentExtractor.js']
      });

      // Send message to extract content
      const response = await browser.tabs.sendMessage(tabId, {
        type: 'EXTRACT_CONTENT'
      });

      return response as PageContent;
    } catch (error) {
      console.error(`Error extracting content from tab ${tabId}:`, error);
      
      // Fallback to basic tab info
      const tab = await browser.tabs.get(tabId);
      return {
        url: tab.url || '',
        title: tab.title || '',
        content: tab.title || ''
      };
    }
  }

  private isExcludedUrl(url: string): boolean {
    return this.settings.excludedUrls.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(url);
    });
  }

  private isSameCategory(oldUrl: string, newUrl: string): boolean {
    // Simple heuristic: check if same domain
    try {
      const oldDomain = new URL(oldUrl).hostname;
      const newDomain = new URL(newUrl).hostname;
      return oldDomain === newDomain;
    } catch {
      return false;
    }
  }
}
