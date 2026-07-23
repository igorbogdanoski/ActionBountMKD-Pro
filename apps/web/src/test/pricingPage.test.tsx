import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { PLAN_LIMITS } from 'shared';
import type { PaymentRequest } from '../utils/paymentRequests';

const authState = vi.hoisted(() => ({ user: null as { uid: string } | null, signInWithGoogle: vi.fn() }));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => ({ planId: 'free' }) }));
// PaymentModal (statically imported by PricingPage) -> utils/paymentRequests -> utils/firebase,
// which throws auth/invalid-api-key in the test environment.
vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));

const getUserPaymentRequests = vi.hoisted(() => vi.fn());
vi.mock('../utils/paymentRequests', async () => {
  const actual = await vi.importActual<typeof import('../utils/paymentRequests')>('../utils/paymentRequests');
  return { ...actual, getUserPaymentRequests };
});

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

beforeEach(() => {
  authState.user = null;
  authState.signInWithGoogle.mockReset().mockResolvedValue(undefined);
  getUserPaymentRequests.mockReset().mockResolvedValue([]);
});

describe('PricingPage', () => {
  it('renders all four plans (card + comparison table header, each)', () => {
    renderPage();
    expect(screen.getAllByText('Бесплатен').length).toBe(2);
    expect(screen.getAllByText('Starter').length).toBe(2);
    expect(screen.getAllByText('Pro').length).toBe(2);
    expect(screen.getAllByText('Enterprise').length).toBe(2);
    const cards = screen.getAllByTestId('pricing-plan-card');
    expect(cards).toHaveLength(4);
    expect(cards.every(card => card.className.includes('shadow-soft'))).toBe(true);
    expect(cards.filter(card => card.className.includes('ring-2'))).toHaveLength(1);
    expect(cards.filter(card => card.className.includes('!shadow-none'))).toHaveLength(3);
  });

  it('uses submit-safe shared buttons, preserves plan palettes, and disables the current plan', () => {
    renderPage();

    const current = screen.getByRole('button', { name: /Активен план/ });
    const starter = screen.getByRole('button', { name: 'Земи Starter' });
    const pro = screen.getByRole('button', { name: 'Земи Pro' });
    const enterprise = screen.getByRole('button', { name: 'Контактирај нè' });

    expect(current).toBeDisabled();
    expect(current).toHaveAttribute('type', 'button');
    expect(current.className).toContain('bg-slate-200');
    expect(starter.className).toContain('bg-indigo-600');
    expect(pro.className).toContain('bg-emerald-600');
    expect(enterprise.className).toContain('bg-amber-500');
    expect([starter, pro, enterprise].every(button => button.getAttribute('type') === 'button')).toBe(true);

    fireEvent.click(current);
    expect(authState.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('keeps the logged-out paid-plan CTA on the Google sign-in path', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Земи Starter' }));
    await waitFor(() => expect(authState.signInWithGoogle).toHaveBeenCalledOnce());
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

  it('shows no pending banner for a logged-out visitor', () => {
    renderPage();
    expect(screen.queryByText(/чека одобрување/)).toBeNull();
    expect(getUserPaymentRequests).not.toHaveBeenCalled();
  });

  it('shows no pending banner when the user has no pending payment request', async () => {
    authState.user = { uid: 'u1' };
    getUserPaymentRequests.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(getUserPaymentRequests).toHaveBeenCalledWith('u1'));
    expect(screen.queryByText(/чека одобрување/)).toBeNull();
  });

  it('shows a pending-review banner naming the plan when the user has a pending request', async () => {
    authState.user = { uid: 'u1' };
    const pending: PaymentRequest = {
      id: 'r1', userId: 'u1', userEmail: 'u1@example.com', displayName: 'Наставник',
      planId: 'pro', method: 'paypal', amountMkd: 1490, transactionRef: 'TX1',
      status: 'pending', createdAt: new Date().toISOString(),
    };
    getUserPaymentRequests.mockResolvedValue([pending]);

    renderPage();

    expect(await screen.findByText(/чека одобрување/)).toBeTruthy();
    expect(screen.getByText('Pro', { selector: 'strong' })).toBeTruthy();
  });
});
