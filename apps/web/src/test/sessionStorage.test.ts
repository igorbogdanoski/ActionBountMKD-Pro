// End-to-end test of the real-time session data layer against an in-memory
// Firestore mock. Drives the full host→join→progress→broadcast→finish flow and
// verifies live onSnapshot propagation — catches integration bugs without a
// live Firebase backend.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const fs = vi.hoisted(() => {
  type Ref = { path: string };
  const store = new Map<string, unknown>();
  const listeners = new Map<string, Set<(snap: unknown) => void>>();
  const clone = <T>(o: T): T => (o === undefined ? o : JSON.parse(JSON.stringify(o)));
  const snapOf = (path: string) => {
    const exists = store.has(path);
    const data = clone(store.get(path));
    return { exists: () => exists, data: () => data };
  };
  const notify = (path: string) => {
    const set = listeners.get(path);
    if (!set) return;
    const snap = snapOf(path);
    set.forEach(cb => cb(snap));
  };
  const notifyAll = () => { for (const path of listeners.keys()) notify(path); };
  return {
    store, listeners, clone, snapOf, notify, notifyAll,
    reset: () => { store.clear(); listeners.clear(); },
    doc: (_db: unknown, coll: string, id: string): Ref => ({ path: `${coll}/${id}` }),
    getDoc: async (ref: Ref) => fs.snapOf(ref.path),
    setDoc: async (ref: Ref, data: unknown) => { store.set(ref.path, clone(data)); notify(ref.path); },
    updateDoc: async (ref: Ref, patch: Record<string, unknown>) => {
      store.set(ref.path, { ...(store.get(ref.path) as object ?? {}), ...clone(patch) });
      notify(ref.path);
    },
    deleteDoc: async (ref: Ref) => { store.delete(ref.path); notify(ref.path); },
    onSnapshot: (ref: Ref, onNext: (snap: unknown) => void) => {
      const set = listeners.get(ref.path) ?? new Set();
      set.add(onNext);
      listeners.set(ref.path, set);
      onNext(fs.snapOf(ref.path));
      return () => set.delete(onNext);
    },
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: async (ref: Ref) => fs.snapOf(ref.path),
        set: (ref: Ref, data: unknown) => { store.set(ref.path, clone(data)); },
        update: (ref: Ref, patch: Record<string, unknown>) => {
          store.set(ref.path, { ...(store.get(ref.path) as object ?? {}), ...clone(patch) });
        },
        delete: (ref: Ref) => { store.delete(ref.path); },
      };
      const result = await fn(tx);
      notifyAll();
      return result;
    },
  };
});

vi.mock('../utils/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: fs.doc,
  getDoc: fs.getDoc,
  setDoc: fs.setDoc,
  updateDoc: fs.updateDoc,
  deleteDoc: fs.deleteDoc,
  onSnapshot: fs.onSnapshot,
  runTransaction: fs.runTransaction,
}));

import {
  createSession,
  getSession,
  joinSession,
  leaveSession,
  updateProgress,
  setSessionStatus,
  setBroadcastStage,
  subscribeSession,
  deleteSession,
  SessionError,
} from '../utils/sessionStorage';
import { computeLeaderboard } from '../lib/session';
import type { GameSession } from 'shared';

const baseInput = {
  questId: 'quest-1',
  questTitle: 'Скопска авантура',
  hostId: 'host-1',
  stageCount: 5,
};

beforeEach(() => fs.reset());

describe('createSession', () => {
  it('creates a waiting session with a 6-char code and empty roster', async () => {
    const s = await createSession(baseInput);
    expect(s.id).toHaveLength(6);
    expect(s.status).toBe('waiting');
    expect(s.players).toEqual([]);
    expect(s.mode).toBe('free');
    const fetched = await getSession(s.id);
    expect(fetched?.questTitle).toBe('Скопска авантура');
  });
});

describe('join flow', () => {
  it('adds players and is case-insensitive on the code', async () => {
    const s = await createSession(baseInput);
    await joinSession(s.id.toLowerCase(), 'p1', 'Ана');
    await joinSession(s.id, 'p2', 'Бојан');
    const fetched = await getSession(s.id);
    expect(fetched?.players.map(p => p.name)).toEqual(['Ана', 'Бојан']);
  });

  it('re-joining with the same uid updates the name, not duplicates', async () => {
    const s = await createSession(baseInput);
    await joinSession(s.id, 'p1', 'Ана');
    await joinSession(s.id, 'p1', 'Ана М.');
    const fetched = await getSession(s.id);
    expect(fetched?.players).toHaveLength(1);
    expect(fetched?.players[0].name).toBe('Ана М.');
  });

  it('throws not-found for a missing code', async () => {
    await expect(joinSession('ZZZZZZ', 'p1', 'Ана')).rejects.toBeInstanceOf(SessionError);
    await expect(joinSession('ZZZZZZ', 'p1', 'Ана')).rejects.toMatchObject({ code: 'not-found' });
  });

  it('throws full when at capacity (but lets existing players rejoin)', async () => {
    const s = await createSession({ ...baseInput, maxPlayers: 1 });
    await joinSession(s.id, 'p1', 'Ана');
    await expect(joinSession(s.id, 'p2', 'Бојан')).rejects.toMatchObject({ code: 'full' });
    await expect(joinSession(s.id, 'p1', 'Ана')).resolves.toBeTruthy(); // rejoin ok
  });

  it('throws finished once the session is over', async () => {
    const s = await createSession(baseInput);
    await setSessionStatus(s.id, 'finished');
    await expect(joinSession(s.id, 'p1', 'Ана')).rejects.toMatchObject({ code: 'finished' });
  });
});

describe('progress & leaderboard', () => {
  it('updates points/stage and reflects in a computed leaderboard', async () => {
    const s = await createSession(baseInput);
    await joinSession(s.id, 'p1', 'Ана');
    await joinSession(s.id, 'p2', 'Бојан');
    await updateProgress(s.id, 'p1', { points: 20, stageIndex: 2 });
    await updateProgress(s.id, 'p2', { points: 50, stageIndex: 3, finished: true });

    const fetched = (await getSession(s.id)) as GameSession;
    const board = computeLeaderboard(fetched.players);
    expect(board[0]).toMatchObject({ uid: 'p2', rank: 1, points: 50 });
    expect(board[1]).toMatchObject({ uid: 'p1', rank: 2, points: 20 });
  });

  it('progress update for an unknown player is a no-op', async () => {
    const s = await createSession(baseInput);
    await joinSession(s.id, 'p1', 'Ана');
    await updateProgress(s.id, 'ghost', { points: 999 });
    const fetched = await getSession(s.id);
    expect(fetched?.players).toHaveLength(1);
    expect(fetched?.players[0].points).toBe(0);
  });
});

describe('broadcast & lifecycle', () => {
  it('clamps the broadcast stage pointer to valid bounds', async () => {
    const s = await createSession(baseInput); // stageCount 5
    await setBroadcastStage(s.id, 99);
    expect((await getSession(s.id))?.currentStageIndex).toBe(4);
    await setBroadcastStage(s.id, -3);
    expect((await getSession(s.id))?.currentStageIndex).toBe(0);
  });

  it('transitions status and removes players / deletes', async () => {
    const s = await createSession(baseInput);
    await joinSession(s.id, 'p1', 'Ана');
    await setSessionStatus(s.id, 'active');
    expect((await getSession(s.id))?.status).toBe('active');
    await leaveSession(s.id, 'p1');
    expect((await getSession(s.id))?.players).toHaveLength(0);
    await deleteSession(s.id);
    expect(await getSession(s.id)).toBeNull();
  });
});

describe('live subscription (onSnapshot)', () => {
  it('pushes roster and progress changes to subscribers', async () => {
    const s = await createSession(baseInput);
    const frames: GameSession[] = [];
    const unsub = subscribeSession(s.id, sess => { if (sess) frames.push(sess); });

    await joinSession(s.id, 'p1', 'Ана');
    await updateProgress(s.id, 'p1', { points: 30 });

    // initial frame + after join + after progress
    expect(frames.length).toBeGreaterThanOrEqual(3);
    const last = frames[frames.length - 1];
    expect(last.players[0].points).toBe(30);
    unsub();

    // no more frames after unsubscribe
    const count = frames.length;
    await updateProgress(s.id, 'p1', { points: 80 });
    expect(frames.length).toBe(count);
  });

  it('emits null when the session is deleted', async () => {
    const s = await createSession(baseInput);
    let latest: GameSession | null | undefined;
    const unsub = subscribeSession(s.id, sess => { latest = sess; });
    await deleteSession(s.id);
    expect(latest).toBeNull();
    unsub();
  });
});

