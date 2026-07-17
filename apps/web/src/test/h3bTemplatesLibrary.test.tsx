import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Template } from 'shared';

const getPublicTemplates = vi.hoisted(() => vi.fn());
const incrementTemplateUsage = vi.hoisted(() => vi.fn());
const saveTemplate = vi.hoisted(() => vi.fn());
const trackEvent = vi.hoisted(() => vi.fn());
const planState = vi.hoisted(() => ({ planId: 'free' }));

vi.mock('../utils/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'teacher-1', displayName: 'Teacher' } }),
}));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => planState }));
vi.mock('../utils/storage', () => ({ getPublicTemplates, incrementTemplateUsage, saveTemplate }));
vi.mock('../utils/analytics', () => ({ trackEvent }));

import { TemplatesLibrary } from '../components/dashboard/TemplatesLibrary';

const baseTemplate = {
  id: 'template-basic',
  title: 'Geometry trail',
  subject: 'Математика',
  grade: '6 одд.',
  curriculumRef: 'МАТ-6.3',
  description: 'Find shapes around the school.',
  stages: [{ id: 'info-1', type: 'INFO', title: 'Start', description: 'Look around.', order: 0 }],
  stageCount: 1,
  rating: 4.8,
  ratingCount: 12,
  authorId: 'author-1',
  authorName: 'Author',
  status: 'approved',
  isPublic: true,
  isFeatured: false,
  isPro: false,
  difficulty: 'лесно',
  estimatedMinutes: 20,
  playMode: 'singleplayer',
  tags: ['geometry'],
  usageCount: 8,
  createdAt: '2026-07-17T00:00:00.000Z',
  updatedAt: '2026-07-17T00:00:00.000Z',
} as Template;

const proTemplate = {
  ...baseTemplate,
  id: 'template-pro',
  title: 'Advanced science mission',
  subject: 'Природни науки',
  curriculumRef: 'ПРИ-8.2',
  isPro: true,
} as Template;

beforeEach(() => {
  localStorage.clear();
  planState.planId = 'free';
  getPublicTemplates.mockReset();
  getPublicTemplates.mockResolvedValue([baseTemplate, proTemplate]);
  incrementTemplateUsage.mockReset();
  incrementTemplateUsage.mockResolvedValue(undefined);
  saveTemplate.mockReset();
  trackEvent.mockReset();
});

describe('H3b TemplatesLibrary controls', () => {
  it('preserves free-plan gating and emits the exact selected template payload', async () => {
    const onUseTemplate = vi.fn();
    render(<TemplatesLibrary onUseTemplate={onUseTemplate} />);

    const basicCard = (await screen.findByText('Geometry trail')).closest('div.rounded-2xl') as HTMLElement;
    const proCard = screen.getByText('Advanced science mission').closest('div.rounded-2xl') as HTMLElement;
    expect(screen.queryByRole('button', { name: 'Предложи шаблон' })).not.toBeInTheDocument();
    expect(within(proCard).getByRole('button', { name: 'Користи' })).toBeDisabled();

    fireEvent.click(within(basicCard).getByRole('button', { name: 'Користи' }));
    await waitFor(() => expect(incrementTemplateUsage).toHaveBeenCalledWith('template-basic'));
    expect(trackEvent).toHaveBeenCalledWith('template_used', { template_id: 'template-basic', subject: 'Математика' });
    expect(onUseTemplate).toHaveBeenCalledWith({
      title: '(Копија) Geometry trail',
      description: baseTemplate.description,
      stages: baseTemplate.stages,
      curriculumRef: 'МАТ-6.3',
    });
  });

  it('persists favorite state and exposes it as a pressed toggle', async () => {
    render(<TemplatesLibrary onUseTemplate={vi.fn()} />);
    await screen.findByText('Geometry trail');

    const favorite = screen.getAllByRole('button', { name: 'Додај во омилени' })[0];
    expect(favorite).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(favorite);
    expect(screen.getByRole('button', { name: 'Отстрани од омилени' })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('actionbound_fav_templates') ?? '[]')).toEqual(['template-basic']);
  });

  it('filters templates and exposes the Pro submission panel as an expanded control', async () => {
    planState.planId = 'pro';
    render(<TemplatesLibrary onUseTemplate={vi.fn()} />);
    await screen.findByText('Geometry trail');

    fireEvent.change(screen.getByPlaceholderText('Пребарај шаблони...'), { target: { value: 'science' } });
    expect(screen.queryByText('Geometry trail')).not.toBeInTheDocument();
    expect(screen.getByText('Advanced science mission')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Користи' })).toBeEnabled();

    const submitToggle = screen.getByRole('button', { name: 'Предложи шаблон' });
    expect(submitToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(submitToggle);
    expect(submitToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Предложи свој шаблон')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Поднеси за одобрување' })).toBeDisabled();
  });
});
