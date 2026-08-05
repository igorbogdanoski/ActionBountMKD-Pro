import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import type { GroupStudent, RosterLaunch, RosterLaunchSet } from 'shared';
import { ROSTER_LAUNCH_LIFETIME_MS } from 'shared';
import { buildRosterLaunchSetId, createOpaqueLaunchId, createRosterLaunch } from '../lib/rosterLaunch';
import { db } from './firebase';

const ROSTER_LAUNCH_SETS = 'roster_launch_sets';
const ROSTER_LAUNCHES = 'roster_launches';

export async function getRosterLaunch(id: string): Promise<RosterLaunch | null> {
  const snap = await getDoc(doc(db, ROSTER_LAUNCHES, id));
  if (!snap.exists()) return null;
  return snap.data() as RosterLaunch;
}

export async function rotateRosterLaunches(input: {
  ownerId: string;
  groupId: string;
  questId: string;
  students: Pick<GroupStudent, 'id' | 'name'>[];
}, nowMs = Date.now()): Promise<RosterLaunch[]> {
  const generationId = createOpaqueLaunchId();
  const setId = buildRosterLaunchSetId(input.groupId, input.questId);
  const expiresAtMs = nowMs + ROSTER_LAUNCH_LIFETIME_MS;
  const launchSet: RosterLaunchSet = {
    id: setId,
    ownerId: input.ownerId,
    groupId: input.groupId,
    questId: input.questId,
    generationId,
    status: 'active',
    issuedAtMs: nowMs,
    expiresAtMs,
  };
  const launches = input.students.map(student => createRosterLaunch({
    ...input,
    generationId,
    student,
  }, nowMs));

  const batch = writeBatch(db);
  batch.set(doc(db, ROSTER_LAUNCH_SETS, setId), launchSet);
  launches.forEach(launch => batch.set(doc(db, ROSTER_LAUNCHES, launch.id), launch));
  await batch.commit();
  return launches;
}

export async function revokeRosterLaunches(
  groupId: string,
  questId: string,
  nowMs = Date.now(),
): Promise<void> {
  const setId = buildRosterLaunchSetId(groupId, questId);
  await updateDoc(doc(db, ROSTER_LAUNCH_SETS, setId), {
    status: 'revoked',
    revokedAtMs: nowMs,
  });
}
