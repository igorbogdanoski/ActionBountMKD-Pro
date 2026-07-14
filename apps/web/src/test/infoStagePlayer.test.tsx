import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoStagePlayer } from '../components/player/stages/InfoStagePlayer';
import type { InfoStage } from 'shared';

function makeStage(overrides: Partial<InfoStage> = {}): InfoStage {
  return {
    id: 's1',
    type: 'INFO',
    title: 'Вовед',
    description: 'Опис на етапата',
    order: 0,
    mediaType: 'none',
    ...overrides,
  };
}

describe('InfoStagePlayer', () => {
  it('renders title and description, and calls onContinue', () => {
    const onContinue = vi.fn();
    render(<InfoStagePlayer stage={makeStage()} isNightMode={false} onContinue={onContinue} />);
    expect(screen.getByText('Вовед')).toBeTruthy();
    expect(screen.getByText('Опис на етапата')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Разбрав, понатаму' }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('renders an image when mediaUrl is a non-YouTube URL', () => {
    render(<InfoStagePlayer stage={makeStage({ mediaUrl: 'https://example.com/photo.jpg' })} isNightMode={false} onContinue={vi.fn()} />);
    const img = screen.getByAltText('Мултимедија') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/photo.jpg');
  });

  it('renders a YouTube embed when mediaUrl is a YouTube link', () => {
    render(<InfoStagePlayer stage={makeStage({ mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })} isNightMode={false} onContinue={vi.fn()} />);
    const iframe = screen.getByTitle('YouTube video player') as HTMLIFrameElement;
    expect(iframe.src).toContain('dQw4w9WgXcQ');
  });

  it('renders nothing media-related when there is no mediaUrl', () => {
    render(<InfoStagePlayer stage={makeStage()} isNightMode={false} onContinue={vi.fn()} />);
    expect(screen.queryByAltText('Мултимедија')).toBeNull();
  });
});
