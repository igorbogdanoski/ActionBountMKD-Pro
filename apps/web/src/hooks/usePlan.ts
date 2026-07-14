import { useAuth } from '../utils/AuthContext';
import { PLAN_LIMITS, type PlanId, type PlanLimits } from 'shared';

export interface UsePlanReturn {
  planId: PlanId;
  limits: PlanLimits;
  can: (feature: keyof PlanLimits) => boolean;
  isAtLimit: (resource: 'quests' | 'stages' | 'players', current: number) => boolean;
  isFree: boolean;
  isPro: boolean;
  isEnterprise: boolean;
}

export function usePlan(): UsePlanReturn {
  const { profile, isAdmin } = useAuth();
  // The platform admin isn't a customer — never gate them behind plan
  // limits/upsells, regardless of what user_profiles.plan happens to hold.
  const planId: PlanId = isAdmin ? 'enterprise' : (profile?.plan ?? 'free');
  const limits = PLAN_LIMITS[planId];

  return {
    planId,
    limits,
    can: (feature) => {
      const val = limits[feature];
      return typeof val === 'boolean' ? val : true;
    },
    isAtLimit: (resource, current) => {
      const map: Record<typeof resource, number> = {
        quests:  limits.maxQuests,
        stages:  limits.maxStagesPerQuest,
        players: limits.maxPlayersPerQuest,
      };
      const max = map[resource];
      return max !== -1 && current >= max;
    },
    isFree:       planId === 'free',
    isPro:        planId === 'pro' || planId === 'enterprise',
    isEnterprise: planId === 'enterprise',
  };
}

