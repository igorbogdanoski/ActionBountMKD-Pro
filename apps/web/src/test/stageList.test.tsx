import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StageList } from '../components/creator/StageList';
import type { InfoStage } from 'shared';

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

function renderList(onDelete = vi.fn(), stages = [makeStage()]) {
  render(
    <StageList
      stages={stages}
      selectedId={null}
      onSelect={vi.fn()}
      onAdd={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={onDelete}
      onReorder={vi.fn()}
    />
  );
  return onDelete;
}

describe('StageList delete confirmation (Modal-based)', () => {
  it('opens a confirmation Modal instead of deleting immediately', () => {
    const onDelete = renderList();

    fireEvent.click(screen.getByTitle('Избриши'));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes when the Modal delete button is confirmed', () => {
    const onDelete = renderList();

    fireEvent.click(screen.getByTitle('Избриши'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Избриши' }));

    expect(onDelete).toHaveBeenCalledWith('s1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not delete when the Modal is cancelled', () => {
    const onDelete = renderList();

    fireEvent.click(screen.getByTitle('Избриши'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Откажи' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape without deleting (gained from the shared Modal)', () => {
    const onDelete = renderList();

    fireEvent.click(screen.getByTitle('Избриши'));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('includes the stage title in the confirmation message', () => {
    renderList(vi.fn(), [makeStage({ title: 'Финална загатка' })]);

    fireEvent.click(screen.getByTitle('Избриши'));

    expect(within(screen.getByRole('dialog')).getByText(/Финална загатка/)).toBeTruthy();
  });
});
