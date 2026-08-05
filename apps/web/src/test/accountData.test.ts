import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('../utils/firebase', () => ({ db: { name: 'test-db' } }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ kind: 'collection', name }),
  doc: (_db: unknown, collectionName: string, id: string) => ({ kind: 'doc', collectionName, id }),
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  query: (source: { name: string }, ...constraints: unknown[]) => ({
    kind: 'query',
    collectionName: source.name,
    constraints,
  }),
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  where: (field: string, operator: string, value: unknown) => ({ field, operator, value }),
}));

import {
  buildAccountDataExport,
  cancelAccountDeletion,
  downloadAccountData,
  getAccountDeletionRequest,
  readLocalAccountData,
  requestAccountDeletion,
} from '../utils/accountData';
import type { AccountDataExport } from '../utils/accountData';

function foundDocument(id: string, data: Record<string, unknown>) {
  return { id, exists: () => true, data: () => data };
}

function missingDocument(id: string) {
  return { id, exists: () => false, data: () => ({}) };
}

function queryDocuments(items: Array<{ id: string; data: Record<string, unknown> }>) {
  return { docs: items.map(item => ({ id: item.id, data: () => item.data })) };
}

beforeEach(() => {
  mocks.getDoc.mockReset();
  mocks.getDocs.mockReset();
  mocks.setDoc.mockReset().mockResolvedValue(undefined);
  mocks.updateDoc.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('account data export', () => {
  it('exports only app-owned local keys in deterministic order', () => {
    localStorage.setItem('firebase:authUser:test', 'secret');
    localStorage.setItem('ak_theme', 'dark');
    localStorage.setItem('avk_analytics_consent', 'granted');
    localStorage.setItem('actionbound_draft', '{"id":1}');
    localStorage.setItem('unrelated', 'ignore');

    expect(readLocalAccountData(localStorage)).toEqual({
      actionbound_draft: '{"id":1}',
      ak_theme: 'dark',
      avk_analytics_consent: 'granted',
    });
  });

  it('uses canonical snapshot ids and gathers the user-owned Firestore surface', async () => {
    mocks.getDoc.mockImplementation(async (reference: { collectionName: string; id: string }) => {
      if (reference.collectionName === 'user_profiles') {
        return foundDocument(reference.id, { _documentId: 'spoofed-profile', displayName: 'Teacher' });
      }
      if (reference.collectionName === 'user_settings') return foundDocument(reference.id, { theme: 'dark' });
      return missingDocument(reference.id);
    });
    mocks.getDocs.mockImplementation(async (request: {
      collectionName: string;
      constraints: Array<{ value: unknown }>;
    }) => {
      if (request.collectionName === 'quests') {
        return queryDocuments([{ id: 'quest-a', data: { id: 'spoofed-quest', title: 'Quest A' } }]);
      }
      if (request.collectionName === 'quest_stages') {
        return queryDocuments([{ id: 'quest-a__stage-a', data: { questId: 'quest-a', creatorId: 'u1', id: 'stage-a' } }]);
      }
      if (request.collectionName === 'class_groups') {
        return queryDocuments([{ id: 'group-a', data: { ownerId: 'u1' } }]);
      }
      if (request.collectionName === 'payment_requests') {
        return queryDocuments([{ id: 'payment-a', data: { userId: 'u1' } }]);
      }
      const questId = request.constraints[0]?.value;
      expect(questId).toBe('quest-a');
      if (request.collectionName === 'quest_results') {
        return queryDocuments([{ id: 'result-a', data: { questId } }]);
      }
      if (request.collectionName === 'quest_result_telemetry') {
        return queryDocuments([{ id: 'telemetry-a', data: { questId } }]);
      }
      if (request.collectionName === 'quest_feedback') {
        return queryDocuments([{ id: 'feedback-a', data: { questId } }]);
      }
      return queryDocuments([]);
    });

    const exported = await buildAccountDataExport({
      uid: 'u1',
      email: 'teacher@example.com',
      displayName: 'Teacher',
    }, null);

    expect(exported.firestore.profile?._documentId).toBe('u1');
    expect(exported.firestore.quests[0]._documentId).toBe('quest-a');
    expect(exported.firestore.questStages[0]._documentId).toBe('quest-a__stage-a');
    expect(exported.firestore.questOwnedData).toEqual([expect.objectContaining({
      questId: 'quest-a',
      results: [expect.objectContaining({ _documentId: 'result-a' })],
      telemetry: [expect.objectContaining({ _documentId: 'telemetry-a' })],
      feedback: [expect.objectContaining({ _documentId: 'feedback-a' })],
    })]);
    expect(exported.coverage.manualArchiveRequired).toContain('uploaded Storage object binaries');
  });

  it('downloads a deterministic JSON filename and releases the temporary object URL', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:account-export');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    let clickedLink: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureLink(this: HTMLAnchorElement) {
      clickedLink = this;
    });

    downloadAccountData({
      identity: { uid: 'u1', email: 'teacher@example.com', displayName: 'Teacher' },
      exportedAt: '2026-08-04T12:00:00.000Z',
    } as AccountDataExport);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickedLink).not.toBeNull();
    expect((clickedLink as HTMLAnchorElement | null)?.download)
      .toBe('avantura-account-data-u1-2026-08-04.json');
    expect(document.body.contains(clickedLink)).toBe(false);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:account-export');
  });
});

describe('account deletion request client contract', () => {
  it('reads, creates and cancels the deterministic per-user request', async () => {
    mocks.getDoc.mockResolvedValue(foundDocument('u1', {
      userId: 'u1',
      email: 'teacher@example.com',
      status: 'pending',
      requestedAt: '2026-08-04T12:00:00.000Z',
      updatedAt: '2026-08-04T12:00:00.000Z',
    }));

    expect((await getAccountDeletionRequest('u1'))?.status).toBe('pending');
    const request = await requestAccountDeletion('u1', 'teacher@example.com');
    expect(request.status).toBe('pending');
    expect(mocks.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: 'account_deletion_requests', id: 'u1' }),
      request,
    );

    await cancelAccountDeletion('u1');
    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collectionName: 'account_deletion_requests', id: 'u1' }),
      expect.objectContaining({ status: 'cancelled' }),
    );
  });
});
