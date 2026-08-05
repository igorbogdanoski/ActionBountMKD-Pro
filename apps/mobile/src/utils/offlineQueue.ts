import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  appendUniquePendingResult,
  createAttemptId,
  normalizePendingResults,
  reconcilePendingResults,
} from 'shared';
import { saveQuestResultV2, type ResultWriteInput } from './resultStorage';

const QUEUE_KEY = 'mobile_offline_results';

export type PendingResult = ResultWriteInput;

let queueMutation: Promise<void> = Promise.resolve();

function withQueueLock<T>(operation: () => Promise<T>): Promise<T> {
  const run = queueMutation.then(operation, operation);
  queueMutation = run.then(() => undefined, () => undefined);
  return run;
}

async function readQueue(): Promise<PendingResult[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed as PendingResult[] : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: readonly PendingResult[]): Promise<void> {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(QUEUE_KEY);
    return;
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function saveOfflineResult(result: PendingResult): Promise<void> {
  await withQueueLock(async () => {
    const queue = await readQueue();
    await writeQueue(appendUniquePendingResult(queue, result));
  });
}

export async function getOfflineQueue(): Promise<PendingResult[]> {
  return readQueue();
}

export async function clearOfflineQueue(): Promise<void> {
  await withQueueLock(() => AsyncStorage.removeItem(QUEUE_KEY));
}

export async function offlineQueueSize(): Promise<number> {
  return (await getOfflineQueue()).length;
}

// Same in-flight guard as the web app's offlineQueue: without it, the app
// foregrounding twice in quick succession could read the same queue snapshot
// twice and double-submit results.
let syncInFlight: Promise<number> | null = null;

export async function syncOfflineQueue(): Promise<number> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const queue = await withQueueLock(async () => {
      const normalized = normalizePendingResults(await readQueue(), createAttemptId);
      await writeQueue(normalized);
      return normalized;
    });
    if (!queue.length) return 0;

    let synced = 0;
    const successfulAttemptIds = new Set<string>();

    for (const result of queue) {
      try {
        await saveQuestResultV2(result);
        synced++;
        successfulAttemptIds.add(result.attemptId!);
      } catch {
        // Reconciliation below retains this result from the latest queue.
      }
    }

    await withQueueLock(async () => {
      const latestQueue = await readQueue();
      await writeQueue(reconcilePendingResults(queue, latestQueue, successfulAttemptIds));
    });

    return synced;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
