import { describe, it, expect } from 'vitest';
import {
  generateJoinCode,
  normalizeJoinCode,
  isValidJoinCode,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  upsertPlayer,
  removePlayer,
  applyProgress,
  computeLeaderboard,
  isSessionJoinable,
  canStartSession,
  sessionStats,
  clampBroadcastIndex,
  makeSessionPlayer,
} from '../lib/session';
import type { SessionPlayer } from '../types';

const player = (over: Partial<SessionPlayer> = {}): SessionPlayer => ({
  uid: 'u1',
  name: 'Игор',
  points: 0,
  stageIndex: 0,
  finished: false,
  joinedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

// ─── Join codes ────────────────────────────────────────────────────────────────

describe('join codes', () => {
  it('generates a code of fixed length from the safe alphabet', () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
    for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
  });

  it('is deterministic with an injected rng', () => {
    const rng = () => 0; // always first char
    expect(generateJoinCode(rng)).toBe(JOIN_CODE_ALPHABET[0].repeat(JOIN_CODE_LENGTH));
  });

  it('never contains ambiguous characters', () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[O01IL]/);
  });

  it('normalises user input', () => {
    expect(normalizeJoinCode('  ab c2 3 ')).toBe('ABC23');
    expect(normalizeJoinCode('')).toBe('');
  });

  it('validates codes', () => {
    expect(isValidJoinCode('ABC234')).toBe(true);
    expect(isValidJoinCode('abc234')).toBe(true);
    expect(isValidJoinCode('ABC23')).toBe(false);   // too short
    expect(isValidJoinCode('ABC2O4')).toBe(false);  // contains O
    expect(isValidJoinCode('ABC2!4')).toBe(false);  // bad char
  });
});

// ─── Roster ──────────────────────────────────────────────────────────────────

describe('roster mutations are immutable', () => {
  it('adds a new player without mutating the source', () => {
    const a = [player({ uid: 'a' })];
    const b = upsertPlayer(a, player({ uid: 'b' }));
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(2);
  });

  it('updates an existing player by uid', () => {
    const a = [player({ uid: 'a', points: 0 })];
    const b = upsertPlayer(a, player({ uid: 'a', points: 99 }));
    expect(b).toHaveLength(1);
    expect(b[0].points).toBe(99);
    expect(a[0].points).toBe(0);
  });

  it('removes a player by uid', () => {
    const a = [player({ uid: 'a' }), player({ uid: 'b' })];
    expect(removePlayer(a, 'a')).toEqual([a[1]]);
  });

  it('applies a progress patch only to the matching player', () => {
    const a = [player({ uid: 'a' }), player({ uid: 'b' })];
    const b = applyProgress(a, 'b', { points: 50, stageIndex: 3 }, '2026-02-02T00:00:00.000Z');
    expect(b[1]).toMatchObject({ points: 50, stageIndex: 3, updatedAt: '2026-02-02T00:00:00.000Z' });
    expect(b[0].points).toBe(0);
  });

  it('is a no-op when the player is absent', () => {
    const a = [player({ uid: 'a' })];
    expect(applyProgress(a, 'ghost', { points: 1 }, 'now')).toBe(a);
  });
});

// ─── Leaderboard ─────────────────────────────────────────────────────────────

describe('computeLeaderboard', () => {
  it('ranks by points desc, then stageIndex desc, then earliest join', () => {
    const players = [
      player({ uid: 'a', points: 10, stageIndex: 1, joinedAt: '2026-01-01T00:00:03.000Z' }),
      player({ uid: 'b', points: 30, stageIndex: 2, joinedAt: '2026-01-01T00:00:02.000Z' }),
      player({ uid: 'c', points: 10, stageIndex: 4, joinedAt: '2026-01-01T00:00:01.000Z' }),
      player({ uid: 'd', points: 10, stageIndex: 4, joinedAt: '2026-01-01T00:00:00.000Z' }),
    ];
    const board = computeLeaderboard(players);
    expect(board.map(p => p.uid)).toEqual(['b', 'd', 'c', 'a']);
    expect(board.map(p => p.rank)).toEqual([1, 2, 3, 4]);
  });

  it('does not mutate the input', () => {
    const players = [player({ uid: 'a', points: 1 }), player({ uid: 'b', points: 2 })];
    computeLeaderboard(players);
    expect(players[0].uid).toBe('a');
  });
});

// ─── Predicates & stats ─────────────────────────────────────────────────────

describe('session predicates', () => {
  it('joinable while waiting/active and under capacity', () => {
    expect(isSessionJoinable({ status: 'waiting', players: [], maxPlayers: 0 })).toBe(true);
    expect(isSessionJoinable({ status: 'active', players: [player()], maxPlayers: 0 })).toBe(true);
    expect(isSessionJoinable({ status: 'finished', players: [], maxPlayers: 0 })).toBe(false);
  });

  it('respects maxPlayers (0 = unlimited)', () => {
    expect(isSessionJoinable({ status: 'waiting', players: [player({ uid: 'a' })], maxPlayers: 1 })).toBe(false);
    expect(isSessionJoinable({ status: 'waiting', players: [player({ uid: 'a' })], maxPlayers: 0 })).toBe(true);
  });

  it('canStartSession requires waiting status and at least one player', () => {
    expect(canStartSession({ status: 'waiting', players: [player()] })).toBe(true);
    expect(canStartSession({ status: 'waiting', players: [] })).toBe(false);
    expect(canStartSession({ status: 'active', players: [player()] })).toBe(false);
  });

  it('computes stats', () => {
    const stats = sessionStats({
      players: [player({ points: 10, finished: true }), player({ points: 40 }), player({ points: 5 })],
    });
    expect(stats).toEqual({ total: 3, finished: 1, active: 2, topPoints: 40 });
  });

  it('clamps broadcast index', () => {
    expect(clampBroadcastIndex(-5, 4)).toBe(0);
    expect(clampBroadcastIndex(2, 4)).toBe(2);
    expect(clampBroadcastIndex(10, 4)).toBe(3);
    expect(clampBroadcastIndex(1, 0)).toBe(0);
  });

  it('makes a fresh player with sane defaults and trimmed name', () => {
    const p = makeSessionPlayer('x', '   Ана   ', 'now');
    expect(p).toMatchObject({ uid: 'x', name: 'Ана', points: 0, stageIndex: 0, finished: false });
    expect(makeSessionPlayer('x', '   ', 'now').name).toBe('Играч');
  });
});
