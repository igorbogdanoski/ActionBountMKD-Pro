import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from 'shared';
import { db } from './firebaseDb';

const USER_PROFILES = 'user_profiles';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USER_PROFILES, uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, USER_PROFILES, profile.uid), {
    ...profile,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
