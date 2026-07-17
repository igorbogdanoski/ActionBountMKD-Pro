import type { QuestResult } from 'shared';

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

export function replaceOfflineQueue(results: PendingResult[]): void {
  if (results.length === 0) {
    clearOfflineQueue();
    return;
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(results));
}

export function offlineQueueSize(): number {
  return getOfflineQueue().length;
}

// ─── Quest localStorage Cache ────────────────────────────────────────────────

import type { Quest } from 'shared';

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
