import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FindSpotStage, SurveyStage, SwitchStage } from 'shared';
import { FindSpotEditor } from '../components/creator/stages/FindSpotEditor';
import { SurveyEditor } from '../components/creator/stages/SurveyEditor';
import { SwitchStageEditor } from '../components/creator/stages/SwitchStageEditor';

vi.mock('../components/MapSelector', () => ({
  MapSelector: () => <div data-testid="map-selector">Map</div>,
}));

const findSpot = {
  id: 'spot', type: 'FIND_SPOT', title: 'Место', description: '', order: 0, points: 50,
  targetCoordinates: { latitude: 0, longitude: 0 }, radiusMeters: 30,
  showMode: 'map', requiredToAdvance: true,
} as FindSpotStage;

const survey = {
  id: 'survey', type: 'SURVEY', title: 'Анкета', description: '', order: 0, points: 0,
  surveyQuestions: ['Прво', 'Второ'],
} as SurveyStage;

const switchStage = {
  id: 'switch', type: 'SWITCH', title: 'Гранка', description: '', order: 0, points: 0,
  conditions: [
    { id: 'c1', label: 'Прв', targetStageId: '' },
    { id: 'c2', label: 'Втор', targetStageId: '' },
  ],
  showPathsToPlayer: false,
} as SwitchStage;

describe('FindSpotEditor controls', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
  });

  it('exposes map visibility as a pressed toggle', async () => {
    render(<FindSpotEditor stage={findSpot} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Координати' }));

    const open = screen.getByRole('button', { name: 'Отвори мапа' });
    expect(open).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(open);
    expect(screen.getByRole('button', { name: 'Скриј мапа' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByTestId('map-selector')).toBeTruthy();
  });

  it('reports rounded GPS coordinates and opens the map on success', async () => {
    const onChange = vi.fn();
    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation(success => {
      success({ coords: { latitude: 41.99812345, longitude: 21.42545678 } } as GeolocationPosition);
    });
    render(<FindSpotEditor stage={findSpot} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Координати' }));
    fireEvent.click(screen.getByRole('button', { name: 'Земи ја мојата локација' }));

    expect(onChange).toHaveBeenCalledWith({
      targetCoordinates: { latitude: 41.998123, longitude: 21.425457 },
    });
    expect(screen.getByRole('button', { name: 'Скриј мапа' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByTestId('map-selector')).toBeTruthy();
  });
});

describe('SurveyEditor controls', () => {
  it('removes the exact survey question and exposes precise icon labels', () => {
    const onChange = vi.fn();
    render(<SurveyEditor stage={survey} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Отстрани прашање 2' }));
    expect(onChange).toHaveBeenCalledWith({ surveyQuestions: ['Прво'] });
  });

  it('adds a blank question and hides the action at the limit', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SurveyEditor stage={survey} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Додај прашање' }));
    expect(onChange).toHaveBeenCalledWith({ surveyQuestions: ['Прво', 'Второ', ''] });

    rerender(<SurveyEditor stage={{ ...survey, surveyQuestions: Array(20).fill('Прашање') }} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Додај прашање' })).toBeNull();
  });
});

describe('SwitchStageEditor controls', () => {
  it('removes the exact condition through a precise icon label', () => {
    const onChange = vi.fn();
    render(<SwitchStageEditor stage={switchStage} allStages={[switchStage]} inventoryItems={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Отстрани услов 2' }));
    expect(onChange).toHaveBeenCalledWith({ conditions: [switchStage.conditions[0]] });
  });

  it('adds a condition with a non-empty stable identifier', () => {
    const onChange = vi.fn();
    render(<SwitchStageEditor stage={switchStage} allStages={[switchStage]} inventoryItems={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Додај услов' }));

    const added = onChange.mock.calls[0][0].conditions.at(-1);
    expect(added).toMatchObject({ label: '', targetStageId: '' });
    expect(added.id).toEqual(expect.any(String));
    expect(added.id.length).toBeGreaterThan(0);
  });
});
