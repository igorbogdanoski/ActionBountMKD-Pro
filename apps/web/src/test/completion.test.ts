import { describe, expect, it } from 'vitest';
import { computeStageCompletion, computeQuizAccuracy, type ResultLike, type StageRefLike, type QuizStageLike, type QuizResultLike } from '../utils/completion';

const stages: StageRefLike[] = [
  { id: 's1', title: 'Старт' },
  { id: 's2', title: 'Средина' },
  { id: 's3', title: 'Крај' },
];

function result(...stageIds: string[]): ResultLike {
  return { stageDurations: stageIds.map((stageId) => ({ stageId, durationSec: 10 })) };
}

describe('computeStageCompletion', () => {
  it('returns an empty array for no stages', () => {
    expect(computeStageCompletion([], [result('s1')])).toEqual([]);
  });

  it('reports zero completion and zero drop-off when there are no players', () => {
    const out = computeStageCompletion(stages, []);
    expect(out).toHaveLength(3);
    expect(out.every((s) => s.completionRate === 0 && s.dropOff === 0)).toBe(true);
    expect(out[0].totalPlayers).toBe(0);
  });

  it('counts reached players and computes completion rate vs total', () => {
    const results = [result('s1', 's2', 's3'), result('s1', 's2'), result('s1'), result('s1')];
    const out = computeStageCompletion(stages, results);
    expect(out.map((s) => s.reached)).toEqual([4, 2, 1]);
    expect(out.map((s) => s.completionRate)).toEqual([100, 50, 25]);
  });

  it('computes drop-off as the percentage-point fall from the previous stage', () => {
    const results = [result('s1', 's2', 's3'), result('s1', 's2'), result('s1'), result('s1')];
    const out = computeStageCompletion(stages, results);
    expect(out[0].dropOff).toBe(0);
    expect(out[1].dropOff).toBe(50);
    expect(out[2].dropOff).toBe(25);
  });

  it('labels stages 1-based and carries the title through', () => {
    const out = computeStageCompletion(stages, [result('s1')]);
    expect(out[0].label).toBe('Етапа 1');
    expect(out[2].label).toBe('Етапа 3');
    expect(out[1].title).toBe('Средина');
  });
});

describe('computeQuizAccuracy', () => {
  const quizStages: QuizStageLike[] = [
    { id: 'q1', title: 'Прашање 1' },
    { id: 'q2', title: 'Прашање 2' },
  ];

  function quizResult(answers: { stageId: string; correct: boolean }[]): QuizResultLike {
    return { quizAnswers: answers };
  }

  it('returns null accuracy and zero answers for an unanswered question', () => {
    const out = computeQuizAccuracy(quizStages, []);
    expect(out).toEqual([
      { id: 'q1', title: 'Прашање 1', answers: 0, accuracy: null },
      { id: 'q2', title: 'Прашање 2', answers: 0, accuracy: null },
    ]);
  });

  it('computes accuracy as a 0-100 percentage of correct answers', () => {
    const results = [
      quizResult([{ stageId: 'q1', correct: true }]),
      quizResult([{ stageId: 'q1', correct: false }]),
      quizResult([{ stageId: 'q1', correct: true }]),
    ];
    const out = computeQuizAccuracy(quizStages, results);
    expect(out[0]).toEqual({ id: 'q1', title: 'Прашање 1', answers: 3, accuracy: 67 });
    expect(out[1]).toEqual({ id: 'q2', title: 'Прашање 2', answers: 0, accuracy: null });
  });

  it('only counts answers for the matching stage id', () => {
    const results = [
      quizResult([{ stageId: 'q1', correct: true }, { stageId: 'q2', correct: false }]),
    ];
    const out = computeQuizAccuracy(quizStages, results);
    expect(out[0].answers).toBe(1);
    expect(out[1].answers).toBe(1);
    expect(out[1].accuracy).toBe(0);
  });
});
