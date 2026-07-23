import { describe, expect, it } from 'vitest';
import { buildObjectiveMasteryReport, computeObjectiveMastery } from 'shared';
import type { BaseStage, GroupStudent, LearningObjective, QuestResult } from 'shared';

const stage = (id: string, objectiveRef?: string): BaseStage => ({
  id,
  type: 'INFO',
  title: id,
  description: '',
  order: 0,
  ...(objectiveRef ? { objectiveRef } : {}),
});

const result = (overrides: Partial<QuestResult> = {}): QuestResult => ({
  id: 'r1',
  questId: 'q1',
  playerName: 'Ана',
  points: 0,
  completedAt: '2026-07-23T10:00:00.000Z',
  ...overrides,
});

describe('computeObjectiveMastery', () => {
  const objectives: LearningObjective[] = [
    { id: 'objective-a', label: 'Прва цел' },
    { id: 'objective-b', label: 'Втора цел' },
  ];
  const stages = [
    stage('s1', 'objective-a'),
    stage('s2', 'objective-a'),
    stage('s3', 'objective-b'),
    stage('s4'),
  ];

  it('rates mastery by reached mapped stages, not total quest progress', () => {
    const mastery = computeObjectiveMastery(objectives, stages, result({
      stageDurations: [{ stageId: 's1', durationSec: 10 }, { stageId: 's4', durationSec: 5 }],
    }));

    expect(mastery.objectives).toEqual([
      { objective: objectives[0], mappedStageCount: 2, reachedStageCount: 1, masteryRatio: 0.5 },
      { objective: objectives[1], mappedStageCount: 1, reachedStageCount: 0, masteryRatio: 0 },
    ]);
  });

  it('reports null masteryRatio for an objective with no mapped stages', () => {
    const unmapped: LearningObjective = { id: 'objective-c', label: 'Без мапирање' };
    const mastery = computeObjectiveMastery([unmapped], stages, result());

    expect(mastery.objectives).toEqual([
      { objective: unmapped, mappedStageCount: 0, reachedStageCount: 0, masteryRatio: null },
    ]);
  });

  it('treats a missing result as zero reach without throwing', () => {
    const mastery = computeObjectiveMastery(objectives, stages, null);
    expect(mastery.objectives.every(o => o.reachedStageCount === 0)).toBe(true);
    expect(mastery.objectives[0].masteryRatio).toBe(0);
  });
});

describe('buildObjectiveMasteryReport', () => {
  const objectives: LearningObjective[] = [{ id: 'objective-a', label: 'Прва цел' }];
  const stages = [stage('s1', 'objective-a'), stage('s2', 'objective-a')];
  const students: GroupStudent[] = [
    { id: 'student-1', name: 'Ана' },
    { id: 'student-2', name: 'Борис' },
  ];

  it('resolves each student to their own best attempt by stable id and computes reach independently', () => {
    const results: QuestResult[] = [
      // student-1's lower-scoring attempt reached nothing; their best attempt reached both stages.
      result({ id: 'r1', studentId: 'student-1', points: 10 }),
      result({
        id: 'r2', studentId: 'student-1', points: 20, completedAt: '2026-07-23T11:00:00.000Z',
        stageDurations: [{ stageId: 's1', durationSec: 5 }, { stageId: 's2', durationSec: 5 }],
      }),
      result({ id: 'r3', studentId: 'student-2', playerName: 'Борис', stageDurations: [{ stageId: 's1', durationSec: 5 }] }),
    ];

    const report = buildObjectiveMasteryReport(students, objectives, stages, results, 'best');

    expect(report[0]).toEqual({
      studentId: 'student-1',
      studentName: 'Ана',
      objectives: [{ objective: objectives[0], mappedStageCount: 2, reachedStageCount: 2, masteryRatio: 1 }],
    });
    expect(report[1]).toEqual({
      studentId: 'student-2',
      studentName: 'Борис',
      objectives: [{ objective: objectives[0], mappedStageCount: 2, reachedStageCount: 1, masteryRatio: 0.5 }],
    });
  });

  it('gives a student with no attempt zero reach for every mapped objective', () => {
    const report = buildObjectiveMasteryReport(students, objectives, stages, [], 'best');
    expect(report.every(row => row.objectives.every(o => o.reachedStageCount === 0))).toBe(true);
  });
});
