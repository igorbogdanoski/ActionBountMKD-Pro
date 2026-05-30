import type { QuestResult } from '../types';

const QUEUE_KEY = 'ab_offline_results';
const QUEST_CACHE_PREFIX = 'ab_quest_';

// ─── Offline Result Queue ────────────────────────────────────────────────────

type PendingResult = Omit<QuestResult, 'id'>;

export function saveOfflineResult(result: PendingResult): void {
  const queue = getOfflineQueue();
  queue.push(result);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getOfflineQueue(): PendingResult[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingResult[]) : [];
  } catch {
    return [];
  }
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function offlineQueueSize(): number {
  return getOfflineQueue().length;
}

export async function syncOfflineQueue(): Promise<number> {
  const queue = getOfflineQueue();
  if (!queue.length) return 0;

  // Dynamically import to avoid circular dependency
  const { saveQuestResult } = await import('./storage');
  let synced = 0;
  const failed: PendingResult[] = [];

  for (const result of queue) {
    try {
      await saveQuestResult(result);
      synced++;
    } catch {
      failed.push(result);
    }
  }

  if (failed.length === 0) {
    clearOfflineQueue();
  } else {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  }

  return synced;
}

// ─── Quest localStorage Cache ────────────────────────────────────────────────

import type { Quest } from '../types';

export function cacheQuestLocally(quest: Quest): void {
  try {
    localStorage.setItem(
      `${QUEST_CACHE_PREFIX}${quest.id}`,
      JSON.stringify({ quest, cachedAt: Date.now() }),
    );
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

export function getCachedQuest(questId: string): Quest | null {
  try {
    const raw = localStorage.getItem(`${QUEST_CACHE_PREFIX}${questId}`);
    if (!raw) return null;
    const { quest } = JSON.parse(raw) as { quest: Quest; cachedAt: number };
    return quest ?? null;
  } catch {
    return null;
  }
}

export function clearCachedQuest(questId: string): void {
  localStorage.removeItem(`${QUEST_CACHE_PREFIX}${questId}`);
}

export function isCachedLocally(questId: string): boolean {
  return localStorage.getItem(`${QUEST_CACHE_PREFIX}${questId}`) !== null;
}
