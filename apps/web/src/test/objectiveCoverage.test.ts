import { describe, expect, it } from 'vitest';
import { computeObjectiveCoverage } from 'shared';
import type { BaseStage, LearningObjective } from 'shared';

const stage = (id: string, objectiveRef?: string, points = 0): BaseStage => ({
  id,
  type: 'INFO',
  title: id,
  description: '',
  order: 0,
  points,
  ...(objectiveRef ? { objectiveRef } : {}),
});

describe('computeObjectiveCoverage', () => {
  const objectives: LearningObjective[] = [
    { id: 'objective-a', label: 'Иста етикета' },
    { id: 'objective-b', label: 'Иста етикета' },
  ];

  it('maps by stable id despite duplicate or renamed labels', () => {
    const beforeRename = computeObjectiveCoverage(objectives, [
      stage('s1', 'objective-a', 10),
      stage('s2', 'objective-b', 20),
    ]);
    const afterRename = computeObjectiveCoverage(
      [{ ...objectives[0], label: 'Преименувана цел' }, objectives[1]],
      [stage('s1', 'objective-a', 10), stage('s2', 'objective-b', 20)],
    );

    expect(beforeRename.objectives.map(item => item.stageIds)).toEqual([['s1'], ['s2']]);
    expect(afterRename.objectives.map(item => item.stageIds)).toEqual([['s1'], ['s2']]);
  });

  it('reports legacy unmapped stages and unknown references separately', () => {
    const coverage = computeObjectiveCoverage(objectives, [
      stage('legacy'),
      stage('missing-1', 'deleted-objective'),
      stage('missing-2', 'deleted-objective'),
    ]);

    expect(coverage.unmappedStageIds).toEqual(['legacy']);
    expect(coverage.missingObjectiveRefs).toEqual(['deleted-objective']);
    expect(coverage.objectives.every(item => item.mappedStageCount === 0)).toBe(true);
  });

  it('aggregates stage count and available points without mutating inputs', () => {
    const stages = [stage('s1', 'objective-a', 10), stage('s2', 'objective-a'), stage('s3')];
    const snapshot = structuredClone(stages);
    const coverage = computeObjectiveCoverage(objectives, stages);

    expect(coverage.objectives[0]).toMatchObject({
      stageIds: ['s1', 's2'],
      mappedStageCount: 2,
      mappedPoints: 10,
    });
    expect(stages).toEqual(snapshot);
  });

  it('handles a legacy quest with no objectives without inventing mappings', () => {
    expect(computeObjectiveCoverage([], [stage('legacy')])).toEqual({
      objectives: [],
      unmappedStageIds: ['legacy'],
      missingObjectiveRefs: [],
    });
  });
});
