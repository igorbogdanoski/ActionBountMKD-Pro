import { after, afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

const PROJECT_ID = 'actionbountmkd-rules-test';
const OWNER_ID = 'teacher-1';
const GROUP_ID = 'group-1';
const QUEST_ID = 'quest-1';
const SET_ID = `${GROUP_ID}--${QUEST_ID}`;
const LAUNCH_ID = '12345678-1234-4234-8234-123456789abc';
const PROGRESS_CHUNK_IDS = Array.from({ length: 34 }, (_, index) => String(index));
const SUBMISSION_CHUNK_IDS = Array.from({ length: 30 }, (_, index) => String(index));
const rules = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8');
const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { rules },
});

afterEach(() => testEnv.clearFirestore());
after(() => testEnv.cleanup());

function ownerFirestore() {
  return testEnv.authenticatedContext(OWNER_ID, {
    email: 'teacher@example.test',
  }).firestore();
}

function adminFirestore() {
  return testEnv.authenticatedContext('admin-1', {
    email: 'admin@example.test',
    admin: true,
  }).firestore();
}

function validDeletionRequest(overrides = {}) {
  return {
    userId: OWNER_ID,
    email: 'teacher@example.test',
    status: 'pending',
    requestedAt: '2026-08-04T10:00:00.000Z',
    updatedAt: '2026-08-04T10:00:00.000Z',
    ...overrides,
  };
}

function validQuest(overrides = {}) {
  return {
    id: 'quest-1',
    creatorId: OWNER_ID,
    title: 'Безбедна авантура',
    visibility: 'secret',
    playMode: 'singleplayer',
    sequence: 'fixed',
    stageSchemaVersion: 2,
    stageRevision: 'revision-0000000000000001',
    stageCount: 0,
    createdAt: '2026-08-04T10:00:00.000Z',
    updatedAt: '2026-08-04T10:00:00.000Z',
    ...overrides,
  };
}

function validStage(overrides = {}) {
  return {
    id: 'stage-1',
    questId: QUEST_ID,
    creatorId: OWNER_ID,
    stageRevision: 'revision-0000000000000001',
    type: 'INFO',
    title: '',
    description: '',
    order: 0,
    points: 10,
    mediaType: 'none',
    ...overrides,
  };
}

function questStageBatch(stages, questOverrides = {}, firestore = ownerFirestore()) {
  const revision = questOverrides.stageRevision ?? 'revision-0000000000000001';
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'quests', QUEST_ID), validQuest({
    stageRevision: revision,
    stageCount: stages.length,
    ...questOverrides,
  }));
  for (const stage of stages) {
    const value = Object.fromEntries(Object.entries(
      { ...stage, stageRevision: stage.stageRevision ?? revision },
    ).filter(([, candidate]) => candidate !== undefined));
    batch.set(doc(firestore, 'quest_stages', `${QUEST_ID}__${value.id}`), value);
  }
  return batch;
}

function validResult(overrides = {}) {
  return {
    questId: 'quest-1',
    playerName: 'Ученик',
    points: 100,
    completedAt: '2026-08-04T10:00:00.000Z',
    ...overrides,
  };
}

function validGroup(overrides = {}) {
  return {
    id: GROUP_ID,
    ownerId: OWNER_ID,
    name: '8-А',
    students: [{ id: 'student-1', name: 'Ана' }],
    assignedQuestIds: [QUEST_ID],
    createdAt: '2026-08-04T10:00:00.000Z',
    updatedAt: '2026-08-04T10:00:00.000Z',
    ...overrides,
  };
}

function validLaunchSet(nowMs = Date.now(), overrides = {}) {
  return {
    id: SET_ID,
    ownerId: OWNER_ID,
    groupId: GROUP_ID,
    questId: QUEST_ID,
    generationId: 'generation-1',
    status: 'active',
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + 30 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

function validLaunch(nowMs = Date.now(), overrides = {}) {
  return {
    id: LAUNCH_ID,
    setId: SET_ID,
    generationId: 'generation-1',
    ownerId: OWNER_ID,
    groupId: GROUP_ID,
    questId: QUEST_ID,
    studentId: 'student-1',
    studentName: 'Ана',
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + 30 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

function writeQuest(id, value) {
  return setDoc(doc(ownerFirestore(), 'quests', id), value);
}

function writeResult(id, value) {
  return setDoc(doc(testEnv.unauthenticatedContext().firestore(), 'quest_results', id), {
    id,
    attemptId: id,
    schemaVersion: 2,
    stageDurationCount: 0,
    submissionCount: 0,
    quizAnswerCount: 0,
    ...value,
  });
}

function resultBatch(id, value, firestore = testEnv.unauthenticatedContext().firestore()) {
  const {
    stageDurations = [],
    submissions = [],
    quizAnswers = [],
    ...summary
  } = value;
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'quest_results', id), {
    id,
    attemptId: id,
    schemaVersion: 2,
    stageDurationCount: stageDurations.length,
    submissionCount: submissions.length,
    quizAnswerCount: quizAnswers.length,
    ...summary,
  });

  const progressChunkCount = Math.max(
    Math.ceil(stageDurations.length / 3),
    Math.ceil(quizAnswers.length / 3),
  );
  for (let index = 0; index < progressChunkCount; index++) {
    const chunkId = PROGRESS_CHUNK_IDS[index];
    batch.set(doc(firestore, 'quest_result_telemetry', `${id}__progress__${chunkId}`), {
      resultId: id,
      questId: value.questId,
      kind: 'progress',
      chunkId,
      chunkIndex: index,
      stageDurations: stageDurations.slice(index * 3, index * 3 + 3),
      quizAnswers: quizAnswers.slice(index * 3, index * 3 + 3),
    });
  }
  for (let index = 0; index < submissions.length; index++) {
    const chunkId = SUBMISSION_CHUNK_IDS[index];
    batch.set(doc(firestore, 'quest_result_telemetry', `${id}__submissions__${chunkId}`), {
      resultId: id,
      questId: value.questId,
      kind: 'submissions',
      chunkId,
      chunkIndex: index,
      submissions: submissions.slice(index, index + 1),
    });
  }
  return batch;
}

async function writeResultInBoundedBatches(id, value) {
  const {
    stageDurations = [],
    submissions = [],
    quizAnswers = [],
    ...summary
  } = value;
  await assertSucceeds(writeResult(id, {
    ...summary,
    stageDurationCount: stageDurations.length,
    submissionCount: submissions.length,
    quizAnswerCount: quizAnswers.length,
  }));

  const firestore = testEnv.unauthenticatedContext().firestore();
  const writes = [];
  const progressChunkCount = Math.max(
    Math.ceil(stageDurations.length / 3),
    Math.ceil(quizAnswers.length / 3),
  );
  for (let index = 0; index < progressChunkCount; index++) {
    const chunkId = PROGRESS_CHUNK_IDS[index];
    writes.push({
      id: `${id}__progress__${chunkId}`,
      data: {
        resultId: id,
        questId: value.questId,
        kind: 'progress',
        chunkId,
        chunkIndex: index,
        stageDurations: stageDurations.slice(index * 3, index * 3 + 3),
        quizAnswers: quizAnswers.slice(index * 3, index * 3 + 3),
      },
    });
  }
  for (let index = 0; index < submissions.length; index++) {
    const chunkId = SUBMISSION_CHUNK_IDS[index];
    writes.push({
      id: `${id}__submissions__${chunkId}`,
      data: {
        resultId: id,
        questId: value.questId,
        kind: 'submissions',
        chunkId,
        chunkIndex: index,
        submissions: submissions.slice(index, index + 1),
      },
    });
  }
  for (let offset = 0; offset < writes.length; offset += 1) {
    const batch = writeBatch(firestore);
    for (const write of writes.slice(offset, offset + 1)) {
      batch.set(doc(firestore, 'quest_result_telemetry', write.id), write.data);
    }
    try {
      await assertSucceeds(batch.commit());
    } catch (error) {
      throw new Error(`bounded telemetry batch failed at offset ${offset}`, { cause: error });
    }
  }
}

async function seedRosterLaunch(overrides = {}) {
  const nowMs = Date.now();
  const ownerDb = ownerFirestore();
  await assertSucceeds(setDoc(doc(ownerDb, 'quests', QUEST_ID), validQuest()));
  await assertSucceeds(setDoc(doc(ownerDb, 'class_groups', GROUP_ID), validGroup()));

  const batch = writeBatch(ownerDb);
  batch.set(doc(ownerDb, 'roster_launch_sets', SET_ID), validLaunchSet(nowMs, overrides.launchSet));
  batch.set(doc(ownerDb, 'roster_launches', LAUNCH_ID), validLaunch(nowMs, overrides.launch));
  await assertSucceeds(batch.commit());
}

describe('quest nested bounds', () => {
  test('rejects new legacy writes while existing legacy quests remain owner-readable', async () => {
    const legacy = {
      id: 'legacy', creatorId: OWNER_ID, title: 'Legacy', visibility: 'secret',
      playMode: 'singleplayer', sequence: 'fixed', stages: [],
      createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
    };
    await assertFails(writeQuest('legacy', legacy));
    await testEnv.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), 'quests', 'legacy'), legacy));
    await assertSucceeds(getDoc(doc(ownerFirestore(), 'quests', 'legacy')));
  });

  test('accepts all ten tags at their maximum bound', async () => {
    await assertSucceeds(writeQuest('bounded-tags', validQuest({
      id: 'bounded-tags',
      tags: Array.from({ length: 10 }, () => 'Т'.repeat(30)),
    })));
  });

  test('accepts all twelve learning goals at their maximum bound', async () => {
    await assertSucceeds(writeQuest('bounded-goals', validQuest({
      id: 'bounded-goals',
      pedagogy: {
        subject: 'Математика',
        grade: '8 одд.',
        curriculumRef: 'К'.repeat(120),
        learningGoals: Array.from({ length: 12 }, (_, index) => `${index}-${'Ц'.repeat(197)}`),
      },
    })));
  });

  test('accepts all twelve learning objectives at their maximum bound', async () => {
    await assertSucceeds(writeQuest('bounded-objectives', validQuest({
      id: 'bounded-objectives',
      pedagogy: {
        learningObjectives: Array.from({ length: 12 }, (_, index) => ({
          id: `objective-${index}`,
          label: `${index}-${'О'.repeat(197)}`,
        })),
      },
    })));
  });

  test('accepts the combined maximum nested quest contract', async () => {
    await assertSucceeds(writeQuest('bounded-combined', validQuest({
      id: 'bounded-combined',
      tags: Array.from({ length: 10 }, () => 'Т'.repeat(30)),
      pedagogy: {
        subject: 'Математика',
        grade: '8 одд.',
        curriculumRef: 'К'.repeat(120),
        learningGoals: Array.from({ length: 6 }, () => 'Ц'.repeat(200)),
        learningObjectives: Array.from({ length: 6 }, (_, index) => ({
          id: `objective-${index}`,
          label: 'О'.repeat(200),
        })),
      },
    })));
  });

  test('rejects more than twelve combined legacy and stable objectives', async () => {
    await assertFails(writeQuest('too-many-combined-objectives', validQuest({
      id: 'too-many-combined-objectives',
      pedagogy: {
        learningGoals: ['Legacy goal'],
        learningObjectives: Array.from({ length: 12 }, (_, index) => ({
          id: `objective-${index}`,
          label: `Objective ${index}`,
        })),
      },
    })));
  });

  test('rejects too many tags and invalid values in the last allowed slot', async () => {
    await assertFails(writeQuest('too-many-tags', validQuest({
      id: 'too-many-tags',
      tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`),
    })));
    await assertFails(writeQuest('long-last-tag', validQuest({
      id: 'long-last-tag',
      tags: [...Array.from({ length: 9 }, (_, index) => `tag-${index}`), 'x'.repeat(31)],
    })));
    await assertFails(writeQuest('non-string-tag', validQuest({
      id: 'non-string-tag',
      tags: ['valid', 42],
    })));
  });

  test('rejects an untitled quest, which is the state every new adventure starts in', async () => {
    await assertFails(writeQuest('no-title', validQuest({ id: 'no-title', title: '' })));
    await assertFails(writeQuest('long-title', validQuest({ id: 'long-title', title: 'x'.repeat(201) })));
    await assertSucceeds(writeQuest('one-char-title', validQuest({ id: 'one-char-title', title: 'A' })));
  });

  test('rejects malformed pedagogy maps and overlong curriculum references', async () => {
    await assertFails(writeQuest('bad-pedagogy', validQuest({
      id: 'bad-pedagogy',
      pedagogy: 'not-a-map',
    })));
    await assertFails(writeQuest('long-curriculum', validQuest({
      id: 'long-curriculum',
      pedagogy: { curriculumRef: 'x'.repeat(121) },
    })));
  });

  test('rejects invalid goals and objectives at the last allowed slot', async () => {
    const validGoals = Array.from({ length: 11 }, (_, index) => `goal-${index}`);
    const validObjectives = Array.from({ length: 11 }, (_, index) => ({
      id: `objective-${index}`,
      label: `Objective ${index}`,
    }));

    await assertFails(writeQuest('long-last-goal', validQuest({
      id: 'long-last-goal',
      pedagogy: { learningGoals: [...validGoals, 'x'.repeat(201)] },
    })));
    await assertFails(writeQuest('bad-last-objective', validQuest({
      id: 'bad-last-objective',
      pedagogy: {
        learningObjectives: [...validObjectives, { id: 'x'.repeat(65), label: 'Valid label' }],
      },
    })));
    await assertFails(writeQuest('objective-missing-label', validQuest({
      id: 'objective-missing-label',
      pedagogy: { learningObjectives: [{ id: 'objective-1' }] },
    })));
  });
});

describe('quest stage schema v2', () => {
  test('owner can query stages before creation and reopen a private quest using both constraints', async () => {
    const db = ownerFirestore();
    const stages = query(collection(db, 'quest_stages'),
      where('questId', '==', QUEST_ID), where('creatorId', '==', OWNER_ID));
    assert.equal((await assertSucceeds(getDocs(stages))).size, 0);
    await assertSucceeds(questStageBatch([validStage()], {}, db).commit());
    assert.equal((await assertSucceeds(getDocs(stages))).size, 1);
    await assertFails(getDocs(query(collection(db, 'quest_stages'), where('questId', '==', QUEST_ID))));
    const other = testEnv.authenticatedContext('teacher-2').firestore();
    await assertFails(getDocs(query(collection(other, 'quest_stages'),
      where('questId', '==', QUEST_ID), where('creatorId', '==', OWNER_ID))));
  });

  test('accepts all nine stage types in one atomic quest revision', async () => {
    const stages = [
      validStage({ id: 'info', order: 0 }),
      validStage({ id: 'quiz', order: 1, type: 'QUIZ', mediaType: undefined, questionType: 'matching', correctAnswer: '', matchingPairs: [{ id: 'p1', left: 'A', right: 'B' }] }),
      validStage({ id: 'mission', order: 2, type: 'MISSION', mediaType: undefined, submissionType: 'photo', rubric: { criteria: [{ id: 'c1', title: 'Критериум', levels: [{ id: 'l1', label: 'Добро', points: 2 }] }] } }),
      validStage({ id: 'spot', order: 3, type: 'FIND_SPOT', mediaType: undefined, targetCoordinates: { latitude: 41.99, longitude: 21.42 }, radiusMeters: 30 }),
      validStage({ id: 'scan', order: 4, type: 'SCAN_CODE', mediaType: undefined, targetQrPayload: '' }),
      validStage({ id: 'qr', order: 5, type: 'QR_TASK', mediaType: undefined, targetQrPayload: '', taskTitle: '', taskDescription: '', answerType: 'text', requiredToAdvance: true }),
      validStage({ id: 'survey', order: 6, type: 'SURVEY', mediaType: undefined, surveyQuestions: [''] }),
      validStage({ id: 'tournament', order: 7, type: 'TOURNAMENT', mediaType: undefined, teamCount: 2 }),
      validStage({ id: 'switch', order: 8, type: 'SWITCH', mediaType: undefined, conditions: [{ id: 'c1', label: '', targetStageId: 'info' }], showPathsToPlayer: false }),
    ].map(stage => Object.fromEntries(Object.entries(stage).filter(([, value]) => value !== undefined)));
    for (const stage of stages) {
      try {
        await assertSucceeds(questStageBatch([stage]).commit());
      } catch (error) {
        throw new Error(`stage type ${stage.type} failed`, { cause: error });
      }
    }
  });

  test('accepts one hundred independently validated stages without access-call overflow', async () => {
    const stages = Array.from({ length: 100 }, (_, order) => validStage({ id: `stage-${order}`, order }));
    await assertSucceeds(questStageBatch(stages).commit());
  });

  test('rejects unknown fields, malformed nested values and revision or owner forgery', async () => {
    await assertFails(questStageBatch([], { stageCount: -1 }).commit());
    await assertFails(questStageBatch([validStage({ isAdmin: true })]).commit());
    await assertFails(questStageBatch([validStage({ type: 'SURVEY', mediaType: undefined, surveyQuestions: Array.from({ length: 21 }, () => 'x') })]).commit());
    await assertFails(questStageBatch([validStage({ creatorId: 'teacher-2' })]).commit());
    await assertFails(questStageBatch([validStage({ stageRevision: 'different-revision-0001' })]).commit());
  });

  test('allows public stage queries but denies private stages to another teacher', async () => {
    await assertSucceeds(questStageBatch([validStage()], { visibility: 'public' }).commit());
    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(query(collection(anonymousDb, 'quest_stages'), where('questId', '==', QUEST_ID))));

    await assertSucceeds(questStageBatch([validStage()], { visibility: 'secret' }).commit());
    const otherDb = testEnv.authenticatedContext('teacher-2').firestore();
    await assertFails(getDocs(query(collection(otherDb, 'quest_stages'), where('questId', '==', QUEST_ID))));
  });
});

describe('anonymous result bounds', () => {
  test('accepts the exact player result contract', async () => {
    await assertSucceeds(resultBatch('attempt-web', validResult({
      teamCode: 'TEAM-1',
      stageDurations: [{ stageId: 'stage-1', durationSec: 30 }],
      submissions: [{ stageId: 'stage-2', type: 'survey', surveyAnswers: ['Одговор'] }],
      quizAnswers: [{ stageId: 'stage-3', selectedAnswer: 'A', correct: true }],
    })).commit());
    await assertSucceeds(writeResult('attempt-mobile', validResult({
      userId: null,
      completedStages: 4,
      totalStages: 5,
    })));
  });

  test('rejects unknown fields, excessive points and invalid timestamps', async () => {
    await assertFails(writeResult('unknown-field', validResult({ isAdmin: true })));
    await assertFails(writeResult('excessive-points', validResult({ points: 1_000_001 })));
    await assertFails(writeResult('invalid-time', validResult({ completedAt: 42 })));
    await assertFails(writeResult('wrong-attempt-id', validResult({ attemptId: 'different-id' })));
  });

  test('rejects oversized optional top-level result fields and telemetry lists', async () => {
    await assertFails(writeResult('long-team', validResult({ teamCode: 'x'.repeat(51) })));
    await assertFails(writeResult('too-many-durations', validResult({ stageDurationCount: 101 })));
  });

  test('allows a bounded parent-first write but rejects out-of-range telemetry', async () => {
    await assertSucceeds(writeResult('missing-progress', validResult({ stageDurationCount: 1 })));
    const firestore = testEnv.unauthenticatedContext().firestore();
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'quest_result_telemetry', 'missing-progress__progress__1'), {
      resultId: 'missing-progress',
      questId: QUEST_ID,
      kind: 'progress',
      chunkId: '1',
      chunkIndex: 1,
      stageDurations: [{ stageId: 'stage-1', durationSec: 1 }],
      quizAnswers: [],
    });
    await assertFails(batch.commit());
  });

  test('accepts maximum bounded telemetry in expression-safe batches', async () => {
    const stageDurations = Array.from({ length: 100 }, (_, index) => ({
      stageId: `stage-${index}`,
      durationSec: index,
    }));
    const quizAnswers = Array.from({ length: 100 }, (_, index) => ({
      stageId: `quiz-${index}`,
      selectedAnswer: `answer-${index}`,
      correct: index % 2 === 0,
    }));
    const submissions = Array.from({ length: 30 }, (_, index) => ({
      stageId: `survey-${index}`,
      type: 'survey',
      surveyAnswers: [`answer-${index}`],
    }));
    await writeResultInBoundedBatches('maximum-telemetry', validResult({
      stageDurations,
      quizAnswers,
      submissions,
    }));
  });

  test('allows an identical atomic retry but rejects malformed telemetry', async () => {
    const value = validResult({
      stageDurations: [{ stageId: 'stage-1', durationSec: 10 }],
      submissions: [{ stageId: 'survey-1', type: 'survey', surveyAnswers: ['A'] }],
    });
    await assertSucceeds(resultBatch('retry-result', value).commit());
    await assertSucceeds(resultBatch('retry-result', value).commit());

    const firestore = testEnv.unauthenticatedContext().firestore();
    const malformed = writeBatch(firestore);
    malformed.set(doc(firestore, 'quest_results', 'malformed-telemetry'), {
      id: 'malformed-telemetry',
      attemptId: 'malformed-telemetry',
      schemaVersion: 2,
      stageDurationCount: 1,
      submissionCount: 0,
      quizAnswerCount: 0,
      ...validResult(),
    });
    malformed.set(doc(firestore, 'quest_result_telemetry', 'malformed-telemetry__progress__0'), {
      resultId: 'malformed-telemetry',
      questId: QUEST_ID,
      kind: 'progress',
      chunkId: '0',
      chunkIndex: 0,
      stageDurations: [{ stageId: 'stage-1', durationSec: 'ten' }],
      quizAnswers: [],
    });
    await assertFails(malformed.commit());
  });

  test('keeps telemetry owner-scoped while legacy inline results remain readable', async () => {
    await assertSucceeds(writeQuest(QUEST_ID, validQuest()));
    await assertSucceeds(resultBatch('readable-v2', validResult({
      stageDurations: [{ stageId: 'stage-1', durationSec: 10 }],
    })).commit());
    await testEnv.withSecurityRulesDisabled(async context => {
      await setDoc(doc(context.firestore(), 'quest_results', 'legacy-inline'), {
        id: 'legacy-inline',
        questId: QUEST_ID,
        playerName: 'Legacy',
        points: 10,
        completedAt: '2025-01-01T00:00:00.000Z',
        stageDurations: [{ stageId: 'stage-1', durationSec: 3 }],
      });
    });

    const ownerDb = ownerFirestore();
    await assertSucceeds(getDoc(doc(ownerDb, 'quest_results', 'legacy-inline')));
    await assertSucceeds(getDocs(query(
      collection(ownerDb, 'quest_result_telemetry'),
      where('questId', '==', QUEST_ID),
    )));
    const otherTeacherDb = testEnv.authenticatedContext('teacher-2').firestore();
    await assertFails(getDoc(doc(otherTeacherDb, 'quest_results', 'legacy-inline')));
    await assertFails(getDocs(query(
      collection(otherTeacherDb, 'quest_result_telemetry'),
      where('questId', '==', QUEST_ID),
    )));
  });
});

describe('opaque roster launch authorization', () => {
  test('allows only exact anonymous reads of an active launch', async () => {
    await seedRosterLaunch();
    const anonymousDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(anonymousDb, 'roster_launches', LAUNCH_ID)));
    await assertFails(getDocs(collection(anonymousDb, 'roster_launches')));
    await assertFails(getDoc(doc(anonymousDb, 'roster_launch_sets', SET_ID)));
  });

  test('accepts a result bound to the exact launch identity', async () => {
    await seedRosterLaunch();
    await assertSucceeds(writeResult('roster-attempt-valid', validResult({
      attemptId: 'roster-attempt-valid',
      studentId: 'student-1',
      launchId: LAUNCH_ID,
      playerName: 'Ана',
    })));
  });

  test('rejects missing launch credentials and forged roster fields', async () => {
    await seedRosterLaunch();
    await assertFails(writeResult('bare-student', validResult({ studentId: 'student-1' })));
    await assertFails(writeResult('bare-launch', validResult({ launchId: LAUNCH_ID })));
    await assertFails(writeResult('wrong-student', validResult({
      studentId: 'student-2', launchId: LAUNCH_ID, playerName: 'Ана',
    })));
    await assertFails(writeResult('wrong-name', validResult({
      studentId: 'student-1', launchId: LAUNCH_ID, playerName: 'Борис',
    })));
    await assertFails(writeResult('wrong-quest', validResult({
      questId: 'quest-2', studentId: 'student-1', launchId: LAUNCH_ID, playerName: 'Ана',
    })));
  });

  test('rotation invalidates every launch from the previous generation', async () => {
    await seedRosterLaunch();
    const ownerDb = ownerFirestore();
    const nowMs = Date.now();
    await assertSucceeds(setDoc(doc(ownerDb, 'roster_launch_sets', SET_ID), validLaunchSet(nowMs, {
      generationId: 'generation-2',
    })));

    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymousDb, 'roster_launches', LAUNCH_ID)));
    await assertFails(writeResult('rotated-attempt', validResult({
      studentId: 'student-1', launchId: LAUNCH_ID, playerName: 'Ана',
    })));
  });

  test('revocation immediately blocks launch reads and result writes', async () => {
    await seedRosterLaunch();
    await assertSucceeds(updateDoc(doc(ownerFirestore(), 'roster_launch_sets', SET_ID), {
      status: 'revoked',
      revokedAtMs: Date.now(),
    }));

    const anonymousDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anonymousDb, 'roster_launches', LAUNCH_ID)));
    await assertFails(writeResult('revoked-attempt', validResult({
      studentId: 'student-1', launchId: LAUNCH_ID, playerName: 'Ана',
    })));
  });

  test('rejects launch creation for unassigned quests or another owner', async () => {
    const ownerDb = ownerFirestore();
    const nowMs = Date.now();
    await assertSucceeds(setDoc(doc(ownerDb, 'quests', QUEST_ID), validQuest()));
    await assertSucceeds(setDoc(doc(ownerDb, 'class_groups', GROUP_ID), validGroup({ assignedQuestIds: [] })));
    await assertFails(setDoc(doc(ownerDb, 'roster_launch_sets', SET_ID), validLaunchSet(nowMs)));

    const attackerDb = testEnv.authenticatedContext('teacher-2').firestore();
    await assertFails(setDoc(doc(attackerDb, 'roster_launch_sets', SET_ID), validLaunchSet(nowMs)));
  });
});

describe('account deletion request authorization', () => {
  test('allows a user to create, read and cancel only their own request', async () => {
    const ownerDb = ownerFirestore();
    const requestRef = doc(ownerDb, 'account_deletion_requests', OWNER_ID);
    await assertSucceeds(setDoc(requestRef, validDeletionRequest()));
    await assertSucceeds(getDoc(requestRef));
    await assertSucceeds(updateDoc(requestRef, {
      status: 'cancelled',
      updatedAt: '2026-08-04T11:00:00.000Z',
    }));
    await assertSucceeds(setDoc(requestRef, validDeletionRequest({
      requestedAt: '2026-08-04T11:05:00.000Z',
      updatedAt: '2026-08-04T11:05:00.000Z',
    })));

    const otherDb = testEnv.authenticatedContext('teacher-2').firestore();
    await assertFails(getDoc(doc(otherDb, 'account_deletion_requests', OWNER_ID)));
  });

  test('rejects forged identity, terminal status, unknown fields and deletion', async () => {
    const ownerDb = ownerFirestore();
    await assertFails(setDoc(
      doc(ownerDb, 'account_deletion_requests', OWNER_ID),
      validDeletionRequest({ userId: 'teacher-2' }),
    ));
    await assertFails(setDoc(
      doc(ownerDb, 'account_deletion_requests', OWNER_ID),
      validDeletionRequest({ email: 'attacker@example.test' }),
    ));
    await assertFails(setDoc(
      doc(ownerDb, 'account_deletion_requests', OWNER_ID),
      validDeletionRequest({ status: 'completed', processedAt: '2026-08-04T11:00:00.000Z' }),
    ));
    await assertFails(setDoc(
      doc(ownerDb, 'account_deletion_requests', OWNER_ID),
      validDeletionRequest({ isAdmin: true }),
    ));

    const requestRef = doc(ownerDb, 'account_deletion_requests', OWNER_ID);
    await assertSucceeds(setDoc(requestRef, validDeletionRequest()));
    await assertFails(updateDoc(requestRef, { status: 'completed' }));
    await assertFails(updateDoc(requestRef, { email: 'attacker@example.test' }));
    await assertFails(deleteDoc(requestRef));
  });

  test('allows an admin to process a request without changing its identity', async () => {
    await assertSucceeds(setDoc(
      doc(ownerFirestore(), 'account_deletion_requests', OWNER_ID),
      validDeletionRequest(),
    ));
    const adminRef = doc(adminFirestore(), 'account_deletion_requests', OWNER_ID);
    await assertSucceeds(updateDoc(adminRef, {
      status: 'in_progress',
      updatedAt: '2026-08-04T11:30:00.000Z',
    }));
    await assertFails(updateDoc(
      doc(ownerFirestore(), 'account_deletion_requests', OWNER_ID),
      { status: 'cancelled', updatedAt: '2026-08-04T11:35:00.000Z' },
    ));
    await assertSucceeds(updateDoc(adminRef, {
      status: 'completed',
      updatedAt: '2026-08-04T12:00:00.000Z',
      processedAt: '2026-08-04T12:00:00.000Z',
    }));
    await assertFails(updateDoc(adminRef, { userId: 'teacher-2' }));
  });

  test('allows a rejected request to be resubmitted without stale processing metadata', async () => {
    const ownerRef = doc(ownerFirestore(), 'account_deletion_requests', OWNER_ID);
    await assertSucceeds(setDoc(ownerRef, validDeletionRequest()));
    const adminRef = doc(adminFirestore(), 'account_deletion_requests', OWNER_ID);
    await assertSucceeds(updateDoc(adminRef, {
      status: 'rejected',
      updatedAt: '2026-08-04T12:00:00.000Z',
      processedAt: '2026-08-04T12:00:00.000Z',
    }));

    await assertSucceeds(setDoc(ownerRef, validDeletionRequest({
      requestedAt: '2026-08-04T13:00:00.000Z',
      updatedAt: '2026-08-04T13:00:00.000Z',
    })));
    const snapshot = await assertSucceeds(getDoc(ownerRef));
    assert.equal(snapshot.data().status, 'pending');
    assert.equal('processedAt' in snapshot.data(), false);
  });
});
