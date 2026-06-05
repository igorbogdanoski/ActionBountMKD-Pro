/**
 * Device-level display preferences (Phase 7E-3).
 *
 * "Outdoor mode" is a high-contrast, bolder rendering that keeps the app
 * readable in direct sunlight during field adventures. It is stored per device
 * (localStorage), not per account, because it follows the screen, not the user.
 * The pure helpers below are storage-agnostic so they stay unit-testable.
 */
export const OUTDOOR_STORAGE_KEY = 'av_outdoor_mode';
export const OUTDOOR_CLASS = 'outdoor';

interface ReadableStorage {
  getItem(key: string): string | null;
}

/** Reads the persisted outdoor-mode flag; defaults to false on any failure. */
export function readOutdoorPref(storage?: ReadableStorage | null): boolean {
  try {
    return storage?.getItem(OUTDOOR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Serialises the outdoor-mode flag for storage. Pure. */
export function outdoorPrefValue(enabled: boolean): string {
  return enabled ? '1' : '0';
}
