import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';
import type { Quest } from 'shared';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const authState = vi.hoisted(() => ({ user: { uid: 'u1' } }));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));

const planState = vi.hoisted(() => ({
  limits: { maxQuests: 10 },
  isPro: true,
  can: () => true,
}));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => planState }));

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'q1',
    title: 'Патека низ градот',
    description: 'опис',
    stages: [],
    visibility: 'secret',
    creatorId: 'u1',
    updatedAt: Date.now(),
    ...overrides,
  } as Quest;
}

const getQuests = vi.hoisted(() => vi.fn());
const deleteQuest = vi.hoisted(() => vi.fn());
const cacheQuestResources = vi.hoisted(() => vi.fn());
vi.mock('../utils/storage', () => ({ getQuests, deleteQuest, cacheQuestResources }));

// GenerateQuestModal (rendered inside BoundsDashboard, even while closed) transitively
// imports utils/aiService -> utils/firebase, which throws auth/invalid-api-key in tests.
vi.mock('../utils/aiService', () => ({ generateQuest: vi.fn() }));

import { BoundsDashboard } from '../components/dashboard/BoundsDashboard';

beforeEach(() => {
  getQuests.mockReset();
  deleteQuest.mockReset().mockResolvedValue(undefined);
  cacheQuestResources.mockReset();
});

function renderDashboard() {
  render(
    <MemoryRouter>
      <BoundsDashboard onCreateNew={vi.fn()} />
    </MemoryRouter>
  );
}

describe('BoundsDashboard delete confirmation (Modal-based)', () => {
  it('opens a confirmation Modal instead of deleting immediately', async () => {
    getQuests.mockResolvedValue([makeQuest()]);
    renderDashboard();

    fireEvent.click(await screen.findByLabelText('Избриши авантура'));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText('Патека низ градот')).toBeTruthy();
    expect(deleteQuest).not.toHaveBeenCalled();
  });

  it('deletes the quest when confirmed in the Modal', async () => {
    getQuests.mockResolvedValue([makeQuest()]);
    renderDashboard();

    fireEvent.click(await screen.findByLabelText('Избриши авантура'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Избриши' }));

    await waitFor(() => expect(deleteQuest).toHaveBeenCalledWith('q1'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not delete when the Modal is cancelled', async () => {
    getQuests.mockResolvedValue([makeQuest()]);
    renderDashboard();

    fireEvent.click(await screen.findByLabelText('Избриши авантура'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Откажи' }));

    expect(deleteQuest).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
