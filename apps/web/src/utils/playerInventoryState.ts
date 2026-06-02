const PREFIX = 'ab_inventory_progress:';

function makeKey(questId: string, actorId: string): string {
  return `${PREFIX}${questId}:${actorId}`;
}

export function loadCollectedItemIds(questId: string, actorId: string): string[] {
  try {
    const raw = localStorage.getItem(makeKey(questId, actorId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

export function saveCollectedItemIds(questId: string, actorId: string, itemIds: string[]): void {
  localStorage.setItem(makeKey(questId, actorId), JSON.stringify(itemIds));
}

export function clearCollectedItemIds(questId: string, actorId: string): void {
  localStorage.removeItem(makeKey(questId, actorId));
}