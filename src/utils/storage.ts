import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Quest, QuestResult, QuestFeedback, UserSettings, UserProfile, Template } from '../types';

// ─── QUESTS ──────────────────────────────────────────────────────────────────

const QUESTS = 'quests';
const RESULTS = 'quest_results';
const FEEDBACK = 'quest_feedback';
const USER_SETTINGS = 'user_settings';
const USER_PROFILES = 'user_profiles';
const TEMPLATES = 'templates';

export async function getQuests(creatorId: string): Promise<Quest[]> {
  const q = query(collection(db, QUESTS), where('creatorId', '==', creatorId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Quest);
}

export async function getPublicQuests(pageSize = 20, after?: QueryDocumentSnapshot): Promise<Quest[]> {
  const constraints = [
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
    ...(after ? [startAfter(after)] : []),
  ];
  const q = query(collection(db, QUESTS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Quest);
}

export async function getQuestById(id: string): Promise<Quest | null> {
  const snap = await getDoc(doc(db, QUESTS, id));
  if (!snap.exists()) return null;
  return snap.data() as Quest;
}

export async function saveQuest(quest: Quest): Promise<void> {
  await setDoc(doc(db, QUESTS, quest.id), {
    ...quest,
    updatedAt: new Date().toISOString(),
    createdAt: quest.createdAt ?? new Date().toISOString(),
  }, { merge: true });
}

export async function deleteQuest(id: string): Promise<void> {
  await deleteDoc(doc(db, QUESTS, id));
}

// ─── QUEST RESULTS ────────────────────────────────────────────────────────────

export async function saveQuestResult(result: Omit<QuestResult, 'id'>): Promise<string> {
  const ref = doc(collection(db, RESULTS));
  const full: QuestResult = { ...result, id: ref.id };
  await setDoc(ref, full);
  return ref.id;
}

export async function getQuestResults(questId?: string): Promise<QuestResult[]> {
  const q = questId
    ? query(collection(db, RESULTS), where('questId', '==', questId))
    : query(collection(db, RESULTS), orderBy('completedAt', 'desc'), limit(200));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as QuestResult);
}

export async function getPublicQuestResults(questId: string, pageSize = 20): Promise<QuestResult[]> {
  const q = query(
    collection(db, RESULTS),
    where('questId', '==', questId),
    orderBy('points', 'desc'),
    limit(pageSize),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as QuestResult);
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

export interface TemplateFilters {
  subject?: string;
  grade?: string;
  difficulty?: string;
  isPro?: boolean;
}

export async function getPublicTemplates(filters?: TemplateFilters): Promise<Template[]> {
  const constraints: Parameters<typeof query>[1][] = [
    where('isPublic', '==', true),
    where('status', '==', 'approved'),
    orderBy('isFeatured', 'desc'),
    orderBy('usageCount', 'desc'),
    limit(50),
  ];
  if (filters?.subject) constraints.push(where('subject', '==', filters.subject));
  if (filters?.grade)   constraints.push(where('grade', '==', filters.grade));
  const q = query(collection(db, TEMPLATES), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Template);
}

export async function getPendingTemplates(): Promise<Template[]> {
  const q = query(collection(db, TEMPLATES), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Template);
}

export async function saveTemplate(template: Template): Promise<void> {
  await setDoc(doc(db, TEMPLATES, template.id), {
    ...template,
    updatedAt: new Date().toISOString(),
    createdAt: template.createdAt ?? new Date().toISOString(),
  }, { merge: true });
}

export async function deleteTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, TEMPLATES, id));
}

export async function incrementTemplateUsage(id: string): Promise<void> {
  await setDoc(doc(db, TEMPLATES, id), { usageCount: increment(1) }, { merge: true });
}

// ─── QUEST FEEDBACK ───────────────────────────────────────────────────────────

export async function submitQuestFeedback(
  questId: string,
  playerName: string,
  comment: string,
  points: number,
): Promise<void> {
  const ref = doc(collection(db, FEEDBACK));
  const feedback: QuestFeedback = {
    id: ref.id,
    questId,
    playerName,
    comment,
    points,
    createdAt: new Date().toISOString(),
  };
  await setDoc(ref, feedback);
}

// ─── USER SETTINGS ────────────────────────────────────────────────────────────

export async function saveUserTheme(uid: string, theme: UserSettings['theme']): Promise<void> {
  await setDoc(
    doc(db, USER_SETTINGS, uid),
    { theme, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

export async function getUserTheme(uid: string): Promise<UserSettings['theme']> {
  const snap = await getDoc(doc(db, USER_SETTINGS, uid));
  if (snap.exists()) return (snap.data() as UserSettings).theme;
  return 'dark';
}

// ─── USER PROFILES ────────────────────────────────────────────────────────────

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

// ─── OFFLINE MEDIA CACHE (Service Worker) ─────────────────────────────────────

export async function cacheQuestResources(quest: Quest): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(`avanturakreator-quest-${quest.id}`);

  const urls: string[] = quest.stages.flatMap(stage => {
    const u: string[] = [];
    if ('mediaUrl' in stage && stage.mediaUrl) u.push(stage.mediaUrl);
    if (stage.audioUrl) u.push(stage.audioUrl);
    return u;
  });

  const unique = [...new Set(urls)].filter(
    u => u.startsWith('http') && !u.includes('youtube.com'),
  );

  await Promise.allSettled(unique.map(u => cache.add(u)));
}
