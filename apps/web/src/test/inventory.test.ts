import { describe, expect, it } from 'vitest';
import {
  canAccessStage,
  collectGrantedItem,
  evaluateSwitchTarget,
  hasRequiredItem,
  normalizeCollectedItemIds,
} from '../lib/inventory';

describe('inventory helpers', () => {
  it('normalizes collected items to unique ids that exist in the quest inventory', () => {
    const ids = normalizeCollectedItemIds(['map', 'map', 'ghost', 'badge'], [
      { id: 'map', name: 'Мапа' },
      { id: 'badge', name: 'Значка' },
    ]);
    expect(ids).toEqual(['map', 'badge']);
  });

  it('treats empty requirement as accessible', () => {
    expect(hasRequiredItem([], undefined)).toBe(true);
    expect(canAccessStage({ requiresItemId: '' }, [])).toBe(true);
  });

  it('blocks access when the required item is missing', () => {
    expect(canAccessStage({ requiresItemId: 'key' }, ['map'])).toBe(false);
    expect(canAccessStage({ requiresItemId: 'key' }, ['map', 'key'])).toBe(true);
  });

  it('collects a granted item only once', () => {
    const ids = collectGrantedItem(['map'], { grantsItemId: 'key' });
    expect(ids).toEqual(['map', 'key']);
    expect(collectGrantedItem(ids, { grantsItemId: 'key' })).toBe(ids);
  });

  it('routes a switch only when score, stages and item gate all match', () => {
    const target = evaluateSwitchTarget(
      {
        id: 'sw1',
        type: 'SWITCH',
        title: 'Switch',
        description: '',
        order: 0,
        points: 0,
        conditions: [
          {
            id: 'c1',
            label: 'Need key',
            minPoints: 100,
            requiredStageIds: ['stage-a'],
            requiredItemId: 'key',
            targetStageId: 'locked-target',
          },
        ],
        defaultTargetStageId: 'fallback',
        showPathsToPlayer: false,
      },
      120,
      ['stage-a'],
      ['map'],
    );
    expect(target).toBe('fallback');
    expect(
      evaluateSwitchTarget(
        {
          id: 'sw1',
          type: 'SWITCH',
          title: 'Switch',
          description: '',
          order: 0,
          points: 0,
          conditions: [
            {
              id: 'c1',
              label: 'Need key',
              minPoints: 100,
              requiredStageIds: ['stage-a'],
              requiredItemId: 'key',
              targetStageId: 'locked-target',
            },
          ],
          defaultTargetStageId: 'fallback',
          showPathsToPlayer: false,
        },
        120,
        ['stage-a'],
        ['map', 'key'],
      ),
    ).toBe('locked-target');
  });
});