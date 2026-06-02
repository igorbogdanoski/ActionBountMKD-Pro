import { describe, expect, it } from 'vitest';
import type { Quest, Stage } from 'shared';
import { getFindSpotMarkers, getFindSpotStages, reorderStagesByIds, updateFindSpotStageCoordinates } from '../lib/findSpotPlanner';

const stages: Stage[] = [
  {
    id: 'info-1',
    type: 'INFO',
    title: 'Intro',
    description: '',
    order: 0,
    points: 0,
    mediaType: 'none',
  },
  {
    id: 'spot-1',
    type: 'FIND_SPOT',
    title: 'Плоштад',
    description: '',
    order: 1,
    points: 50,
    targetCoordinates: { latitude: 41.9981, longitude: 21.4254 },
    radiusMeters: 30,
    showMode: 'map',
    requiredToAdvance: true,
  },
  {
    id: 'spot-2',
    type: 'FIND_SPOT',
    title: 'Мост',
    description: '',
    order: 2,
    points: 75,
    targetCoordinates: { latitude: 42.0, longitude: 21.43 },
    radiusMeters: 25,
    showMode: 'map',
    requiredToAdvance: true,
  },
];

describe('findSpotPlanner helpers', () => {
  it('extracts only find spot stages', () => {
    expect(getFindSpotStages(stages).map(stage => stage.id)).toEqual(['spot-1', 'spot-2']);
  });

  it('builds ordered markers for the map planner', () => {
    expect(getFindSpotMarkers(stages)).toEqual([
      {
        stageId: 'spot-1',
        order: 1,
        title: 'Плоштад',
        coordinates: { latitude: 41.9981, longitude: 21.4254 },
      },
      {
        stageId: 'spot-2',
        order: 2,
        title: 'Мост',
        coordinates: { latitude: 42.0, longitude: 21.43 },
      },
    ]);
  });

  it('updates coordinates for one find spot stage without touching other stages', () => {
    const updated = updateFindSpotStageCoordinates(stages, 'spot-2', { latitude: 41.99, longitude: 21.41 });
    expect(updated[2]).toMatchObject({
      id: 'spot-2',
      targetCoordinates: { latitude: 41.99, longitude: 21.41 },
    });
    expect(updated[1]).toMatchObject({
      id: 'spot-1',
      targetCoordinates: { latitude: 41.9981, longitude: 21.4254 },
    });
  });

  it('reorders mapped stages by id and normalizes order values', () => {
    const reordered = reorderStagesByIds(stages, ['spot-2', 'spot-1']);
    expect(reordered.map(stage => stage.id)).toEqual(['spot-2', 'spot-1', 'info-1']);
    expect(reordered.map(stage => stage.order)).toEqual([0, 1, 2]);
  });
});