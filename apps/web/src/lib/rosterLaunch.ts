import type { GroupStudent, RosterLaunch } from 'shared';
import { ROSTER_LAUNCH_LIFETIME_MS } from 'shared';

const MIN_LAUNCH_ID_LENGTH = 20;
const MAX_LAUNCH_ID_LENGTH = 128;

export interface RosterLaunchReference {
  launchId: string;
}

export type RosterLaunchProblem = 'missing' | 'revoked' | 'expired' | 'quest-mismatch' | 'malformed';

export function createOpaqueLaunchId(cryptoApi: Pick<Crypto, 'randomUUID'> = globalThis.crypto): string {
  const id = cryptoApi?.randomUUID?.();
  if (!id) throw new Error('Secure random UUID support is required for roster launches.');
  return id;
}

export function buildRosterLaunchSetId(groupId: string, questId: string): string {
  return `${groupId}--${questId}`;
}

export function createRosterLaunch(
  input: {
    ownerId: string;
    groupId: string;
    questId: string;
    generationId: string;
    student: Pick<GroupStudent, 'id' | 'name'>;
  },
  nowMs = Date.now(),
  launchId = createOpaqueLaunchId(),
): RosterLaunch {
  return {
    id: launchId,
    setId: buildRosterLaunchSetId(input.groupId, input.questId),
    generationId: input.generationId,
    ownerId: input.ownerId,
    groupId: input.groupId,
    questId: input.questId,
    studentId: input.student.id,
    studentName: input.student.name,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + ROSTER_LAUNCH_LIFETIME_MS,
  };
}

/** Parse only the URL fragment so the bearer credential is not sent as referrer/query data. */
export function parseRosterLaunch(hash: string): RosterLaunchReference | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const launchId = new URLSearchParams(raw).get('launch')?.trim() ?? '';
  if (launchId.length < MIN_LAUNCH_ID_LENGTH || launchId.length > MAX_LAUNCH_ID_LENGTH) return null;
  return { launchId };
}

export function hasRosterLaunchReference(hash: string): boolean {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(raw).has('launch');
}

export function hasLegacyRosterLaunch(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has('student') || params.has('name');
}

export function rosterLaunchProblem(
  launch: RosterLaunch | null,
  questId: string,
  nowMs = Date.now(),
): RosterLaunchProblem | null {
  if (!launch) return 'missing';
  if (!Number.isSafeInteger(launch.issuedAtMs) || !Number.isSafeInteger(launch.expiresAtMs)) return 'malformed';
  if (launch.questId !== questId) return 'quest-mismatch';
  if (launch.expiresAtMs <= nowMs) return 'expired';
  return null;
}

export function buildRosterLaunchUrl(origin: string, questId: string, launchId: string): string {
  const fragment = new URLSearchParams({ launch: launchId });
  return `${origin.replace(/\/$/, '')}/play/${encodeURIComponent(questId)}#${fragment.toString()}`;
}
