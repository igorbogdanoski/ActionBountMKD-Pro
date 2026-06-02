export type AdventureProgressStatus = 'new' | 'in-progress' | 'completed';

const PROGRESS_PREFIX = 'quest_progress_';
const COMPLETED_PREFIX = 'quest_completed_';

export function progressKey(adventureId: string): string {
  return `${PROGRESS_PREFIX}${adventureId}`;
}

export function completedKey(adventureId: string): string {
  return `${COMPLETED_PREFIX}${adventureId}`;
}

export function extractAdventureIds(keys: readonly string[], prefix: string): string[] {
  return keys.filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length));
}

export function getAdventureProgressStatus(
  adventureId: string,
  inProgress: Set<string>,
  completed: Set<string>,
): AdventureProgressStatus {
  if (completed.has(adventureId)) return 'completed';
  if (inProgress.has(adventureId)) return 'in-progress';
  return 'new';
}

export function readProgressIds(keys: readonly string[]): { inProgress: Set<string>; completed: Set<string> } {
  return {
    inProgress: new Set(extractAdventureIds(keys, PROGRESS_PREFIX)),
    completed: new Set(extractAdventureIds(keys, COMPLETED_PREFIX)),
  };
}
