import type { UserProfile, UserSettings } from 'shared';

const THEME_KEY = 'qa-auth-theme';

export async function getUserTheme() {
  return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export async function saveUserTheme(_uid: string, theme: 'light' | 'dark') {
  localStorage.setItem(THEME_KEY, theme);
}

export async function getUserSettings(): Promise<UserSettings> {
  return {
    theme: 'dark',
    notificationsEnabled: true,
    expoPushToken: 'ExponentPushToken[qa-browser-only]',
    notificationPermissionStatus: 'granted',
    updatedAt: '2026-07-17T00:00:00.000Z',
  };
}

export async function upsertUserProfile(_profile: UserProfile) {}

// Vite scans every lazy route before serving the selected QA route. Keep the
// mock module export-compatible with storage.ts while returning inert data for
// routes that authenticated.spec.ts does not exercise.
export async function getQuests() { return []; }
export async function getPublicQuests() { return []; }
export async function getQuestById() { return null; }
export async function saveQuest() {}
export async function deleteQuest() {}
export async function saveQuestResult() { return 'qa-result-001'; }
export async function getQuestResults() { return []; }
export async function gradeSubmission() {}
export async function getPublicQuestResults() { return []; }
export async function getPublicTemplates() { return []; }
export async function getPendingTemplates() { return []; }
export async function saveTemplate() {}
export async function deleteTemplate() {}
export async function incrementTemplateUsage() {}
export async function submitQuestFeedback() {}
export async function getUserProfile() { return null; }
export async function getGroups() { return []; }
export async function saveGroup() {}
export async function deleteGroup() {}
export function cacheQuestLocally() {}
export function getCachedQuest() { return null; }
export function clearCachedQuest() {}
export function isCachedLocally() { return false; }
export function saveOfflineResult() {}
export function getOfflineQueue() { return []; }
export async function syncOfflineQueue() { return { synced: 0, failed: 0 }; }
export function offlineQueueSize() { return 0; }
export async function cacheQuestResources() {}
