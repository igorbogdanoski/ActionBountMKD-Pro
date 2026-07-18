import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { getStageReorderIndices, StageList } from '../components/creator/StageList';
import type { InfoStage, StageType } from 'shared';

function makeStage(overrides: Partial<InfoStage> = {}): InfoStage {
  return {
    id: 's1',
    type: 'INFO',
    title: 'Вовед',
    description: 'д',
    order: 0,
    mediaType: 'none',
    ...overrides,
  } as InfoStage;
}

function renderList({
  stages = [makeStage()],
  selectedId = null,
  onSelect = vi.fn(),
  onAdd = vi.fn(),
  onDuplicate = vi.fn(),
  onDelete = vi.fn(),
  onReorder = vi.fn(),
}: {
  stages?: InfoStage[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onAdd?: (type: StageType, afterIndex: number) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReorder?: (oldIndex: number, newIndex: number) => void;
} = {}) {
  render(
    <StageList
      stages={stages}
      selectedId={selectedId}
      onSelect={onSelect}
      onAdd={onAdd}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onReorder={onReorder}
    />
  );
  return { onSelect, onAdd, onDuplicate, onDelete, onReorder };
}

describe('StageList controls', () => {
  it('maps drag identifiers to reorder indices and rejects no-op drags', () => {
    const stages = [makeStage({ id: 's1' }), makeStage({ id: 's2', order: 1 })];

    expect(getStageReorderIndices(stages, 's1', 's2')).toEqual([0, 1]);
    expect(getStageReorderIndices(stages, 's1', 's1')).toBeNull();
    expect(getStageReorderIndices(stages, 'missing', 's2')).toBeNull();
    expect(getStageReorderIndices(stages, 's1', null)).toBeNull();
  });

  it('adds a selected stage type to an empty quest', () => {
    const onAdd = vi.fn();
    renderList({ stages: [], onAdd });

    fireEvent.click(screen.getByRole('button', { name: 'Квиз' }));
    expect(onAdd).toHaveBeenCalledWith('QUIZ', -1);
  });

  it('exposes semantic stage selection state and selects the stage', () => {
    const onSelect = vi.fn();
    renderList({ selectedId: 's1', onSelect });

    const select = screen.getByRole('button', { name: 'Избери етапа 1: Вовед' });
    expect(select).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(select);
    expect(onSelect).toHaveBeenCalledWith('s1');
  });

  it('duplicates the requested stage without selecting it', () => {
    const onSelect = vi.fn();
    const onDuplicate = vi.fn();
    renderList({ onSelect, onDuplicate });

    fireEvent.click(screen.getByRole('button', { name: 'Дуплирај етапа 1' }));
    expect(onDuplicate).toHaveBeenCalledWith('s1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('opens a confirmation Modal instead of deleting immediately', () => {
    const { onDelete } = renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Избриши етапа 1' }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes when the Modal delete button is confirmed', () => {
    const { onDelete } = renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Избриши етапа 1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Избриши' }));

    expect(onDelete).toHaveBeenCalledWith('s1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not delete when the Modal is cancelled', () => {
    const { onDelete } = renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Избриши етапа 1' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Откажи' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape without deleting (gained from the shared Modal)', () => {
    const { onDelete } = renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Избриши етапа 1' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('includes the stage title in the confirmation message', () => {
    renderList({ stages: [makeStage({ title: 'Финална загатка' })] });

    fireEvent.click(screen.getByRole('button', { name: 'Избриши етапа 1' }));

    expect(within(screen.getByRole('dialog')).getByText(/Финална загатка/)).toBeTruthy();
    expect(within(screen.getByRole('dialog')).getByText(/„Финална загатка“/)).toBeTruthy();
  });
});
