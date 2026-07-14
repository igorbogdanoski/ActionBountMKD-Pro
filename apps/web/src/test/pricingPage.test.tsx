import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PLAN_LIMITS } from 'shared';

vi.mock('../utils/AuthContext', () => ({ useAuth: () => ({ user: null, signInWithGoogle: vi.fn() }) }));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => ({ planId: 'free' }) }));
// PaymentModal (statically imported by PricingPage) -> utils/paymentRequests -> utils/firebase,
// which throws auth/invalid-api-key in the test environment.
vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));

import { PricingPage } from '../components/pricing/PricingPage';

function renderPage() {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <PricingPage />
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('PricingPage', () => {
  it('renders all four plans (card + comparison table header, each)', () => {
    renderPage();
    expect(screen.getAllByText('Бесплатен').length).toBe(2);
    expect(screen.getAllByText('Starter').length).toBe(2);
    expect(screen.getAllByText('Pro').length).toBe(2);
    expect(screen.getAllByText('Enterprise').length).toBe(2);
  });

  it('feature comparison table reflects the real PLAN_LIMITS numbers, not hardcoded duplicates', () => {
    renderPage();
    const table = within(screen.getByRole('table'));
    const questsRow = table.getByText('Квестови').closest('tr')!;
    // Free/Starter/Pro quest caps come straight from PLAN_LIMITS; Enterprise -1 renders as ∞.
    expect(within(questsRow).getByText(String(PLAN_LIMITS.free.maxQuests))).toBeTruthy();
    expect(within(questsRow).getByText(String(PLAN_LIMITS.starter.maxQuests))).toBeTruthy();
    expect(within(questsRow).getByText(String(PLAN_LIMITS.pro.maxQuests))).toBeTruthy();
    expect(PLAN_LIMITS.enterprise.maxQuests).toBe(-1);
    expect(within(questsRow).getByText('∞')).toBeTruthy();
  });

  it('does not hardcode a fixed dark background — page wrapper carries both light and dark classes', () => {
    const { container } = renderPage();
    const wrapper = container.querySelector('.min-h-screen');
    expect(wrapper?.className).toContain('bg-slate-50');
    expect(wrapper?.className).toContain('dark:bg-gray-950');
  });
});
