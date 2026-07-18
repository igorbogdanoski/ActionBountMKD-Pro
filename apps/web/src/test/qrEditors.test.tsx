import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QrTaskStage, ScanCodeStage } from 'shared';
import { ScanCodeEditor } from '../components/creator/stages/ScanCodeEditor';
import { QrTaskEditor } from '../components/creator/stages/QrTaskEditor';
import { downloadSvgById } from '../components/creator/stages/qrEditorUtils';

const scanStage = {
  id: 'scan', type: 'SCAN_CODE', title: 'QR', description: '', order: 0, points: 50,
  targetQrPayload: 'avt-TEST',
} as ScanCodeStage;

const taskStage = {
  id: 'task', type: 'QR_TASK', title: 'QR задача', description: '', order: 0, points: 100,
  targetQrPayload: 'avt-TASK', taskTitle: 'Задача', taskDescription: 'Опис',
  answerType: 'multiple_choice', options: ['Еден', 'Два'], requiredToAdvance: true,
} as QrTaskStage;

describe('QR editor clipboard feedback', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => vi.useRealTimers());

  it('shows success only after ScanCode clipboard write resolves and resets it', async () => {
    vi.useFakeTimers();
    render(<ScanCodeEditor stage={scanStage} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Копирај' }));

    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Копирано' })).toBeTruthy());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('avt-TEST');
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByRole('button', { name: 'Копирај' })).toBeTruthy();
  });

  it('reports rejected QrTask clipboard writes instead of false success', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'));
    render(<QrTaskEditor stage={taskStage} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Копирај' }));

    expect(await screen.findByRole('button', { name: 'Копирањето не успеа' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Копирано' })).toBeNull();
  });

  it('clears the pending feedback timer on unmount', async () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(<ScanCodeEditor stage={scanStage} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Копирај' }));
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Копирано' })).toBeTruthy());

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe('QR editor downloads and options', () => {
  it('always revokes the SVG object URL after initiating a download', () => {
    document.body.innerHTML = '<svg id="download-test"></svg>';
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    expect(downloadSvgById('download-test', 'test.svg')).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('adds and removes exact multiple-choice options with precise labels', async () => {
    const onChange = vi.fn();
    render(<QrTaskEditor stage={taskStage} onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Задача' }));

    fireEvent.click(screen.getByRole('button', { name: 'Отстрани одговор B' }));
    expect(onChange).toHaveBeenCalledWith({ options: ['Еден'] });
    fireEvent.click(screen.getByRole('button', { name: 'Додади одговор' }));
    expect(onChange).toHaveBeenCalledWith({ options: ['Еден', 'Два', ''] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Отстрани одговор A' })).toBeTruthy());
  });
});
