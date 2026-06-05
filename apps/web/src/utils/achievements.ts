/**
 * Player achievement badges (Phase 7E-5).
 *
 * Pure derivation of the badges a player earned in a single play-through, used
 * on the finish screen. No I/O, so it stays unit-testable and can be reused by
 * the native app later.
 */
export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface AchievementInput {
  points: number;
  maxPoints: number;
  completedStages: number;
  totalStages: number;
  collectedItems: number;
  totalItems: number;
}

/**
 * Returns the earned badges, highest-signal first. Score badges are skipped
 * when the quest has no scorable points (maxPoints <= 0) to avoid a misleading
 * "perfect" on a zero-point quest.
 */
export function computeAchievements(input: AchievementInput): Achievement[] {
  const { points, maxPoints, completedStages, totalStages, collectedItems, totalItems } = input;
  const earned: Achievement[] = [];

  if (totalStages > 0 && completedStages >= totalStages) {
    earned.push({
      id: 'finisher',
      icon: '🏁',
      title: 'Авантурист',
      description: 'Ја заврши целата авантура.',
    });
  }

  if (maxPoints > 0) {
    const ratio = points / maxPoints;
    if (ratio >= 1) {
      earned.push({
        id: 'perfect',
        icon: '🌟',
        title: 'Совршен резултат',
        description: 'Освои ги сите можни поени.',
      });
    } else if (ratio >= 0.8) {
      earned.push({
        id: 'sharp',
        icon: '🎯',
        title: 'Остроумен',
        description: 'Освои над 80% од поените.',
      });
    }
  }

  if (totalItems > 0 && collectedItems >= totalItems) {
    earned.push({
      id: 'collector',
      icon: '🎒',
      title: 'Колекционер',
      description: 'Ги собра сите предмети.',
    });
  }

  return earned;
}
