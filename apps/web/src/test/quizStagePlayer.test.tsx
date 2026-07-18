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
    matchingSelections: {} as Record<string, string>,
    matchingRightOptions: [] as string[],
    orderingSequence: [] as string[],
    onAnswerChange: vi.fn(),
    onMatchingSelect: vi.fn(),
    onOrderingMove: vi.fn(),
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

  it('exposes the selected option and locks choices after feedback', () => {
    render(<QuizStagePlayer stage={makeStage()} {...baseProps()} quizAnswer="Б" quizFeedback="success" />);
    expect(screen.getByRole('button', { name: 'Б' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Б' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Точно! +25');
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
    expect(screen.getByRole('timer')).toHaveTextContent('0:45');
    expect(screen.getByRole('progressbar', { name: 'Преостанато време' })).toHaveAttribute('aria-valuenow', '45');
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
    expect(screen.getByRole('alert')).toHaveTextContent('Погрешен одговор, обиди се повторно!');
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

describe('QuizStagePlayer — matching questions', () => {
  const matchingStage = () => makeStage({
    questionType: 'matching',
    options: undefined,
    matchingPairs: [
      { id: 'p1', left: 'Вода', right: 'H2O' },
      { id: 'p2', left: 'Сол', right: 'NaCl' },
    ],
  });

  it('renders a dropdown per left item with the shuffled right options, and disables submit until all are matched', () => {
    render(
      <QuizStagePlayer
        stage={matchingStage()}
        {...baseProps()}
        matchingRightOptions={['NaCl', 'H2O']}
      />
    );
    expect(screen.getByText('Вода')).toBeTruthy();
    expect(screen.getByText('Сол')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Потврди' })).toBeDisabled();
  });

  it('calls onMatchingSelect with the pair id and chosen right text', () => {
    const onMatchingSelect = vi.fn();
    render(
      <QuizStagePlayer
        stage={matchingStage()}
        {...baseProps()}
        matchingRightOptions={['NaCl', 'H2O']}
        onMatchingSelect={onMatchingSelect}
      />
    );
    fireEvent.change(screen.getByLabelText('Поврзи со: Вода'), { target: { value: 'H2O' } });
    expect(onMatchingSelect).toHaveBeenCalledWith('p1', 'H2O');
  });

  it('enables submit once every pair has a selection', () => {
    render(
      <QuizStagePlayer
        stage={matchingStage()}
        {...baseProps()}
        matchingRightOptions={['NaCl', 'H2O']}
        matchingSelections={{ p1: 'H2O', p2: 'NaCl' }}
      />
    );
    expect(screen.getByRole('button', { name: 'Потврди' })).not.toBeDisabled();
  });
});

describe('QuizStagePlayer — ordering questions', () => {
  const orderingStage = () => makeStage({
    questionType: 'ordering',
    options: undefined,
    orderingItems: [
      { id: 'i1', text: 'Прво' },
      { id: 'i2', text: 'Второ' },
      { id: 'i3', text: 'Трето' },
    ],
  });

  it('renders items in the shuffled sequence order passed in', () => {
    render(<QuizStagePlayer stage={orderingStage()} {...baseProps()} orderingSequence={['i2', 'i1', 'i3']} />);
    const texts = screen.getAllByText(/Прво|Второ|Трето/).map(el => el.textContent);
    expect(texts).toEqual(['Второ', 'Прво', 'Трето']);
  });

  it('calls onOrderingMove with the index and direction when reordered', () => {
    const onOrderingMove = vi.fn();
    render(
      <QuizStagePlayer
        stage={orderingStage()}
        {...baseProps()}
        orderingSequence={['i1', 'i2', 'i3']}
        onOrderingMove={onOrderingMove}
      />
    );
    fireEvent.click(screen.getByLabelText('Помести надолу: Прво'));
    expect(onOrderingMove).toHaveBeenCalledWith(0, 'down');
  });

  it('enables submit as soon as a sequence exists (always fully populated)', () => {
    render(<QuizStagePlayer stage={orderingStage()} {...baseProps()} orderingSequence={['i1', 'i2', 'i3']} />);
    expect(screen.getByRole('button', { name: 'Потврди' })).not.toBeDisabled();
  });

  it('disables moving the first item up and the last item down', () => {
    render(<QuizStagePlayer stage={orderingStage()} {...baseProps()} orderingSequence={['i1', 'i2', 'i3']} />);
    expect(screen.getByLabelText('Помести нагоре: Прво')).toBeDisabled();
    expect(screen.getByLabelText('Помести надолу: Трето')).toBeDisabled();
  });
});
