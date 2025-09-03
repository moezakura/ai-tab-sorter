import browser from 'webextension-polyfill';
import { Message } from '../types';

/**
 * Check if TabGroups API is available
 */
export function isTabGroupsAvailable(): boolean {
  return typeof browser.tabGroups !== 'undefined' && browser.tabGroups !== null;
}

/**
 * Check if tabs.group method is available
 */
export function hasTabsGroupMethod(): boolean {
  return 'group' in browser.tabs;
}

/**
 * Check if tabs.ungroup method is available
 */
export function hasTabsUngroupMethod(): boolean {
  return 'ungroup' in browser.tabs;
}

/**
 * Type guard for Message type
 */
export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Message).type === 'string'
  );
}

/**
 * Type guard for EXTRACT_CONTENT message
 */
export function isExtractContentMessage(value: unknown): value is Message {
  return isMessage(value) && value.type === 'EXTRACT_CONTENT';
}

/**
 * Type guard for checking if value is a valid ExtensionSettings object
 */
export function isExtensionSettings(value: unknown): value is { [key: string]: any } {
  return typeof value === 'object' && value !== null;
}

/**
 * Safe type assertion for browser.tabGroups
 */
export function getTabGroups(): browser.TabGroups.Static | null {
  if (isTabGroupsAvailable() && browser.tabGroups) {
    return browser.tabGroups;
  }
  return null;
}