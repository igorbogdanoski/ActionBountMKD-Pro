import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScanCodeStagePlayer } from '../components/player/stages/ScanCodeStagePlayer';
import type { ScanCodeStage } from 'shared';

function makeStage(overrides: Partial<ScanCodeStage> = {}): ScanCodeStage {
  return {
    id: 's1',
    type: 'SCAN_CODE',
    title: 'Скенирај',
    description: 'Опис',
    order: 0,
    points: 30,
    targetQrPayload: 'abc',
    ...overrides,
  };
}

describe('ScanCodeStagePlayer', () => {
  it('renders the title, description and scanner container', () => {
    render(<ScanCodeStagePlayer stage={makeStage()} isNightMode={false} scanError={null} />);
    expect(screen.getByText('Скенирај')).toBeTruthy();
    expect(screen.getByText('Опис')).toBeTruthy();
    expect(document.getElementById('reader')).toBeTruthy();
  });

  it('shows a scan error message when present', () => {
    render(<ScanCodeStagePlayer stage={makeStage()} isNightMode={false} scanError="Погрешен QR код." />);
    expect(screen.getByText('Погрешен QR код.')).toBeTruthy();
  });
});
