import { describe, expect, it } from 'vitest';
import { progressPercent, milestoneEncouragement } from '../utils/encouragement';

describe('progressPercent', () => {
  it('returns 0 when total is zero or negative', () => {
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(3, 0)).toBe(0);
    expect(progressPercent(1, -5)).toBe(0);
  });

  it('returns 0 when nothing completed', () => {
    expect(progressPercent(0, 8)).toBe(0);
  });

  it('returns 100 at completion', () => {
    expect(progressPercent(8, 8)).toBe(100);
  });

  it('clamps overflow to 100', () => {
    expect(progressPercent(12, 8)).toBe(100);
  });

  it('clamps negative completed to 0', () => {
    expect(progressPercent(-2, 8)).toBe(0);
  });

  it('rounds to nearest integer percent', () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(2, 3)).toBe(67);
    expect(progressPercent(1, 8)).toBe(13);
  });
});

describe('milestoneEncouragement', () => {
  it('returns null when total is zero or nothing completed', () => {
    expect(milestoneEncouragement(0, 0)).toBeNull();
    expect(milestoneEncouragement(0, 8)).toBeNull();
    expect(milestoneEncouragement(3, 0)).toBeNull();
  });

  it('returns completion message when all stages done', () => {
    expect(milestoneEncouragement(8, 8)).toBe('Браво! Ја заврши целата авантура! 🎉');
    expect(milestoneEncouragement(10, 8)).toBe('Браво! Ја заврши целата авантура! 🎉');
  });

  it('returns quarter / half / three-quarter messages at milestones', () => {
    expect(milestoneEncouragement(1, 4)).toBe('Добар почеток — продолжи така! 🚀');
    expect(milestoneEncouragement(2, 4)).toBe('Половина пат помина — одлично одиш! ⭐');
    expect(milestoneEncouragement(3, 4)).toBe('Само уште малку — речиси си таму! 💪');
  });

  it('returns null between milestones', () => {
    expect(milestoneEncouragement(5, 12)).toBeNull();
  });

  it('handles small totals without throwing', () => {
    expect(milestoneEncouragement(1, 2)).toBe('Половина пат помина — одлично одиш! ⭐');
    expect(milestoneEncouragement(2, 2)).toBe('Браво! Ја заврши целата авантура! 🎉');
    expect(milestoneEncouragement(1, 3)).toBe('Добар почеток — продолжи така! 🚀');
    expect(milestoneEncouragement(3, 3)).toBe('Браво! Ја заврши целата авантура! 🎉');
  });
});
