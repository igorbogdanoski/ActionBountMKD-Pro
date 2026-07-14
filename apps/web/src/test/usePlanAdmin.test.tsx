// Verifies that an admin account is never gated behind plan limits/upsells —
// regardless of what user_profiles.plan actually holds — since the platform
// owner isn't a paying customer.

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlan } from '../hooks/usePlan';

const authState = vi.hoisted(() => ({ profile: null as { plan: string } | null, isAdmin: false }));
vi.mock('../utils/AuthContext', () => ({
  useAuth: () => authState,
}));

describe('usePlan for an admin account', () => {
  it('reports enterprise limits even when the Firestore profile plan is free', () => {
    authState.profile = { plan: 'free' };
    authState.isAdmin = true;

    const { result } = renderHook(() => usePlan());

    expect(result.current.planId).toBe('enterprise');
    expect(result.current.isEnterprise).toBe(true);
    expect(result.current.can('canUseAI')).toBe(true);
    expect(result.current.can('canGoPublic')).toBe(true);
    expect(result.current.can('canExportCSV')).toBe(true);
    expect(result.current.can('canCollaborate')).toBe(true);
    expect(result.current.isAtLimit('quests', 999999)).toBe(false);
  });

  it('still respects the real plan for a non-admin account', () => {
    authState.profile = { plan: 'free' };
    authState.isAdmin = false;

    const { result } = renderHook(() => usePlan());

    expect(result.current.planId).toBe('free');
    expect(result.current.can('canUseAI')).toBe(false);
  });
});
