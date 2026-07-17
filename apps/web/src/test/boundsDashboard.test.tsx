import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../i18n';
import type { Quest } from 'shared';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const authState = vi.hoisted(() => ({ user: { uid: 'u1' } }));
vi.mock('../utils/AuthContext', () => ({ useAuth: () => authState }));

const planState = vi.hoisted(() => ({
  limits: { maxQuests: 10 },
  isPro: true,
  canUseAI: true,
  can: () => planState.canUseAI,
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
  localStorage.clear();
  navigate.mockReset();
  planState.limits.maxQuests = 10;
  planState.isPro = true;
  planState.canUseAI = true;
  getQuests.mockReset();
  deleteQuest.mockReset().mockResolvedValue(undefined);
  cacheQuestResources.mockReset().mockResolvedValue(undefined);
});

function renderDashboard(onCreateNew = vi.fn()) {
  render(
    <MemoryRouter>
      <BoundsDashboard onCreateNew={onCreateNew} />
    </MemoryRouter>
  );
  return onCreateNew;
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

describe('BoundsDashboard H3b controls', () => {
  it('persists favorite and offline toggles with explicit pressed state', async () => {
    getQuests.mockResolvedValue([makeQuest()]);
    renderDashboard();

    const favorite = await screen.findByRole('button', { name: 'Додај во омилени' });
    const offline = screen.getByRole('button', { name: 'Зачувај офлајн' });
    expect(favorite).toHaveAttribute('aria-pressed', 'false');
    expect(offline).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(favorite);
    expect(screen.getByRole('button', { name: 'Отстрани од омилени' })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('ak_favs') ?? '[]')).toEqual(['q1']);

    fireEvent.click(offline);
    expect(screen.getByRole('button', { name: 'Офлајн зачувано' })).toHaveAttribute('aria-pressed', 'true');
    expect(cacheQuestResources).toHaveBeenCalledWith(expect.objectContaining({ id: 'q1' }));
    expect(JSON.parse(localStorage.getItem('ak_dls') ?? '[]')).toEqual(['q1']);
  });

  it('enforces plan gates for AI, live hosting and quest creation', async () => {
    planState.canUseAI = false;
    planState.isPro = false;
    planState.limits.maxQuests = 1;
    getQuests.mockResolvedValue([makeQuest()]);
    const onCreateNew = renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'AI Генерирај' }));
    expect(navigate).toHaveBeenCalledWith('/pricing');
    fireEvent.click(screen.getByRole('button', { name: 'Игра во живо' }));
    expect(navigate).toHaveBeenLastCalledWith('/pricing');
    const create = screen.getByRole('button', { name: 'Нова Авантура' });
    expect(create).toBeDisabled();
    fireEvent.click(create);
    expect(onCreateNew).not.toHaveBeenCalled();
  });

  it('keeps play and edit actions on their exact destinations', async () => {
    getQuests.mockResolvedValue([makeQuest()]);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Играј' }));
    expect(open).toHaveBeenCalledWith('/play/q1', '_blank', 'noopener,noreferrer');
    fireEvent.click(screen.getByRole('button', { name: 'Уреди' }));
    expect(navigate).toHaveBeenCalledWith('/creator/q1');
    open.mockRestore();
  });
});
