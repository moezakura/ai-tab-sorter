// Firefox specific tab and tabGroups extensions

declare namespace browser.tabs {
  function group(options: {
    tabIds: number[];
    groupId?: number;
    createProperties?: {
      windowId?: number;
    };
  }): Promise<number>;

  function ungroup(tabIds: number[]): Promise<void>;
}

declare namespace browser.tabGroups {
  interface UpdateProperties {
    collapsed?: boolean;
    color?: string;
    title?: string;
  }
  
  function update(groupId: number, updateProperties: UpdateProperties): Promise<TabGroup | undefined>;
}

// Extend tabs.query to include groupId
interface TabQueryInfo extends browser.tabs._QueryQueryInfoType {
  groupId?: number;
}