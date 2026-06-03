import { describe, expect, it } from 'vitest';
import { rubricMaxPoints } from 'shared';
import type { Rubric } from 'shared';

describe('rubricMaxPoints', () => {
  it('returns 0 for undefined / null', () => {
    expect(rubricMaxPoints(undefined)).toBe(0);
    expect(rubricMaxPoints(null)).toBe(0);
  });

  it('returns 0 for a rubric without criteria', () => {
    expect(rubricMaxPoints({ criteria: [] })).toBe(0);
  });

  it('sums the highest level points across criteria', () => {
    const rubric: Rubric = {
      criteria: [
        {
          id: 'c1',
          title: 'Точност',
          levels: [
            { id: 'l1', label: 'Одлично', points: 4 },
            { id: 'l2', label: 'Делумно', points: 2 },
            { id: 'l3', label: 'Недоволно', points: 0 },
          ],
        },
        {
          id: 'c2',
          title: 'Креативност',
          levels: [
            { id: 'l4', label: 'Одлично', points: 3 },
            { id: 'l5', label: 'Слабо', points: 1 },
          ],
        },
      ],
    };
    expect(rubricMaxPoints(rubric)).toBe(7);
  });

  it('ignores order — picks the max level regardless of position', () => {
    const rubric: Rubric = {
      criteria: [
        {
          id: 'c1',
          title: 'X',
          levels: [
            { id: 'l1', label: 'low', points: 1 },
            { id: 'l2', label: 'high', points: 5 },
            { id: 'l3', label: 'mid', points: 3 },
          ],
        },
      ],
    };
    expect(rubricMaxPoints(rubric)).toBe(5);
  });

  it('treats a criterion with no levels as 0', () => {
    const rubric: Rubric = {
      criteria: [
        { id: 'c1', title: 'A', levels: [] },
        { id: 'c2', title: 'B', levels: [{ id: 'l1', label: 'ok', points: 6 }] },
      ],
    };
    expect(rubricMaxPoints(rubric)).toBe(6);
  });

  it('guards against NaN / missing points values', () => {
    const rubric = {
      criteria: [
        {
          id: 'c1',
          title: 'A',
          levels: [
            { id: 'l1', label: 'x', points: NaN as unknown as number },
            { id: 'l2', label: 'y', points: 2 },
          ],
        },
      ],
    } as Rubric;
    expect(rubricMaxPoints(rubric)).toBe(2);
  });
});
