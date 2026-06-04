import { describe, expect, it } from 'vitest';
import { questMatchesPedagogy } from 'shared';
import type { Quest } from 'shared';

const quest = (pedagogy?: Quest['pedagogy']): Pick<Quest, 'pedagogy'> => ({ pedagogy });

describe('questMatchesPedagogy', () => {
  it('matches everything when filter is empty', () => {
    expect(questMatchesPedagogy(quest(), { subject: '', grade: '' })).toBe(true);
    expect(questMatchesPedagogy(quest({ subject: 'Математика' }), {})).toBe(true);
    expect(questMatchesPedagogy(null, {})).toBe(true);
  });

  it('filters by subject', () => {
    expect(questMatchesPedagogy(quest({ subject: 'Математика' }), { subject: 'Математика' })).toBe(true);
    expect(questMatchesPedagogy(quest({ subject: 'Физика' }), { subject: 'Математика' })).toBe(false);
    expect(questMatchesPedagogy(quest(), { subject: 'Математика' })).toBe(false);
  });

  it('filters by grade', () => {
    expect(questMatchesPedagogy(quest({ grade: '6 одд.' }), { grade: '6 одд.' })).toBe(true);
    expect(questMatchesPedagogy(quest({ grade: '5 одд.' }), { grade: '6 одд.' })).toBe(false);
    expect(questMatchesPedagogy(quest(), { grade: '6 одд.' })).toBe(false);
  });

  it('treats grade „Сите" as matching any grade constraint', () => {
    expect(questMatchesPedagogy(quest({ grade: 'Сите' }), { grade: '6 одд.' })).toBe(true);
  });

  it('requires both subject and grade when both are set', () => {
    const q = quest({ subject: 'Математика', grade: '6 одд.' });
    expect(questMatchesPedagogy(q, { subject: 'Математика', grade: '6 одд.' })).toBe(true);
    expect(questMatchesPedagogy(q, { subject: 'Математика', grade: '5 одд.' })).toBe(false);
    expect(questMatchesPedagogy(q, { subject: 'Физика', grade: '6 одд.' })).toBe(false);
  });
});
