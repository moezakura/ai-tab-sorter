import browser from 'webextension-polyfill';
import { TabManager } from './tabManager';
import { AIClassifier } from './aiClassifier';
import { GroupController } from './groupController';
import { DEFAULT_SETTINGS, Message, ExtensionSettings } from '../types';
import { StorageManager } from '../utils/storage';
import { isMessage } from '../utils/typeGuards';

class BackgroundService {
  private tabManager: TabManager;
  private aiClassifier: AIClassifier;
  private groupController: GroupController;
  private storageManager: StorageManager;
  private settings: ExtensionSettings = DEFAULT_SETTINGS;

  constructor() {
    this.storageManager = new StorageManager();
    this.aiClassifier = new AIClassifier(this.settings.apiConfig);
    this.groupController = new GroupController();
    this.tabManager = new TabManager(
      this.aiClassifier,
      this.groupController,
      this.settings
    );
  }

  async initialize() {
    console.log('AI Tab Sorter: Initializing...');
    
    // Load settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Initialize existing tabs
    await this.initializeExistingTabs();
    
    console.log('AI Tab Sorter: Initialized successfully');
  }

  private async loadSettings() {
    this.settings = await this.storageManager.getSettings();
    this.aiClassifier.updateConfig(this.settings.apiConfig);
    this.tabManager.updateSettings(this.settings);
  }

  private setupEventListeners() {
    // Tab events
    browser.tabs.onCreated.addListener((tab) => {
      if (this.settings.enabled && this.settings.autoGroupNewTabs) {
        this.tabManager.handleNewTab(tab);
      }
    });

    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (
        changeInfo.status === 'complete' &&
        this.settings.enabled &&
        this.settings.autoGroupNewTabs
      ) {
        this.tabManager.handleTabUpdate(tab);
      }
    });

    browser.tabs.onRemoved.addListener((tabId) => {
      this.tabManager.handleTabRemoval(tabId);
    });

    // Message handling
    browser.runtime.onMessage.addListener((message: unknown, sender: browser.Runtime.MessageSender) => {
      if (isMessage(message)) {
        return this.handleMessage(message, sender);
      }
      return undefined;
    });

    // Storage changes
    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        this.loadSettings();
      }
    });
  }

  private async handleMessage(message: Message, sender: browser.Runtime.MessageSender) {
    switch (message.type) {
      case 'CONTENT_EXTRACTED':
        if (sender.tab?.id) {
          return this.tabManager.processExtractedContent(
            sender.tab.id,
            message.payload
          );
        }
        break;

      case 'CLASSIFY_TAB':
        if (message.payload?.tabId) {
          this.tabManager.enqueueTab(message.payload.tabId);
          return { queued: true };
        }
        break;

      case 'GROUP_TAB':
        if (message.payload?.tabId && message.payload?.category) {
          return this.groupController.addTabToGroup(
            message.payload.tabId,
            message.payload.category
          );
        }
        break;

      case 'SETTINGS_UPDATED':
        await this.loadSettings();
        return { success: true };

      case 'GET_PROCESSING_STATUS':
        return {
          active: this.tabManager.isProcessing(),
          count: this.tabManager.getProcessingCount(),
          processingIds: this.tabManager.getProcessingIds(),
          pendingIds: this.tabManager.getPendingIds(),
        };

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private async initializeExistingTabs() {
    if (!this.settings.enabled || !this.settings.autoGroupNewTabs) return;

    const tabs = await browser.tabs.query({});
    const normalTabs = tabs.filter(tab => 
      tab.url && 
      !this.isExcludedUrl(tab.url) &&
      !tab.groupId
    );

    console.log(`Found ${normalTabs.length} ungrouped tabs to process`);

    // Enqueue all to reflect pending state and allow TabManager to process
    for (const tab of normalTabs) {
      if (tab.id) this.tabManager.enqueueTab(tab.id);
    }
  }

  private isExcludedUrl(url: string): boolean {
    return this.settings.excludedUrls.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(url);
    });
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();
backgroundService.initialize().catch(console.error);
