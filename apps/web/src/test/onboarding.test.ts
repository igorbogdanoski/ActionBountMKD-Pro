import { describe, expect, it } from 'vitest';
import { shouldShowOnboarding, PLAYER_ONBOARDING_TIPS, ONBOARDING_STORAGE_KEY } from '../utils/onboarding';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return { getItem: (k: string) => (map.has(k) ? map.get(k)! : null) };
}

describe('shouldShowOnboarding', () => {
  it('shows on the first run (no flag stored)', () => {
    expect(shouldShowOnboarding(fakeStorage())).toBe(true);
  });

  it('hides once the player has been onboarded', () => {
    expect(shouldShowOnboarding(fakeStorage({ [ONBOARDING_STORAGE_KEY]: '1' }))).toBe(false);
  });

  it('fails closed when storage throws (does not trap the player)', () => {
    expect(shouldShowOnboarding({ getItem() { throw new Error('blocked'); } })).toBe(false);
  });
});

describe('PLAYER_ONBOARDING_TIPS', () => {
  it('provides a few non-empty tips', () => {
    expect(PLAYER_ONBOARDING_TIPS.length).toBeGreaterThanOrEqual(3);
    for (const tip of PLAYER_ONBOARDING_TIPS) {
      expect(tip.title.trim().length).toBeGreaterThan(0);
      expect(tip.text.trim().length).toBeGreaterThan(0);
    }
  });
});
