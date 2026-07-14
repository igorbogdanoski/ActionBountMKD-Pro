import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FindSpotStagePlayer } from '../components/player/stages/FindSpotStagePlayer';
import type { FindSpotStage } from 'shared';

function makeStage(overrides: Partial<FindSpotStage> = {}): FindSpotStage {
  return {
    id: 's1',
    type: 'FIND_SPOT',
    title: 'Најди го местото',
    description: 'Опис',
    order: 0,
    points: 50,
    targetCoordinates: { latitude: 41.99, longitude: 21.43 },
    radiusMeters: 20,
    ...overrides,
  };
}

function baseProps() {
  return {
    isNightMode: false,
    otherPendingTargets: [],
    currentLocation: null,
    pathHistory: [],
    distanceToTarget: null,
    gpsError: null,
    isStageCompleted: false,
    onRetryGps: vi.fn(),
    onSkip: vi.fn(),
    onArrived: vi.fn(),
    onContinue: vi.fn(),
  };
}

describe('FindSpotStagePlayer', () => {
  it('shows "computing" while distance is unknown', () => {
    render(<FindSpotStagePlayer stage={makeStage()} {...baseProps()} />);
    expect(screen.getByText('Се пресметува...')).toBeTruthy();
  });

  it('shows the arrived button and calls onArrived once within the radius', () => {
    const onArrived = vi.fn();
    render(<FindSpotStagePlayer stage={makeStage()} {...baseProps()} distanceToTarget={5} onArrived={onArrived} />);
    const btn = screen.getByRole('button', { name: /Ја најдов! \(\+50\)/ });
    fireEvent.click(btn);
    expect(onArrived).toHaveBeenCalledOnce();
  });

  it('shows distance in meters while outside the radius, and no arrived button', () => {
    render(<FindSpotStagePlayer stage={makeStage()} {...baseProps()} distanceToTarget={120} />);
    expect(screen.getByText('120 метри')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ја најдов!/ })).toBeNull();
  });

  it('shows a retry button and a skip button on GPS error when not required to advance', () => {
    const onRetryGps = vi.fn();
    const onSkip = vi.fn();
    render(<FindSpotStagePlayer stage={makeStage({ requiredToAdvance: false })} {...baseProps()} gpsError="denied" onRetryGps={onRetryGps} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: /Обиди се повторно/ }));
    expect(onRetryGps).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Прескокни без поени' }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('hides the skip option on GPS error when requiredToAdvance is true', () => {
    render(<FindSpotStagePlayer stage={makeStage({ requiredToAdvance: true })} {...baseProps()} gpsError="unavailable" />);
    expect(screen.queryByRole('button', { name: 'Прескокни без поени' })).toBeNull();
  });

  it('shows a locked "must physically arrive" message when required and not skippable', () => {
    render(<FindSpotStagePlayer stage={makeStage({ requiredToAdvance: true })} {...baseProps()} distanceToTarget={200} />);
    expect(screen.getByText('Мора физички да пристигнеш до локацијата')).toBeTruthy();
  });

  it('shows a continue button once the stage is already completed', () => {
    const onContinue = vi.fn();
    render(<FindSpotStagePlayer stage={makeStage()} {...baseProps()} isStageCompleted onContinue={onContinue} />);
    expect(screen.getByText('Решено')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Продолжи напред' }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
