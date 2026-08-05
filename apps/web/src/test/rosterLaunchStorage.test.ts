import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RosterLaunch, RosterLaunchSet } from 'shared';
import { ROSTER_LAUNCH_LIFETIME_MS } from 'shared';

const fs = vi.hoisted(() => {
  const writes = new Map<string, Record<string, unknown>>();
  const updates = new Map<string, Record<string, unknown>>();

  return {
    writes,
    updates,
    reset() {
      writes.clear();
      updates.clear();
    },
    doc: (_db: unknown, collectionName: string, id: string) => ({
      id,
      path: `${collectionName}/${id}`,
    }),
    writeBatch: () => ({
      set: (ref: { path: string }, value: Record<string, unknown>) => writes.set(ref.path, value),
      commit: vi.fn().mockResolvedValue(undefined),
    }),
    updateDoc: async (ref: { path: string }, value: Record<string, unknown>) => {
      updates.set(ref.path, value);
    },
  };
});

vi.mock('../utils/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: fs.doc,
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: fs.updateDoc,
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  increment: vi.fn(),
  deleteField: vi.fn(),
  writeBatch: fs.writeBatch,
}));

import { revokeRosterLaunches, rotateRosterLaunches } from '../utils/rosterLaunchStorage';

beforeEach(() => fs.reset());

describe('roster launch storage lifecycle', () => {
  it('writes one active set generation and one opaque launch per student', async () => {
    const nowMs = 1_800_000_000_000;
    const launches = await rotateRosterLaunches({
      ownerId: 'teacher-1',
      groupId: 'group-1',
      questId: 'quest-1',
      students: [
        { id: 'student-1', name: 'Ана' },
        { id: 'student-2', name: 'Борис' },
      ],
    }, nowMs);

    expect(launches).toHaveLength(2);
    expect(new Set(launches.map(item => item.id)).size).toBe(2);
    const launchSet = fs.writes.get('roster_launch_sets/group-1--quest-1') as unknown as RosterLaunchSet;
    expect(launchSet).toMatchObject({
      id: 'group-1--quest-1',
      ownerId: 'teacher-1',
      generationId: expect.any(String),
      status: 'active',
      issuedAtMs: nowMs,
      expiresAtMs: nowMs + ROSTER_LAUNCH_LIFETIME_MS,
    });

    for (const launch of launches) {
      const written = fs.writes.get(`roster_launches/${launch.id}`) as unknown as RosterLaunch;
      expect(written).toMatchObject({
        generationId: launchSet.generationId,
        setId: launchSet.id,
        questId: 'quest-1',
        expiresAtMs: launchSet.expiresAtMs,
      });
    }
  });

  it('revokes the deterministic set without rewriting identity fields', async () => {
    await revokeRosterLaunches('group-1', 'quest-1', 1_800_000_000_000);
    expect(fs.updates.get('roster_launch_sets/group-1--quest-1')).toEqual({
      status: 'revoked',
      revokedAtMs: 1_800_000_000_000,
    });
  });
});
