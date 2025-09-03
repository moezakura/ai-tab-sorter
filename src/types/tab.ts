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