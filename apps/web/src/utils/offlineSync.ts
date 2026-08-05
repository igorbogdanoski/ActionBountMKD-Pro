import { createAttemptId, normalizePendingResults, reconcilePendingResults } from 'shared';
import type { QuestResult } from 'shared';
import { saveQuestResult } from './storage';
import { getOfflineQueue, replaceOfflineQueue } from './offlineQueue';

type PendingResult = Omit<QuestResult, 'id'>;

// Share one pass across rapid/repeated online events so the same queued
// result cannot be persisted twice while a previous sync is still running.
let syncInFlight: Promise<number> | null = null;

export async function syncOfflineQueue(): Promise<number> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const queue = normalizePendingResults(getOfflineQueue(), createAttemptId);
    if (!queue.length) return 0;
    replaceOfflineQueue(queue);

    let synced = 0;
    const successfulAttemptIds = new Set<string>();

    for (const result of queue) {
      try {
        await saveQuestResult(result);
        synced++;
        successfulAttemptIds.add(result.attemptId!);
      } catch {
        // Reconciliation below retains this result from the latest queue.
      }
    }

    const latestQueue = getOfflineQueue();
    replaceOfflineQueue(reconcilePendingResults(queue, latestQueue, successfulAttemptIds));

    return synced;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
