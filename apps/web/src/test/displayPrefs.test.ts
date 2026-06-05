import { describe, expect, it } from 'vitest';
import { readOutdoorPref, outdoorPrefValue, OUTDOOR_STORAGE_KEY } from '../utils/displayPrefs';

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
  };
}

describe('readOutdoorPref', () => {
  it('returns false when the key is absent', () => {
    expect(readOutdoorPref(fakeStorage())).toBe(false);
  });

  it('returns false when the stored value is not "1"', () => {
    expect(readOutdoorPref(fakeStorage({ [OUTDOOR_STORAGE_KEY]: '0' }))).toBe(false);
    expect(readOutdoorPref(fakeStorage({ [OUTDOOR_STORAGE_KEY]: 'yes' }))).toBe(false);
  });

  it('returns true only for the exact value "1"', () => {
    expect(readOutdoorPref(fakeStorage({ [OUTDOOR_STORAGE_KEY]: '1' }))).toBe(true);
  });

  it('returns false when storage is missing or throws', () => {
    expect(readOutdoorPref(null)).toBe(false);
    expect(readOutdoorPref(undefined)).toBe(false);
    expect(readOutdoorPref({ getItem() { throw new Error('blocked'); } })).toBe(false);
  });
});

describe('outdoorPrefValue', () => {
  it('serialises the flag to "1" / "0"', () => {
    expect(outdoorPrefValue(true)).toBe('1');
    expect(outdoorPrefValue(false)).toBe('0');
  });
});
