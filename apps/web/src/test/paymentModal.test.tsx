import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const authState = vi.hoisted(() => ({
  user: { uid: 'u1', email: 'nastavnik@example.com' },
  profile: { uid: 'u1', displayName: 'Наставник Прв' },
}));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));

const submitPaymentRequest = vi.hoisted(() => vi.fn());
vi.mock('../utils/paymentRequests', () => ({ submitPaymentRequest }));

import { PaymentModal } from '../components/pricing/PaymentModal';

beforeEach(() => submitPaymentRequest.mockReset());

describe('PaymentModal', () => {
  it('renders the plan name/price and both payment method options', () => {
    render(<PaymentModal planId="starter" planName="Starter" onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Купи план Starter')).toBeTruthy();
    expect(screen.getByText(/590/)).toBeTruthy();
    expect(screen.getByText('PayPal')).toBeTruthy();
    expect(screen.getByRole('button', { name: /PayPal/ })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('button', { name: /Банкарски/ })).toHaveAttribute('type', 'button');
  });

  it('walks through method -> instructions -> confirm -> done, submitting the payment request', async () => {
    submitPaymentRequest.mockResolvedValue('req-1');
    render(<PaymentModal planId="starter" planName="Starter" onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('PayPal'));
    expect(screen.getByText(/Веќе платив/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Веќе платив/ }));
    fireEvent.change(screen.getByPlaceholderText('пр. 1AB23456CD789012E'), { target: { value: 'TX123' } });
    fireEvent.click(screen.getByRole('button', { name: /Испрати потврда/ }));

    await waitFor(() => expect(submitPaymentRequest).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      method: 'paypal',
      transactionRef: 'TX123',
      planId: 'starter',
    })));
    expect(await screen.findByText('Барањето е примено!')).toBeTruthy();
  });

  it('shows a validation error when confirming without a transaction reference', async () => {
    render(<PaymentModal planId="pro" planName="Pro" onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Банкарски/));
    fireEvent.click(screen.getByRole('button', { name: /Веќе платив/ }));
    fireEvent.click(screen.getByRole('button', { name: /Испрати потврда/ }));
    expect(await screen.findByText('Внеси референтен број на трансакцијата.')).toBeTruthy();
    expect(submitPaymentRequest).not.toHaveBeenCalled();
  });

  it('preserves both back transitions', () => {
    render(<PaymentModal planId="starter" planName="Starter" onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('PayPal'));
    fireEvent.click(screen.getByRole('button', { name: /Назад/ }));
    expect(screen.getByRole('button', { name: /PayPal/ })).toBeTruthy();

    fireEvent.click(screen.getByText('PayPal'));
    fireEvent.click(screen.getByRole('button', { name: /Веќе платив/ }));
    fireEvent.click(screen.getByRole('button', { name: /Назад/ }));
    expect(screen.getByRole('button', { name: /Веќе платив/ })).toBeTruthy();
  });

  it('disables the confirmation action and shows shared loading state while submitting', async () => {
    submitPaymentRequest.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve('req-1'), 50);
    }));
    render(<PaymentModal planId="starter" planName="Starter" onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('PayPal'));
    fireEvent.click(screen.getByRole('button', { name: /Веќе платив/ }));
    fireEvent.change(screen.getByPlaceholderText('пр. 1AB23456CD789012E'), { target: { value: 'TX123' } });
    const submit = screen.getByRole('button', { name: /Испрати потврда/ });
    expect(submit).toHaveAttribute('type', 'button');
    fireEvent.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    expect(submit.querySelector('.animate-spin')).toBeTruthy();
    expect(await screen.findByText('Барањето е примено!')).toBeTruthy();
  });

  it('closes on Escape (gained from the shared Modal)', () => {
    const onClose = vi.fn();
    render(<PaymentModal planId="starter" planName="Starter" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
