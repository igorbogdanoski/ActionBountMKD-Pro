import type { QuestResult } from 'shared';
import { saveQuestResult } from './storage';
import { clearOfflineQueue, getOfflineQueue, replaceOfflineQueue } from './offlineQueue';

type PendingResult = Omit<QuestResult, 'id'>;

// Share one pass across rapid/repeated online events so the same queued
// result cannot be persisted twice while a previous sync is still running.
let syncInFlight: Promise<number> | null = null;

export async function syncOfflineQueue(): Promise<number> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const queue = getOfflineQueue();
    if (!queue.length) return 0;

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
      replaceOfflineQueue(failed);
    }

    return synced;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
