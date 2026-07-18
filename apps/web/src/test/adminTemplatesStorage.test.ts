import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  collection: vi.fn(),
  where: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: { id: 'qa-db' } }));
vi.mock('../utils/offlineQueue', () => ({ cacheQuestLocally: vi.fn() }));
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    collection: mocks.collection,
    where: mocks.where,
    query: mocks.query,
    limit: mocks.limit,
    getDocs: mocks.getDocs,
  };
});

import { getAdminTemplates } from '../utils/storage';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.collection.mockReturnValue('templates-collection');
  mocks.where.mockReturnValue('status-filter');
  mocks.limit.mockReturnValue('limit-100');
  mocks.query.mockReturnValueOnce('pending-query').mockReturnValueOnce('approved-query');
  mocks.getDocs.mockResolvedValueOnce({
    docs: [{ data: () => ({ id: 'newer', status: 'pending', createdAt: '2026-07-18T10:00:00.000Z' }) }],
  }).mockResolvedValueOnce({
    docs: [
      { data: () => ({ id: 'older', status: 'approved', createdAt: '2026-07-17T10:00:00.000Z' }) },
    ],
  });
});

describe('getAdminTemplates', () => {
  it('fetches separately bounded pending and approved queues with newest-first sorting', async () => {
    const templates = await getAdminTemplates();

    expect(mocks.collection).toHaveBeenCalledWith({ id: 'qa-db' }, 'templates');
    expect(mocks.where).toHaveBeenNthCalledWith(1, 'status', '==', 'pending');
    expect(mocks.where).toHaveBeenNthCalledWith(2, 'status', '==', 'approved');
    expect(mocks.limit).toHaveBeenCalledTimes(2);
    expect(mocks.limit).toHaveBeenCalledWith(100);
    expect(mocks.query).toHaveBeenNthCalledWith(1, 'templates-collection', 'status-filter', 'limit-100');
    expect(mocks.query).toHaveBeenNthCalledWith(2, 'templates-collection', 'status-filter', 'limit-100');
    expect(mocks.getDocs).toHaveBeenNthCalledWith(1, 'pending-query');
    expect(mocks.getDocs).toHaveBeenNthCalledWith(2, 'approved-query');
    expect(templates.map(template => template.id)).toEqual(['newer', 'older']);
  });
});
