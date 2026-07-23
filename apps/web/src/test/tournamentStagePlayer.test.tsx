import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TournamentStagePlayer } from '../components/player/stages/TournamentStagePlayer';
import type { TournamentStage } from 'shared';

function makeStage(overrides: Partial<TournamentStage> = {}): TournamentStage {
  return {
    id: 's1',
    type: 'TOURNAMENT',
    title: 'Турнир',
    description: 'Опис',
    order: 0,
    points: 50,
    ...overrides,
  };
}

describe('TournamentStagePlayer', () => {
  it('renders title, description and points on the finish button', () => {
    render(<TournamentStagePlayer stage={makeStage()} isNightMode={false} onFinish={vi.fn()} />);
    expect(screen.getByText('Турнир')).toBeTruthy();
    expect(screen.getByText('Опис')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Турнирот заврши \(\+50\)/ })).toBeTruthy();
  });

  it('shows the task description and team count when present', () => {
    render(
      <TournamentStagePlayer
        stage={makeStage({ taskDescription: 'Задача за тимовите текст', teamCount: 4 })}
        isNightMode={false}
        onFinish={vi.fn()}
      />
    );
    expect(screen.getByText('Задача за тимовите текст')).toBeTruthy();
    expect(screen.getByText('4 тима се натпреваруваат')).toBeTruthy();
  });

  it('calls onFinish when the button is clicked', () => {
    const onFinish = vi.fn();
    render(<TournamentStagePlayer stage={makeStage()} isNightMode={false} onFinish={onFinish} />);
    fireEvent.click(screen.getByRole('button', { name: /Турнирот заврши/ }));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('keeps the shared task card palettes', () => {
    const stage = makeStage({ taskDescription: 'Team task' });
    const { rerender } = render(
      <TournamentStagePlayer stage={stage} isNightMode={false} onFinish={vi.fn()} />
    );
    expect(screen.getByTestId('tournament-task-card').className).toContain('!bg-orange-50');

    rerender(<TournamentStagePlayer stage={stage} isNightMode onFinish={vi.fn()} />);
    expect(screen.getByTestId('tournament-task-card').className).toContain('!bg-slate-800');
  });
});
