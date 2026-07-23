// Verifies gradeSubmission recomputes the result's total points correctly
// (first grade, re-grade, and multiple graded stages) against an in-memory
// Firestore mock — this is the write path the rubric-review UI depends on.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RubricGrade, QuestResult } from 'shared';

const fs = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const deleteSentinel = { __deleteField: true };
  const clone = <T>(o: T): T => (o === undefined ? o : JSON.parse(JSON.stringify(o)));

  return {
    store,
    deleteSentinel,
    reset: () => store.clear(),
    collection: (_db: unknown, coll: string) => ({ path: coll }),
    doc: (first: unknown, coll?: string, id?: string) => (
      id
        ? { path: `${coll}/${id}`, id }
        : { path: `${(first as { path: string }).path}/generated-result`, id: 'generated-result' }
    ),
    setDoc: async (ref: { path: string }, value: Record<string, unknown>) => {
      store.set(ref.path, clone(value));
    },
    updateDoc: async (ref: { path: string }, patch: Record<string, unknown>) => {
      const next = { ...(store.get(ref.path) ?? {}) };
      for (const [key, value] of Object.entries(patch)) {
        if (value === deleteSentinel) delete next[key];
        else next[key] = clone(value);
      }
      store.set(ref.path, next);
    },
  };
});

vi.mock('../utils/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: fs.collection,
  doc: fs.doc,
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: fs.setDoc,
  updateDoc: fs.updateDoc,
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  increment: vi.fn(),
  deleteField: () => fs.deleteSentinel,
}));

import { gradeSubmission, saveQuestResult, setResultApproval } from '../utils/storage';

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

describe('saveQuestResult attempt identity', () => {
  it('uses attemptId as the deterministic Firestore document id', async () => {
    const id = await saveQuestResult({
      questId: 'q1',
      attemptId: 'attempt-123',
      playerName: 'Ана',
      points: 50,
      completedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(id).toBe('attempt-123');
    expect(fs.store.get('quest_results/attempt-123')).toMatchObject({
      id: 'attempt-123',
      attemptId: 'attempt-123',
    });
  });
});

describe('setResultApproval', () => {
  it('approves with only the timestamp and authenticated teacher identity', async () => {
    const approval = await setResultApproval('r1', 'teacher-1', true);

    expect(approval.approvedBy).toBe('teacher-1');
    expect(Date.parse(approval.approvedAt!)).not.toBeNaN();
    expect(fs.store.get('quest_results/r1')).toEqual(approval);
  });

  it('revokes both approval fields without rewriting immutable result data', async () => {
    fs.store.set('quest_results/r1', {
      approvedAt: '2026-01-01T00:00:00.000Z',
      approvedBy: 'teacher-1',
      points: 50,
    });

    const approval = await setResultApproval('r1', 'teacher-1', false);

    expect(approval).toEqual({ approvedAt: undefined, approvedBy: undefined });
    expect(fs.store.get('quest_results/r1')).toEqual({ points: 50 });
  });
});
