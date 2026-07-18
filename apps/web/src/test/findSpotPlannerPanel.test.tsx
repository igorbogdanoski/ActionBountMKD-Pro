import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Coordinates, FindSpotStage, InfoStage, Stage } from 'shared';
import { FindSpotPlannerPanel } from '../components/creator/FindSpotPlannerPanel';

vi.mock('../components/MapSelector', () => ({
  MapSelector: ({
    markers,
    onMapClick,
    onMarkerMove,
    onMarkerSelect,
  }: {
    markers: Array<{ id: string; label: string; title: string }>;
    onMapClick?: (coordinates: Coordinates) => void;
    onMarkerMove?: (id: string, coordinates: Coordinates) => void;
    onMarkerSelect?: (id: string) => void;
  }) => (
    <div data-testid="map-selector">
      <span>{markers.map(marker => `${marker.label}:${marker.title}`).join('|')}</span>
      {onMapClick && (
        <button type="button" onClick={() => onMapClick({ latitude: 41.99, longitude: 21.43 })}>
          Клик на мапа
        </button>
      )}
      <button type="button" onClick={() => onMarkerSelect?.('spot-2')}>Избери marker</button>
      <button
        type="button"
        onClick={() => onMarkerMove?.('spot-1', { latitude: 42, longitude: 21.5 })}
      >
        Помести marker
      </button>
    </div>
  ),
}));

function makeSpot(overrides: Partial<FindSpotStage> = {}): FindSpotStage {
  return {
    id: 'spot-1',
    type: 'FIND_SPOT',
    title: 'Плоштад',
    description: '',
    order: 0,
    points: 50,
    targetCoordinates: { latitude: 41.9981, longitude: 21.4254 },
    radiusMeters: 30,
    showMode: 'map',
    requiredToAdvance: true,
    ...overrides,
  };
}

function renderPlanner({
  stages = [],
  selectedStageId = null,
  onSelectStage = vi.fn(),
  onMoveStage = vi.fn(),
  onAddStageAtCoordinates = vi.fn(),
}: {
  stages?: Stage[];
  selectedStageId?: string | null;
  onSelectStage?: (stageId: string) => void;
  onMoveStage?: (stageId: string, coordinates: Coordinates) => void;
  onAddStageAtCoordinates?: (coordinates: Coordinates) => void;
} = {}) {
  render(
    <FindSpotPlannerPanel
      stages={stages}
      selectedStageId={selectedStageId}
      onSelectStage={onSelectStage}
      onMoveStage={onMoveStage}
      onAddStageAtCoordinates={onAddStageAtCoordinates}
    />
  );
  return { onSelectStage, onMoveStage, onAddStageAtCoordinates };
}

describe('FindSpotPlannerPanel', () => {
  it('renders its empty state and exposes the add-mode toggle state', async () => {
    renderPlanner();

    await screen.findByTestId('map-selector');
    expect(screen.getByText(/Сѐ уште нема FIND_SPOT етапи/)).toBeTruthy();
    const toggle = screen.getByRole('button', { name: 'Нова точка' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    const cancel = screen.getByRole('button', { name: 'Откажи додавање' });
    expect(cancel).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('button', { name: 'Клик на мапа' })).toBeTruthy();

    fireEvent.click(cancel);
    expect(screen.getByRole('button', { name: 'Нова точка' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('adds a stage at the clicked coordinates and exits add mode', async () => {
    const { onAddStageAtCoordinates } = renderPlanner();

    fireEvent.click(screen.getByRole('button', { name: 'Нова точка' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Клик на мапа' }));

    expect(onAddStageAtCoordinates).toHaveBeenCalledWith({ latitude: 41.99, longitude: 21.43 });
    expect(screen.getByRole('button', { name: 'Нова точка' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders ordered planner markers and semantic selection controls', async () => {
    const info: InfoStage = {
      id: 'info-1', type: 'INFO', title: 'Вовед', description: '', order: 0, points: 0, mediaType: 'none',
    };
    const stages: Stage[] = [
      info,
      makeSpot({ order: 1 }),
      makeSpot({ id: 'spot-2', title: '', order: 2, targetCoordinates: { latitude: 42, longitude: 21.43 } }),
    ];
    const { onSelectStage } = renderPlanner({ stages, selectedStageId: 'spot-1' });

    expect(await screen.findByText('1:Плоштад|2:Точка 2')).toBeTruthy();
    const first = screen.getByRole('button', { name: 'Избери точка 1: Плоштад' });
    const second = screen.getByRole('button', { name: 'Избери точка 2: Точка 2' });
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(second).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(second);
    expect(onSelectStage).toHaveBeenCalledWith('spot-2');
  });

  it('passes map marker selection and movement to the creator callbacks', async () => {
    const { onSelectStage, onMoveStage } = renderPlanner({ stages: [makeSpot()] });

    fireEvent.click(await screen.findByRole('button', { name: 'Избери marker' }));
    fireEvent.click(screen.getByRole('button', { name: 'Помести marker' }));

    expect(onSelectStage).toHaveBeenCalledWith('spot-2');
    expect(onMoveStage).toHaveBeenCalledWith('spot-1', { latitude: 42, longitude: 21.5 });
  });
});
