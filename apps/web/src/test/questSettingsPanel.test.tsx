import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Quest } from 'shared';

const planState = vi.hoisted(() => ({ planId: 'pro' }));
vi.mock('../hooks/usePlan', () => ({ usePlan: () => planState }));
vi.mock('../components/upload/ImageUploader', () => ({ ImageUploader: () => <div>Image uploader</div> }));
vi.mock('../components/upload/TrackUploader', () => ({ TrackUploader: () => <div>Track uploader</div> }));

import { QuestSettingsPanel } from '../components/creator/QuestSettingsPanel';

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'q1',
    creatorId: 'teacher-1',
    title: 'Тест квест',
    description: '',
    visibility: 'secret',
    playMode: 'singleplayer',
    sequence: 'fixed',
    stages: [],
    createdAt: '2026-07-18T00:00:00.000Z',
    updatedAt: '2026-07-18T00:00:00.000Z',
    ...overrides,
  } as Quest;
}

function renderPanel(quest = makeQuest(), onChange = vi.fn(), onDeleteQuest = vi.fn().mockResolvedValue(undefined)) {
  const view = render(<QuestSettingsPanel quest={quest} onChange={onChange} onDeleteQuest={onDeleteQuest} />);
  return { ...view, onChange, onDeleteQuest };
}

beforeEach(() => {
  planState.planId = 'pro';
});

describe('QuestSettingsPanel controls', () => {
  it('sanitizes and adds a tag through the labelled control', () => {
    const { onChange } = renderPanel();
    fireEvent.change(screen.getByPlaceholderText('npr. скопје, историја...'), { target: { value: '  Скопје!  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Додај таг' }));
    expect(onChange).toHaveBeenCalledWith('tags', ['скопје']);
  });

  it('removes a named tag without ambiguity', () => {
    const { onChange } = renderPanel(makeQuest({ tags: ['историја', 'скопје'] }));
    fireEvent.click(screen.getByRole('button', { name: 'Отстрани таг историја' }));
    expect(onChange).toHaveBeenCalledWith('tags', ['скопје']);
  });

  it('adds and removes inventory items with stable identifiers', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QuestSettingsPanel quest={makeQuest()} onChange={onChange} onDeleteQuest={vi.fn().mockResolvedValue(undefined)} />,
    );
    fireEvent.change(screen.getByPlaceholderText('Име на предмет'), { target: { value: 'Златен Клуч' } });
    fireEvent.change(screen.getByPlaceholderText('Икона, напр. 🗝️'), { target: { value: '🗝️' } });
    fireEvent.click(screen.getByRole('button', { name: 'Додај предмет' }));
    expect(onChange).toHaveBeenCalledWith('inventoryItems', [expect.objectContaining({ id: 'златен-клуч', name: 'Златен Клуч', icon: '🗝️' })]);

    onChange.mockClear();
    const item = { id: 'key', name: 'Клуч' };
    rerender(<QuestSettingsPanel quest={makeQuest({ inventoryItems: [item] })} onChange={onChange} onDeleteQuest={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Отстрани предмет Клуч' }));
    expect(onChange).toHaveBeenCalledWith('inventoryItems', []);
  });

  it('adds and removes learning goals through the pedagogy tab', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <QuestSettingsPanel quest={makeQuest()} onChange={onChange} onDeleteQuest={vi.fn().mockResolvedValue(undefined)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Педагогија' }));
    fireEvent.change(screen.getByPlaceholderText(/Препознава историски/), { target: { value: 'Препознава обележја' } });
    fireEvent.click(screen.getByRole('button', { name: 'Додај цел на учење' }));
    expect(onChange).toHaveBeenCalledWith('pedagogy', { learningGoals: ['Препознава обележја'] });

    onChange.mockClear();
    rerender(<QuestSettingsPanel quest={makeQuest({ pedagogy: { learningGoals: ['Цел 1'] } })} onChange={onChange} onDeleteQuest={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Отстрани цел 1' }));
    expect(onChange).toHaveBeenCalledWith('pedagogy', undefined);
  });

  it('gates the public leaderboard control by plan', () => {
    planState.planId = 'free';
    const { rerender } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Карактеристики' }));
    expect(screen.getByText(/достапна со Pro план/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Јавна табела/ })).not.toBeInTheDocument();

    planState.planId = 'pro';
    rerender(<QuestSettingsPanel quest={makeQuest()} onChange={vi.fn()} onDeleteQuest={vi.fn().mockResolvedValue(undefined)} />);
    expect(screen.getByRole('checkbox', { name: /Јавна табела/ })).toBeInTheDocument();
  });

  it('confirms quest deletion and reports a rejected delete without closing the dialog', async () => {
    const onDeleteQuest = vi.fn().mockRejectedValue(new Error('offline'));
    renderPanel(makeQuest(), vi.fn(), onDeleteQuest);
    fireEvent.click(screen.getByRole('button', { name: 'Опасна зона' }));
    fireEvent.click(screen.getByRole('button', { name: 'Избриши квест' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/„Тест квест“/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Избриши засекогаш' }));

    await waitFor(() => expect(onDeleteQuest).toHaveBeenCalledOnce());
    expect(within(dialog).getByRole('alert')).toHaveTextContent('не може да се избрише');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
