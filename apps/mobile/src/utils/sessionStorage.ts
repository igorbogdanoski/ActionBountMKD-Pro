import { doc, getDoc, runTransaction } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import type { GameSession, SessionPlayer } from 'shared';
import { normalizeJoinCode, upsertPlayer, applyProgress, makeSessionPlayer, isSessionJoinable } from 'shared';

const SESSIONS = 'game_sessions';
const PLAYER_ID_KEY = 'av_session_player_id';

const nowIso = () => new Date().toISOString();

export class SessionError extends Error {
  code: 'not-found' | 'finished' | 'full';
  constructor(code: 'not-found' | 'finished' | 'full', message: string) {
    super(message);
    this.code = code;
    this.name = 'SessionError';
  }
}

/** Anonymous player id, persisted across app launches — mirrors the web app's localStorage equivalent. */
export async function getSessionPlayerId(): Promise<string> {
  let id = await AsyncStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    await AsyncStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export async function getSession(code: string): Promise<GameSession | null> {
  const ref = doc(db, SESSIONS, normalizeJoinCode(code));
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as GameSession) : null;
}

/** Join a session atomically. Adds the player (or refreshes name if rejoining). */
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

/** Best-effort progress sync — swallows errors so it never blocks local gameplay. */
export async function updateSessionProgress(
  code: string,
  uid: string,
  patch: Partial<Pick<SessionPlayer, 'points' | 'stageIndex' | 'finished'>>,
): Promise<void> {
  try {
    const ref = doc(db, SESSIONS, normalizeJoinCode(code));
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const session = snap.data() as GameSession;
      const players = applyProgress(session.players, uid, patch, nowIso());
      tx.update(ref, { players, updatedAt: nowIso() });
    });
  } catch (e) {
    console.warn('[sessionStorage] progress sync failed:', e);
  }
}
