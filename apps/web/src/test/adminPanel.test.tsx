import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  getPaymentRequests: vi.fn(),
  approvePaymentRequest: vi.fn(),
  rejectPaymentRequest: vi.fn(),
  getAdminTemplates: vi.fn(),
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
vi.mock('../utils/storage', () => ({ getAdminTemplates: mocks.getAdminTemplates, saveTemplate: mocks.saveTemplate }));
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

const pendingTemplate = {
  id: 'template-1', title: 'Математичка авантура', authorName: 'Автор', subject: 'Математика', grade: 'VI',
  difficulty: 'medium', stageCount: 3, estimatedMinutes: 30, description: 'Опис', tags: ['алгебра'], status: 'pending', isPublic: false,
};

const featuredTemplate = {
  ...pendingTemplate, id: 'template-2', title: 'Јавен шаблон', status: 'approved', isPublic: true, isFeatured: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPaymentRequests.mockResolvedValue([request]);
  mocks.approvePaymentRequest.mockResolvedValue(undefined);
  mocks.rejectPaymentRequest.mockResolvedValue(undefined);
  mocks.getAdminTemplates.mockResolvedValue([]);
});

describe('AdminPanel payment controls', () => {
  it('uses semantic section tabs and pressed payment filters', async () => {
    render(<AdminPanel />);
    const tabs = screen.getByRole('tablist', { name: 'Admin секции' });
    expect(within(tabs).getByRole('tab', { name: 'Плаќања' })).toHaveAttribute('aria-selected', 'true');
    expect(within(tabs).getByRole('tab', { name: 'Шаблони' })).toHaveAttribute('aria-selected', 'false');
    const pending = await screen.findByRole('button', { name: 'Чека' });
    const paymentCard = screen.getByTestId('admin-payment-card');
    expect(paymentCard.className).toContain('!bg-slate-900');
    expect(paymentCard.className).toContain('!rounded-xl');
    expect(paymentCard.className).toContain('!shadow-none');
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

describe('AdminPanel template controls', () => {
  beforeEach(() => {
    mocks.getAdminTemplates.mockResolvedValue([pendingTemplate, featuredTemplate]);
    mocks.saveTemplate.mockResolvedValue(undefined);
    mocks.runSeedTemplates.mockResolvedValue(undefined);
    mocks.cleanupDuplicateTemplates.mockResolvedValue(undefined);
  });

  async function openTemplates() {
    render(<AdminPanel />);
    fireEvent.click(screen.getByRole('tab', { name: 'Шаблони' }));
    await screen.findByText('Математичка авантура');
  }

  it('seeds only after confirmation and renders progress messages', async () => {
    mocks.runSeedTemplates.mockImplementation(async (onProgress: (message: string) => void) => { onProgress('✓ Додадени 15 шаблони'); });
    await openTemplates();
    const templateCards = screen.getAllByTestId('admin-template-card');
    expect(templateCards).toHaveLength(2);
    expect(templateCards.every(card => card.className.includes('!bg-slate-900'))).toBe(true);
    expect(templateCards.every(card => card.className.includes('!rounded-xl'))).toBe(true);
    expect(templateCards.every(card => card.className.includes('!shadow-none'))).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Seed шаблони' }));
    expect(mocks.runSeedTemplates).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Додади стандардни шаблони?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Додади шаблони' }));

    await waitFor(() => expect(mocks.runSeedTemplates).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('✓ Додадени 15 шаблони')).toBeTruthy();
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it('keeps cleanup confirmation open with a visible failure alert', async () => {
    mocks.cleanupDuplicateTemplates.mockRejectedValueOnce(new Error('offline'));
    await openTemplates();
    fireEvent.click(screen.getByRole('button', { name: 'Исчисти дупликати' }));
    const dialog = screen.getByRole('dialog', { name: 'Исчисти ги дупликатите?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Исчисти дупликати' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/не може да се исчистат/);
    expect(dialog).toBeInTheDocument();
  });

  it('approves and publishes only after explicit confirmation', async () => {
    await openTemplates();
    fireEvent.click(screen.getByRole('button', { name: 'Одобри и објави: Математичка авантура' }));
    expect(mocks.saveTemplate).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Одобри и објави шаблон?' });
    expect(dialog).toHaveTextContent('Математичка авантура');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Одобри и објави' }));
    await waitFor(() => expect(mocks.saveTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: 'template-1', status: 'approved', isPublic: true })));
    await waitFor(() => expect(screen.queryByText('Математичка авантура')).toBeNull());
  });

  it('rejects only after confirmation and preserves the template on failure', async () => {
    mocks.saveTemplate.mockRejectedValueOnce(new Error('offline'));
    await openTemplates();
    fireEvent.click(screen.getByRole('button', { name: 'Одбиј: Математичка авантура' }));
    const dialog = screen.getByRole('dialog', { name: 'Одбиј шаблон?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Одбиј шаблон' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/не може да се одбие/);
    expect(screen.getByText('Математичка авантура')).toBeTruthy();
  });

  it('exposes Featured as a pressed toggle and reports persistence failure', async () => {
    mocks.saveTemplate.mockRejectedValueOnce(new Error('offline'));
    await openTemplates();
    const featured = screen.getByRole('button', { name: 'Отстрани Featured: Јавен шаблон' });
    expect(featured).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(featured);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Featured статусот/);
    expect(featured).toHaveAttribute('aria-pressed', 'true');
  });
});
