import { describe, it, expect } from 'vitest';
import { isMatchingCorrect, isOrderingCorrect } from 'shared';
import type { MatchingPair, OrderingItem } from 'shared';

const pairs: MatchingPair[] = [
  { id: 'p1', left: 'Вода', right: 'H2O' },
  { id: 'p2', left: 'Сол', right: 'NaCl' },
];

const items: OrderingItem[] = [
  { id: 'i1', text: 'Прво' },
  { id: 'i2', text: 'Второ' },
  { id: 'i3', text: 'Трето' },
];

describe('isMatchingCorrect', () => {
  it('is correct when every pair maps to its own right side', () => {
    expect(isMatchingCorrect(pairs, { p1: 'H2O', p2: 'NaCl' })).toBe(true);
  });

  it('is incorrect when a pair is mismatched', () => {
    expect(isMatchingCorrect(pairs, { p1: 'NaCl', p2: 'H2O' })).toBe(false);
  });

  it('is incorrect when a pair is unanswered', () => {
    expect(isMatchingCorrect(pairs, { p1: 'H2O' })).toBe(false);
  });

  it('is false for an empty pair list (nothing to match)', () => {
    expect(isMatchingCorrect([], {})).toBe(false);
  });
});

describe('isOrderingCorrect', () => {
  it('is correct when the sequence exactly matches item order', () => {
    expect(isOrderingCorrect(items, ['i1', 'i2', 'i3'])).toBe(true);
  });

  it('is incorrect for a shuffled sequence', () => {
    expect(isOrderingCorrect(items, ['i2', 'i1', 'i3'])).toBe(false);
  });

  it('is incorrect when the sequence is shorter than the item list', () => {
    expect(isOrderingCorrect(items, ['i1', 'i2'])).toBe(false);
  });

  it('is false for an empty item list', () => {
    expect(isOrderingCorrect([], [])).toBe(false);
  });
});
