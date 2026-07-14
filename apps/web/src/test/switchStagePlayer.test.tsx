import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwitchStagePlayer } from '../components/player/stages/SwitchStagePlayer';
import type { SwitchStage, Stage } from 'shared';

function makeStage(overrides: Partial<SwitchStage> = {}): SwitchStage {
  return {
    id: 's1',
    type: 'SWITCH',
    title: 'Избери патека',
    description: '',
    order: 0,
    showPathsToPlayer: true,
    conditions: [],
    ...overrides,
  };
}

function baseProps() {
  return {
    isNightMode: false,
    allStages: [] as Stage[],
    points: 0,
    completedStageIds: [] as string[],
    collectedItemIds: [] as string[],
    inventoryItems: [],
    onChoosePath: vi.fn(),
  };
}

describe('SwitchStagePlayer', () => {
  it('shows a routing spinner and no choice buttons when showPathsToPlayer is false', () => {
    render(<SwitchStagePlayer stage={makeStage({ showPathsToPlayer: false })} {...baseProps()} />);
    expect(screen.getByText('Насочување...')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a choice button per condition and calls onChoosePath with its targetStageId', () => {
    const onChoosePath = vi.fn();
    const stage = makeStage({
      conditions: [
        { id: 'c1', label: 'Патека А', targetStageId: 'target-a' },
        { id: 'c2', label: 'Патека Б', targetStageId: 'target-b' },
      ],
    });
    render(<SwitchStagePlayer stage={stage} {...baseProps()} onChoosePath={onChoosePath} />);
    fireEvent.click(screen.getByText('Патека Б'));
    expect(onChoosePath).toHaveBeenCalledWith('target-b');
  });

  it('disables a condition button when its required item is missing, and shows the hint', () => {
    const stage = makeStage({
      conditions: [{ id: 'c1', label: 'Тајна патека', targetStageId: 'target-a', requiredItemId: 'key' }],
    });
    render(
      <SwitchStagePlayer
        stage={stage}
        {...baseProps()}
        inventoryItems={[{ id: 'key', name: 'Клуч', icon: '🔑' }]}
      />
    );
    const btn = screen.getByRole('button', { name: /Тајна патека/ });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Потребно:.*Клуч/)).toBeTruthy();
  });

  it('enables the condition button once the required item is collected', () => {
    const stage = makeStage({
      conditions: [{ id: 'c1', label: 'Тајна патека', targetStageId: 'target-a', requiredItemId: 'key' }],
    });
    render(
      <SwitchStagePlayer
        stage={stage}
        {...baseProps()}
        collectedItemIds={['key']}
        inventoryItems={[{ id: 'key', name: 'Клуч' }]}
      />
    );
    expect(screen.getByRole('button', { name: /Тајна патека/ })).not.toBeDisabled();
  });

  it('renders no path buttons when there are no conditions and no default target', () => {
    const stage = makeStage({ conditions: [] });
    render(<SwitchStagePlayer stage={stage} {...baseProps()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
