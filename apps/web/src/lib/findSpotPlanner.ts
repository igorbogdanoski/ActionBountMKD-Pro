import type { Coordinates, FindSpotStage, Stage } from 'shared';

export interface FindSpotMarker {
  stageId: string;
  order: number;
  title: string;
  coordinates: Coordinates;
}

export function getFindSpotStages(stages: Stage[]): FindSpotStage[] {
  return stages.filter((stage): stage is FindSpotStage => stage.type === 'FIND_SPOT');
}

export function getFindSpotMarkers(stages: Stage[]): FindSpotMarker[] {
  return getFindSpotStages(stages).map(stage => ({
    stageId: stage.id,
    order: stage.order,
    title: stage.title,
    coordinates: stage.targetCoordinates,
  }));
}

export function updateFindSpotStageCoordinates(
  stages: Stage[],
  stageId: string,
  coordinates: Coordinates,
): Stage[] {
  return stages.map(stage => (
    stage.type === 'FIND_SPOT' && stage.id === stageId
      ? { ...stage, targetCoordinates: coordinates }
      : stage
  ));
}

export function reorderStagesByIds(stages: Stage[], orderedStageIds: string[]): Stage[] {
  if (orderedStageIds.length < 2) return stages;

  const orderMap = new Map(orderedStageIds.map((id, index) => [id, index]));
  const reordered = [...stages].sort((left, right) => {
    const leftOrder = orderMap.get(left.id);
    const rightOrder = orderMap.get(right.id);

    if (leftOrder === undefined && rightOrder === undefined) return left.order - right.order;
    if (leftOrder === undefined) return 1;
    if (rightOrder === undefined) return -1;
    return leftOrder - rightOrder;
  });

  return reordered.map((stage, index) => ({ ...stage, order: index }));
}
