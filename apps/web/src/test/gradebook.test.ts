import { describe, expect, it } from 'vitest';
import {
  questMaxScore,
  normalizePlayerName,
  bestResultForName,
  bestResultForStudent,
  buildClassGradebook,
  numberQuestAttempts,
  selectQuestResult,
  selectResultForStudent,
} from 'shared';
import type { QuestResult, Stage } from 'shared';

const result = (over: Partial<QuestResult>): QuestResult => ({
  id: 'r' + Math.random().toString(36).slice(2, 6),
  questId: 'q1',
  playerName: 'Ана',
  points: 0,
  completedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('questMaxScore', () => {
  it('returns 0 for null / undefined / no stages', () => {
    expect(questMaxScore(undefined)).toBe(0);
    expect(questMaxScore(null)).toBe(0);
    expect(questMaxScore({ stages: [] })).toBe(0);
  });

  it('sums stage points, treating missing points as 0', () => {
    const stages = [
      { points: 50 },
      { points: undefined },
      { points: 25 },
    ] as unknown as Stage[];
    expect(questMaxScore({ stages })).toBe(75);
  });
});

describe('normalizePlayerName', () => {
  it('trims, lowercases and collapses whitespace', () => {
    expect(normalizePlayerName('  Ана   Б ')).toBe('ана б');
    expect(normalizePlayerName('ANA')).toBe('ana');
  });
});

describe('bestResultForName', () => {
  const results = [
    result({ playerName: 'Ана', points: 30 }),
    result({ playerName: 'ана', points: 80 }),
    result({ playerName: 'Бојан', points: 100 }),
  ];

  it('returns null for empty name or no match', () => {
    expect(bestResultForName(results, '')).toBeNull();
    expect(bestResultForName(results, 'Викторија')).toBeNull();
  });

  it('returns the highest-scoring matching result, case-insensitively', () => {
    expect(bestResultForName(results, 'АНА')?.points).toBe(80);
    expect(bestResultForName(results, 'бојан')?.points).toBe(100);
  });
});

describe('bestResultForStudent', () => {
  it('matches stable student ids before display names', () => {
    const results = [
      result({ studentId: 's2', playerName: 'Ана', points: 100 }),
      result({ studentId: 's1', playerName: 'Ана П.', points: 80 }),
    ];

    expect(bestResultForStudent(results, { id: 's1', name: 'Ана' })?.points).toBe(80);
  });

  it('includes legacy name-matched results without borrowing another stable id', () => {
    const results = [
      result({ playerName: ' Ана ', points: 90 }),
      result({ studentId: 's2', playerName: 'Ана', points: 100 }),
      result({ studentId: 's1', playerName: 'Ана', points: 80 }),
    ];

    expect(bestResultForStudent(results, { id: 's1', name: 'ана' })?.points).toBe(90);
  });
});

describe('numberQuestAttempts', () => {
  it('derives deterministic attempt numbers for new and legacy results', () => {
    const attempts = numberQuestAttempts([
      result({ id: 'legacy-b', completedAt: '2026-01-02T00:00:00.000Z' }),
      result({ id: 'legacy-a', completedAt: '2026-01-01T00:00:00.000Z' }),
      result({ id: 'r3', attemptId: 'attempt-c', completedAt: '2026-01-02T00:00:00.000Z' }),
    ]);

    expect(attempts.map(item => [item.result.id, item.attemptNumber])).toEqual([
      ['legacy-a', 1],
      ['r3', 2],
      ['legacy-b', 3],
    ]);
  });
});

describe('result selection policy', () => {
  const attempts = [
    result({ id: 'first', points: 40, completedAt: '2026-01-01T10:00:00.000Z' }),
    result({ id: 'best-old', points: 90, completedAt: '2026-01-02T10:00:00.000Z' }),
    result({ id: 'best-latest', points: 90, completedAt: '2026-01-03T10:00:00.000Z' }),
    result({
      id: 'approved',
      points: 70,
      completedAt: '2026-01-04T10:00:00.000Z',
      approvedAt: '2026-01-05T10:00:00.000Z',
      approvedBy: 'teacher-1',
    }),
  ];

  it('supports first, latest and best with deterministic tie-breaking', () => {
    expect(selectQuestResult(attempts, 'first')?.id).toBe('first');
    expect(selectQuestResult(attempts, 'latest')?.id).toBe('approved');
    expect(selectQuestResult(attempts, 'best')?.id).toBe('best-latest');
  });

  it('returns only a teacher-approved attempt for the approval policy', () => {
    expect(selectQuestResult(attempts, 'teacher-approved')?.id).toBe('approved');
    expect(selectQuestResult(attempts.slice(0, 3), 'teacher-approved')).toBeNull();
  });

  it('keeps duplicate roster names isolated while admitting legacy attempts', () => {
    const duplicateNames = [
      result({ id: 's1-low', studentId: 's1', playerName: 'Ана', points: 40 }),
      result({ id: 's2-high', studentId: 's2', playerName: 'Ана', points: 100 }),
      result({ id: 'legacy', playerName: 'Ана', points: 80 }),
    ];

    expect(selectResultForStudent(duplicateNames, { id: 's1', name: 'Ана' }, 'best')?.id).toBe('legacy');
    expect(selectResultForStudent(duplicateNames, { id: 's2', name: 'Ана' }, 'best')?.id).toBe('s2-high');
    expect(bestResultForName(duplicateNames, 'Ана')?.id).toBe('legacy');
  });

  it('applies an explicit policy to gradebook cells', () => {
    const rows = buildClassGradebook(
      [{ id: 's1', name: 'Ана' }],
      ['q1'],
      { q1: attempts },
      'first',
    );
    expect(rows[0].cells[0]).toMatchObject({ points: 40, completedAt: '2026-01-01T10:00:00.000Z' });
  });
});

describe('buildClassGradebook', () => {
  const students = [
    { id: 's1', name: 'Ана' },
    { id: 's2', name: 'Бојан' },
    { id: 's3', name: 'Викторија' },
  ];
  const resultsByQuest: Record<string, QuestResult[]> = {
    q1: [result({ questId: 'q1', playerName: 'Ана', points: 90 }), result({ questId: 'q1', playerName: 'Бојан', points: 40 })],
    q2: [result({ questId: 'q2', playerName: 'Ана', points: 50 })],
  };

  it('produces a row per student with per-quest cells', () => {
    const rows = buildClassGradebook(students, ['q1', 'q2'], resultsByQuest);
    expect(rows).toHaveLength(3);
    expect(rows[0].cells).toHaveLength(2);
  });

  it('computes total and completedCount, with null for missing', () => {
    const rows = buildClassGradebook(students, ['q1', 'q2'], resultsByQuest);
    const ana = rows.find(r => r.studentId === 's1')!;
    expect(ana.total).toBe(140);
    expect(ana.completedCount).toBe(2);

    const bojan = rows.find(r => r.studentId === 's2')!;
    expect(bojan.total).toBe(40);
    expect(bojan.completedCount).toBe(1);
    expect(bojan.cells[1].points).toBeNull();

    const vik = rows.find(r => r.studentId === 's3')!;
    expect(vik.total).toBe(0);
    expect(vik.completedCount).toBe(0);
    expect(vik.cells.every(c => c.points === null)).toBe(true);
  });

  it('handles a quest with no results array gracefully', () => {
    const rows = buildClassGradebook(students, ['q1', 'q_missing'], resultsByQuest);
    expect(rows[0].cells[1].points).toBeNull();
  });
});
