// Verifies the payment-approval flow against an in-memory Firestore mock —
// in particular that approval is atomic and can't be double-processed.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const fs = vi.hoisted(() => {
  type Ref = { path: string; coll: string; id: string };
  const store = new Map<string, Record<string, unknown>>();
  const clone = <T>(o: T): T => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
  let nextId = 0;

  return {
    store,
    reset: () => { store.clear(); nextId = 0; },
    collection: (_db: unknown, coll: string) => ({ coll }),
    doc: (_db: unknown, coll: string, id: string): Ref => ({ path: `${coll}/${id}`, coll, id }),
    addDoc: async (colRef: { coll: string }, data: Record<string, unknown>) => {
      const id = `id-${nextId++}`;
      store.set(`${colRef.coll}/${id}`, clone(data));
      return { id };
    },
    query: (colRef: { coll: string }, ...constraints: Array<{ field: string; value: unknown }>) => ({ coll: colRef.coll, constraints }),
    where: (field: string, _op: string, value: unknown) => ({ field, value }),
    getDocs: async (q: { coll: string; constraints?: Array<{ field: string; value: unknown }> }) => {
      const docs = [...store.entries()]
        .filter(([path]) => path.startsWith(`${q.coll}/`))
        .filter(([, data]) => (q.constraints ?? []).every(c => data[c.field] === c.value))
        .map(([path, data]) => ({ id: path.split('/')[1], data: () => clone(data) }));
      return { docs };
    },
    updateDoc: async (ref: Ref, patch: Record<string, unknown>) => {
      store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...clone(patch) });
    },
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: async (ref: Ref) => {
          const data = store.get(ref.path);
          return { exists: () => data !== undefined, data: () => clone(data) };
        },
        update: (ref: Ref, patch: Record<string, unknown>) => {
          store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...clone(patch) });
        },
      };
      return fn(tx);
    },
  };
});

vi.mock('../utils/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: fs.collection,
  doc: fs.doc,
  addDoc: fs.addDoc,
  query: fs.query,
  where: fs.where,
  getDocs: fs.getDocs,
  updateDoc: fs.updateDoc,
  runTransaction: fs.runTransaction,
}));

import { submitPaymentRequest, approvePaymentRequest, rejectPaymentRequest } from '../utils/paymentRequests';

beforeEach(() => fs.reset());

const baseRequest = {
  userId: 'user-1',
  userEmail: 'user1@example.com',
  displayName: 'Ученик Прв',
  planId: 'starter' as const,
  method: 'bank' as const,
  amountMkd: 590,
  transactionRef: 'REF-123',
};

describe('approvePaymentRequest', () => {
  it('atomically marks the request approved and upgrades the user plan', async () => {
    const reqId = await submitPaymentRequest(baseRequest);
    fs.store.set('user_profiles/user-1', { plan: 'free' });

    await approvePaymentRequest(reqId, 'user-1', 'starter');

    expect(fs.store.get(`payment_requests/${reqId}`)?.status).toBe('approved');
    expect(fs.store.get('user_profiles/user-1')?.plan).toBe('starter');
  });

  it('refuses to process the same request twice', async () => {
    const reqId = await submitPaymentRequest(baseRequest);
    fs.store.set('user_profiles/user-1', { plan: 'free' });

    await approvePaymentRequest(reqId, 'user-1', 'starter');
    // Simulate a second admin double-clicking approve, or a retried request.
    fs.store.set('user_profiles/user-1', { ...fs.store.get('user_profiles/user-1'), plan: 'starter' });
    await expect(approvePaymentRequest(reqId, 'user-1', 'pro')).rejects.toThrow();

    // Plan must not have been bumped to 'pro' by the rejected second call.
    expect(fs.store.get('user_profiles/user-1')?.plan).toBe('starter');
  });

  it('refuses to approve a request that does not exist', async () => {
    await expect(approvePaymentRequest('missing-id', 'user-1', 'starter')).rejects.toThrow();
  });
});

describe('rejectPaymentRequest', () => {
  it('marks the request rejected without touching the user profile', async () => {
    const reqId = await submitPaymentRequest(baseRequest);
    fs.store.set('user_profiles/user-1', { plan: 'free' });

    await rejectPaymentRequest(reqId);

    expect(fs.store.get(`payment_requests/${reqId}`)?.status).toBe('rejected');
    expect(fs.store.get('user_profiles/user-1')?.plan).toBe('free');
  });
});
