import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizStagePlayer } from '../components/player/stages/QuizStagePlayer';
import type { QuizStage } from 'shared';

function makeStage(overrides: Partial<QuizStage> = {}): QuizStage {
  return {
    id: 's1',
    type: 'QUIZ',
    title: 'Прашање',
    description: 'Опис',
    order: 0,
    points: 25,
    questionType: 'multiple_choice',
    options: ['А', 'Б', 'В'],
    correctAnswer: 'Б',
    ...overrides,
  };
}

function baseProps() {
  return {
    isNightMode: false,
    timeLeft: null,
    quizAnswer: '',
    quizFeedback: null as 'success' | 'error' | null,
    quizAttempts: 0,
    onAnswerChange: vi.fn(),
    onSubmit: vi.fn(),
    onSkip: vi.fn(),
  };
}

describe('QuizStagePlayer', () => {
  it('renders each option and selects one on click', () => {
    const onAnswerChange = vi.fn();
    render(<QuizStagePlayer stage={makeStage()} {...baseProps()} onAnswerChange={onAnswerChange} />);
    fireEvent.click(screen.getByText('Б'));
    expect(onAnswerChange).toHaveBeenCalledWith('Б');
  });

  it('disables submit until an answer is selected, and calls onSubmit', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<QuizStagePlayer stage={makeStage()} {...baseProps()} onSubmit={onSubmit} />);
    expect(screen.getByRole('button', { name: 'Потврди' })).toBeDisabled();

    rerender(<QuizStagePlayer stage={makeStage()} {...baseProps()} quizAnswer="Б" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Потврди' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows a countdown timer and progress bar when timeLimitSeconds is set', () => {
    render(<QuizStagePlayer stage={makeStage({ timeLimitSeconds: 60 })} {...baseProps()} timeLeft={45} />);
    expect(screen.getByText('0:45')).toBeTruthy();
  });

  it('shows "time expired" feedback and a continue button when the timer hits zero', () => {
    const onSkip = vi.fn();
    render(<QuizStagePlayer stage={makeStage({ timeLimitSeconds: 30 })} {...baseProps()} timeLeft={0} quizFeedback="error" onSkip={onSkip} />);
    expect(screen.getByText('Времето истече!')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Продолжи →' }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('shows "wrong answer" feedback (not "time expired") on a normal incorrect attempt', () => {
    render(<QuizStagePlayer stage={makeStage()} {...baseProps()} quizFeedback="error" />);
    expect(screen.getByText('Погрешен одговор, обиди се повторно!')).toBeTruthy();
  });

  it('shows success feedback with the points earned', () => {
    render(<QuizStagePlayer stage={makeStage()} {...baseProps()} quizFeedback="success" />);
    expect(screen.getByText('Точно! +25')).toBeTruthy();
  });

  it('reveals the hint after enough failed attempts', () => {
    render(<QuizStagePlayer stage={makeStage({ hintText: 'Помисли повторно' })} {...baseProps()} quizAttempts={2} />);
    expect(screen.getByText(/Помисли повторно/)).toBeTruthy();
  });

  it('does not reveal the hint before enough attempts', () => {
    render(<QuizStagePlayer stage={makeStage({ hintText: 'Помисли повторно' })} {...baseProps()} quizAttempts={0} />);
    expect(screen.queryByText(/Помисли повторно/)).toBeNull();
  });

  it('renders a textarea (not options) for free_text questions', () => {
    const onAnswerChange = vi.fn();
    render(
      <QuizStagePlayer
        stage={makeStage({ questionType: 'free_text', options: undefined, correctAnswer: 'скенер' })}
        {...baseProps()}
        onAnswerChange={onAnswerChange}
      />
    );
    const input = screen.getByPlaceholderText('Внеси го твојот одговор...');
    fireEvent.change(input, { target: { value: 'скенер' } });
    expect(onAnswerChange).toHaveBeenCalledWith('скенер');
    expect(screen.queryByRole('button', { name: 'А' })).toBeNull();
  });

  it('renders a number input for estimate_number questions', () => {
    const onAnswerChange = vi.fn();
    render(
      <QuizStagePlayer
        stage={makeStage({ questionType: 'estimate_number', options: undefined, correctAnswer: 42 })}
        {...baseProps()}
        onAnswerChange={onAnswerChange}
      />
    );
    const input = screen.getByPlaceholderText('Внеси број...') as HTMLInputElement;
    expect(input.type).toBe('number');
    fireEvent.change(input, { target: { value: '42' } });
    expect(onAnswerChange).toHaveBeenCalledWith('42');
  });

  it('lets a free_text answer enable the submit button', () => {
    render(
      <QuizStagePlayer
        stage={makeStage({ questionType: 'free_text', options: undefined })}
        {...baseProps()}
        quizAnswer="мојот одговор"
      />
    );
    expect(screen.getByRole('button', { name: 'Потврди' })).not.toBeDisabled();
  });
});
