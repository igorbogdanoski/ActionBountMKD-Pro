import { describe, expect, it } from 'vitest';
import { computeAchievements, type AchievementInput } from '../utils/achievements';

const base: AchievementInput = {
  points: 0,
  maxPoints: 100,
  completedStages: 0,
  totalStages: 5,
  collectedItems: 0,
  totalItems: 0,
};

const ids = (input: AchievementInput) => computeAchievements(input).map(a => a.id);

describe('computeAchievements', () => {
  it('awards finisher only when every stage is completed', () => {
    expect(ids({ ...base, completedStages: 4 })).not.toContain('finisher');
    expect(ids({ ...base, completedStages: 5 })).toContain('finisher');
  });

  it('never awards finisher when the quest has no stages', () => {
    expect(ids({ ...base, totalStages: 0, completedStages: 0 })).not.toContain('finisher');
  });

  it('awards perfect at full score and not sharp', () => {
    const got = ids({ ...base, points: 100, maxPoints: 100 });
    expect(got).toContain('perfect');
    expect(got).not.toContain('sharp');
  });

  it('awards sharp from 80% up to (but not including) perfect', () => {
    expect(ids({ ...base, points: 80, maxPoints: 100 })).toContain('sharp');
    expect(ids({ ...base, points: 79, maxPoints: 100 })).not.toContain('sharp');
    expect(ids({ ...base, points: 99, maxPoints: 100 })).toContain('sharp');
  });

  it('skips score badges when there are no scorable points', () => {
    const got = ids({ ...base, points: 0, maxPoints: 0 });
    expect(got).not.toContain('perfect');
    expect(got).not.toContain('sharp');
  });

  it('awards collector only when all items are collected', () => {
    expect(ids({ ...base, totalItems: 3, collectedItems: 2 })).not.toContain('collector');
    expect(ids({ ...base, totalItems: 3, collectedItems: 3 })).toContain('collector');
    expect(ids({ ...base, totalItems: 0, collectedItems: 0 })).not.toContain('collector');
  });

  it('returns finisher first, then score, then collector', () => {
    const got = ids({ points: 100, maxPoints: 100, completedStages: 5, totalStages: 5, collectedItems: 2, totalItems: 2 });
    expect(got).toEqual(['finisher', 'perfect', 'collector']);
  });
});
