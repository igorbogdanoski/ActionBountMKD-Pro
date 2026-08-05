import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { hydrateQuestFromStageStorage } from '../../packages/shared/questStageStorage.ts';
import { runQuestStageMigration } from '../../scripts/migrate-quest-stages.mjs';

const PROJECT_ID = 'demo-actionbountmkd-quest-migration';
const QUEST_ID = 'legacy-quest';
const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
const db = getFirestore(app);

const legacyQuest = {
  id: QUEST_ID,
  creatorId: 'owner-migration',
  title: 'Миграциска авантура',
  description: 'Локален emulator dry-run',
  visibility: 'public',
  playMode: 'singleplayer',
  sequence: 'fixed',
  isPublic: true,
  createdAt: '2026-08-05T10:00:00.000Z',
  updatedAt: '2026-08-05T10:00:00.000Z',
  stages: [
    { id: 'intro', type: 'INFO', title: 'Почеток', description: 'Добредојде', order: 0 },
    { id: 'quiz', type: 'QUIZ', title: 'Прашање', description: 'Одговори', order: 1, questionType: 'multiple_choice', options: ['1', '2'], correctAnswer: '2' },
  ],
};

await db.collection('quests').doc(QUEST_ID).set(legacyQuest);

const dryRun = await runQuestStageMigration(db, { apply: false });
assert.equal(dryRun.scanned, 1);
assert.equal(dryRun.legacyReady, 1);
assert.equal(dryRun.migrated, 0);
assert.equal((await db.collection('quests').doc(QUEST_ID).get()).data().stages.length, 2);

const applied = await runQuestStageMigration(db, { apply: true });
assert.equal(applied.legacyReady, 1);
assert.equal(applied.migrated, 1);

const parent = (await db.collection('quests').doc(QUEST_ID).get()).data();
const stageSnapshot = await db.collection('quest_stages').where('questId', '==', QUEST_ID).get();
assert.equal(parent.stageSchemaVersion, 2);
assert.equal(parent.stageCount, 2);
assert.equal('stages' in parent, false);
assert.equal('isPublic' in parent, false);
assert.equal(stageSnapshot.size, 2);
const hydrated = hydrateQuestFromStageStorage(parent, stageSnapshot.docs.map(document => document.data()));
assert.deepEqual(hydrated.stages.map(stage => stage.id), ['intro', 'quiz']);

const repeated = await runQuestStageMigration(db, { apply: false });
assert.equal(repeated.v2Valid, 1);
assert.equal(repeated.legacyReady, 0);
assert.equal(repeated.invalid, 0);
assert.equal(repeated.conflicts, 0);

console.log('Quest-stage migration drill PASS: dry-run 1/1, apply 1/1, repeat verification 1/1.');
