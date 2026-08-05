export interface AttemptIdentified {
  attemptId?: string;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
}

export function hasSameQueuedPayload(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function queueConflict(attemptId: string): TypeError {
  return new TypeError(`Offline queue identity conflict for attemptId "${attemptId}"`);
}

/**
 * Adds one result without allowing repeated UI events or retries to grow the
 * queue. Reusing an attempt id for different data is rejected fail-closed.
 */
export function appendUniquePendingResult<T extends AttemptIdentified>(
  queue: readonly T[],
  result: T,
): T[] {
  if (!result.attemptId) return [...queue, result];

  const existing = queue.find(item => item.attemptId === result.attemptId);
  if (!existing) return [...queue, result];
  if (hasSameQueuedPayload(existing, result)) return [...queue];
  throw queueConflict(result.attemptId);
}

/** Backfills legacy ids once and removes exact duplicate retry entries. */
export function normalizePendingResults<T extends AttemptIdentified>(
  queue: readonly T[],
  createId: () => string,
): T[] {
  let normalized: T[] = [];
  for (const item of queue) {
    const withIdentity = item.attemptId
      ? item
      : ({ ...item, attemptId: createId() } as T);
    normalized = appendUniquePendingResult(normalized, withIdentity);
  }
  return normalized;
}

/**
 * Applies sync success to the latest queue, not to the stale snapshot that was
 * read before network I/O. Results appended while sync was running therefore
 * survive. An item is removed only when both its id and payload match a
 * successfully persisted snapshot item.
 */
export function reconcilePendingResults<T extends AttemptIdentified>(
  syncedSnapshot: readonly T[],
  latestQueue: readonly T[],
  successfulAttemptIds: ReadonlySet<string>,
): T[] {
  const snapshotById = new Map(
    syncedSnapshot
      .filter((item): item is T & { attemptId: string } => Boolean(item.attemptId))
      .map(item => [item.attemptId, item]),
  );

  return latestQueue.filter(item => {
    if (!item.attemptId || !successfulAttemptIds.has(item.attemptId)) return true;
    const synced = snapshotById.get(item.attemptId);
    return !synced || !hasSameQueuedPayload(synced, item);
  });
}
