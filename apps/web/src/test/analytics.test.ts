import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canTrackAnalytics,
  hasAnalyticsConsent,
  sanitizeAnalyticsProperties,
  setAnalyticsAdapter,
  setAnalyticsConsent,
  trackEvent,
} from '../utils/analytics';

describe('analytics helpers', () => {
  afterEach(() => {
    localStorage.clear();
    setAnalyticsAdapter(null);
  });

  it('stores and reads consent from localStorage', () => {
    expect(hasAnalyticsConsent()).toBe(false);
    setAnalyticsConsent(true);
    expect(hasAnalyticsConsent()).toBe(true);
    setAnalyticsConsent(false);
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('sanitizes unsupported property values', () => {
    expect(sanitizeAnalyticsProperties({
      ok: true,
      count: 3,
      label: 'quest',
      nil: null,
      skipped: undefined,
    })).toEqual({
      ok: true,
      count: 3,
      label: 'quest',
    });
  });

  it('does not capture events without consent', () => {
    const capture = vi.fn();
    setAnalyticsAdapter({ capture });

    trackEvent('quest_start', { quest_id: 'q1' });

    expect(canTrackAnalytics()).toBe(false);
    expect(capture).not.toHaveBeenCalled();
  });

  it('captures events when consent is granted and adapter is set', () => {
    const capture = vi.fn();
    setAnalyticsAdapter({ capture });
    setAnalyticsConsent(true);

    trackEvent('quest_start', { quest_id: 'q1', stage_count: 5, invalid: undefined });

    expect(capture).toHaveBeenCalledWith('quest_start', { quest_id: 'q1', stage_count: 5 });
  });
});