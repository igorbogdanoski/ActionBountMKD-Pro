import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  increment,
  deleteField,
  writeBatch,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { cacheQuestLocally } from './offlineQueue';
import {
  hydrateQuestResult,
  hydrateQuestFromStageStorage,
  questStageDocumentId,
  questSummaryFromStorage,
  QUEST_STAGE_SCHEMA_VERSION,
  QUEST_STAGES_COLLECTION,
  RESULT_TELEMETRY_COLLECTION,
  RESULT_TELEMETRY_WRITES_PER_BATCH,
  splitQuestResultForStorage,
  type ClassGroup,
  type Quest,
  type QuestStageDocument,
  type QuestSummary,
  type QuestFeedback,
  type QuestResult,
  type ResultTelemetryChunk,
  type RubricGrade,
  type Template,
  type UserSettings,
  splitQuestForStageStorage,
} from 'shared';

// ─── QUESTS ──────────────────────────────────────────────────────────────────

const QUESTS = 'quests';
const RESULTS = 'quest_results';
const FEEDBACK = 'quest_feedback';
const USER_SETTINGS = 'user_settings';
const TEMPLATES = 'templates';
const CLASS_GROUPS = 'class_groups';

// Enterprise plans have no maxQuests cap (see PLAN_LIMITS), so this query is
// otherwise unbounded — a hard ceiling keeps one large account's dashboard
// load from growing latency/cost without limit, same pattern already used
// below for templates (getPublicTemplates/getPendingTemplates).
const MAX_OWN_QUESTS = 500;

function makeStageRevision(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
}

function stageQueryForQuest(questId: string, creatorId: string) {
  // Rules must prove ownership from the query, including before a new parent exists.
  return query(collection(db, QUEST_STAGES_COLLECTION), where('questId', '==', questId), where('creatorId', '==', creatorId));
}

function hydrateQuestSafely(
  document: Record<string, unknown>,
  stageDocuments: QuestStageDocument[],
): Quest | null {
  try {
    return hydrateQuestFromStageStorage(document, stageDocuments);
  } catch (error) {
    console.error(`[QuestStorage] Invalid or incomplete quest ${String(document.id ?? 'unknown')}`, error);
    return null;
  }
}

export async function getQuests(creatorId: string): Promise<Quest[]> {
  const q = query(collection(db, QUESTS), where('creatorId', '==', creatorId), limit(MAX_OWN_QUESTS));
  const stagesQuery = query(collection(db, QUEST_STAGES_COLLECTION), where('creatorId', '==', creatorId));
  const [snap, stageSnap] = await Promise.all([getDocs(q), getDocs(stagesQuery)]);
  const allStages = stageSnap.docs.map(stageDoc => stageDoc.data() as QuestStageDocument);
  return snap.docs.flatMap(questDoc => {
    const data = questDoc.data() as Record<string, unknown>;
    const questStages = data.stageSchemaVersion === QUEST_STAGE_SCHEMA_VERSION
      ? allStages.filter(stage => stage.questId === data.id)
      : [];
    const hydrated = hydrateQuestSafely(data, questStages);
    return hydrated ? [hydrated] : [];
  });
}

export async function getPublicQuests(pageSize = 20, after?: QueryDocumentSnapshot): Promise<QuestSummary[]> {
  const constraints = [
    where('visibility', '==', 'public'),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
    ...(after ? [startAfter(after)] : []),
  ];
  const q = query(collection(db, QUESTS), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.flatMap(questDoc => {
    try {
      return [questSummaryFromStorage(questDoc.data() as Record<string, unknown>)];
    } catch (error) {
      console.error(`[QuestStorage] Invalid public quest summary ${questDoc.id}`, error);
      return [];
    }
  });
}

export async function getQuestById(id: string): Promise<Quest | null> {
  const snap = await getDoc(doc(db, QUESTS, id));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const stageDocuments = data.stageSchemaVersion === QUEST_STAGE_SCHEMA_VERSION
    ? (await getDocs(stageQueryForQuest(id, data.creatorId as string))).docs.map(stageDoc => stageDoc.data() as QuestStageDocument)
    : [];
  return hydrateQuestSafely(data, stageDocuments);
}

export async function saveQuest(quest: Quest): Promise<void> {
  const now = new Date().toISOString();
  const persistedQuest = {
    ...quest,
    updatedAt: now,
    createdAt: quest.createdAt ?? now,
  };
  const split = splitQuestForStageStorage(persistedQuest, makeStageRevision());
  const existing = await getDocs(stageQueryForQuest(quest.id, quest.creatorId));
  const nextIds = new Set(split.stages.map(stage => questStageDocumentId(quest.id, stage.id)));
  const batch = writeBatch(db);
  batch.set(doc(db, QUESTS, quest.id), split.document);
  for (const stage of split.stages) {
    batch.set(doc(db, QUEST_STAGES_COLLECTION, questStageDocumentId(quest.id, stage.id)), stage);
  }
  for (const existingStage of existing.docs) {
    if (!nextIds.has(existingStage.id)) batch.delete(existingStage.ref);
  }
  await batch.commit();
}

export async function deleteQuest(id: string): Promise<void> {
  const parent = await getDoc(doc(db, QUESTS, id));
  if (!parent.exists()) return;
  const existing = await getDocs(stageQueryForQuest(id, parent.data().creatorId));
  const batch = writeBatch(db);
  for (const stage of existing.docs) batch.delete(stage.ref);
  batch.delete(doc(db, QUESTS, id));
  await batch.commit();
}

// ─── QUEST RESULTS ────────────────────────────────────────────────────────────

export async function saveQuestResult(result: Omit<QuestResult, 'id'>): Promise<string> {
  if (!result.attemptId) throw new TypeError('attemptId is required for an idempotent result write');
  const ref = doc(db, RESULTS, result.attemptId);
  const full: QuestResult = { ...result, id: ref.id };
  const split = splitQuestResultForStorage(full);
  const parentBatch = writeBatch(db);
  parentBatch.set(ref, split.document);
  await parentBatch.commit();
  for (let offset = 0; offset < split.telemetry.length; offset += RESULT_TELEMETRY_WRITES_PER_BATCH) {
    const batch = writeBatch(db);
    for (const telemetry of split.telemetry.slice(offset, offset + RESULT_TELEMETRY_WRITES_PER_BATCH)) {
      batch.set(doc(db, RESULT_TELEMETRY_COLLECTION, telemetry.id), telemetry.data);
    }
    await batch.commit();
  }
  return ref.id;
}

export async function getQuestResults(questId: string): Promise<QuestResult[]> {
  const [resultSnap, telemetrySnap] = await Promise.all([
    getDocs(query(collection(db, RESULTS), where('questId', '==', questId))),
    getDocs(query(collection(db, RESULT_TELEMETRY_COLLECTION), where('questId', '==', questId))),
  ]);
  const chunksByResult = new Map<string, ResultTelemetryChunk[]>();
  for (const telemetryDoc of telemetrySnap.docs) {
    const chunk = telemetryDoc.data() as ResultTelemetryChunk;
    const current = chunksByResult.get(chunk.resultId) ?? [];
    current.push(chunk);
    chunksByResult.set(chunk.resultId, current);
  }
  return resultSnap.docs.flatMap(resultDoc => {
    const result = resultDoc.data() as QuestResult;
    try {
      return [hydrateQuestResult(result, chunksByResult.get(result.id) ?? [])];
    } catch (error) {
      console.error(`[ResultStorage] Incomplete telemetry for ${result.id}`, error);
      return [];
    }
  });
}

/**
 * Records the teacher's rubric grade for one stage submission and recomputes
 * the result's total points. Only touches `grades`/`points` — matches the
 * Firestore rule, which denies any other field on this update.
 */
export async function gradeSubmission(result: QuestResult, grade: RubricGrade): Promise<void> {
  const otherGrades = (result.grades ?? []).filter(g => g.stageId !== grade.stageId);
  const grades = [...otherGrades, grade];
  const bonus = grades.reduce((sum, g) => sum + g.totalPoints, 0);
  const previousBonus = (result.grades ?? []).reduce((sum, g) => sum + g.totalPoints, 0);
  const points = result.points - previousBonus + bonus;
  await updateDoc(doc(db, RESULTS, result.id), { grades, points });
}

export type ResultApproval = Pick<QuestResult, 'approvedAt' | 'approvedBy'>;

/**
 * Approves or revokes one immutable attempt. Firestore rules bind approvals
 * to the authenticated quest owner and permit no fields beyond this pair.
 */
export async function setResultApproval(
  resultId: string,
  teacherId: string,
  approved: boolean,
): Promise<ResultApproval> {
  if (approved) {
    const approval = {
      approvedAt: new Date().toISOString(),
      approvedBy: teacherId,
    };
    await updateDoc(doc(db, RESULTS, resultId), approval);
    return approval;
  }

  await updateDoc(doc(db, RESULTS, resultId), {
    approvedAt: deleteField(),
    approvedBy: deleteField(),
  });
  return { approvedAt: undefined, approvedBy: undefined };
}

export async function getPublicQuestResults(questId: string, pageSize = 20): Promise<QuestResult[]> {
  // Single equality filter — sort client-side to avoid composite index
  const q = query(collection(db, RESULTS), where('questId', '==', questId), limit(pageSize * 3));
  const snap = await getDocs(q);
  const results = snap.docs.map(d => d.data() as QuestResult);
  results.sort((a, b) => b.points - a.points);
  return results.slice(0, pageSize);
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────────

export interface TemplateFilters {
  subject?: string;
  grade?: string;
  difficulty?: string;
  isPro?: boolean;
}

export async function getPublicTemplates(filters?: TemplateFilters): Promise<Template[]> {
  // Single equality filter + limit — no composite index needed; sort client-side
  const q = query(collection(db, TEMPLATES), where('status', '==', 'approved'), limit(100));
  const snap = await getDocs(q);
  let results = snap.docs.map(d => d.data() as Template);
  if (filters?.subject) results = results.filter(t => t.subject === filters.subject);
  if (filters?.grade)   results = results.filter(t => t.grade === filters.grade);
  // Sort: featured first, then by usageCount
  results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0) || b.usageCount - a.usageCount);
  return results;
}

export async function getPendingTemplates(): Promise<Template[]> {
  // Single equality filter — no composite index needed; sort client-side
  const q = query(collection(db, TEMPLATES), where('status', '==', 'pending'), limit(100));
  const snap = await getDocs(q);
  const results = snap.docs.map(d => d.data() as Template);
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
}

/** Admin moderation needs pending submissions plus already-approved templates
 * whose Featured status can still be managed. Keep the public and pending-only
 * queries unchanged for their narrower consumers. */
export async function getAdminTemplates(): Promise<Template[]> {
  const templates = collection(db, TEMPLATES);
  const [pendingSnap, approvedSnap] = await Promise.all([
    getDocs(query(templates, where('status', '==', 'pending'), limit(100))),
    getDocs(query(templates, where('status', '==', 'approved'), limit(100))),
  ]);
  const results = [...pendingSnap.docs, ...approvedSnap.docs].map(d => d.data() as Template);
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return results;
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

export async function getUserSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db, USER_SETTINGS, uid));
  if (!snap.exists()) return null;
  return snap.data() as UserSettings;
}

// ─── CLASS GROUPS (Phase 7D-3) ────────────────────────────────────────────────

const MAX_OWN_GROUPS = 300;

export async function getGroups(ownerId: string): Promise<ClassGroup[]> {
  const q = query(collection(db, CLASS_GROUPS), where('ownerId', '==', ownerId), limit(MAX_OWN_GROUPS));
  const snap = await getDocs(q);
  const groups = snap.docs.map(d => d.data() as ClassGroup);
  groups.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return groups;
}

export async function saveGroup(group: ClassGroup): Promise<void> {
  await setDoc(doc(db, CLASS_GROUPS, group.id), {
    ...group,
    updatedAt: new Date().toISOString(),
    createdAt: group.createdAt ?? new Date().toISOString(),
  }, { merge: true });
}

export async function deleteGroup(id: string): Promise<void> {
  await deleteDoc(doc(db, CLASS_GROUPS, id));
}

// ─── OFFLINE: re-export localStorage helpers from offlineQueue ───────────────
// Keeps all storage concerns importable from one place.
export {
  cacheQuestLocally,
  getCachedQuest,
  clearCachedQuest,
  isCachedLocally,
  saveOfflineResult,
  getOfflineQueue,
  offlineQueueSize,
} from './offlineQueue';

// ─── OFFLINE MEDIA CACHE (Service Worker) ─────────────────────────────────────

// Shared with public/sw.js — keep names in sync.
const MEDIA_CACHE = 'av-media-v2';

export async function cacheQuestResources(quest: Quest): Promise<void> {
  // 1. Persist quest JSON so it can be loaded offline by MobilePlayer.
  cacheQuestLocally(quest);

  // 2. Warm the Service Worker media cache (same name the SW serves from).
  if (!('caches' in window)) return;
  const cache = await caches.open(MEDIA_CACHE);

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
