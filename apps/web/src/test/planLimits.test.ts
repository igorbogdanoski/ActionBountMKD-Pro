/**
 * Plan limits & feature-gating logic tests.
 *
 * Tests the PLAN_LIMITS constants AND the pure helper logic extracted from
 * `usePlan` (can / isAtLimit / flag derivations) — without needing React.
 * These are the most business-critical constraints in the app: a bug here
 * would silently give users the wrong access level.
 */
import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, type PlanId, type PlanLimits } from 'shared';

// ─── Pure helpers (mirrors usePlan without React) ────────────────────────────

function can(limits: PlanLimits, feature: keyof PlanLimits): boolean {
  const val = limits[feature];
  return typeof val === 'boolean' ? val : true;
}

function isAtLimit(
  limits: PlanLimits,
  resource: 'quests' | 'stages' | 'players',
  current: number,
): boolean {
  const map: Record<typeof resource, number> = {
    quests:  limits.maxQuests,
    stages:  limits.maxStagesPerQuest,
    players: limits.maxPlayersPerQuest,
  };
  const max = map[resource];
  return max !== -1 && current >= max;
}

const isFree       = (p: PlanId) => p === 'free';
const isPro        = (p: PlanId) => p === 'pro' || p === 'enterprise';
const isEnterprise = (p: PlanId) => p === 'enterprise';

// ─── PLAN_LIMITS shape ────────────────────────────────────────────────────────

describe('PLAN_LIMITS structure', () => {
  const plans: PlanId[] = ['free', 'starter', 'pro', 'enterprise'];

  it('exports limits for every plan', () => {
    for (const plan of plans) {
      expect(PLAN_LIMITS[plan]).toBeDefined();
    }
  });

  it('every plan has all required keys', () => {
    const keys: (keyof PlanLimits)[] = [
      'maxQuests', 'maxStagesPerQuest', 'maxPlayersPerQuest',
      'canExportCSV', 'canCollaborate', 'canUseAI', 'canGoPublic',
    ];
    for (const plan of plans) {
      for (const key of keys) {
        expect(PLAN_LIMITS[plan]).toHaveProperty(key);
      }
    }
  });

  it('enterprise uses -1 (unlimited) for all numeric limits', () => {
    const { maxQuests, maxStagesPerQuest, maxPlayersPerQuest } = PLAN_LIMITS.enterprise;
    expect(maxQuests).toBe(-1);
    expect(maxStagesPerQuest).toBe(-1);
    expect(maxPlayersPerQuest).toBe(-1);
  });

  it('plan limits are strictly increasing: free < starter < pro', () => {
    const f = PLAN_LIMITS.free;
    const s = PLAN_LIMITS.starter;
    const p = PLAN_LIMITS.pro;
    expect(s.maxQuests).toBeGreaterThan(f.maxQuests);
    expect(p.maxQuests).toBeGreaterThan(s.maxQuests);
    expect(s.maxStagesPerQuest).toBeGreaterThan(f.maxStagesPerQuest);
    expect(p.maxStagesPerQuest).toBeGreaterThan(s.maxStagesPerQuest);
    expect(s.maxPlayersPerQuest).toBeGreaterThan(f.maxPlayersPerQuest);
    expect(p.maxPlayersPerQuest).toBeGreaterThan(s.maxPlayersPerQuest);
  });
});

// ─── Free plan ────────────────────────────────────────────────────────────────

describe('free plan feature flags', () => {
  const limits = PLAN_LIMITS.free;

  it('cannot export CSV', ()     => expect(can(limits, 'canExportCSV')).toBe(false));
  it('cannot collaborate', ()    => expect(can(limits, 'canCollaborate')).toBe(false));
  it('cannot use AI', ()         => expect(can(limits, 'canUseAI')).toBe(false));
  it('cannot go public', ()      => expect(can(limits, 'canGoPublic')).toBe(false));
});

describe('free plan numeric limits', () => {
  const limits = PLAN_LIMITS.free;

  it('3 quests max', () => {
    expect(isAtLimit(limits, 'quests', 2)).toBe(false);
    expect(isAtLimit(limits, 'quests', 3)).toBe(true);
    expect(isAtLimit(limits, 'quests', 4)).toBe(true);
  });

  it('10 stages per quest max', () => {
    expect(isAtLimit(limits, 'stages', 9)).toBe(false);
    expect(isAtLimit(limits, 'stages', 10)).toBe(true);
  });

  it('20 players per quest max', () => {
    expect(isAtLimit(limits, 'players', 19)).toBe(false);
    expect(isAtLimit(limits, 'players', 20)).toBe(true);
  });
});

// ─── Starter plan ────────────────────────────────────────────────────────────

describe('starter plan', () => {
  const limits = PLAN_LIMITS.starter;

  it('can export CSV, use AI, go public', () => {
    expect(can(limits, 'canExportCSV')).toBe(true);
    expect(can(limits, 'canUseAI')).toBe(true);
    expect(can(limits, 'canGoPublic')).toBe(true);
  });

  it('cannot collaborate (Pro+ only)', () => {
    expect(can(limits, 'canCollaborate')).toBe(false);
  });

  it('15 quests max — boundary', () => {
    expect(isAtLimit(limits, 'quests', 14)).toBe(false);
    expect(isAtLimit(limits, 'quests', 15)).toBe(true);
  });
});

// ─── Pro plan ────────────────────────────────────────────────────────────────

describe('pro plan', () => {
  const limits = PLAN_LIMITS.pro;

  it('can use all features', () => {
    expect(can(limits, 'canExportCSV')).toBe(true);
    expect(can(limits, 'canCollaborate')).toBe(true);
    expect(can(limits, 'canUseAI')).toBe(true);
    expect(can(limits, 'canGoPublic')).toBe(true);
  });

  it('100 quests max — boundary', () => {
    expect(isAtLimit(limits, 'quests', 99)).toBe(false);
    expect(isAtLimit(limits, 'quests', 100)).toBe(true);
  });

  it('500 players max — boundary', () => {
    expect(isAtLimit(limits, 'players', 499)).toBe(false);
    expect(isAtLimit(limits, 'players', 500)).toBe(true);
  });
});

// ─── Enterprise plan ─────────────────────────────────────────────────────────

describe('enterprise plan (unlimited)', () => {
  const limits = PLAN_LIMITS.enterprise;

  it('never hits limits with -1 sentinel', () => {
    expect(isAtLimit(limits, 'quests',  99_999)).toBe(false);
    expect(isAtLimit(limits, 'stages',  99_999)).toBe(false);
    expect(isAtLimit(limits, 'players', 99_999)).toBe(false);
  });

  it('has all features enabled', () => {
    expect(can(limits, 'canExportCSV')).toBe(true);
    expect(can(limits, 'canCollaborate')).toBe(true);
    expect(can(limits, 'canUseAI')).toBe(true);
    expect(can(limits, 'canGoPublic')).toBe(true);
  });
});

// ─── Plan identity flags ─────────────────────────────────────────────────────

describe('plan identity flags', () => {
  it('isFree only for free', () => {
    expect(isFree('free')).toBe(true);
    expect(isFree('starter')).toBe(false);
    expect(isFree('pro')).toBe(false);
    expect(isFree('enterprise')).toBe(false);
  });

  it('isPro for pro and enterprise', () => {
    expect(isPro('free')).toBe(false);
    expect(isPro('starter')).toBe(false);
    expect(isPro('pro')).toBe(true);
    expect(isPro('enterprise')).toBe(true);
  });

  it('isEnterprise only for enterprise', () => {
    expect(isEnterprise('free')).toBe(false);
    expect(isEnterprise('starter')).toBe(false);
    expect(isEnterprise('pro')).toBe(false);
    expect(isEnterprise('enterprise')).toBe(true);
  });
});

// ─── isAtLimit edge cases ────────────────────────────────────────────────────

describe('isAtLimit edge cases', () => {
  it('current = 0 is never at limit', () => {
    expect(isAtLimit(PLAN_LIMITS.free, 'quests', 0)).toBe(false);
  });

  it('current negative is never at limit', () => {
    expect(isAtLimit(PLAN_LIMITS.free, 'quests', -1)).toBe(false);
  });

  it('boundary: current = max is at limit (not max-1)', () => {
    // Free maxQuests = 3; reaching exactly 3 means you are AT the limit
    expect(isAtLimit(PLAN_LIMITS.free, 'quests', 3)).toBe(true);
    expect(isAtLimit(PLAN_LIMITS.free, 'quests', 2)).toBe(false);
  });
});
