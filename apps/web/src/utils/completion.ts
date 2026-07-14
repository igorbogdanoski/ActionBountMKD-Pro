/**
 * Per-stage completion analytics (Phase 7G / 5E).
 *
 * Pure derivation of how many players reached each stage, the completion rate
 * relative to all players, and the drop-off versus the previous stage. No I/O,
 * so it stays unit-testable and reusable across the dashboard and exports.
 */
export interface StageDurationLike {
  stageId: string;
  durationSec?: number;
}

export interface ResultLike {
  stageDurations?: StageDurationLike[] | null;
}

export interface StageRefLike {
  id: string;
  title?: string;
}

export interface StageCompletion {
  id: string;
  index: number;
  label: string;
  title: string;
  reached: number;
  totalPlayers: number;
  completionRate: number;
  dropOff: number;
}

/** A player "reached" a stage if a duration entry exists for it. */
function reachedCount(results: ResultLike[], stageId: string): number {
  return results.reduce((acc, r) => {
    const hit = r.stageDurations?.some((sd) => sd.stageId === stageId);
    return hit ? acc + 1 : acc;
  }, 0);
}

/**
 * Returns one entry per stage (in order) with completion rate as a 0–100 integer
 * relative to the total number of players, plus the percentage-point drop-off
 * from the previous stage. Empty input yields an empty array.
 */
export function computeStageCompletion(
  stages: StageRefLike[],
  results: ResultLike[],
): StageCompletion[] {
  const totalPlayers = results.length;

  return stages.map((stage, index) => {
    const reached = reachedCount(results, stage.id);
    const completionRate = totalPlayers > 0 ? Math.round((reached / totalPlayers) * 100) : 0;
    return {
      id: stage.id,
      index,
      label: `Етапа ${index + 1}`,
      title: stage.title ?? '',
      reached,
      totalPlayers,
      completionRate,
      dropOff: 0,
    };
  }).map((entry, index, all) => {
    if (index === 0) return entry;
    const dropOff = Math.max(0, all[index - 1].completionRate - entry.completionRate);
    return { ...entry, dropOff };
  });
}

// ─── Quiz accuracy (Phase 1 — cross-quest weak-spot dashboard) ────────────────

export interface QuizStageLike {
  id: string;
  title?: string;
}

export interface QuizAnswerLike {
  stageId: string;
  correct: boolean;
}

export interface QuizResultLike {
  quizAnswers?: QuizAnswerLike[] | null;
}

export interface QuizAccuracy {
  id: string;
  title: string;
  answers: number;
  /** 0-100, or null when no player has answered this question yet. */
  accuracy: number | null;
}

/** Per-question accuracy across a set of results — the same derivation
 * ResultsDashboard uses per-quest, extracted so it can also be aggregated
 * across every quest a teacher owns (cross-quest weak-spot view). */
export function computeQuizAccuracy(quizStages: QuizStageLike[], results: QuizResultLike[]): QuizAccuracy[] {
  return quizStages.map(stage => {
    const answers = results.flatMap(r => (r.quizAnswers ?? []).filter(a => a.stageId === stage.id));
    const correctCount = answers.filter(a => a.correct).length;
    const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : null;
    return { id: stage.id, title: stage.title ?? '', answers: answers.length, accuracy };
  });
}
