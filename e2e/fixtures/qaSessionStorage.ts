import type { GameSession } from 'shared';

let session: GameSession | null = null;
const listeners = new Set<(value: GameSession | null) => void>();

function publish() {
  listeners.forEach(listener => listener(session));
}

export async function createSession(input: {
  questId: string; questTitle: string; hostId: string; stageCount: number; mode?: GameSession['mode'];
}): Promise<GameSession> {
  const now = new Date().toISOString();
  session = {
    id: 'QA1234',
    questId: input.questId,
    questTitle: input.questTitle,
    hostId: input.hostId,
    players: [],
    sosAlerts: [],
    status: 'waiting',
    mode: input.mode ?? 'free',
    currentStageIndex: 0,
    stageCount: input.stageCount,
    maxPlayers: 0,
    createdAt: now,
    updatedAt: now,
  };
  queueMicrotask(publish);
  return session;
}

export function subscribeSession(_code: string, onChange: (value: GameSession | null) => void) {
  listeners.add(onChange);
  queueMicrotask(() => onChange(session));
  return () => listeners.delete(onChange);
}

export async function setSessionStatus(_code: string, status: GameSession['status']) {
  if (session) session = { ...session, status };
  publish();
}

export async function setBroadcastStage(_code: string, index: number) {
  if (session) session = { ...session, currentStageIndex: Math.max(0, Math.min(index, session.stageCount - 1)) };
  publish();
}

export async function deleteSession() {
  session = null;
  publish();
}

export async function clearSosAlert() {}
export async function updateProgress() {}
