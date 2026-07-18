import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getPaymentRequests: vi.fn(),
  approvePaymentRequest: vi.fn(),
  rejectPaymentRequest: vi.fn(),
  getPendingTemplates: vi.fn(),
  saveTemplate: vi.fn(),
  runSeedTemplates: vi.fn(),
  cleanupDuplicateTemplates: vi.fn(),
}));

vi.mock('../utils/firebase', () => ({ auth: {}, provider: {}, storage: {}, db: {} }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mocks.navigate };
});
vi.mock('../utils/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'admin-1' }, isAdmin: true }) }));
vi.mock('../utils/paymentRequests', () => ({
  getPaymentRequests: mocks.getPaymentRequests,
  approvePaymentRequest: mocks.approvePaymentRequest,
  rejectPaymentRequest: mocks.rejectPaymentRequest,
}));
vi.mock('../utils/storage', () => ({ getPendingTemplates: mocks.getPendingTemplates, saveTemplate: mocks.saveTemplate }));
vi.mock('../utils/seedTemplates', () => ({
  runSeedTemplates: mocks.runSeedTemplates,
  cleanupDuplicateTemplates: mocks.cleanupDuplicateTemplates,
}));
vi.mock('../components/SEO', () => ({ SEO: () => null }));

import { AdminPanel } from '../components/admin/AdminPanel';

const request = {
  id: 'request-1',
  userId: 'user-1',
  userEmail: 'ana@example.test',
  displayName: 'Ана Наставничка',
  planId: 'pro',
  method: 'bank',
  amountMkd: 4990,
  transactionRef: 'BANK-2026-001',
  status: 'pending',
  createdAt: '2026-07-18T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPaymentRequests.mockResolvedValue([request]);
  mocks.approvePaymentRequest.mockResolvedValue(undefined);
  mocks.rejectPaymentRequest.mockResolvedValue(undefined);
  mocks.getPendingTemplates.mockResolvedValue([]);
});

describe('AdminPanel payment controls', () => {
  it('uses semantic section tabs and pressed payment filters', async () => {
    render(<AdminPanel />);
    const tabs = screen.getByRole('tablist', { name: 'Admin секции' });
    expect(within(tabs).getByRole('tab', { name: 'Плаќања' })).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs).getByRole('tab', { name: 'Шаблони' })).toHaveAttribute('aria-selected', 'false');
    const pending = await screen.findByRole('button', { name: 'Чека' });
    expect(pending).toHaveAttribute('aria-pressed', 'true');
    expect(mocks.getPaymentRequests).toHaveBeenCalledWith('pending');

    fireEvent.click(screen.getByRole('button', { name: 'Сите' }));
    await waitFor(() => expect(mocks.getPaymentRequests).toHaveBeenLastCalledWith(undefined));
    expect(screen.getByRole('button', { name: 'Сите' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('routes back and reports a failed refresh', async () => {
    render(<AdminPanel />);
    await screen.findByText('Ана Наставничка');
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(mocks.navigate).toHaveBeenCalledWith('/dashboard');

    mocks.getPaymentRequests.mockRejectedValueOnce(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Освежи' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/не може да се вчитаат/);
  });

  it('approves only after explicit confirmation and reloads the list', async () => {
    render(<AdminPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Одобри (pro)' }));
    expect(mocks.approvePaymentRequest).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Одобри плаќање?' });
    expect(dialog).toHaveTextContent('BANK-2026-001');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Одобри pro' }));
    await waitFor(() => expect(mocks.approvePaymentRequest).toHaveBeenCalledWith('request-1', 'user-1', 'pro'));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(mocks.getPaymentRequests).toHaveBeenCalledTimes(2);
  });

  it('keeps the approval dialog open with a visible alert on failure', async () => {
    mocks.approvePaymentRequest.mockRejectedValueOnce(new Error('already processed'));
    render(<AdminPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Одобри (pro)' }));
    const dialog = screen.getByRole('dialog', { name: 'Одобри плаќање?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Одобри pro' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/не може да се одобри/);
    expect(dialog).toBeInTheDocument();
  });

  it('rejects only from the confirmation dialog', async () => {
    render(<AdminPanel />);
    fireEvent.click(await screen.findByRole('button', { name: 'Одбиј' }));
    expect(mocks.rejectPaymentRequest).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Одбиј плаќање?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Одбиј барање' }));
    await waitFor(() => expect(mocks.rejectPaymentRequest).toHaveBeenCalledWith('request-1'));
  });
});
