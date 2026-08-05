import { describe, expect, it } from 'vitest';
import {
  hydrateQuestResult,
  RESULT_SCHEMA_VERSION,
  splitQuestResultForStorage,
  type QuestResult,
  type ResultTelemetryChunk,
} from 'shared';

function result(overrides: Partial<QuestResult> = {}): QuestResult {
  return {
    id: 'attempt-1',
    attemptId: 'attempt-1',
    questId: 'quest-1',
    playerName: 'Ана',
    points: 80,
    completedAt: '2026-08-04T20:00:00.000Z',
    ...overrides,
  };
}

describe('result storage v2', () => {
  it('splits telemetry into bounded deterministic chunks and hydrates it losslessly', () => {
    const original = result({
      stageDurations: Array.from({ length: 12 }, (_, index) => ({
        stageId: `stage-${index}`,
        durationSec: index + 1,
      })),
      submissions: Array.from({ length: 6 }, (_, index) => ({
        stageId: `mission-${index}`,
        type: 'photo' as const,
        mediaUrl: `https://example.test/${index}.jpg`,
      })),
      quizAnswers: Array.from({ length: 11 }, (_, index) => ({
        stageId: `quiz-${index}`,
        selectedAnswer: String(index),
        correct: index % 2 === 0,
      })),
    });

    const split = splitQuestResultForStorage(original);
    expect(split.document).toMatchObject({
      schemaVersion: RESULT_SCHEMA_VERSION,
      stageDurationCount: 12,
      submissionCount: 6,
      quizAnswerCount: 11,
    });
    expect(split.document).not.toHaveProperty('stageDurations');
    expect(split.document).not.toHaveProperty('submissions');
    expect(split.document).not.toHaveProperty('quizAnswers');
    expect(split.telemetry.filter(write => write.data.kind === 'progress')).toHaveLength(4);
    expect(split.telemetry.filter(write => write.data.kind === 'submissions')).toHaveLength(6);
    expect(split.telemetry[0].id).toBe('attempt-1__progress__0');

    expect(hydrateQuestResult(split.document, split.telemetry.map(write => write.data))).toEqual({
      ...split.document,
      stageDurations: original.stageDurations,
      submissions: original.submissions,
      quizAnswers: original.quizAnswers,
    });
  });

  it('leaves legacy inline results readable without migration', () => {
    const legacy = result({ stageDurations: [{ stageId: 'stage-1', durationSec: 4 }] });
    expect(hydrateQuestResult(legacy, [])).toBe(legacy);
  });

  it('rejects oversized or malformed telemetry before a write starts', () => {
    expect(() => splitQuestResultForStorage(result({
      stageDurations: Array.from({ length: 101 }, (_, index) => ({ stageId: `s-${index}`, durationSec: 1 })),
    }))).toThrow(/100-item limit/);
    expect(() => splitQuestResultForStorage(result({
      submissions: [{ stageId: 'survey-1', type: 'survey', surveyAnswers: ['x'.repeat(2001)] }],
    }))).toThrow(/2000 characters/);
    expect(() => splitQuestResultForStorage(result({
      quizAnswers: [{ stageId: 'quiz-1', selectedAnswer: 'A', correct: 'yes' as unknown as boolean }],
    }))).toThrow(/must be boolean/);
  });

  it('fails closed when chunk identity or summary counts are inconsistent', () => {
    const split = splitQuestResultForStorage(result({
      quizAnswers: [{ stageId: 'quiz-1', selectedAnswer: 'A', correct: true }],
    }));
    expect(() => hydrateQuestResult(split.document, [{
      ...split.telemetry[0].data,
      resultId: 'another-result',
    } as ResultTelemetryChunk])).toThrow(/identity/);
    expect(() => hydrateQuestResult(split.document, [])).toThrow(/sequence/);
  });
});
