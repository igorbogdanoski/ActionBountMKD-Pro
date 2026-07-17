import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const analytics = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  hasConsent: vi.fn(() => false),
  setConsent: vi.fn(),
  syncConsent: vi.fn(() => Promise.resolve()),
}));

vi.mock('../utils/analytics', () => ({
  isAnalyticsConfigured: analytics.configured,
  hasAnalyticsConsent: analytics.hasConsent,
  setAnalyticsConsent: analytics.setConsent,
  syncAnalyticsConsent: analytics.syncConsent,
}));

import { AnalyticsConsentBanner } from '../components/AnalyticsConsentBanner';
import { OnboardingBanner } from '../components/dashboard/OnboardingBanner';

beforeEach(() => {
  localStorage.clear();
  analytics.configured.mockReturnValue(true);
  analytics.hasConsent.mockReturnValue(false);
  analytics.setConsent.mockReset();
  analytics.syncConsent.mockReset();
  analytics.syncConsent.mockResolvedValue();
});

describe('H3a consent and onboarding Button migrations', () => {
  it('persists analytics consent and waits for the consent sync', async () => {
    render(<AnalyticsConsentBanner />);
    const accept = await screen.findAllByRole('button').then(buttons => buttons[0]);
    expect(accept).toHaveAttribute('type', 'button');

    fireEvent.click(accept);

    expect(analytics.setConsent).toHaveBeenCalledWith(true);
    await waitFor(() => expect(analytics.syncConsent).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });

  it('dismisses analytics without granting consent', async () => {
    render(<AnalyticsConsentBanner />);
    const buttons = await screen.findAllByRole('button');
    fireEvent.click(buttons[1]);

    expect(analytics.setConsent).not.toHaveBeenCalled();
    expect(localStorage.getItem('avk_analytics_banner_dismissed')).toBe('1');
  });

  it('keeps onboarding CTA and dismiss controls as non-submit buttons', () => {
    const onCreateAdventure = vi.fn();
    render(<OnboardingBanner onCreateAdventure={onCreateAdventure} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    buttons.forEach(button => expect(button).toHaveAttribute('type', 'button'));

    fireEvent.click(buttons[1]);
    expect(onCreateAdventure).toHaveBeenCalledOnce();
    expect(localStorage.getItem('ak_onboarding_dismissed')).toBeNull();
  });

  it('persists onboarding dismissal from the icon control', () => {
    render(<OnboardingBanner onCreateAdventure={() => {}} />);
    fireEvent.click(screen.getAllByRole('button')[0]);

    expect(localStorage.getItem('ak_onboarding_dismissed')).toBe('1');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
