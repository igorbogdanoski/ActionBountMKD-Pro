import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MissionStagePlayer } from '../components/player/stages/MissionStagePlayer';
import type { MissionStage } from 'shared';

function makeStage(overrides: Partial<MissionStage> = {}): MissionStage {
  return {
    id: 's1',
    type: 'MISSION',
    title: 'Мисија',
    description: 'Опис',
    order: 0,
    points: 100,
    submissionType: 'photo',
    ...overrides,
  };
}

function baseProps() {
  return {
    isNightMode: false,
    isRecording: false,
    recordedAudioURL: null,
    missionUploading: false,
    missionUploadedUrl: null,
    missionUploadError: null,
    onToggleRecording: vi.fn(),
    onRetakeAudio: vi.fn(),
    onFileSelected: vi.fn(),
    onFinish: vi.fn(),
  };
}

describe('MissionStagePlayer', () => {
  it('shows the file picker for photo/video submissions and disables finish until uploaded', () => {
    render(<MissionStagePlayer stage={makeStage()} {...baseProps()} />);
    expect(screen.getByText('Избери датотека')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Заврши ја мисијата/ })).toBeDisabled();
  });

  it('enables finish once missionUploadedUrl is set, and calls onFinish', () => {
    const onFinish = vi.fn();
    render(<MissionStagePlayer stage={makeStage()} {...baseProps()} missionUploadedUrl="https://example.com/x.jpg" onFinish={onFinish} />);
    const btn = screen.getByRole('button', { name: /Заврши ја мисијата \(\+100\)/ });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('shows the audio recording UI for audio submissions and toggles recording', () => {
    const onToggleRecording = vi.fn();
    render(<MissionStagePlayer stage={makeStage({ submissionType: 'audio' })} {...baseProps()} onToggleRecording={onToggleRecording} />);
    const recording = screen.getByRole('button', { name: /Започни Снимање/ });
    expect(recording).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(recording);
    expect(onToggleRecording).toHaveBeenCalledOnce();
  });

  it('exposes the active recording state and stop action', () => {
    render(<MissionStagePlayer stage={makeStage({ submissionType: 'audio' })} {...baseProps()} isRecording />);
    expect(screen.getByRole('button', { name: /Стопирај Снимање/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the recorded audio player and a retake button once a recording exists', () => {
    const onRetakeAudio = vi.fn();
    render(
      <MissionStagePlayer
        stage={makeStage({ submissionType: 'audio' })}
        {...baseProps()}
        recordedAudioURL="blob:fake"
        onRetakeAudio={onRetakeAudio}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Сними повторно' }));
    expect(onRetakeAudio).toHaveBeenCalledOnce();
  });

  it('disables finish while uploading or recording', () => {
    const { rerender } = render(<MissionStagePlayer stage={makeStage()} {...baseProps()} missionUploadedUrl="url" missionUploading />);
    expect(screen.getByRole('button', { name: /Заврши ја мисијата/ })).toBeDisabled();

    rerender(<MissionStagePlayer stage={makeStage({ submissionType: 'audio' })} {...baseProps()} missionUploadedUrl="url" isRecording />);
    expect(screen.getByRole('button', { name: /Заврши ја мисијата/ })).toBeDisabled();
  });

  it('shows the grading label and rubric preview when a rubric is attached', () => {
    const stage = makeStage({
      rubric: { criteria: [{ id: 'c1', title: 'Квалитет', levels: [{ id: 'l1', label: 'Добро', points: 10 }] }] },
    });
    render(<MissionStagePlayer stage={stage} {...baseProps()} missionUploadedUrl="url" />);
    expect(screen.getByRole('button', { name: 'Испрати за оценување' })).toBeTruthy();
    expect(screen.getByText('📋 Како се оценува')).toBeTruthy();
  });

  it('surfaces an upload error message when present', () => {
    render(<MissionStagePlayer stage={makeStage()} {...baseProps()} missionUploadError="Датотеката е преголема (max 20MB)." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Датотеката е преголема (max 20MB).');
  });
});
