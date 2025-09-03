import browser from 'webextension-polyfill';
import { TabGroupInfo, GroupCategory, DEFAULT_CATEGORIES } from '../types';
import { isTabGroupsAvailable, getTabGroups, hasTabsGroupMethod, hasTabsUngroupMethod } from '../utils/typeGuards';

export class GroupController {
  private groupCache: Map<string, number> = new Map(); // category -> groupId
  private tabGroups: Map<number, TabGroupInfo> = new Map(); // groupId -> TabGroupInfo

  constructor() {
    this.initializeGroups();
  }

  private async initializeGroups() {
    try {
      // Check if tabGroups API is available
      const tabGroups = getTabGroups();
      if (!tabGroups) {
        console.warn('Tab Groups API is not available');
        return;
      }

      // Query existing groups
      const groups = await tabGroups.query({});
      groups.forEach(group => {
        const groupInfo: TabGroupInfo = {
          id: group.id,
          title: group.title || '',
          color: group.color,
          collapsed: group.collapsed,
          windowId: group.windowId,
          tabIds: []
        };
        this.tabGroups.set(group.id, groupInfo);
        
        // Cache by title if it matches a category
        if (group.title) {
          this.groupCache.set(group.title, group.id);
        }
      });

      console.log(`Initialized with ${groups.length} existing groups`);
    } catch (error) {
      console.error('Error initializing groups:', error);
    }
  }

  async addTabToGroup(tabId: number, categoryName: string): Promise<void> {
    try {
      // Check if tabGroups API is available
      if (!isTabGroupsAvailable() || !hasTabsGroupMethod()) {
        console.warn('Tab Groups API is not available, skipping grouping');
        return;
      }

      const tab = await browser.tabs.get(tabId);
      if (!tab.windowId) {
        console.error('Tab has no window ID');
        return;
      }

      // Get or create group for this category
      const { groupId, dummyTabId } = await this.getOrCreateGroup(categoryName, tab.windowId);
      
      if (groupId === -1) {
        console.error('Failed to get or create group');
        return;
      }

      // Add tab to group
      if (browser.tabs.group) {
        await browser.tabs.group({
          tabIds: [tabId],
          groupId: groupId
        });
      }

      console.log(`Added tab ${tabId} to group ${groupId} (${categoryName})`);

      // Update cache
      const groupInfo = this.tabGroups.get(groupId);
      if (groupInfo && !groupInfo.tabIds.includes(tabId)) {
        groupInfo.tabIds.push(tabId);
      }

      // Remove dummy tab if it was created for a new group
      if (dummyTabId) {
        try {
          await browser.tabs.remove(dummyTabId);
          console.log(`Removed dummy tab ${dummyTabId} after adding actual tab`);
          
          // Remove dummy tab from cache
          if (groupInfo) {
            const dummyIndex = groupInfo.tabIds.indexOf(dummyTabId);
            if (dummyIndex > -1) {
              groupInfo.tabIds.splice(dummyIndex, 1);
            }
          }
        } catch (e) {
          console.warn(`Failed to remove dummy tab ${dummyTabId}:`, e);
        }
      }

    } catch (error) {
      console.error(`Error adding tab ${tabId} to group:`, error);
    }
  }

  private async getOrCreateGroup(categoryName: string, windowId: number): Promise<{ groupId: number; dummyTabId?: number }> {
    try {
      // Check if group already exists for this category
      const existingGroupId = this.groupCache.get(categoryName);
      
      if (existingGroupId !== undefined) {
        // Verify the group still exists and is in the same window
        try {
          const tabGroups = getTabGroups();
          if (!tabGroups) throw new Error('TabGroups API not available');
          const group = await tabGroups.get(existingGroupId);
          if (group && group.windowId === windowId) {
            return { groupId: existingGroupId };
          }
        } catch (e) {
          // Group no longer exists
          this.groupCache.delete(categoryName);
          this.tabGroups.delete(existingGroupId);
        }
      }

      // Create new group
      const category = DEFAULT_CATEGORIES.find(cat => cat.name === categoryName) 
        || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]; // Default to 'その他'

      // Create a dummy tab first (Firefox requires at least one tab to create a group)
      const dummyTab = await browser.tabs.create({
        url: 'about:blank',
        windowId: windowId,
        active: false
      });

      if (!dummyTab.id) {
        throw new Error('Failed to create dummy tab');
      }

      // Create group with the dummy tab
      const groupId = browser.tabs.group ? 
        await browser.tabs.group({
          tabIds: [dummyTab.id]
        }) : -1;
      
      if (groupId === -1) {
        await browser.tabs.remove(dummyTab.id);
        throw new Error('Tab grouping not available');
      }

      // Update group properties
      const tabGroups = getTabGroups();
      if (tabGroups) {
        await tabGroups.update(groupId, {
          title: categoryName,
          color: category.color as browser.TabGroups.ColorEnum,
          collapsed: false as any
        });
      }

      // DON'T remove the dummy tab here - it will be removed after adding the actual tab

      // Cache the new group
      this.groupCache.set(categoryName, groupId);
      this.tabGroups.set(groupId, {
        id: groupId,
        title: categoryName,
        color: category.color,
        collapsed: false,
        windowId: windowId,
        tabIds: [dummyTab.id] // Include dummy tab in the list
      });

      console.log(`Created new group ${groupId} for category ${categoryName} with dummy tab ${dummyTab.id}`);
      return { groupId, dummyTabId: dummyTab.id };

    } catch (error) {
      console.error('Error creating group:', error);
      return { groupId: -1 };
    }
  }

  async removeTabFromGroup(tabId: number): Promise<void> {
    try {
      if (!hasTabsUngroupMethod()) {
        return;
      }

      if ((browser.tabs as any).ungroup) {
        await (browser.tabs as any).ungroup([tabId]);
      }
      
      // Update cache
      this.tabGroups.forEach(groupInfo => {
        const index = groupInfo.tabIds.indexOf(tabId);
        if (index > -1) {
          groupInfo.tabIds.splice(index, 1);
        }
      });

    } catch (error) {
      console.error(`Error removing tab ${tabId} from group:`, error);
    }
  }

  async collapseGroup(groupId: number): Promise<void> {
    try {
      const tabGroups = getTabGroups();
      if (!tabGroups) {
        return;
      }

      await tabGroups.update(groupId, {
        collapsed: true as any
      });

      const groupInfo = this.tabGroups.get(groupId);
      if (groupInfo) {
        groupInfo.collapsed = true;
      }

    } catch (error) {
      console.error(`Error collapsing group ${groupId}:`, error);
    }
  }

  async expandGroup(groupId: number): Promise<void> {
    try {
      const tabGroups = getTabGroups();
      if (!tabGroups) {
        return;
      }

      await tabGroups.update(groupId, {
        collapsed: false as any
      });

      const groupInfo = this.tabGroups.get(groupId);
      if (groupInfo) {
        groupInfo.collapsed = false;
      }

    } catch (error) {
      console.error(`Error expanding group ${groupId}:`, error);
    }
  }

  async getAllGroups(): Promise<TabGroupInfo[]> {
    const tabGroups = getTabGroups();
    if (!tabGroups) {
      return [];
    }

    const groups = await tabGroups.query({});
    return groups.map(group => ({
      id: group.id,
      title: group.title || '',
      color: group.color,
      collapsed: group.collapsed,
      windowId: group.windowId,
      tabIds: [] // Would need to query tabs to get this
    }));
  }

  async getGroupTabs(groupId: number): Promise<browser.Tabs.Tab[]> {
    const tabs = await browser.tabs.query({ groupId } as any);
    return tabs;
  }
}