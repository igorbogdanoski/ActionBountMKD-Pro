import { describe, expect, it } from 'vitest';
import { clearCollectedItemIds, loadCollectedItemIds, saveCollectedItemIds } from '../utils/playerInventoryState';

describe('playerInventoryState', () => {
  it('saves and loads collected item ids', () => {
    saveCollectedItemIds('quest-1', 'igor', ['key', 'map']);
    expect(loadCollectedItemIds('quest-1', 'igor')).toEqual(['key', 'map']);
  });

  it('returns empty array for invalid JSON', () => {
    localStorage.setItem('ab_inventory_progress:quest-1:igor', '{oops');
    expect(loadCollectedItemIds('quest-1', 'igor')).toEqual([]);
  });

  it('clears stored progress', () => {
    saveCollectedItemIds('quest-1', 'igor', ['key']);
    clearCollectedItemIds('quest-1', 'igor');
    expect(loadCollectedItemIds('quest-1', 'igor')).toEqual([]);
  });
});