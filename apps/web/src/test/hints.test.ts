import { describe, expect, it } from 'vitest';
import { shouldRevealHint } from '../utils/hints';

describe('shouldRevealHint', () => {
  it('hides the hint before any wrong attempt', () => {
    expect(shouldRevealHint(0, 'Помисли на множители')).toBe(false);
  });

  it('reveals the hint after the first wrong attempt', () => {
    expect(shouldRevealHint(1, 'Помисли на множители')).toBe(true);
    expect(shouldRevealHint(3, 'Помисли на множители')).toBe(true);
  });

  it('never reveals when there is no hint text', () => {
    expect(shouldRevealHint(5, undefined)).toBe(false);
    expect(shouldRevealHint(5, null)).toBe(false);
    expect(shouldRevealHint(5, '')).toBe(false);
  });

  it('treats whitespace-only hint text as empty', () => {
    expect(shouldRevealHint(2, '   ')).toBe(false);
  });

  it('ignores negative attempt counts', () => {
    expect(shouldRevealHint(-1, 'Помош')).toBe(false);
  });
});
