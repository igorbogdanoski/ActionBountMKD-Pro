import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertEmulatorOnlyEnvironment,
  migrationRevision,
  parseMigrationArgs,
  planLegacyQuest,
} from './migrate-quest-stages.mjs';

const legacyQuest = {
  creatorId: 'owner-migration',
  title: 'Миграциска авантура',
  description: 'Локален fixture',
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

test('migration revision is deterministic and content-addressed', () => {
  const first = migrationRevision('quest-1', legacyQuest.stages);
  const second = migrationRevision('quest-1', JSON.parse(JSON.stringify(legacyQuest.stages)));
  assert.equal(first, second);
  assert.match(first, /^migration-v2-[a-f0-9]{40}$/);
  assert.notEqual(first, migrationRevision('quest-1', legacyQuest.stages.slice(0, 1)));
});

test('legacy plan strips inline and obsolete storage fields', () => {
  const plan = planLegacyQuest('quest-1', legacyQuest);
  assert.equal(plan.document.stageSchemaVersion, 2);
  assert.equal(plan.document.stageCount, 2);
  assert.equal('stages' in plan.document, false);
  assert.equal('isPublic' in plan.document, false);
  assert.equal(plan.stages[0].questId, 'quest-1');
  assert.equal(plan.stages[0].creatorId, legacyQuest.creatorId);
  assert.equal(plan.stages[0].stageRevision, plan.document.stageRevision);
});

test('legacy plan fails closed on non-contiguous or unknown stages', () => {
  assert.throws(() => planLegacyQuest('quest-1', {
    ...legacyQuest,
    stages: [{ id: 'bad', type: 'UNKNOWN', title: '', description: '', order: 0 }],
  }), /Invalid quest stage/);
  assert.throws(() => planLegacyQuest('quest-1', {
    ...legacyQuest,
    stages: [{ ...legacyQuest.stages[0], order: 2 }],
  }), /contiguous/);
});

test('CLI parser is dry-run by default and emulator-project restricted', () => {
  assert.deepEqual(parseMigrationArgs(['--project', 'demo-actionbountmkd-migration']), {
    apply: false,
    projectId: 'demo-actionbountmkd-migration',
    questId: '',
  });
  assert.equal(parseMigrationArgs(['--project=demo-actionbountmkd-migration', '--apply', '--quest=quest-1']).apply, true);
  assert.throws(() => parseMigrationArgs(['--project', 'production-project']), /restricted/);
  assert.throws(() => parseMigrationArgs(['--project', 'demo-safe', '--quest', 'nested/id']), /document ID/);
});

test('CLI environment guard blocks every non-emulator invocation', () => {
  assert.throws(() => assertEmulatorOnlyEnvironment({}), /cannot connect to production/);
  assert.doesNotThrow(() => assertEmulatorOnlyEnvironment({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8185' }));
});
