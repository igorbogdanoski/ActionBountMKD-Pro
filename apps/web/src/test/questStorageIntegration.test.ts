import { beforeEach, describe, expect, it, vi } from 'vitest';
import { splitQuestForStageStorage, type Quest } from 'shared';

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  batchSet: vi.fn(),
  batchDelete: vi.fn(),
  batchCommit: vi.fn(),
}));

vi.mock('../utils/firebase', () => ({ db: { id: 'db' } }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  doc: (_db: unknown, collectionName: string, id: string) => ({ collectionName, id }),
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: (source: { name: string }, ...constraints: unknown[]) => ({ collectionName: source.name, constraints }),
  where: (field: string, operator: string, value: unknown) => ({ field, operator, value }),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  increment: vi.fn(),
  deleteField: vi.fn(),
  writeBatch: () => ({ set: mocks.batchSet, delete: mocks.batchDelete, commit: mocks.batchCommit }),
}));

import { getQuestById, saveQuest } from '../utils/storage';

function quest(): Quest {
  return {
    id: 'quest-1', creatorId: 'teacher-1', title: 'Quest', description: '',
    visibility: 'secret', playMode: 'singleplayer', sequence: 'fixed',
    stages: [{ id: 'stage-1', type: 'INFO', title: '', description: '', order: 0, mediaType: 'none' }],
    createdAt: '2026-08-05T10:00:00.000Z', updatedAt: '2026-08-05T10:00:00.000Z',
  };
}

beforeEach(() => {
  Object.values(mocks).forEach(mock => mock.mockReset());
  mocks.batchCommit.mockResolvedValue(undefined);
});

describe('quest Firestore schema-v2 integration', () => {
  it('atomically writes a stage-free parent, validated stage documents and removes stale stages', async () => {
    mocks.getDocs.mockResolvedValue({ docs: [{ id: 'quest-1__stale', ref: { id: 'quest-1__stale' } }] });
    await saveQuest(quest());
    expect(mocks.getDocs).toHaveBeenCalledWith({ collectionName: 'quest_stages', constraints: [
      { field: 'questId', operator: '==', value: 'quest-1' },
      { field: 'creatorId', operator: '==', value: 'teacher-1' },
    ] });

    expect(mocks.batchSet).toHaveBeenCalledTimes(2);
    expect(mocks.batchSet.mock.calls[0][1]).toMatchObject({
      id: 'quest-1', stageSchemaVersion: 2, stageCount: 1,
    });
    expect(mocks.batchSet.mock.calls[0][1]).not.toHaveProperty('stages');
    expect(mocks.batchSet.mock.calls[1][0]).toMatchObject({ collectionName: 'quest_stages', id: 'quest-1__stage-1' });
    expect(mocks.batchSet.mock.calls[1][1]).toMatchObject({
      id: 'stage-1', questId: 'quest-1', creatorId: 'teacher-1', type: 'INFO',
    });
    expect(mocks.batchDelete).toHaveBeenCalledWith({ id: 'quest-1__stale' });
    expect(mocks.batchCommit).toHaveBeenCalledOnce();
  });

  it('hydrates an exact quest only from the matching current stage revision', async () => {
    const split = splitQuestForStageStorage(quest(), 'revision-0000000000000001');
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => split.document });
    mocks.getDocs.mockResolvedValue({ docs: split.stages.map(stage => ({ data: () => stage })) });

    await expect(getQuestById('quest-1')).resolves.toEqual(quest());
  });
});
