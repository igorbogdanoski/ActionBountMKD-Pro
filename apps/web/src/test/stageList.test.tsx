import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

function renderList(onDelete = vi.fn()) {
  render(
    <StageList
      stages={[makeStage()]}
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

describe('StageList delete confirmation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks for confirmation and deletes when confirmed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDelete = renderList();

    fireEvent.click(screen.getByTitle('Избриши'));

    expect(window.confirm).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith('s1');
  });

  it('does not delete when the confirmation is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onDelete = renderList();

    fireEvent.click(screen.getByTitle('Избриши'));

    expect(window.confirm).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('includes the stage title in the confirmation message', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(
      <StageList
        stages={[makeStage({ title: 'Финална загатка' })]}
        selectedId={null}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTitle('Избриши'));

    expect(confirmSpy.mock.calls[0][0]).toContain('Финална загатка');
  });
});
