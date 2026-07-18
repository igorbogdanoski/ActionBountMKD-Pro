import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QrTaskStagePlayer } from '../components/player/stages/QrTaskStagePlayer';
import type { QrTaskStage } from 'shared';

function makeStage(overrides: Partial<QrTaskStage> = {}): QrTaskStage {
  return {
    id: 's1',
    type: 'QR_TASK',
    title: 'QR Задача',
    description: 'Опис',
    order: 0,
    points: 40,
    targetQrPayload: 'xyz',
    taskTitle: 'Задача',
    taskDescription: 'Одговори на прашањето',
    answerType: 'text',
    requiredToAdvance: false,
    ...overrides,
  };
}

function baseProps() {
  return {
    isNightMode: false,
    scanError: null,
    qrTaskScanned: false,
    quizAnswer: '',
    quizFeedback: null as 'success' | 'error' | null,
    onAnswerChange: vi.fn(),
    onPhotoSelected: vi.fn(),
    onSubmit: vi.fn(),
    onSkip: vi.fn(),
  };
}

describe('QrTaskStagePlayer', () => {
  it('shows the scanner phase before the QR code is scanned', () => {
    render(<QrTaskStagePlayer stage={makeStage()} {...baseProps()} />);
    expect(screen.getByText(/QR Задача · 40 поени/)).toBeTruthy();
    expect(document.getElementById('reader')).toBeTruthy();
    expect(screen.queryByText('Задача')).toBeNull();
  });

  it('announces scanner failures as actionable errors', () => {
    render(<QrTaskStagePlayer stage={makeStage()} {...baseProps()} scanError="Камерата не е достапна." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Камерата не е достапна.');
  });

  it('reveals the task after scanning, and disables submit until answered', () => {
    render(<QrTaskStagePlayer stage={makeStage()} {...baseProps()} qrTaskScanned />);
    expect(screen.getByText('Задача')).toBeTruthy();
    expect(screen.getByText('Одговори на прашањето')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Потврди' })).toBeDisabled();
  });

  it('calls onAnswerChange when typing a free-text answer, and submits', () => {
    const onAnswerChange = vi.fn();
    const onSubmit = vi.fn();
    render(<QrTaskStagePlayer stage={makeStage()} {...baseProps()} qrTaskScanned onAnswerChange={onAnswerChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('Внеси го твојот одговор...'), { target: { value: '42' } });
    expect(onAnswerChange).toHaveBeenCalledWith('42');

    render(<QrTaskStagePlayer stage={makeStage()} {...baseProps()} qrTaskScanned quizAnswer="42" onSubmit={onSubmit} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Потврди' })[1]);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('renders multiple-choice options and selects on click', () => {
    const onAnswerChange = vi.fn();
    render(
      <QrTaskStagePlayer
        stage={makeStage({ answerType: 'multiple_choice', options: ['А', 'Б', 'В'] })}
        {...baseProps()}
        qrTaskScanned
        onAnswerChange={onAnswerChange}
      />
    );
    fireEvent.click(screen.getByText('Б'));
    expect(onAnswerChange).toHaveBeenCalledWith('Б');
  });

  it('exposes the selected multiple-choice option without enabling changes after feedback', () => {
    render(
      <QrTaskStagePlayer
        stage={makeStage({ answerType: 'multiple_choice', options: ['А', 'Б'] })}
        {...baseProps()}
        qrTaskScanned
        quizAnswer="Б"
        quizFeedback="success"
      />
    );
    expect(screen.getByRole('button', { name: /Б/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Б/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(/Зачувано/);
  });

  it('shows a continue button instead of resubmit when an optional stage is answered wrong', () => {
    const onSkip = vi.fn();
    render(<QrTaskStagePlayer stage={makeStage({ requiredToAdvance: false })} {...baseProps()} qrTaskScanned quizFeedback="error" onSkip={onSkip} />);
    fireEvent.click(screen.getByRole('button', { name: 'Продолжи →' }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('shows the correct success message depending on whether the answer was auto-graded', () => {
    render(<QrTaskStagePlayer stage={makeStage({ correctAnswer: '42' })} {...baseProps()} qrTaskScanned quizFeedback="success" />);
    expect(screen.getByText('Точно! +40')).toBeTruthy();
  });
});
