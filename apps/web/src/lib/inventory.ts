import type { BaseStage, InventoryItem, SwitchStage } from 'shared';

export function normalizeCollectedItemIds(
  itemIds: string[],
  inventoryItems: InventoryItem[] | undefined,
): string[] {
  const allowed = new Set((inventoryItems ?? []).map(item => item.id));
  const unique = Array.from(new Set(itemIds.filter(Boolean)));
  return unique.filter(id => allowed.has(id));
}

export function hasRequiredItem(collectedItemIds: string[], requiredItemId?: string): boolean {
  return !requiredItemId || collectedItemIds.includes(requiredItemId);
}

export function canAccessStage(
  stage: Pick<BaseStage, 'requiresItemId'>,
  collectedItemIds: string[],
): boolean {
  return hasRequiredItem(collectedItemIds, stage.requiresItemId);
}

export function collectGrantedItem(
  collectedItemIds: string[],
  stage: Pick<BaseStage, 'grantsItemId'>,
): string[] {
  if (!stage.grantsItemId || collectedItemIds.includes(stage.grantsItemId)) return collectedItemIds;
  return [...collectedItemIds, stage.grantsItemId];
}

export function evaluateSwitchTarget(
  switchStage: SwitchStage,
  currentPoints: number,
  completedStageIds: string[],
  collectedItemIds: string[],
): string | null {
  for (const condition of switchStage.conditions) {
    const minOk = condition.minPoints === undefined || currentPoints >= condition.minPoints;
    const maxOk = condition.maxPoints === undefined || currentPoints <= condition.maxPoints;
    const stageOk = !condition.requiredStageIds?.length || condition.requiredStageIds.every(id => completedStageIds.includes(id));
    const itemOk = hasRequiredItem(collectedItemIds, condition.requiredItemId);
    if (minOk && maxOk && stageOk && itemOk && condition.targetStageId) return condition.targetStageId;
  }

  return switchStage.defaultTargetStageId || null;
}