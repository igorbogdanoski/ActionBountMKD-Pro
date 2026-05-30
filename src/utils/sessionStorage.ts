import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import type { GameSession, SessionMode, SessionPlayer } from '../types';
import {
  generateJoinCode,
  normalizeJoinCode,
  upsertPlayer,
  removePlayer,
  applyProgress,
  makeSessionPlayer,
  isSessionJoinable,
  clampBroadcastIndex,
} from '../lib/session';

const SESSIONS = 'game_sessions';

const nowIso = () => new Date().toISOString();

export class SessionError extends Error {
  constructor(public code: 'not-found' | 'finished' | 'full' | 'code-collision', message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export interface CreateSessionInput {
  questId: string;
  questTitle: string;
  hostId: string;
  stageCount: number;
  mode?: SessionMode;
  maxPlayers?: number;
}

/** Create a session with a unique join code (retries on collision). */
export async function createSession(input: CreateSessionInput): Promise<GameSession> {
  const ts = nowIso();
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateJoinCode();
    const ref = doc(db, SESSIONS, code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    const session: GameSession = {
      id: code,
      questId: input.questId,
      questTitle: input.questTitle,
      hostId: input.hostId,
      players: [],
      status: 'waiting',
      mode: input.mode ?? 'free',
      currentStageIndex: 0,
      stageCount: input.stageCount,
      maxPlayers: input.maxPlayers ?? 0,
      createdAt: ts,
      updatedAt: ts,
    };
    await setDoc(ref, session);
    return session;
  }
  throw new SessionError('code-collision', 'Не може да се генерира уникатен код. Обиди се повторно.');
}

export async function getSession(code: string): Promise<GameSession | null> {
  const ref = doc(db, SESSIONS, normalizeJoinCode(code));
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as GameSession) : null;
}

/** Subscribe to live session updates. Returns an unsubscribe function. */
export function subscribeSession(
  code: string,
  onChange: (session: GameSession | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const ref = doc(db, SESSIONS, normalizeJoinCode(code));
  return onSnapshot(
    ref,
    snap => onChange(snap.exists() ? (snap.data() as GameSession) : null),
    err => onError?.(err as Error),
  );
}

/**
 * Join a session atomically. Adds the player (or refreshes name if rejoining).
 * Throws SessionError on missing / finished / full sessions.
 */
export async function joinSession(code: string, uid: string, name: string): Promise<GameSession> {
  const ref = doc(db, SESSIONS, normalizeJoinCode(code));
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new SessionError('not-found', 'Сесијата не постои.');
    const session = snap.data() as GameSession;

    const alreadyJoined = session.players.some(p => p.uid === uid);
    if (!alreadyJoined && !isSessionJoinable(session)) {
      if (session.status === 'finished') throw new SessionError('finished', 'Сесијата е завршена.');
      throw new SessionError('full', 'Сесијата е полна.');
    }

    const player: SessionPlayer = alreadyJoined
      ? { ...session.players.find(p => p.uid === uid)!, name: name.trim().slice(0, 40) || 'Играч' }
      : makeSessionPlayer(uid, name, nowIso());

    const players = upsertPlayer(session.players, player);
    tx.update(ref, { players, updatedAt: nowIso() });
    return { ...session, players };
  });
}

export async function leaveSession(code: string, uid: string): Promise<void> {
  const ref = doc(db, SESSIONS, normalizeJoinCode(code));
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const session = snap.data() as GameSession;
    tx.update(ref, { players: removePlayer(session.players, uid), updatedAt: nowIso() });
  });
}

export async function updateProgress(
  code: string,
  uid: string,
  patch: Partial<Pick<SessionPlayer, 'points' | 'stageIndex' | 'finished'>>,
): Promise<void> {
  const ref = doc(db, SESSIONS, normalizeJoinCode(code));
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const session = snap.data() as GameSession;
    const players = applyProgress(session.players, uid, patch, nowIso());
    tx.update(ref, { players, updatedAt: nowIso() });
  });
}

export async function setSessionStatus(code: string, status: GameSession['status']): Promise<void> {
  const ref = doc(db, SESSIONS, normalizeJoinCode(code));
  await updateDoc(ref, { status, updatedAt: nowIso() });
}

/** Move the broadcast pointer (host-paced mode), clamped to valid bounds. */
export async function setBroadcastStage(code: string, index: number): Promise<void> {
  const ref = doc(db, SESSIONS, normalizeJoinCode(code));
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const session = snap.data() as GameSession;
    const next = clampBroadcastIndex(index, session.stageCount);
    tx.update(ref, { currentStageIndex: next, updatedAt: nowIso() });
  });
}

export async function deleteSession(code: string): Promise<void> {
  await deleteDoc(doc(db, SESSIONS, normalizeJoinCode(code)));
}
