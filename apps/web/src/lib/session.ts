import type { GameSession, SessionPlayer, LeaderboardEntry, SessionSosAlert } from 'shared';

// ─── Join codes ──────────────────────────────────────────────────────────────
// Unambiguous alphabet — no 0/O, 1/I/L to avoid player typos.
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const JOIN_CODE_LENGTH = 6;

/** Generate a random join code. `rng` is injectable for deterministic tests. */
export function generateJoinCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    const idx = Math.floor(rng() * JOIN_CODE_ALPHABET.length) % JOIN_CODE_ALPHABET.length;
    code += JOIN_CODE_ALPHABET[idx];
  }
  return code;
}

/** Normalise user input: trim, strip spaces, uppercase. */
export function normalizeJoinCode(input: string): string {
  return (input ?? '').replace(/\s+/g, '').toUpperCase();
}

export function isValidJoinCode(code: string): boolean {
  const c = normalizeJoinCode(code);
  if (c.length !== JOIN_CODE_LENGTH) return false;
  for (const ch of c) {
    if (!JOIN_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}

// ─── Player roster ─────────────────────────────────────────────────────────────

/**
 * Add a new player or update an existing one (matched by uid).
 * Returns a NEW array — never mutates the input.
 */
export function upsertPlayer(players: SessionPlayer[], player: SessionPlayer): SessionPlayer[] {
  const idx = players.findIndex(p => p.uid === player.uid);
  if (idx === -1) return [...players, player];
  const next = players.slice();
  next[idx] = { ...next[idx], ...player };
  return next;
}

export function removePlayer(players: SessionPlayer[], uid: string): SessionPlayer[] {
  return players.filter(p => p.uid !== uid);
}

/** Apply a partial progress update to one player (matched by uid). No-op if absent. */
export function applyProgress(
  players: SessionPlayer[],
  uid: string,
  patch: Partial<Pick<SessionPlayer, 'points' | 'stageIndex' | 'finished'>>,
  now: string,
): SessionPlayer[] {
  const idx = players.findIndex(p => p.uid === uid);
  if (idx === -1) return players;
  const next = players.slice();
  next[idx] = { ...next[idx], ...patch, updatedAt: now };
  return next;
}

export interface SessionLocationPatch {
  lastLat: number;
  lastLng: number;
  lastSeenAt: string;
}

export function applyLocation(
  players: SessionPlayer[],
  uid: string,
  patch: SessionLocationPatch,
): SessionPlayer[] {
  const idx = players.findIndex(p => p.uid === uid);
  if (idx === -1) return players;
  const next = players.slice();
  next[idx] = {
    ...next[idx],
    lastLat: patch.lastLat,
    lastLng: patch.lastLng,
    lastSeenAt: patch.lastSeenAt,
    updatedAt: patch.lastSeenAt,
  };
  return next;
}

export function clearLocations(players: SessionPlayer[]): SessionPlayer[] {
  return players.map(({ lastLat: _lastLat, lastLng: _lastLng, lastSeenAt: _lastSeenAt, ...player }) => player);
}

export function raiseSos(
  alerts: SessionSosAlert[],
  nextAlert: SessionSosAlert,
): SessionSosAlert[] {
  const idx = alerts.findIndex(alert => alert.playerId === nextAlert.playerId);
  if (idx === -1) return [nextAlert, ...alerts];
  const next = alerts.slice();
  next[idx] = nextAlert;
  return next.sort((a, b) => b.ts.localeCompare(a.ts));
}

export function clearSos(alerts: SessionSosAlert[], playerId: string): SessionSosAlert[] {
  return alerts.filter(alert => alert.playerId !== playerId);
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

/**
 * Rank players: points desc → stageIndex desc → earliest join first.
 * Returns a new sorted array with a 1-based `rank` on each entry.
 */
export function computeLeaderboard(players: SessionPlayer[]): LeaderboardEntry[] {
  const sorted = players.slice().sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.stageIndex !== a.stageIndex) return b.stageIndex - a.stageIndex;
    return a.joinedAt.localeCompare(b.joinedAt);
  });
  return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
}

// ─── Session predicates ────────────────────────────────────────────────────────

export function isSessionJoinable(session: Pick<GameSession, 'status' | 'players' | 'maxPlayers'>): boolean {
  if (session.status === 'finished') return false;
  if (session.maxPlayers > 0 && session.players.length >= session.maxPlayers) return false;
  return true;
}

export function canStartSession(session: Pick<GameSession, 'status' | 'players'>): boolean {
  return session.status === 'waiting' && session.players.length > 0;
}

export interface SessionStats {
  total: number;
  finished: number;
  active: number;
  topPoints: number;
}

export function sessionStats(session: Pick<GameSession, 'players'>): SessionStats {
  const total = session.players.length;
  const finished = session.players.filter(p => p.finished).length;
  return {
    total,
    finished,
    active: total - finished,
    topPoints: session.players.reduce((max, p) => Math.max(max, p.points), 0),
  };
}

/** Clamp a broadcast stage pointer into valid bounds. */
export function clampBroadcastIndex(index: number, stageCount: number): number {
  if (stageCount <= 0) return 0;
  if (index < 0) return 0;
  if (index > stageCount - 1) return stageCount - 1;
  return index;
}

export function makeSessionPlayer(uid: string, name: string, now: string): SessionPlayer {
  return {
    uid,
    name: name.trim().slice(0, 40) || 'Играч',
    points: 0,
    stageIndex: 0,
    finished: false,
    joinedAt: now,
    updatedAt: now,
  };
}

