// Verifies gradeSubmission recomputes the result's total points correctly
// (first grade, re-grade, and multiple graded stages) against an in-memory
// Firestore mock — this is the write path the rubric-review UI depends on.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RubricGrade, QuestResult } from 'shared';

const fs = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const clone = <T>(o: T): T => (o === undefined ? o : JSON.parse(JSON.stringify(o)));

  return {
    store,
    reset: () => store.clear(),
    doc: (_db: unknown, coll: string, id: string) => ({ path: `${coll}/${id}` }),
    updateDoc: async (ref: { path: string }, patch: Record<string, unknown>) => {
      store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...clone(patch) });
    },
  };
});

vi.mock('../utils/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: fs.doc,
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: fs.updateDoc,
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  increment: vi.fn(),
}));

import { gradeSubmission } from '../utils/storage';

beforeEach(() => fs.reset());

function makeResult(overrides: Partial<QuestResult> = {}): QuestResult {
  return {
    id: 'r1',
    questId: 'q1',
    playerName: 'Ана',
    points: 50, // e.g. from a non-rubric QUIZ stage played earlier
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeGrade(overrides: Partial<RubricGrade> = {}): RubricGrade {
  return {
    stageId: 's-mission',
    criterionScores: { c1: 8 },
    totalPoints: 8,
    gradedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('gradeSubmission', () => {
  it('adds the rubric bonus to the result total on first grade', async () => {
    const result = makeResult();
    await gradeSubmission(result, makeGrade({ totalPoints: 8 }));

    const saved = fs.store.get('quest_results/r1');
    expect(saved?.points).toBe(58);
    expect((saved?.grades as RubricGrade[]).map(g => g.stageId)).toEqual(['s-mission']);
  });

  it('replaces (not stacks) the bonus when re-grading the same stage', async () => {
    const graded = makeResult({ points: 58, grades: [makeGrade({ totalPoints: 8 })] });
    await gradeSubmission(graded, makeGrade({ totalPoints: 3 }));

    const saved = fs.store.get('quest_results/r1');
    expect(saved?.points).toBe(53); // 58 - 8 + 3, not 58 + 3
    expect((saved?.grades as RubricGrade[])).toHaveLength(1);
  });

  it('accumulates bonuses across multiple independently-graded stages', async () => {
    const result = makeResult({ points: 58, grades: [makeGrade({ stageId: 's-mission', totalPoints: 8 })] });
    await gradeSubmission(result, makeGrade({ stageId: 's-survey', totalPoints: 5 }));

    const saved = fs.store.get('quest_results/r1');
    expect(saved?.points).toBe(63);
    expect((saved?.grades as RubricGrade[]).map(g => g.stageId).sort()).toEqual(['s-mission', 's-survey']);
  });

  it('never touches fields other than grades/points', async () => {
    const result = makeResult();
    await gradeSubmission(result, makeGrade());

    const saved = fs.store.get('quest_results/r1');
    expect(Object.keys(saved ?? {}).sort()).toEqual(['grades', 'points']);
  });
});
