import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

const QUEUE_KEY = 'mobile_offline_results';

export interface PendingResult {
  questId: string;
  playerName: string;
  userId: string | null;
  points: number;
  completedStages: number;
  totalStages: number;
  completedAt: string;
}

export async function saveOfflineResult(result: PendingResult): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push(result);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getOfflineQueue(): Promise<PendingResult[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingResult[]) : [];
  } catch {
    return [];
  }
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
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
    const queue = await getOfflineQueue();
    if (!queue.length) return 0;

    let synced = 0;
    const failed: PendingResult[] = [];

    for (const result of queue) {
      try {
        await addDoc(collection(db, 'quest_results'), result);
        synced++;
      } catch {
        failed.push(result);
      }
    }

    if (failed.length === 0) {
      await clearOfflineQueue();
    } else {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    }

    return synced;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
