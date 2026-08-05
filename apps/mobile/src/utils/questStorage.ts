import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import {
  hydrateQuestFromStageStorage,
  QUEST_STAGE_SCHEMA_VERSION,
  QUEST_STAGES_COLLECTION,
  type Quest,
} from 'shared';
import { db } from './firebase';

export async function getQuestById(questId: string): Promise<Quest | null> {
  const snapshot = await getDoc(doc(db, 'quests', questId));
  if (!snapshot.exists()) return null;
  const document = { id: snapshot.id, ...snapshot.data() } as Record<string, unknown>;
  const stageDocuments = document.stageSchemaVersion === QUEST_STAGE_SCHEMA_VERSION
    ? (await getDocs(query(
      collection(db, QUEST_STAGES_COLLECTION),
      where('questId', '==', questId),
    ))).docs.map(stage => stage.data())
    : [];
  return hydrateQuestFromStageStorage(document, stageDocuments);
}
