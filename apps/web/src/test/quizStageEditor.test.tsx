import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuizStageEditor } from '../components/creator/stages/QuizStageEditor';
import type { QuizStage } from 'shared';

function makeStage(overrides: Partial<QuizStage> = {}): QuizStage {
  return {
    id: 's1',
    type: 'QUIZ',
    title: 'Прашање',
    description: 'Опис',
    order: 0,
    points: 50,
    questionType: 'free_text',
    correctAnswer: '',
    ...overrides,
  };
}

function renderOnAnswerTab(stage: QuizStage, onChange = vi.fn()) {
  render(<QuizStageEditor stage={stage} onChange={onChange} />);
  fireEvent.click(screen.getByRole('tab', { name: 'Одговор' }));
  return onChange;
}

describe('QuizStageEditor — matching questions', () => {
  it('lists matching/ordering as selectable answer types', () => {
    renderOnAnswerTab(makeStage());
    const select = screen.getByLabelText('Тип на одговор') as HTMLSelectElement;
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('matching');
    expect(values).toContain('ordering');
  });

  it('adds a new empty pair and edits its left/right text', () => {
    const onChange = renderOnAnswerTab(makeStage({ questionType: 'matching', matchingPairs: [] }));
    fireEvent.click(screen.getByRole('button', { name: /Додај пар/ }));
    expect(onChange).toHaveBeenCalledWith({ matchingPairs: [{ id: expect.any(String), left: '', right: '' }] });
  });

  it('updates an existing pair in place without touching the others', () => {
    const pairs = [
      { id: 'p1', left: 'Вода', right: '' },
      { id: 'p2', left: 'Сол', right: '' },
    ];
    const onChange = renderOnAnswerTab(makeStage({ questionType: 'matching', matchingPairs: pairs }));
    fireEvent.change(screen.getByPlaceholderText('Десно 1'), { target: { value: 'H2O' } });
    expect(onChange).toHaveBeenCalledWith({
      matchingPairs: [{ id: 'p1', left: 'Вода', right: 'H2O' }, { id: 'p2', left: 'Сол', right: '' }],
    });
  });

  it('removes a pair by index', () => {
    const pairs = [
      { id: 'p1', left: 'Вода', right: 'H2O' },
      { id: 'p2', left: 'Сол', right: 'NaCl' },
    ];
    const onChange = renderOnAnswerTab(makeStage({ questionType: 'matching', matchingPairs: pairs }));
    fireEvent.click(screen.getByLabelText('Избриши пар 1'));
    expect(onChange).toHaveBeenCalledWith({ matchingPairs: [{ id: 'p2', left: 'Сол', right: 'NaCl' }] });
  });

  it('hides the single "correct answer" field for matching questions', () => {
    renderOnAnswerTab(makeStage({ questionType: 'matching' }));
    expect(screen.queryByPlaceholderText('Точен одговор...')).toBeNull();
  });
});

describe('QuizStageEditor — ordering questions', () => {
  it('adds a new ordering item', () => {
    const onChange = renderOnAnswerTab(makeStage({ questionType: 'ordering', orderingItems: [] }));
    fireEvent.click(screen.getByRole('button', { name: /Додај ставка/ }));
    expect(onChange).toHaveBeenCalledWith({ orderingItems: [{ id: expect.any(String), text: '' }] });
  });

  it('swaps adjacent items when moved up or down', () => {
    const items = [
      { id: 'i1', text: 'Прво' },
      { id: 'i2', text: 'Второ' },
      { id: 'i3', text: 'Трето' },
    ];
    const onChange = renderOnAnswerTab(makeStage({ questionType: 'ordering', orderingItems: items }));
    fireEvent.click(screen.getByLabelText('Помести надолу 1'));
    expect(onChange).toHaveBeenCalledWith({
      orderingItems: [
        { id: 'i2', text: 'Второ' },
        { id: 'i1', text: 'Прво' },
        { id: 'i3', text: 'Трето' },
      ],
    });
  });

  it('disables moving the first item up and the last item down', () => {
    const items = [{ id: 'i1', text: 'Прво' }, { id: 'i2', text: 'Второ' }];
    renderOnAnswerTab(makeStage({ questionType: 'ordering', orderingItems: items }));
    expect(screen.getByLabelText('Помести нагоре 1')).toBeDisabled();
    expect(screen.getByLabelText('Помести надолу 2')).toBeDisabled();
  });

  it('hides the single "correct answer" field for ordering questions', () => {
    renderOnAnswerTab(makeStage({ questionType: 'ordering' }));
    expect(screen.queryByPlaceholderText('Точен одговор...')).toBeNull();
  });
});

describe('QuizStageEditor — existing question types unaffected', () => {
  it('still shows the correct-answer field for free_text', () => {
    renderOnAnswerTab(makeStage({ questionType: 'free_text' }));
    expect(screen.getByPlaceholderText('Точен одговор...')).toBeTruthy();
  });
});
