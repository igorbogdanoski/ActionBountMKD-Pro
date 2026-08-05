import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuestResult } from 'shared';

const storedValues = vi.hoisted(() => new Map<string, string>());
const asyncStorageMock = vi.hoisted(() => ({
  getItem: vi.fn(async (key: string) => storedValues.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => { storedValues.set(key, value); }),
  removeItem: vi.fn(async (key: string) => { storedValues.delete(key); }),
}));
const saveQuestResultV2Mock = vi.hoisted(() => vi.fn());

vi.mock('@react-native-async-storage/async-storage', () => ({ default: asyncStorageMock }));
vi.mock('../../../mobile/src/utils/resultStorage', () => ({
  saveQuestResultV2: (...args: unknown[]) => saveQuestResultV2Mock(...args),
}));

import {
  clearOfflineQueue,
  getOfflineQueue,
  saveOfflineResult,
  syncOfflineQueue,
} from '../../../mobile/src/utils/offlineQueue';

type PendingResult = Omit<QuestResult, 'id'>;

function result(attemptId: string, points: number): PendingResult {
  return {
    questId: 'mobile-quest',
    attemptId,
    playerName: 'Mobile tester',
    userId: null,
    points,
    completedStages: 1,
    totalStages: 1,
    completedAt: '2026-08-05T10:00:00.000Z',
  };
}

beforeEach(async () => {
  await clearOfflineQueue();
  storedValues.clear();
  asyncStorageMock.getItem.mockClear();
  asyncStorageMock.setItem.mockClear();
  asyncStorageMock.removeItem.mockClear();
  saveQuestResultV2Mock.mockReset();
});

describe('mobile offline result queue', () => {
  it('serializes simultaneous read-modify-write appends without losing either result', async () => {
    const first = result('mobile-first', 10);
    const second = result('mobile-second', 20);

    await Promise.all([saveOfflineResult(first), saveOfflineResult(second)]);

    expect(await getOfflineQueue()).toEqual([first, second]);
  });

  it('deduplicates an exact retry and rejects an identity conflict', async () => {
    const first = result('mobile-same', 10);
    await saveOfflineResult(first);
    await saveOfflineResult({ ...first });

    await expect(saveOfflineResult(result('mobile-same', 99)))
      .rejects.toThrow(/identity conflict/);
    expect(await getOfflineQueue()).toEqual([first]);
  });

  it('preserves an append that arrives during network sync', async () => {
    let resolveSave: (value: string) => void = () => {};
    saveQuestResultV2Mock.mockImplementation(
      () => new Promise<string>(resolve => { resolveSave = resolve; }),
    );
    const first = result('mobile-syncing', 10);
    const later = result('mobile-later', 20);
    await saveOfflineResult(first);

    const sync = syncOfflineQueue();
    await vi.waitFor(() => expect(saveQuestResultV2Mock).toHaveBeenCalledWith(first));
    await saveOfflineResult(later);
    resolveSave('saved');

    await expect(sync).resolves.toBe(1);
    expect(await getOfflineQueue()).toEqual([later]);
  });

  it('shares an overlapping reconnect pass instead of double-saving', async () => {
    let resolveSave: (value: string) => void = () => {};
    saveQuestResultV2Mock.mockImplementation(
      () => new Promise<string>(resolve => { resolveSave = resolve; }),
    );
    await saveOfflineResult(result('mobile-overlap', 10));

    const firstSync = syncOfflineQueue();
    const secondSync = syncOfflineQueue();
    await vi.waitFor(() => expect(saveQuestResultV2Mock).toHaveBeenCalledTimes(1));
    resolveSave('saved');

    await expect(Promise.all([firstSync, secondSync])).resolves.toEqual([1, 1]);
    expect(saveQuestResultV2Mock).toHaveBeenCalledTimes(1);
  });
});
