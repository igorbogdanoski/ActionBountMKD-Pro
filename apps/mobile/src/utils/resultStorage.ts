import { doc, writeBatch } from 'firebase/firestore';
import {
  RESULT_TELEMETRY_COLLECTION,
  RESULT_TELEMETRY_WRITES_PER_BATCH,
  splitQuestResultForStorage,
  type QuestResult,
} from 'shared';
import { db } from './firebase';

export type ResultWriteInput = Omit<QuestResult, 'id'>;

export async function saveQuestResultV2(result: ResultWriteInput): Promise<string> {
  if (!result.attemptId) throw new TypeError('attemptId is required for an idempotent result write');
  const full: QuestResult = { ...result, id: result.attemptId };
  const split = splitQuestResultForStorage(full);
  const parentBatch = writeBatch(db);
  parentBatch.set(doc(db, 'quest_results', result.attemptId), split.document);
  await parentBatch.commit();
  for (let offset = 0; offset < split.telemetry.length; offset += RESULT_TELEMETRY_WRITES_PER_BATCH) {
    const batch = writeBatch(db);
    for (const telemetry of split.telemetry.slice(offset, offset + RESULT_TELEMETRY_WRITES_PER_BATCH)) {
      batch.set(doc(db, RESULT_TELEMETRY_COLLECTION, telemetry.id), telemetry.data);
    }
    await batch.commit();
  }
  return result.attemptId;
}
