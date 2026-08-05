import { describe, expect, it } from 'vitest';
import {
  hydrateQuestFromStageStorage,
  isValidQuestStage,
  questStageDocumentId,
  questSummaryFromStorage,
  splitQuestForStageStorage,
  type Quest,
  type Stage,
} from 'shared';

const base = { title: '', description: '', points: 10 };

function stages(): Stage[] {
  return [
    { ...base, id: 'info', type: 'INFO', order: 0, mediaType: 'none' },
    { ...base, id: 'quiz', type: 'QUIZ', order: 1, questionType: 'matching', correctAnswer: '', matchingPairs: [{ id: 'p1', left: 'A', right: 'B' }] },
    { ...base, id: 'mission', type: 'MISSION', order: 2, submissionType: 'photo', rubric: { criteria: [{ id: 'c1', title: 'Критериум', levels: [{ id: 'l1', label: 'Добро', points: 2 }] }] } },
    { ...base, id: 'spot', type: 'FIND_SPOT', order: 3, targetCoordinates: { latitude: 41.99, longitude: 21.42 }, radiusMeters: 30 },
    { ...base, id: 'scan', type: 'SCAN_CODE', order: 4, targetQrPayload: '' },
    { ...base, id: 'qr', type: 'QR_TASK', order: 5, targetQrPayload: '', taskTitle: '', taskDescription: '', answerType: 'text', requiredToAdvance: true },
    { ...base, id: 'survey', type: 'SURVEY', order: 6, surveyQuestions: [''] },
    { ...base, id: 'tournament', type: 'TOURNAMENT', order: 7, teamCount: 2 },
    { ...base, id: 'switch', type: 'SWITCH', order: 8, conditions: [{ id: 'c1', label: '', targetStageId: 'info' }], showPathsToPlayer: false },
  ];
}

function quest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'quest-1',
    creatorId: 'teacher-1',
    title: 'Безбедна авантура',
    description: '',
    visibility: 'secret',
    playMode: 'singleplayer',
    sequence: 'fixed',
    stages: stages(),
    createdAt: '2026-08-05T10:00:00.000Z',
    updatedAt: '2026-08-05T10:00:00.000Z',
    ...overrides,
  };
}

describe('quest stage schema-v2 storage', () => {
  it('validates every supported stage type and round-trips exact content', () => {
    expect(stages().every(isValidQuestStage)).toBe(true);
    const split = splitQuestForStageStorage(quest(), 'revision-0000000000000001');
    expect(split.document).not.toHaveProperty('stages');
    expect(split.document).toMatchObject({ stageSchemaVersion: 2, stageCount: 9 });
    expect(hydrateQuestFromStageStorage(split.document, split.stages)).toEqual(quest());
    expect(questStageDocumentId('quest-1', 'info')).toBe('quest-1__info');
  });

  it('ignores stale revision documents but fails closed on missing current stages', () => {
    const split = splitQuestForStageStorage(quest(), 'revision-0000000000000001');
    const stale = { ...split.stages[0], stageRevision: 'revision-0000000000000000' };
    expect(hydrateQuestFromStageStorage(split.document, [...split.stages, stale]).stages).toHaveLength(9);
    expect(() => hydrateQuestFromStageStorage(split.document, split.stages.slice(1))).toThrow(/Incomplete/);
  });

  it('rejects duplicate IDs, non-contiguous order, unknown fields and oversized nested values', () => {
    const duplicate = stages();
    duplicate[1] = { ...duplicate[1], id: duplicate[0].id };
    expect(() => splitQuestForStageStorage(quest({ stages: duplicate }), 'revision-0000000000000001')).toThrow(/Duplicate/);

    const wrongOrder = stages();
    wrongOrder[8] = { ...wrongOrder[8], order: 99 };
    expect(() => splitQuestForStageStorage(quest({ stages: wrongOrder }), 'revision-0000000000000001')).toThrow(/contiguous/);
    expect(isValidQuestStage({ ...stages()[0], isAdmin: true })).toBe(false);
    expect(isValidQuestStage({ ...stages()[6], surveyQuestions: Array.from({ length: 21 }, () => 'x') })).toBe(false);
  });

  it('keeps legacy reads compatible and exposes summary counts without stage payloads', () => {
    const legacy = quest() as unknown as Record<string, unknown>;
    expect(hydrateQuestFromStageStorage(legacy)).toEqual(quest());

    const split = splitQuestForStageStorage(quest(), 'revision-0000000000000001');
    const summary = questSummaryFromStorage(split.document);
    expect(summary.stageCount).toBe(9);
    expect(summary).not.toHaveProperty('stages');
  });
});
