import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveOfflineResult,
  getOfflineQueue,
  clearOfflineQueue,
  offlineQueueSize,
  syncOfflineQueue,
  cacheQuestLocally,
  getCachedQuest,
  clearCachedQuest,
  isCachedLocally,
} from '../utils/offlineQueue';
import type { Quest, QuestResult } from 'shared';

const saveQuestResultMock = vi.fn();

vi.mock('../utils/storage', () => ({
  saveQuestResult: (...args: unknown[]) => saveQuestResultMock(...args),
}));

const makeResult = (points: number): Omit<QuestResult, 'id'> => ({
  questId: 'quest-1',
  playerName: 'Тестер',
  points,
  completedAt: new Date().toISOString(),
  stageDurations: [],
});

const makeQuest = (id: string): Quest => ({
  id,
  title: 'Тест квест',
  description: 'опис',
  creatorId: 'u1',
  stages: [],
} as unknown as Quest);

beforeEach(() => {
  localStorage.clear();
  saveQuestResultMock.mockReset();
});

// ─── Offline Result Queue ────────────────────────────────────────────────────

describe('offline result queue', () => {
  it('starts empty', () => {
    expect(getOfflineQueue()).toEqual([]);
    expect(offlineQueueSize()).toBe(0);
  });

  it('saves and reads results in order', () => {
    saveOfflineResult(makeResult(10));
    saveOfflineResult(makeResult(20));
    const queue = getOfflineQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0].points).toBe(10);
    expect(queue[1].points).toBe(20);
    expect(offlineQueueSize()).toBe(2);
  });

  it('clears the queue', () => {
    saveOfflineResult(makeResult(5));
    clearOfflineQueue();
    expect(offlineQueueSize()).toBe(0);
  });

  it('returns empty array on corrupted storage', () => {
    localStorage.setItem('ab_offline_results', '{not json');
    expect(getOfflineQueue()).toEqual([]);
  });
});

// ─── Sync ────────────────────────────────────────────────────────────────────

describe('syncOfflineQueue', () => {
  it('returns 0 when queue is empty', async () => {
    const synced = await syncOfflineQueue();
    expect(synced).toBe(0);
    expect(saveQuestResultMock).not.toHaveBeenCalled();
  });

  it('flushes all results and clears the queue on success', async () => {
    saveQuestResultMock.mockResolvedValue('new-id');
    saveOfflineResult(makeResult(10));
    saveOfflineResult(makeResult(20));

    const synced = await syncOfflineQueue();

    expect(synced).toBe(2);
    expect(saveQuestResultMock).toHaveBeenCalledTimes(2);
    expect(offlineQueueSize()).toBe(0);
  });

  it('keeps failed results in the queue and reports synced count', async () => {
    saveQuestResultMock
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce(new Error('network'));
    saveOfflineResult(makeResult(10));
    saveOfflineResult(makeResult(20));

    const synced = await syncOfflineQueue();

    expect(synced).toBe(1);
    const remaining = getOfflineQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].points).toBe(20);
  });

  it('does not double-save when two syncs overlap (flaky online/offline toggling)', async () => {
    let resolveFirstSave: (v: string) => void = () => {};
    saveQuestResultMock.mockImplementation(
      () => new Promise<string>(resolve => { resolveFirstSave = resolve; }),
    );
    saveOfflineResult(makeResult(10));

    // Two overlapping calls, e.g. from two rapid `online` events.
    const first = syncOfflineQueue();
    const second = syncOfflineQueue();

    // Let the (mocked) dynamic import + the in-flight pass actually reach
    // its saveQuestResult() call before resolving it.
    await vi.waitFor(() => expect(saveQuestResultMock).toHaveBeenCalled());
    resolveFirstSave('ok');
    const [firstSynced, secondSynced] = await Promise.all([first, second]);

    // The single queued result must only be saved once — both concurrent
    // callers share the same in-flight pass and its result.
    expect(saveQuestResultMock).toHaveBeenCalledTimes(1);
    expect(firstSynced).toBe(1);
    expect(secondSynced).toBe(1);
  });
});

// ─── Quest localStorage cache ─────────────────────────────────────────────────

describe('quest local cache', () => {
  it('caches and retrieves a quest', () => {
    const quest = makeQuest('q-abc');
    cacheQuestLocally(quest);
    expect(isCachedLocally('q-abc')).toBe(true);
    expect(getCachedQuest('q-abc')?.id).toBe('q-abc');
  });

  it('returns null for an uncached quest', () => {
    expect(getCachedQuest('missing')).toBeNull();
    expect(isCachedLocally('missing')).toBe(false);
  });

  it('clears a cached quest', () => {
    cacheQuestLocally(makeQuest('q-del'));
    clearCachedQuest('q-del');
    expect(getCachedQuest('q-del')).toBeNull();
    expect(isCachedLocally('q-del')).toBe(false);
  });
});

